import { Router } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as logger from "../../lib/logger.js";

export const adminDashboardRouter = Router();

// ── GET /api/admin/dashboard/kpis ──
// Tous les KPIs respectent le filtre dateFrom/dateTo quand fourni
adminDashboardRouter.get("/kpis", requireAdmin, async (req, res) => {
  try {
    const now = new Date();

    // Date filter — s'applique à TOUT (commandes, retraits, vendeurs, top sellers)
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const hasDateFilter = !!(dateFrom || dateTo);
    const dateRange: Record<string, Date> = {};
    if (dateFrom) dateRange.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setUTCHours(23, 59, 59, 999);
      dateRange.lte = end;
    }

    // Build filters
    const orderBase = { paymentStatus: "PAID" as const, deletedAt: null };
    const orderFilter = hasDateFilter ? { ...orderBase, paidAt: dateRange } : orderBase;
    const communityBase = { status: "COMPLETED" as const };
    const communityFilter = hasDateFilter ? { ...communityBase, createdAt: dateRange } : communityBase;
    const withdrawalBase = { status: "COMPLETED" as const };
    const withdrawalFilter = hasDateFilter ? { ...withdrawalBase, processedAt: dateRange } : withdrawalBase;
    const sellerDateFilter = hasDateFilter ? { deletedAt: null, createdAt: dateRange } : { deletedAt: null };

    // SQL date conditions for raw queries
    const sqlDateFrom = dateFrom ? new Date(dateFrom) : null;
    const sqlDateTo = dateTo ? (() => { const d = new Date(dateTo); d.setUTCHours(23, 59, 59, 999); return d; })() : null;

    // ── Batch 1: Core stats ──
    const [
      // Orders
      orderCount,
      orderAgg,
      ordersByType,
      // Community payments
      cpCount,
      cpAgg,
      cpCommAgg,
      // Withdrawals (period)
      withdrawalCount,
      withdrawalAgg,
      // Sellers
      totalSellers,
      activeSellers,
      newSellers,
      sellersWithSales,
      // Snapshot stats (not date-filtered)
      communityMrr,
      activeCommunities,
      activeSubscriptions,
      pendingWithdrawals,
      pendingWithdrawalAmt,
      pendingKyc,
      failedWebhooks24h,
      pendingReports,
    ] = await Promise.all([
      // Orders
      prisma.order.count({ where: orderFilter }),
      prisma.order.aggregate({ where: orderFilter, _sum: { amount: true, sellerAmount: true, commissionAmount: true } }),
      prisma.order.groupBy({ by: ["orderType"], where: orderFilter, _count: true, _sum: { amount: true, commissionAmount: true } }),
      // Community
      prisma.communityPayment.count({ where: communityFilter }),
      prisma.communityPayment.aggregate({ where: communityFilter, _sum: { amount: true, sellerAmount: true } }),
      prisma.communityPayment.aggregate({ where: communityFilter, _sum: { commissionAmount: true } }),
      // Withdrawals (period)
      prisma.withdrawal.count({ where: withdrawalFilter }),
      prisma.withdrawal.aggregate({ where: withdrawalFilter, _sum: { amount: true } }),
      // Sellers
      prisma.seller.count({ where: { deletedAt: null } }),
      prisma.seller.count({ where: { deletedAt: null, onboardingCompleted: true } }),
      prisma.seller.count({ where: sellerDateFilter }),
      prisma.order.groupBy({ by: ["sellerId"], where: orderFilter }).then((g) => g.length),
      // Snapshots (always current)
      prisma.communitySubscription.aggregate({ where: { status: "ACTIVE" }, _sum: { lockedPrice: true } }),
      prisma.community.count({ where: { isActive: true } }),
      prisma.communitySubscription.count({ where: { status: "ACTIVE" } }),
      prisma.withdrawal.count({ where: { status: "PENDING" } }),
      prisma.withdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
      prisma.seller.count({ where: { kycStatus: "PENDING", deletedAt: null } }),
      prisma.webhookLog.count({ where: { status: { not: "processed" }, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
      prisma.report.count({ where: { status: "PENDING" } }),
    ]);

    // ── Batch 2: Top sellers + recent withdrawals (date-filtered) ──
    const [topSellersRaw, recentWithdrawals] = await Promise.all([
      // Top 10 vendeurs — filtré par période si date fournie
      hasDateFilter
        ? prisma.$queryRaw<{ sellerId: string; displayName: string; slug: string; email: string; totalRevenue: bigint; orderCount: bigint }[]>`
            SELECT s."id" AS "sellerId", s."displayName", s."slug", s."email",
              COALESCE(SUM(o."sellerAmount"), 0)::bigint AS "totalRevenue",
              COUNT(o."id")::bigint AS "orderCount"
            FROM "Seller" s INNER JOIN "Order" o ON o."sellerId" = s."id"
            WHERE o."paymentStatus" = 'PAID' AND o."deletedAt" IS NULL AND s."deletedAt" IS NULL
              ${sqlDateFrom ? Prisma.sql`AND o."paidAt" >= ${sqlDateFrom}` : Prisma.empty}
              ${sqlDateTo ? Prisma.sql`AND o."paidAt" <= ${sqlDateTo}` : Prisma.empty}
            GROUP BY s."id", s."displayName", s."slug", s."email"
            ORDER BY "totalRevenue" DESC LIMIT 10
          `
        : prisma.$queryRaw<{ sellerId: string; displayName: string; slug: string; email: string; totalRevenue: bigint; orderCount: bigint }[]>`
            SELECT s."id" AS "sellerId", s."displayName", s."slug", s."email",
              COALESCE(SUM(o."sellerAmount"), 0)::bigint AS "totalRevenue",
              COUNT(o."id")::bigint AS "orderCount"
            FROM "Seller" s INNER JOIN "Order" o ON o."sellerId" = s."id"
            WHERE o."paymentStatus" = 'PAID' AND o."deletedAt" IS NULL AND s."deletedAt" IS NULL
            GROUP BY s."id", s."displayName", s."slug", s."email"
            ORDER BY "totalRevenue" DESC LIMIT 10
          `,
      // Derniers retraits (filtré par période)
      prisma.withdrawal.findMany({
        where: withdrawalFilter,
        orderBy: { processedAt: "desc" },
        take: 10,
        select: {
          id: true, amount: true, provider: true, phone: true,
          recipientName: true, processedAt: true,
          seller: { select: { displayName: true, slug: true } },
        },
      }),
    ]);

    // ── Build response ──
    const orderVolume = orderAgg._sum.amount || 0;
    const orderCommission = orderAgg._sum.commissionAmount || 0;
    const orderSellerAmount = orderAgg._sum.sellerAmount || 0;
    const cpVolume = cpAgg._sum.amount || 0;
    const cpSellerAmount = cpAgg._sum.sellerAmount || 0;
    const cpCommission = cpCommAgg._sum.commissionAmount || 0;

    const totalVolume = orderVolume + cpVolume;
    const totalCommission = orderCommission + cpCommission;
    const totalSellerAmount = orderSellerAmount + cpSellerAmount;
    const totalWithdrawn = withdrawalAgg._sum.amount || 0;

    // Répartition par type
    const byType: Record<string, { count: number; volume: number; commission: number }> = {};
    for (const row of ordersByType) {
      byType[row.orderType] = { count: row._count, volume: row._sum.amount || 0, commission: row._sum.commissionAmount || 0 };
    }
    if (cpCount > 0) {
      byType["COMMUNITY"] = { count: cpCount, volume: cpVolume, commission: cpCommission };
    }

    const topSellers = topSellersRaw.map((s) => ({
      sellerId: s.sellerId, displayName: s.displayName, slug: s.slug, email: s.email,
      totalRevenue: Number(s.totalRevenue), orderCount: Number(s.orderCount),
    }));

    const recentWithdrawalsMasked = recentWithdrawals.map((w) => ({
      ...w, phone: w.phone.replace(/(.{4})(.*)(.{2})/, "$1****$3"),
    }));

    res.json({
      // Résumé de la période sélectionnée (ou all-time)
      periodSummary: {
        totalVolume,
        totalCommission,
        totalSellerAmount,
        totalWithdrawn,
        netSeller: totalSellerAmount - totalWithdrawn,
        avgOrderValue: orderCount > 0 ? Math.round(orderVolume / orderCount) : 0,
        orderCount: orderCount + cpCount,
        withdrawalCount,
      },
      orders: {
        total: orderCount,
        communityPayments: cpCount,
        byType,
      },
      sellers: {
        total: totalSellers,
        active: activeSellers,
        withSales: sellersWithSales,
        newInPeriod: hasDateFilter ? newSellers : undefined,
      },
      communities: {
        totalActive: activeCommunities,
        activeSubscriptions,
        mrr: communityMrr._sum.lockedPrice || 0,
      },
      operations: {
        pendingWithdrawals,
        pendingWithdrawalAmount: pendingWithdrawalAmt._sum.amount || 0,
        pendingKyc,
        pendingReports,
        failedWebhooks24h,
      },
      topSellers,
      recentWithdrawals: recentWithdrawalsMasked,
    });
  } catch (err) {
    logger.error("Erreur admin KPIs", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/admin/dashboard/badges ── (lightweight endpoint for sidebar badges)
adminDashboardRouter.get("/badges", requireAdmin, async (req, res) => {
  try {
    const [pendingKyc, pendingWithdrawals, pendingReports, newOrdersToday] = await Promise.all([
      prisma.seller.count({ where: { kycStatus: "PENDING", deletedAt: null } }),
      prisma.withdrawal.count({ where: { status: "PENDING" } }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.order.count({
        where: {
          paymentStatus: "PAID",
          paidAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    res.json({
      kyc: pendingKyc,
      withdrawals: pendingWithdrawals,
      reports: pendingReports,
      orders: newOrdersToday,
    });
  } catch (err) {
    logger.error("Erreur admin badges", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/admin/dashboard/revenue-chart ──
adminDashboardRouter.get("/revenue-chart", requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 90);
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    // Revenus quotidiens (commissions plateforme)
    const dailyRevenue = await prisma.$queryRaw<
      { date: Date; orders_commission: bigint; community_commission: bigint; order_count: bigint }[]
    >`
      SELECT
        DATE_TRUNC('day', o."paidAt") AS date,
        COALESCE(SUM(o."commissionAmount"), 0) AS orders_commission,
        0::bigint AS community_commission,
        COUNT(*)::bigint AS order_count
      FROM "Order" o
      WHERE o."paymentStatus" = 'PAID'
        AND o."paidAt" >= ${startDate}
      GROUP BY DATE_TRUNC('day', o."paidAt")
      ORDER BY date
    `;

    const communityRevenue = await prisma.$queryRaw<
      { date: Date; commission: bigint }[]
    >`
      SELECT
        DATE_TRUNC('day', cp."createdAt") AS date,
        COALESCE(SUM(cp."commissionAmount"), 0) AS commission
      FROM "CommunityPayment" cp
      WHERE cp."status" = 'COMPLETED'
        AND cp."createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('day', cp."createdAt")
      ORDER BY date
    `;

    // Merge into daily buckets — include days with only community revenue
    const orderMap = new Map(
      dailyRevenue.map((r) => [
        r.date.toISOString().split("T")[0],
        { commission: Number(r.orders_commission), count: Number(r.order_count) },
      ])
    );
    const communityMap = new Map(
      communityRevenue.map((r) => [r.date.toISOString().split("T")[0], Number(r.commission)])
    );

    // Union of all dates
    const allDates = new Set([...orderMap.keys(), ...communityMap.keys()]);
    const chart = Array.from(allDates)
      .sort()
      .map((dateStr) => ({
        date: dateStr,
        ordersCommission: orderMap.get(dateStr)?.commission || 0,
        communityCommission: communityMap.get(dateStr) || 0,
        orderCount: orderMap.get(dateStr)?.count || 0,
      }));

    res.json({ chart, days });
  } catch (err) {
    logger.error("Erreur admin revenue chart", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
