import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as logger from "../../lib/logger.js";

export const adminAnalyticsRouter = Router();

// ── GET /api/admin/analytics — Analytiques plateforme avec filtres dates ──
adminAnalyticsRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    const endDate = dateTo ? new Date(dateTo) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = { gte: startDate, lte: endDate };

    const [
      newSellers,
      paidOrders,
      totalRevenue,
      platformCommission,
      newCommunityPayments,
      communityCommission,
      completedWithdrawals,
      pageViews,
      topSellers,
      ordersByType,
      dailyOrders,
      dailyRevenue,
    ] = await Promise.all([
      // Nouveaux vendeurs dans la période
      prisma.seller.count({ where: { createdAt: dateFilter, deletedAt: null } }),

      // Commandes payées
      prisma.order.count({ where: { paymentStatus: "PAID", paidAt: dateFilter } }),

      // Revenue total
      prisma.order.aggregate({
        where: { paymentStatus: "PAID", paidAt: dateFilter },
        _sum: { amount: true },
      }),

      // Commission plateforme orders
      prisma.order.aggregate({
        where: { paymentStatus: "PAID", paidAt: dateFilter },
        _sum: { commissionAmount: true },
      }),

      // Paiements communauté
      prisma.communityPayment.count({
        where: { status: "COMPLETED", createdAt: dateFilter },
      }),

      // Commission communauté
      prisma.communityPayment.aggregate({
        where: { status: "COMPLETED", createdAt: dateFilter },
        _sum: { commissionAmount: true, amount: true },
      }),

      // Retraits complétés
      prisma.withdrawal.aggregate({
        where: { status: "COMPLETED", processedAt: dateFilter },
        _sum: { amount: true },
        _count: true,
      }),

      // Pages vues
      prisma.pageView.count({ where: { createdAt: dateFilter } }),

      // Top 10 vendeurs par revenu dans la période
      prisma.order.groupBy({
        by: ["sellerId"],
        where: { paymentStatus: "PAID", paidAt: dateFilter },
        _sum: { amount: true, commissionAmount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
        take: 10,
      }),

      // Commandes par type
      prisma.order.groupBy({
        by: ["orderType"],
        where: { paymentStatus: "PAID", paidAt: dateFilter },
        _sum: { amount: true },
        _count: true,
      }),

      // Commandes quotidiennes (chart)
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE_TRUNC('day', "paidAt") AS date, COUNT(*)::bigint AS count
        FROM "Order"
        WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${startDate} AND "paidAt" <= ${endDate}
        GROUP BY DATE_TRUNC('day', "paidAt")
        ORDER BY date
      `,

      // Revenue quotidien (chart)
      prisma.$queryRaw<{ date: Date; revenue: bigint; commission: bigint }[]>`
        SELECT DATE_TRUNC('day', "paidAt") AS date,
               COALESCE(SUM("amount"), 0)::bigint AS revenue,
               COALESCE(SUM("commissionAmount"), 0)::bigint AS commission
        FROM "Order"
        WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${startDate} AND "paidAt" <= ${endDate}
        GROUP BY DATE_TRUNC('day', "paidAt")
        ORDER BY date
      `,
    ]);

    // Enrichir top sellers avec les noms
    const sellerIds = topSellers.map((s) => s.sellerId);
    const sellerNames = sellerIds.length > 0
      ? await prisma.seller.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, displayName: true, slug: true, email: true },
        })
      : [];
    const nameMap = new Map(sellerNames.map((s) => [s.id, s]));

    // Merge community data into daily charts
    const dailyCommunity = await prisma.$queryRaw<{ date: Date; count: bigint; revenue: bigint; commission: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS date,
             COUNT(*)::bigint AS count,
             COALESCE(SUM("amount"), 0)::bigint AS revenue,
             COALESCE(SUM("commissionAmount"), 0)::bigint AS commission
      FROM "CommunityPayment"
      WHERE "status" = 'COMPLETED' AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date
    `;
    const communityDailyMap = new Map(dailyCommunity.map((d) => [
      d.date.toISOString().split("T")[0],
      { count: Number(d.count), revenue: Number(d.revenue), commission: Number(d.commission) },
    ]));

    // Merge daily orders chart (Order + Community)
    const orderDailyMap = new Map(dailyOrders.map((d) => [d.date.toISOString().split("T")[0], Number(d.count)]));
    const revenueDailyMap = new Map(dailyRevenue.map((d) => [
      d.date.toISOString().split("T")[0],
      { revenue: Number(d.revenue), commission: Number(d.commission) },
    ]));
    const allDates = new Set([...orderDailyMap.keys(), ...revenueDailyMap.keys(), ...communityDailyMap.keys()]);
    const mergedDailyOrders = Array.from(allDates).sort().map((date) => ({
      date,
      count: (orderDailyMap.get(date) || 0) + (communityDailyMap.get(date)?.count || 0),
    }));
    const mergedDailyRevenue = Array.from(allDates).sort().map((date) => ({
      date,
      revenue: (revenueDailyMap.get(date)?.revenue || 0) + (communityDailyMap.get(date)?.revenue || 0),
      commission: (revenueDailyMap.get(date)?.commission || 0) + (communityDailyMap.get(date)?.commission || 0),
    }));

    // Add COMMUNITY to ordersByType
    const typesWithCommunity = [
      ...ordersByType.map((t) => ({
        type: t.orderType,
        count: t._count,
        amount: t._sum.amount || 0,
      })),
      ...(newCommunityPayments > 0
        ? [{ type: "COMMUNITY", count: newCommunityPayments, amount: communityCommission._sum.amount || 0 }]
        : []),
    ];

    res.json({
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      overview: {
        newSellers,
        paidOrders: paidOrders + newCommunityPayments,
        totalRevenue: (totalRevenue._sum.amount || 0) + (communityCommission._sum.amount || 0),
        platformCommission: (platformCommission._sum.commissionAmount || 0) + (communityCommission._sum.commissionAmount || 0),
        ordersCommission: platformCommission._sum.commissionAmount || 0,
        communityRevenue: communityCommission._sum.amount || 0,
        communityCommission: communityCommission._sum.commissionAmount || 0,
        communityPayments: newCommunityPayments,
        withdrawalsCompleted: completedWithdrawals._count,
        withdrawalsAmount: completedWithdrawals._sum.amount || 0,
        pageViews,
      },
      topSellers: topSellers.map((s) => ({
        seller: nameMap.get(s.sellerId) || { id: s.sellerId, displayName: "Inconnu", slug: "", email: "" },
        totalRevenue: s._sum.amount || 0,
        commission: s._sum.commissionAmount || 0,
        orderCount: s._count,
      })),
      ordersByType: typesWithCommunity,
      charts: {
        dailyOrders: mergedDailyOrders,
        dailyRevenue: mergedDailyRevenue,
      },
    });
  } catch (err) {
    logger.error("Erreur admin analytics", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
