import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as logger from "../../lib/logger.js";

export const adminOrdersRouter = Router();

// ── GET /api/admin/orders — Liste paginée unifiée : orders + community payments ──
adminOrdersRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = (req.query.search as string || "").trim();
    const status = req.query.status as string | undefined;
    const orderType = req.query.orderType as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const wantCommunity = !orderType || orderType === "COMMUNITY";
    const wantOrders = !orderType || ["SALE", "BOOKING", "PAYMENT", "DONATION"].includes(orderType);

    // Date range commune
    let dateRange: { gte?: Date; lte?: Date } | undefined;
    if (dateFrom || dateTo) {
      dateRange = {};
      if (dateFrom) dateRange.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateRange.lte = end;
      }
    }

    // ── 1. Fetch orders ──
    let orderResults: Record<string, unknown>[] = [];
    let orderTotal = 0;
    let orderAgg = { amount: 0, commission: 0, sellerAmount: 0, count: 0 };

    if (wantOrders && orderType !== "COMMUNITY") {
      const where: Record<string, unknown> = {};
      if (search) {
        where.OR = [
          { reference: { contains: search, mode: "insensitive" } },
          { customerEmail: { contains: search, mode: "insensitive" } },
          { seller: { displayName: { contains: search, mode: "insensitive" } } },
          { seller: { email: { contains: search, mode: "insensitive" } } },
        ];
      }
      if (status && ["PAID", "PENDING", "FAILED", "REFUNDED", "EXPIRED"].includes(status)) {
        where.paymentStatus = status;
      }
      if (orderType && ["SALE", "BOOKING", "PAYMENT", "DONATION"].includes(orderType)) {
        where.orderType = orderType;
      }
      if (dateRange) where.createdAt = dateRange;
      // Exclure les commandes de test
      where.paymentProvider = { notIn: ["dev_simulation", "dev_credit"] };

      // En mode mixte (tous les types), on fetch skip+limit pour bien paginer le merge
      const isMixed = !orderType;
      const [raw, count] = await Promise.all([
        prisma.order.findMany({
          where: where as never,
          select: {
            id: true,
            reference: true,
            orderType: true,
            amount: true,
            commissionAmount: true,
            sellerAmount: true,
            paymentStatus: true,
            paymentProvider: true,
            paymentOperator: true,
            customerEmail: true,
            customerName: true,
            paidAt: true,
            createdAt: true,
            seller: { select: { id: true, displayName: true, slug: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: isMixed ? 0 : skip,
          take: isMixed ? skip + limit : limit,
        }),
        prisma.order.count({ where: where as never }),
      ]);
      orderResults = raw;
      orderTotal = count;

      const TEST_PROVIDERS = ["dev_simulation", "dev_credit"];
      const paidWhere = { ...where, paymentStatus: "PAID", paymentProvider: { notIn: TEST_PROVIDERS } } as Record<string, unknown>;
      const agg = await prisma.order.aggregate({
        where: paidWhere as never,
        _sum: { amount: true, commissionAmount: true, sellerAmount: true },
        _count: true,
      });
      // Also exclude test transactions from the displayed total count
      const realCountWhere = { ...where, paymentProvider: { notIn: TEST_PROVIDERS } };
      const realCount = await prisma.order.count({
        where: realCountWhere as never,
      });
      orderTotal = realCount;
      orderAgg = {
        amount: agg._sum.amount || 0,
        commission: agg._sum.commissionAmount || 0,
        sellerAmount: agg._sum.sellerAmount || 0,
        count: agg._count,
      };
    }

    // ── 2. Fetch community payments ──
    let communityResults: Record<string, unknown>[] = [];
    let communityTotal = 0;
    let communityAgg = { amount: 0, commission: 0, sellerAmount: 0, count: 0 };

    if (wantCommunity) {
      const cpWhere: Record<string, unknown> = {};
      if (status === "PAID") cpWhere.status = "COMPLETED";
      else if (status === "PENDING") cpWhere.status = "PENDING";
      else if (status === "FAILED") cpWhere.status = "FAILED";
      if (dateRange) cpWhere.createdAt = dateRange;
      if (search) {
        cpWhere.OR = [
          { reference: { contains: search, mode: "insensitive" } },
          { subscription: { memberEmail: { contains: search, mode: "insensitive" } } },
          { community: { seller: { displayName: { contains: search, mode: "insensitive" } } } },
        ];
      }

      const isMixed = !orderType;
      const [cpRaw, cpCount] = await Promise.all([
        prisma.communityPayment.findMany({
          where: cpWhere as never,
          select: {
            id: true,
            reference: true,
            amount: true,
            commissionAmount: true,
            sellerAmount: true,
            status: true,
            createdAt: true,
            subscription: { select: { memberName: true, memberEmail: true } },
            community: {
              select: {
                title: true,
                seller: { select: { id: true, displayName: true, slug: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: isMixed ? 0 : skip,
          take: isMixed ? skip + limit : limit,
        }),
        prisma.communityPayment.count({ where: cpWhere as never }),
      ]);

      communityTotal = cpCount;
      communityResults = cpRaw.map((cp) => ({
        id: cp.id,
        reference: cp.reference,
        orderType: "COMMUNITY",
        amount: cp.amount,
        commissionAmount: cp.commissionAmount,
        sellerAmount: cp.sellerAmount,
        paymentStatus: cp.status === "COMPLETED" ? "PAID" : cp.status,
        paymentProvider: "bictorys",
        paymentOperator: null,
        customerEmail: cp.subscription?.memberEmail || "",
        customerName: cp.subscription?.memberName || null,
        paidAt: cp.status === "COMPLETED" ? cp.createdAt : null,
        createdAt: cp.createdAt,
        seller: cp.community?.seller || null,
      }));

      // Community aggregates (COMPLETED only)
      const cpPaidWhere = { ...cpWhere, status: "COMPLETED" } as Record<string, unknown>;
      const cpAgg = await prisma.communityPayment.aggregate({
        where: cpPaidWhere as never,
        _sum: { amount: true, commissionAmount: true, sellerAmount: true },
        _count: true,
      });
      communityAgg = {
        amount: cpAgg._sum.amount || 0,
        commission: cpAgg._sum.commissionAmount || 0,
        sellerAmount: cpAgg._sum.sellerAmount || 0,
        count: cpAgg._count,
      };
    }

    // ── 3. Merge + sort + paginate ──
    const merged = [...orderResults, ...communityResults]
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

    const total = orderType === "COMMUNITY" ? communityTotal
      : orderType ? orderTotal
      : orderTotal + communityTotal;

    // En mode mixte, on a fetché skip+limit de chaque table → on slice [skip, skip+limit] du merge
    // En mode filtré, la pagination est déjà gérée par Prisma
    const paginated = (!orderType) ? merged.slice(skip, skip + limit) : merged;

    res.json({
      orders: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        totalAmount: orderAgg.amount + communityAgg.amount,
        totalCommission: orderAgg.commission + communityAgg.commission,
        totalSellerAmount: orderAgg.sellerAmount + communityAgg.sellerAmount,
        paidCount: orderAgg.count + communityAgg.count,
      },
    });
  } catch (err) {
    logger.error("Erreur admin orders list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
