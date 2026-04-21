import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireRole } from "../../middleware/requireAdmin.js";
import { logAdminAction } from "../../lib/adminLog.js";
import {
  fireKycApproved,
  fireKycRejected,
} from "../../lib/notifications/dispatch.js";

export const kycRouter = Router();

// All routes require admin auth
kycRouter.use(requireAdmin);

// ── GET / — List sellers with KYC data ──
const listQuerySchema = z.object({
  status: z.string().default("PENDING"),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

kycRouter.get("/", async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Paramètres invalides", details: parsed.error.flatten() });
      return;
    }

    const { status, search, page, limit, dateFrom, dateTo } = parsed.data;
    const where: Record<string, unknown> = { kycStatus: status };

    // Search filter
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { kycFullName: { contains: search, mode: "insensitive" } },
      ];
    }

    // Date range filter (KYC filters by kycSubmittedAt, not createdAt)
    if (dateFrom || dateTo) {
      where.kycSubmittedAt = {};
      if (dateFrom) {
        (where.kycSubmittedAt as Record<string, unknown>).gte = new Date(dateFrom + "T00:00:00Z");
      }
      if (dateTo) {
        (where.kycSubmittedAt as Record<string, unknown>).lte = new Date(dateTo + "T23:59:59Z");
      }
    }

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        orderBy: { kycSubmittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          email: true,
          displayName: true,
          kycStatus: true,
          kycFullName: true,
          kycIdUrl: true,
          kycSelfieUrl: true,
          kycSubmittedAt: true,
          kycReviewedAt: true,
          createdAt: true,
        },
      }),
      prisma.seller.count({ where }),
    ]);

    res.json({
      sellers,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /:sellerId/review — Approve or reject KYC ──
const reviewBodySchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().optional(),
});

kycRouter.post("/:sellerId/review", requireRole("ADMIN", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const sellerId = req.params.sellerId as string;

  const parsed = reviewBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }

  const { status, reason } = parsed.data;

  // Atomic check-and-update — prevents race condition on concurrent reviews
  const result = await prisma.seller.updateMany({
    where: { id: sellerId, kycStatus: "PENDING" },
    data: { kycStatus: status, kycReviewedAt: new Date() },
  });

  if (result.count === 0) {
    // Either seller doesn't exist or KYC was already reviewed
    const exists = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true },
    });
    if (!exists) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }
    res.status(409).json({ error: "Ce KYC a déjà été traité." });
    return;
  }

  // Fetch seller data needed for notification dispatch
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { id: true, slug: true },
  });

  // Fire notification
  if (status === "APPROVED") {
    await fireKycApproved({ id: sellerId });
  } else {
    await fireKycRejected({ id: sellerId }, reason || "Documents non conformes");
  }

  // Audit log
  await logAdminAction(
    req.admin!.id,
    status === "APPROVED" ? "KYC_APPROVED" : "KYC_REJECTED",
    `seller:${sellerId}`,
    { reason, sellerSlug: seller?.slug },
    req.ip,
  );

  res.json({ ok: true, kycStatus: status });
});

// ── POST /bulk/review — Bulk approve/reject KYC ──
// Best-effort : mutate tous les IDs PENDING d'un coup via updateMany, puis
// fire les notifications hors tx. Le retour distingue succeeded vs failed
// (failed = déjà traité / inconnu) pour que l'UI puisse garder les items
// en échec sélectionnés pour retry.
const bulkReviewBodySchema = z.object({
  sellerIds: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum(["APPROVED", "REJECTED"]),
  // Raison obligatoire pour REJECTED — alignement avec l'UX de la modal.
  // En APPROVED elle est ignorée.
  reason: z.string().trim().max(500).optional(),
});

kycRouter.post(
  "/bulk/review",
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const parsed = bulkReviewBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
      return;
    }

    const { sellerIds, status, reason } = parsed.data;

    if (status === "REJECTED" && (!reason || reason.length === 0)) {
      res.status(400).json({ error: "Une raison est requise pour rejeter." });
      return;
    }

    // Snapshot PRE-update : on récupère les PENDING + les slugs pour l'audit
    // log et les notifications. Les items non-PENDING ne seront pas mutés
    // par le updateMany ci-dessous.
    const pendingBefore = await prisma.seller.findMany({
      where: { id: { in: sellerIds }, kycStatus: "PENDING" },
      select: { id: true, slug: true },
    });
    const pendingIds = pendingBefore.map((s) => s.id);

    // Atomic bulk update — seuls les PENDING sont mutés.
    const { count: updatedCount } = await prisma.seller.updateMany({
      where: { id: { in: pendingIds }, kycStatus: "PENDING" },
      data: { kycStatus: status, kycReviewedAt: new Date() },
    });

    // Fire notifications en best-effort — une erreur n'interrompt pas le
    // batch. Le dedupeKey Notification.@unique protège contre le double-fire
    // si le seller était déjà notifié (edge case : race avec review individuelle).
    const notifyPromises = pendingBefore.map(async (seller) => {
      try {
        if (status === "APPROVED") {
          await fireKycApproved({ id: seller.id });
        } else {
          await fireKycRejected({ id: seller.id }, reason || "Documents non conformes");
        }
      } catch (_err) {
        // Silence — la mutation DB a réussi, la notif peut être rejouée.
      }
    });
    await Promise.allSettled(notifyPromises);

    // Audit log — 1 entrée résumant le bulk (vs 1 par item, voir audit-036).
    await logAdminAction(
      req.admin!.id,
      status === "APPROVED" ? "KYC_BULK_APPROVED" : "KYC_BULK_REJECTED",
      `sellers:${pendingIds.length}`,
      {
        reason,
        requestedIds: sellerIds,
        appliedIds: pendingIds,
        count: updatedCount,
      },
      req.ip,
    );

    const failedIds = sellerIds.filter((id) => !pendingIds.includes(id));
    res.json({
      ok: true,
      updated: updatedCount,
      succeededIds: pendingIds,
      failedIds,
    });
  },
);
