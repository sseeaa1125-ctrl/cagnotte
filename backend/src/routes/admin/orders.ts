import { Router } from "express";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma, OrderType, PaymentStatus } from "../../generated/prisma/client.js";
import * as logger from "../../lib/logger.js";

export const ordersAdminRouter = Router();

// All routes require admin auth
ordersAdminRouter.use(requireAdmin);

// ── GET / — Paginated orders with search, filters & aggregates ──
ordersAdminRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    // Search by reference, customerEmail, or customerName
    const search = (req.query.search as string)?.trim();
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
      ];
    }

    // Order type filter
    const orderType = req.query.orderType as string;
    if (orderType && ["SALE", "BOOKING", "PAYMENT", "DONATION"].includes(orderType)) {
      where.orderType = orderType as OrderType;
    }

    // Payment status filter
    const paymentStatus = req.query.paymentStatus as string;
    if (
      paymentStatus &&
      ["PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED"].includes(paymentStatus)
    ) {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }

    // Date range filter
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom + "T00:00:00Z");
      }
      if (dateTo) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo + "T23:59:59Z");
      }
    }

    // Run paginated query + aggregates in parallel
    const [orders, totalCount, aggregates] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          reference: true,
          orderType: true,
          amount: true,
          commissionAmount: true,
          sellerAmount: true,
          paymentStatus: true,
          paymentOperator: true,
          customerName: true,
          customerEmail: true,
          isAnonymous: true,
          paidAt: true,
          createdAt: true,
          seller: {
            select: {
              id: true,
              slug: true,
              displayName: true,
            },
          },
          block: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where,
        _sum: { amount: true, commissionAmount: true, sellerAmount: true },
        _count: { _all: true },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      orders,
      totalRevenue: aggregates._sum.amount ?? 0,
      totalCommission: aggregates._sum.commissionAmount ?? 0,
      totalSellerAmount: aggregates._sum.sellerAmount ?? 0,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (err) {
    logger.error("admin:orders:list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /:id — Full order detail ──
ordersAdminRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        orderType: true,
        amount: true,
        commissionRate: true,
        commissionAmount: true,
        sellerAmount: true,
        currency: true,
        paymentStatus: true,
        paymentProvider: true,
        paymentOperator: true,
        paymentExternalId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        donorMessage: true,
        isAnonymous: true,
        messageIsPrivate: true,
        source: true,
        country: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        block: {
          select: {
            id: true,
            slug: true,
            title: true,
            type: true,
            config: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }

    res.json({ order });
  } catch (err) {
    logger.error("admin:orders:detail", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
