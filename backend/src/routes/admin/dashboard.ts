import { Router } from "express";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import * as logger from "../../lib/logger.js";

export const adminDashboardRouter = Router();

adminDashboardRouter.use(requireAdmin);

// ── Helper: parse optional date range from query ──
function parseDateRange(query: Record<string, unknown>): { gte?: Date; lte?: Date } | null {
  const range: { gte?: Date; lte?: Date } = {};
  if (typeof query.dateFrom === "string" && query.dateFrom) {
    range.gte = new Date(query.dateFrom + "T00:00:00Z");
  }
  if (typeof query.dateTo === "string" && query.dateTo) {
    range.lte = new Date(query.dateTo + "T23:59:59Z");
  }
  return range.gte || range.lte ? range : null;
}

// ── GET /kpis — aggregate queries with optional date range ──
adminDashboardRouter.get("/kpis", async (req, res) => {
  try {
    const dateRange = parseDateRange(req.query as Record<string, unknown>);

    const orderDateFilter = dateRange ? { paidAt: dateRange } : {};
    const sellerDateFilter = dateRange ? { createdAt: dateRange } : {};
    const blockDateFilter = dateRange ? { createdAt: dateRange } : {};

    const [
      sellerCount,
      cagnotteCount,
      orderStats,
      pendingKyc,
      pendingWithdrawals,
    ] = await Promise.all([
      prisma.seller.count({ where: { deletedAt: null, ...sellerDateFilter } }),
      prisma.block.count({ where: { type: "FUNDRAISER", isActive: true, ...blockDateFilter } }),
      prisma.order.aggregate({
        where: { paymentStatus: "PAID", ...orderDateFilter },
        _sum: { amount: true, sellerAmount: true, commissionAmount: true, voluntaryContribution: true },
        _count: true,
      }),
      prisma.seller.count({ where: { kycStatus: "PENDING" } }),
      prisma.withdrawal.count({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
      }),
    ]);

    const totalRevenue = orderStats._sum.amount ?? 0;
    const totalSellerAmount = orderStats._sum.sellerAmount ?? 0;
    // Revenu plateforme = tout ce qui n'est PAS reversé aux vendeurs
    const totalCommission = totalRevenue - totalSellerAmount;
    const totalVoluntary = orderStats._sum.voluntaryContribution ?? 0;

    res.json({
      totalRevenue,
      totalCommission,
      totalVoluntary,
      totalSellerAmount,
      sellerCount,
      cagnotteCount,
      pendingKyc,
      pendingWithdrawals,
      orderCount: orderStats._count,
    });
  } catch (err) {
    logger.error("Erreur admin /dashboard/kpis", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /revenue-chart?days=30 — daily revenue for last N days ──
adminDashboardRouter.get("/revenue-chart", async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days)) || 30, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.$queryRaw<
      { date: Date; revenue: bigint; commission: bigint; count: bigint }[]
    >(
      Prisma.sql`
        SELECT
          DATE("paidAt") as date,
          SUM(amount) as revenue,
          SUM(amount - "sellerAmount") as commission,
          COUNT(*)::int as count
        FROM "Order"
        WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${since}
        GROUP BY DATE("paidAt")
        ORDER BY date ASC
      `,
    );

    const lookup = new Map<string, { revenue: number; commission: number; count: number }>();
    for (const row of rows) {
      const key =
        row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date);
      lookup.set(key, {
        revenue: Number(row.revenue),
        commission: Number(row.commission),
        count: Number(row.count),
      });
    }

    const chart: { date: string; revenue: number; commission: number; count: number }[] = [];
    const cursor = new Date(since);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      const entry = lookup.get(key);
      chart.push({
        date: key,
        revenue: entry?.revenue ?? 0,
        commission: entry?.commission ?? 0,
        count: entry?.count ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({ chart });
  } catch (err) {
    logger.error("Erreur admin /dashboard/revenue-chart", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /badges — sidebar notification counts (polled every 60s) ──
adminDashboardRouter.get("/badges", async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [pendingKyc, pendingWithdrawals, pendingReports, todayOrders, newSellersWeek] =
      await Promise.all([
        prisma.seller.count({ where: { kycStatus: "PENDING" } }),
        prisma.withdrawal.count({
          where: { status: { in: ["PENDING", "PROCESSING"] } },
        }),
        prisma.report.count({ where: { status: "PENDING" } }),
        prisma.order.count({
          where: { paymentStatus: "PAID", paidAt: { gte: todayStart } },
        }),
        prisma.seller.count({
          where: { createdAt: { gte: weekAgo }, deletedAt: null },
        }),
      ]);

    res.json({ pendingKyc, pendingWithdrawals, pendingReports, todayOrders, newSellersWeek });
  } catch (err) {
    logger.error("Erreur admin /dashboard/badges", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /activity — recent admin logs + recent paid orders merged ──
adminDashboardRouter.get("/activity", async (_req, res) => {
  try {
    const [adminLogs, recentOrders] = await Promise.all([
      prisma.adminLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          target: true,
          details: true,
          createdAt: true,
          admin: { select: { name: true } },
        },
      }),
      prisma.order.findMany({
        where: { paymentStatus: "PAID" },
        orderBy: { paidAt: "desc" },
        take: 10,
        select: {
          id: true,
          reference: true,
          amount: true,
          customerName: true,
          paidAt: true,
          block: { select: { title: true } },
        },
      }),
    ]);

    const logItems = adminLogs.map((l) => ({
      type: "admin_log" as const,
      id: l.id,
      date: l.createdAt.toISOString(),
      description: `${l.admin.name}: ${l.action} — ${l.target}`,
      details: l.details,
    }));

    const orderItems = recentOrders.map((o) => ({
      type: "order" as const,
      id: o.id,
      date: (o.paidAt ?? new Date()).toISOString(),
      description: `Don de ${o.customerName ?? "Anonyme"} — ${o.amount} FCFA${o.block?.title ? ` pour "${o.block.title}"` : ""}`,
      details: { reference: o.reference },
    }));

    const merged = [...logItems, ...orderItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    res.json({ activity: merged });
  } catch (err) {
    logger.error("Erreur admin /dashboard/activity", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /wallet — Platform wallet overview with optional date range ──
//
// Money flow: Donor → Bictorys → Platform account
//   - amount = baseAmount + voluntaryContribution (total charged)
//   - sellerAmount = what the seller earns (amount - commissionAmount)
//   - commissionAmount = platform commission (includes portion of voluntary)
//   - Platform revenue = amount - sellerAmount (= commissionAmount, everything not given to sellers)
//   - Platform out = payouts to sellers + Bictorys fees
//
// NB: voluntaryContribution is already baked into the commission calculation
// (computeCommission runs on the full amount including voluntary). So:
//   platformRevenue = totalCollected - totalSellerAmount
// NOT: commissionAmount + voluntaryContribution (that would double-count).
//
// Balances (sellerRetained, platformBalance) are ALWAYS computed on all-time
// data, even when a date filter is active — period-filtered balances are
// meaningless since a seller can earn in January and withdraw in March.
adminDashboardRouter.get("/wallet", async (req, res) => {
  try {
    const dateRange = parseDateRange(req.query as Record<string, unknown>);

    const orderDateFilter = dateRange ? { paidAt: dateRange } : {};
    const withdrawalDateFilter = dateRange ? { processedAt: dateRange } : {};

    const [orderStats, withdrawalStats, allTimeOrders, allTimePayouts, pendingPayouts] =
      await Promise.all([
        // Period-filtered: revenue breakdown
        prisma.order.aggregate({
          where: { paymentStatus: "PAID", ...orderDateFilter },
          _sum: { amount: true, commissionAmount: true, sellerAmount: true, voluntaryContribution: true },
          _count: true,
        }),
        // Period-filtered: payouts
        prisma.withdrawal.aggregate({
          where: { status: "COMPLETED", ...withdrawalDateFilter },
          _sum: { amount: true, merchantFee: true },
          _count: true,
        }),
        // All-time: for balance calculations
        dateRange
          ? prisma.order.aggregate({
              where: { paymentStatus: "PAID" },
              _sum: { amount: true, sellerAmount: true },
            })
          : null,
        dateRange
          ? prisma.withdrawal.aggregate({
              where: { status: "COMPLETED" },
              _sum: { amount: true, merchantFee: true },
            })
          : null,
        // Pending payouts (always all-time)
        prisma.withdrawal.aggregate({
          where: { status: { in: ["PENDING", "PROCESSING"] } },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    // Period revenue
    const totalCollected = orderStats._sum.amount ?? 0;
    const totalSellerAmount = orderStats._sum.sellerAmount ?? 0;
    const totalVoluntary = orderStats._sum.voluntaryContribution ?? 0;
    // Platform revenue = everything not given to sellers
    const platformRevenue = totalCollected - totalSellerAmount;

    // Period payouts
    const totalPayouts = withdrawalStats._sum.amount ?? 0;
    const totalFees = withdrawalStats._sum.merchantFee ?? 0;

    // All-time balances (use all-time data when filtered, period data otherwise)
    const atCollected = dateRange
      ? (allTimeOrders?._sum.amount ?? 0)
      : totalCollected;
    const atSellerAmount = dateRange
      ? (allTimeOrders?._sum.sellerAmount ?? 0)
      : totalSellerAmount;
    const atPayouts = dateRange
      ? (allTimePayouts?._sum.amount ?? 0)
      : totalPayouts;
    const atFees = dateRange
      ? (allTimePayouts?._sum.merchantFee ?? 0)
      : totalFees;
    const atPending = pendingPayouts._sum.amount ?? 0;

    // Seller retained = what sellers earned but haven't withdrawn yet
    const sellerRetained = Math.max(atSellerAmount - atPayouts - atPending, 0);
    // Platform balance = platform revenue all-time minus Bictorys fees
    const atPlatformRevenue = atCollected - atSellerAmount;
    const platformBalance = atPlatformRevenue - atFees;

    res.json({
      // Period: revenue breakdown
      totalCollected,
      orderCount: orderStats._count,
      platformRevenue,
      totalVoluntary,
      totalSellerAmount,

      // Period: payouts
      totalPayouts,
      payoutCount: withdrawalStats._count,
      totalFees,

      // All-time balances
      sellerRetained,
      pendingPayouts: atPending,
      pendingPayoutCount: pendingPayouts._count,
      platformBalance,
    });
  } catch (err) {
    logger.error("Erreur admin /dashboard/wallet", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
