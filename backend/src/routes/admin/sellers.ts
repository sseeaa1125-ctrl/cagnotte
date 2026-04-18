import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireRole } from "../../middleware/requireAdmin.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { logAdminAction } from "../../lib/adminLog.js";
import { fireWithdrawalBlocked } from "../../lib/notifications/dispatch.js";
import * as logger from "../../lib/logger.js";

export const sellersAdminRouter = Router();

// All routes require admin auth
sellersAdminRouter.use(requireAdmin);

// ── GET / — Paginated list with search & filters ──
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  kycStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]).optional(),
  plan: z.enum(["FREE", "PRO"]).optional(),
  isFlagged: z.enum(["true", "false"]).optional(),
  withdrawalBlocked: z.enum(["true", "false"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

sellersAdminRouter.get("/", async (req, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Paramètres invalides", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, kycStatus, plan, isFlagged, withdrawalBlocked, dateFrom, dateTo } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Prisma.SellerWhereInput = {};

    // Search by name, email, or slug
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    // KYC status filter
    if (kycStatus) where.kycStatus = kycStatus;

    // Plan filter
    if (plan) where.plan = plan;

    // Flagged filter
    if (isFlagged === "true") where.isFlagged = true;
    if (isFlagged === "false") where.isFlagged = false;

    // Withdrawal blocked filter
    if (withdrawalBlocked === "true") where.withdrawalBlocked = true;
    if (withdrawalBlocked === "false") where.withdrawalBlocked = false;

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom + "T00:00:00Z");
      }
      if (dateTo) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo + "T23:59:59Z");
      }
    }

    const [sellers, totalCount] = await Promise.all([
      prisma.seller.findMany({
        where,
        select: {
          id: true,
          slug: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          plan: true,
          kycStatus: true,
          isFlagged: true,
          withdrawalBlocked: true,
          createdAt: true,
          deletedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.seller.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({ sellers, totalCount, totalPages, currentPage: page });
  } catch (err) {
    logger.error("admin:sellers:list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /:id — Full seller detail with counts ──
sellersAdminRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;

    const [seller, orderCount, withdrawalCount, blockCount] = await Promise.all([
      prisma.seller.findUnique({
        where: { id },
        select: {
          id: true,
          slug: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          coverUrl: true,
          bio: true,
          subtitle: true,
          phone: true,
          plan: true,
          kycStatus: true,
          kycFullName: true,
          kycSubmittedAt: true,
          kycReviewedAt: true,
          payoutPhone: true,
          payoutProvider: true,
          payoutName: true,
          payoutCountry: true,
          isFlagged: true,
          flaggedAt: true,
          flagReason: true,
          withdrawalBlocked: true,
          withdrawalBlockedAt: true,
          withdrawalBlockReason: true,
          customCommissionRate: true,
          onboardingCompleted: true,
          emailVerified: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.order.count({ where: { sellerId: id, paymentStatus: "PAID" } }),
      prisma.withdrawal.count({ where: { sellerId: id } }),
      prisma.block.count({ where: { sellerId: id, type: "FUNDRAISER" } }),
    ]);

    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    res.json({ seller, orderCount, withdrawalCount, blockCount });
  } catch (err) {
    logger.error("admin:sellers:detail", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /:id/block-withdrawal — Toggle withdrawal block ──
const blockWithdrawalSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().max(500).optional(),
});

sellersAdminRouter.patch("/:id/block-withdrawal", requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const id = req.params.id as string;
    const parsed = blockWithdrawalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }

    const { blocked, reason } = parsed.data;

    const seller = await prisma.seller.findUnique({ where: { id }, select: { id: true } });
    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    await prisma.seller.update({
      where: { id },
      data: {
        withdrawalBlocked: blocked,
        withdrawalBlockedAt: blocked ? new Date() : null,
        withdrawalBlockReason: blocked ? (reason ?? null) : null,
      },
    });

    await logAdminAction(
      req.admin!.id,
      blocked ? "WITHDRAWAL_BLOCKED" : "WITHDRAWAL_UNBLOCKED",
      `seller:${id}`,
      { reason },
      req.ip,
    );

    // Notify seller by email when withdrawals are blocked
    if (blocked && reason) {
      fireWithdrawalBlocked({ id }, reason).catch((err) =>
        logger.error("admin:sellers:block-withdrawal notification", err),
      );
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("admin:sellers:block-withdrawal", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /:id/flag — Toggle flagged status ──
const flagSchema = z.object({
  flagged: z.boolean(),
  reason: z.string().max(500).optional(),
});

sellersAdminRouter.patch("/:id/flag", requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const id = req.params.id as string;
    const parsed = flagSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }

    const { flagged, reason } = parsed.data;

    const seller = await prisma.seller.findUnique({ where: { id }, select: { id: true } });
    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    await prisma.seller.update({
      where: { id },
      data: {
        isFlagged: flagged,
        flaggedAt: flagged ? new Date() : null,
        flagReason: flagged ? (reason ?? null) : null,
      },
    });

    await logAdminAction(
      req.admin!.id,
      flagged ? "SELLER_FLAGGED" : "SELLER_UNFLAGGED",
      `seller:${id}`,
      { reason },
      req.ip,
    );

    res.json({ success: true });
  } catch (err) {
    logger.error("admin:sellers:flag", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /:id/commission — Set custom commission rate ──
const commissionSchema = z.object({
  customCommissionRate: z.union([
    z.number().int().min(0).max(5000),
    z.null(),
  ]),
});

sellersAdminRouter.patch("/:id/commission", requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const id = req.params.id as string;
    const parsed = commissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }

    const { customCommissionRate } = parsed.data;

    const seller = await prisma.seller.findUnique({ where: { id }, select: { id: true } });
    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    await prisma.seller.update({
      where: { id },
      data: { customCommissionRate },
    });

    await logAdminAction(
      req.admin!.id,
      "COMMISSION_UPDATED",
      `seller:${id}`,
      { customCommissionRate },
      req.ip,
    );

    res.json({ success: true });
  } catch (err) {
    logger.error("admin:sellers:commission", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── DELETE /:id — Soft delete ──
sellersAdminRouter.delete("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const id = req.params.id as string;

    const seller = await prisma.seller.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }
    if (seller.deletedAt) {
      res.status(400).json({ error: "Ce compte est deja supprime" });
      return;
    }

    // Cascade: soft-delete seller + deactivate all their cagnottes +
    // reject pending withdrawals in a single transaction.
    const now = new Date();
    await prisma.$transaction([
      prisma.seller.update({
        where: { id },
        data: { deletedAt: now },
      }),
      // Deactivate all active fundraiser blocks
      prisma.block.updateMany({
        where: { sellerId: id, isActive: true },
        data: { isActive: false },
      }),
      // Reject any PENDING withdrawals (release balance)
      prisma.withdrawal.updateMany({
        where: { sellerId: id, status: "PENDING" },
        data: { status: "REJECTED", failureReason: "Compte supprime par admin", processedAt: now },
      }),
    ]);

    await logAdminAction(
      req.admin!.id,
      "SELLER_SOFT_DELETED",
      `seller:${id}`,
      { cascadedBlockDeactivation: true, cascadedWithdrawalRejection: true },
      req.ip,
    );

    res.json({ success: true });
  } catch (err) {
    logger.error("admin:sellers:delete", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
