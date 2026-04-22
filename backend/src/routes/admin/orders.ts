import { Router } from "express";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma, OrderType, PaymentStatus } from "../../generated/prisma/client.js";
import { toCsv, sendCsv } from "../../lib/csv.js";
import { logAdminAction } from "../../lib/adminLog.js";
import * as logger from "../../lib/logger.js";

// Helper partagé — extrait les filtres de la requête en objet Prisma where.
// Utilisé par GET / (paginated) et GET /export.csv (full dump).
function buildOrdersWhere(req: {
  query: Record<string, unknown>;
}): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const search = (req.query.search as string)?.trim();
  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
    ];
  }
  const orderType = req.query.orderType as string;
  if (orderType && ["SALE", "BOOKING", "PAYMENT", "DONATION"].includes(orderType)) {
    where.orderType = orderType as OrderType;
  }
  const paymentStatus = req.query.paymentStatus as string;
  if (
    paymentStatus &&
    ["PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED"].includes(paymentStatus)
  ) {
    where.paymentStatus = paymentStatus as PaymentStatus;
  }
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
  return where;
}

export const ordersAdminRouter = Router();

// All routes require admin auth
ordersAdminRouter.use(requireAdmin);

// ── GET / — Paginated orders with search, filters & aggregates ──
ordersAdminRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where = buildOrdersWhere(req);

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

// ── GET /export.csv — Full CSV dump matching current filters ──
// IMPORTANT : déclaré AVANT `/:id` pour que "export.csv" ne soit pas matché
// comme param. Cap 50k pour éviter un load mémoire catastrophique sur Neon.
ordersAdminRouter.get("/export.csv", async (req, res) => {
  try {
    const where = buildOrdersWhere(req);

    const orders = await prisma.order.findMany({
      where,
      select: {
        reference: true,
        orderType: true,
        amount: true,
        voluntaryContribution: true,
        commissionAmount: true,
        sellerAmount: true,
        currency: true,
        paymentStatus: true,
        paymentOperator: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        isAnonymous: true,
        paidAt: true,
        createdAt: true,
        seller: { select: { slug: true, displayName: true, email: true } },
        block: { select: { slug: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50_000,
    });

    const headers = [
      "reference",
      "orderType",
      "paymentStatus",
      "amount",
      "voluntaryContribution",
      "commissionAmount",
      "sellerAmount",
      "currency",
      "paymentOperator",
      "customerName",
      "customerEmail",
      "customerPhone",
      "isAnonymous",
      "sellerSlug",
      "sellerName",
      "sellerEmail",
      "blockSlug",
      "blockTitle",
      "paidAt",
      "createdAt",
    ];

    const rows = orders.map((o) => [
      o.reference,
      o.orderType,
      o.paymentStatus,
      o.amount,
      o.voluntaryContribution ?? 0,
      o.commissionAmount,
      o.sellerAmount,
      o.currency,
      o.paymentOperator ?? "",
      o.isAnonymous ? "Anonyme" : (o.customerName ?? ""),
      o.customerEmail,
      o.customerPhone,
      o.isAnonymous,
      o.seller?.slug ?? "",
      o.seller?.displayName ?? "",
      o.seller?.email ?? "",
      o.block?.slug ?? "",
      o.block?.title ?? "",
      o.paidAt,
      o.createdAt,
    ]);

    // Audit trail — tracer quel admin a dumpé quelle tranche de données, avec
    // les filtres actifs. Volume de lignes inclus pour repérer les dumps
    // anormalement larges. N'attend pas la promesse pour ne pas bloquer le CSV.
    logAdminAction(
      req.admin!.id,
      "CSV_EXPORTED",
      "orders",
      {
        rowCount: orders.length,
        truncated: orders.length >= 50_000,
        filters: {
          search: (req.query.search as string) || null,
          orderType: (req.query.orderType as string) || null,
          paymentStatus: (req.query.paymentStatus as string) || null,
          dateFrom: (req.query.dateFrom as string) || null,
          dateTo: (req.query.dateTo as string) || null,
        },
      },
      req.ip,
    ).catch((err) => logger.error("admin:orders:export audit", err));

    const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    sendCsv(res, filename, toCsv(headers, rows));
  } catch (err) {
    logger.error("admin:orders:export", err);
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
