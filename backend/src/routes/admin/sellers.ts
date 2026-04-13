import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireRole } from "../../middleware/adminAuth.js";
import { getClientIp } from "../../lib/getClientIp.js";
import * as logger from "../../lib/logger.js";
import { formatZodError } from "../../lib/zodErrors.js";

export const adminSellersRouter = Router();

// ── GET /api/admin/sellers — Liste paginée, filtrable ──
adminSellersRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = (req.query.search as string || "").trim();
    const plan = req.query.plan as string | undefined;
    const kycStatus = req.query.kycStatus as string | undefined;
    const status = req.query.status as string | undefined; // "active" | "deleted"
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
    const hasSales = req.query.hasSales as string | undefined; // "with" | "without"

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (plan === "FREE" || plan === "PRO") {
      where.plan = plan;
    }

    if (kycStatus && ["NONE", "PENDING", "APPROVED", "REJECTED"].includes(kycStatus)) {
      where.kycStatus = kycStatus;
    }

    if (status === "deleted") {
      where.deletedAt = { not: null };
    } else if (status !== "all") {
      where.deletedAt = null;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = end;
      }
    }

    // Filtre par ventes
    if (hasSales === "with") {
      where.orders = { some: { paymentStatus: "PAID" } };
    } else if (hasSales === "without") {
      where.orders = { none: { paymentStatus: "PAID" } };
    }

    // Allowed sort fields
    const allowedSorts: Record<string, string> = {
      createdAt: "createdAt",
      email: "email",
      displayName: "displayName",
      plan: "plan",
    };
    const orderField = allowedSorts[sortBy] || "createdAt";

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
          kycStatus: true,
          onboardingCompleted: true,
          withdrawalBlocked: true,
          customCommissionRate: true,
          deletedAt: true,
          createdAt: true,
          isFlagged: true,
          _count: {
            select: {
              orders: { where: { paymentStatus: "PAID" } },
              communities: true,
              reports: true,
            },
          },
        },
        orderBy: { [orderField]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.seller.count({ where: where as never }),
    ]);

    // Compute total revenue per seller in a batch (orders + community payments)
    const sellerIds = sellers.map((s) => s.id);
    const [revenueData, communityRevenueData, communityPaymentCounts] = sellerIds.length > 0
      ? await Promise.all([
          prisma.order.groupBy({
            by: ["sellerId"],
            where: { sellerId: { in: sellerIds }, paymentStatus: "PAID" },
            _sum: { amount: true },
          }),
          prisma.$queryRaw<{ sellerId: string; total: bigint }[]>`
            SELECT c."sellerId", SUM(cp.amount) as total
            FROM "CommunityPayment" cp
            JOIN "Community" c ON cp."communityId" = c.id
            WHERE c."sellerId" = ANY(${sellerIds}) AND cp.status = 'COMPLETED'
            GROUP BY c."sellerId"
          `,
          prisma.$queryRaw<{ sellerId: string; count: bigint }[]>`
            SELECT c."sellerId", COUNT(*)::bigint as count
            FROM "CommunityPayment" cp
            JOIN "Community" c ON cp."communityId" = c.id
            WHERE c."sellerId" = ANY(${sellerIds}) AND cp.status = 'COMPLETED'
            GROUP BY c."sellerId"
          `,
        ])
      : [[], [], []];

    const revenueMap = new Map(revenueData.map((r) => [r.sellerId, r._sum.amount || 0]));
    const communityRevenueMap = new Map(communityRevenueData.map((r) => [r.sellerId, Number(r.total)]));
    const communityCountMap = new Map(communityPaymentCounts.map((r) => [r.sellerId, Number(r.count)]));

    const results = sellers.map((s) => ({
      id: s.id,
      email: s.email,
      slug: s.slug,
      displayName: s.displayName,
      avatarUrl: s.avatarUrl,
      plan: s.plan,
      kycStatus: s.kycStatus,
      onboardingCompleted: s.onboardingCompleted,
      withdrawalBlocked: s.withdrawalBlocked,
      customCommissionRate: s.customCommissionRate,
      deletedAt: s.deletedAt,
      createdAt: s.createdAt,
      isFlagged: s.isFlagged,
      orderCount: s._count.orders + (communityCountMap.get(s.id) || 0),
      communityCount: s._count.communities,
      reportCount: s._count.reports,
      totalRevenue: (revenueMap.get(s.id) || 0) + (communityRevenueMap.get(s.id) || 0),
    }));

    res.json({
      sellers: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error("Erreur admin sellers list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/admin/sellers/:id — Détail vendeur ──
adminSellersRouter.get("/:id", requireAdmin, async (req, res) => {
  try {
    const sellerId = req.params.id as string;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        email: true,
        slug: true,
        displayName: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        plan: true,
        kycStatus: true,
        kycFullName: true,
        kycIdUrl: true,
        kycSelfieUrl: true,
        kycSubmittedAt: true,
        kycReviewedAt: true,
        onboardingCompleted: true,
        withdrawalBlocked: true,
        withdrawalBlockedAt: true,
        withdrawalBlockReason: true,
        customCommissionRate: true,
        isFlagged: true,
        flaggedAt: true,
        flagReason: true,
        payoutPhone: true,
        payoutProvider: true,
        deletedAt: true,
        hardDeletedAt: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            customers: true,
            blocks: true,
            communities: true,
            withdrawals: true,
            pageViews: true,
            reports: true,
          },
        },
      },
    });

    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    // Revenue stats (orders + community payments)
    const [revenueStats, communityRevenueStats] = await Promise.all([
      prisma.order.aggregate({
        where: { sellerId: seller.id, paymentStatus: "PAID" },
        _sum: { amount: true, commissionAmount: true, sellerAmount: true },
        _count: true,
      }),
      prisma.communityPayment.aggregate({
        where: { community: { sellerId: seller.id }, status: "COMPLETED" },
        _sum: { amount: true, commissionAmount: true, sellerAmount: true },
        _count: true,
      }),
    ]);

    // Recent orders + community payments merged
    const [rawOrders, rawCommunity] = await Promise.all([
      prisma.order.findMany({
        where: { sellerId: seller.id },
        select: {
          id: true,
          reference: true,
          orderType: true,
          amount: true,
          paymentStatus: true,
          customerEmail: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.communityPayment.findMany({
        where: { community: { sellerId: seller.id } },
        select: {
          id: true,
          reference: true,
          amount: true,
          status: true,
          createdAt: true,
          subscription: { select: { memberEmail: true } },
          community: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const recentOrders = [
      ...rawOrders,
      ...rawCommunity.map((cp) => ({
        id: cp.id,
        reference: cp.reference,
        orderType: "COMMUNITY" as string,
        amount: cp.amount,
        paymentStatus: cp.status === "COMPLETED" ? "PAID" : cp.status,
        customerEmail: cp.subscription?.memberEmail || "",
        createdAt: cp.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Recent withdrawals
    const recentWithdrawals = await prisma.withdrawal.findMany({
      where: { sellerId: seller.id },
      select: {
        id: true,
        amount: true,
        status: true,
        phone: true,
        provider: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Admin logs for this seller
    const adminLogs = await prisma.adminLog.findMany({
      where: { target: `seller:${seller.id}` },
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        admin: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({
      seller,
      revenue: {
        totalAmount: (revenueStats._sum.amount || 0) + (communityRevenueStats._sum.amount || 0),
        totalCommission: (revenueStats._sum.commissionAmount || 0) + (communityRevenueStats._sum.commissionAmount || 0),
        totalSellerAmount: (revenueStats._sum.sellerAmount || 0) + (communityRevenueStats._sum.sellerAmount || 0),
        paidOrderCount: revenueStats._count + communityRevenueStats._count,
      },
      recentOrders,
      recentWithdrawals,
      adminLogs,
    });
  } catch (err) {
    logger.error("Erreur admin seller detail", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/admin/sellers/:id/sales-chart — Ventes par jour avec filtre date ──
adminSellersRouter.get("/:id/sales-chart", requireAdmin, async (req, res) => {
  try {
    const sellerId = req.params.id as string;
    const days = Math.min(Number(req.query.days) || 30, 90);
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    // Determine date range
    let startDate: Date;
    let endDate: Date;

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(dateTo);
      endDate.setUTCHours(23, 59, 59, 999);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - days);
      startDate.setUTCHours(0, 0, 0, 0);
    }

    // Daily sales for orders
    const dailyOrders = await prisma.$queryRaw<
      { date: Date; count: bigint; amount: bigint; commission: bigint }[]
    >`
      SELECT
        DATE_TRUNC('day', "paidAt") AS date,
        COUNT(*)::bigint AS count,
        COALESCE(SUM(amount), 0)::bigint AS amount,
        COALESCE(SUM("commissionAmount"), 0)::bigint AS commission
      FROM "Order"
      WHERE "sellerId" = ${sellerId}
        AND "paymentStatus" = 'PAID'
        AND "paidAt" >= ${startDate}
        AND "paidAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', "paidAt")
      ORDER BY date
    `;

    // Daily sales for community payments
    const dailyCommunity = await prisma.$queryRaw<
      { date: Date; count: bigint; amount: bigint; commission: bigint }[]
    >`
      SELECT
        DATE_TRUNC('day', cp."createdAt") AS date,
        COUNT(*)::bigint AS count,
        COALESCE(SUM(cp.amount), 0)::bigint AS amount,
        COALESCE(SUM(cp."commissionAmount"), 0)::bigint AS commission
      FROM "CommunityPayment" cp
      JOIN "Community" c ON cp."communityId" = c.id
      WHERE c."sellerId" = ${sellerId}
        AND cp.status = 'COMPLETED'
        AND cp."createdAt" >= ${startDate}
        AND cp."createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', cp."createdAt")
      ORDER BY date
    `;

    // Merge into daily buckets
    const orderMap = new Map(
      dailyOrders.map((r) => [
        r.date.toISOString().split("T")[0],
        { count: Number(r.count), amount: Number(r.amount), commission: Number(r.commission) },
      ])
    );
    const communityMap = new Map(
      dailyCommunity.map((r) => [
        r.date.toISOString().split("T")[0],
        { count: Number(r.count), amount: Number(r.amount), commission: Number(r.commission) },
      ])
    );

    // Union of all dates
    const allDates = new Set([...orderMap.keys(), ...communityMap.keys()]);
    const chart = Array.from(allDates)
      .sort()
      .map((dateStr) => {
        const o = orderMap.get(dateStr) || { count: 0, amount: 0, commission: 0 };
        const c = communityMap.get(dateStr) || { count: 0, amount: 0, commission: 0 };
        return {
          date: dateStr,
          count: o.count + c.count,
          amount: o.amount + c.amount,
          commission: o.commission + c.commission,
        };
      });

    // Totals
    const totals = chart.reduce(
      (acc, d) => ({
        count: acc.count + d.count,
        amount: acc.amount + d.amount,
        commission: acc.commission + d.commission,
      }),
      { count: 0, amount: 0, commission: 0 }
    );

    res.json({ chart, totals, dateFrom: startDate.toISOString(), dateTo: endDate.toISOString() });
  } catch (err) {
    logger.error("Erreur admin seller sales chart", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /api/admin/sellers/:id/plan — Changer le plan ──
const changePlanSchema = z.object({
  plan: z.enum(["FREE", "PRO"]),
});

adminSellersRouter.patch("/:id/plan", requireAdmin, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const data = changePlanSchema.parse(req.body);
    const sellerId = req.params.id as string;

    const seller = await prisma.seller.findUnique({ where: { id: sellerId }, select: { id: true, plan: true } });
    if (!seller) { res.status(404).json({ error: "Vendeur introuvable" }); return; }

    if (seller.plan === data.plan) {
      res.status(400).json({ error: `Le vendeur est déjà en plan ${data.plan}` });
      return;
    }

    await prisma.seller.update({
      where: { id: sellerId },
      data: { plan: data.plan },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: "PLAN_CHANGED",
        target: `seller:${sellerId}`,
        details: { from: seller.plan, to: data.plan },
        ip: getClientIp(req),
      },
    });

    res.json({ ok: true, plan: data.plan });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur admin change plan", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /api/admin/sellers/:id/kyc — Approuver/Rejeter KYC ──
const kycActionSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(500).optional(),
});

adminSellersRouter.patch("/:id/kyc", requireAdmin, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const data = kycActionSchema.parse(req.body);
    const sellerId = req.params.id as string;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, kycStatus: true },
    });
    if (!seller) { res.status(404).json({ error: "Vendeur introuvable" }); return; }

    // Rejet uniquement si PENDING (un KYC soumis)
    if (data.action === "REJECTED" && seller.kycStatus !== "PENDING") {
      res.status(400).json({ error: `Impossible de rejeter : KYC n'est pas en attente (statut actuel: ${seller.kycStatus})` });
      return;
    }

    // Approbation possible depuis n'importe quel statut (validation manuelle par admin)
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
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur admin KYC action", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /api/admin/sellers/:id/suspend — Suspendre/Réactiver un vendeur ──
const suspendSchema = z.object({
  action: z.enum(["suspend", "reactivate"]),
  reason: z.string().max(500).optional(),
});

adminSellersRouter.patch("/:id/suspend", requireAdmin, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const data = suspendSchema.parse(req.body);
    const sellerId = req.params.id as string;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, deletedAt: true },
    });
    if (!seller) { res.status(404).json({ error: "Vendeur introuvable" }); return; }

    if (data.action === "suspend" && seller.deletedAt) {
      res.status(400).json({ error: "Le vendeur est déjà suspendu" });
      return;
    }
    if (data.action === "reactivate" && !seller.deletedAt) {
      res.status(400).json({ error: "Le vendeur n'est pas suspendu" });
      return;
    }

    await prisma.seller.update({
      where: { id: sellerId },
      data: { deletedAt: data.action === "suspend" ? new Date() : null },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: data.action === "suspend" ? "SELLER_SUSPENDED" : "SELLER_REACTIVATED",
        target: `seller:${sellerId}`,
        details: data.reason ? { reason: data.reason } : undefined,
        ip: getClientIp(req),
      },
    });

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur admin suspend", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /api/admin/sellers/:id/withdrawal-block — Bloquer/Débloquer retraits ──
const withdrawalBlockSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().min(1).max(500).optional(),
});

adminSellersRouter.patch("/:id/withdrawal-block", requireAdmin, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const data = withdrawalBlockSchema.parse(req.body);
    const sellerId = req.params.id as string;

    if (data.blocked && !data.reason) {
      res.status(400).json({ error: "Un motif est obligatoire pour bloquer les retraits" });
      return;
    }

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, withdrawalBlocked: true },
    });
    if (!seller) { res.status(404).json({ error: "Vendeur introuvable" }); return; }

    await prisma.seller.update({
      where: { id: sellerId },
      data: {
        withdrawalBlocked: data.blocked,
        withdrawalBlockedAt: data.blocked ? new Date() : null,
        withdrawalBlockReason: data.blocked ? data.reason : null,
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: data.blocked ? "WITHDRAWAL_BLOCKED" : "WITHDRAWAL_UNBLOCKED",
        target: `seller:${sellerId}`,
        details: data.reason ? { reason: data.reason } : undefined,
        ip: getClientIp(req),
      },
    });

    res.json({ ok: true, withdrawalBlocked: data.blocked });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur admin withdrawal block", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /api/admin/sellers/:id/flag — Flaguer/Déflaguer un vendeur comme suspect ──
const flagSchema = z.object({
  flagged: z.boolean(),
  reason: z.string().min(1).max(500).optional(),
});

adminSellersRouter.patch("/:id/flag", requireAdmin, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const data = flagSchema.parse(req.body);
    const sellerId = req.params.id as string;

    if (data.flagged && !data.reason) {
      res.status(400).json({ error: "Un motif est obligatoire pour flaguer un vendeur" });
      return;
    }

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, isFlagged: true },
    });
    if (!seller) { res.status(404).json({ error: "Vendeur introuvable" }); return; }

    await prisma.seller.update({
      where: { id: sellerId },
      data: {
        isFlagged: data.flagged,
        flaggedAt: data.flagged ? new Date() : null,
        flagReason: data.flagged ? data.reason : null,
        // Auto-block withdrawals when flagging
        ...(data.flagged && !seller.isFlagged ? {
          withdrawalBlocked: true,
          withdrawalBlockedAt: new Date(),
          withdrawalBlockReason: `Profil flagué : ${data.reason}`,
        } : {}),
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: data.flagged ? "SELLER_FLAGGED" : "SELLER_UNFLAGGED",
        target: `seller:${sellerId}`,
        details: data.reason ? { reason: data.reason } : undefined,
        ip: getClientIp(req),
      },
    });

    res.json({ ok: true, isFlagged: data.flagged });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur admin flag seller", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /api/admin/sellers/:id/commission — Changer le taux de commission ──
const commissionSchema = z.object({
  customCommissionRate: z.number().int().min(0).max(5000).nullable(),
});

adminSellersRouter.patch("/:id/commission", requireAdmin, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const data = commissionSchema.parse(req.body);
    const sellerId = req.params.id as string;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, customCommissionRate: true },
    });
    if (!seller) { res.status(404).json({ error: "Vendeur introuvable" }); return; }

    await prisma.seller.update({
      where: { id: sellerId },
      data: { customCommissionRate: data.customCommissionRate },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: "COMMISSION_CHANGED",
        target: `seller:${sellerId}`,
        details: { from: seller.customCommissionRate, to: data.customCommissionRate },
        ip: getClientIp(req),
      },
    });

    res.json({ ok: true, customCommissionRate: data.customCommissionRate });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur admin commission", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
