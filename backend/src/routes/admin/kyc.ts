import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireRole } from "../../middleware/adminAuth.js";
import { getClientIp } from "../../lib/getClientIp.js";
import * as logger from "../../lib/logger.js";
import { formatZodError } from "../../lib/zodErrors.js";

export const adminKycRouter = Router();

// ── GET /api/admin/kyc — Liste paginée des vendeurs avec KYC ──
adminKycRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status as string || "PENDING";
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const where: Record<string, unknown> = { deletedAt: null };

    if (status && ["NONE", "PENDING", "APPROVED", "REJECTED", "all"].includes(status)) {
      if (status !== "all") {
        where.kycStatus = status;
      }
    }

    if (dateFrom || dateTo) {
      where.kycSubmittedAt = {};
      if (dateFrom) (where.kycSubmittedAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        (where.kycSubmittedAt as Record<string, unknown>).lte = end;
      }
    }

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where: where as never,
        select: {
          id: true,
          email: true,
          slug: true,
          displayName: true,
          avatarUrl: true,
          plan: true,
          phone: true,
          kycStatus: true,
          kycFullName: true,
          kycIdUrl: true,
          kycSelfieUrl: true,
          kycSubmittedAt: true,
          kycReviewedAt: true,
          createdAt: true,
          _count: { select: { orders: true, withdrawals: true } },
        },
        orderBy: { kycSubmittedAt: { sort: "desc", nulls: "last" } },
        skip,
        take: limit,
      }),
      prisma.seller.count({ where: where as never }),
    ]);

    // Stats KYC globales
    const [pending, approved, rejected] = await Promise.all([
      prisma.seller.count({ where: { kycStatus: "PENDING", deletedAt: null } }),
      prisma.seller.count({ where: { kycStatus: "APPROVED", deletedAt: null } }),
      prisma.seller.count({ where: { kycStatus: "REJECTED", deletedAt: null } }),
    ]);

    res.json({
      sellers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: { pending, approved, rejected },
    });
  } catch (err) {
    logger.error("Erreur admin KYC list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /api/admin/kyc/:id — Approuver/Rejeter KYC ──
const kycActionSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(500).optional(),
});

adminKycRouter.patch("/:id", requireAdmin, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const data = kycActionSchema.parse(req.body);
    const sellerId = req.params.id as string;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, kycStatus: true, displayName: true },
    });

    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    // Permettre le force-approve depuis n'importe quel statut (admin peut valider manuellement)
    if (data.action === "REJECTED" && seller.kycStatus !== "PENDING") {
      res.status(400).json({ error: `KYC n'est pas en attente (statut: ${seller.kycStatus})` });
      return;
    }

    if (data.action === "APPROVED" && seller.kycStatus === "APPROVED") {
      res.status(400).json({ error: "KYC déjà approuvé" });
      return;
    }

    await prisma.seller.update({
      where: { id: sellerId },
      data: { kycStatus: data.action, kycReviewedAt: new Date() },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: `KYC_${data.action}`,
        target: `seller:${sellerId}`,
        details: data.reason ? { reason: data.reason } : undefined,
        ip: getClientIp(req),
      },
    });

    res.json({ ok: true, kycStatus: data.action });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur admin KYC action", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
