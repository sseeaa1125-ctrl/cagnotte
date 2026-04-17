import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireRole } from "../../middleware/requireAdmin.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { logAdminAction } from "../../lib/adminLog.js";
import * as logger from "../../lib/logger.js";

export const cagnottesAdminRouter = Router();

// All routes require admin auth
cagnottesAdminRouter.use(requireAdmin);

// ── Types ──
interface FundraiserConfig {
  title?: string;
  description?: string;
  coverUrl?: string | null;
  subtype?: "festive" | "solidaire";
  visibility?: "public" | "private";
  status?: "active" | "closed";
  goalAmount?: number;
  endDate?: string | null;
}

// ── GET / — Paginated fundraiser blocks with search & filters ──
cagnottesAdminRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BlockWhereInput = { type: "FUNDRAISER" };

    // Search by title or slug
    const search = (req.query.search as string)?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    // Subtype filter (from config JSON)
    const subtype = req.query.subtype as string;
    if (subtype && ["festive", "solidaire"].includes(subtype)) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { config: { path: ["subtype"], equals: subtype } },
      ];
    }

    // Status filter (from config JSON)
    const status = req.query.status as string;
    if (status && ["active", "closed"].includes(status)) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { config: { path: ["status"], equals: status } },
      ];
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

    const [blocks, totalCount] = await Promise.all([
      prisma.block.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          config: true,
          isActive: true,
          createdAt: true,
          seller: {
            select: {
              id: true,
              slug: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.block.count({ where }),
    ]);

    // Single grouped aggregate — no N+1
    const blockIds = blocks.map((b) => b.id);
    const totals =
      blockIds.length === 0
        ? []
        : await prisma.order.groupBy({
            by: ["blockId"],
            where: { blockId: { in: blockIds }, paymentStatus: "PAID" },
            _sum: { amount: true },
            _count: { _all: true },
          });
    const totalsMap = new Map<string, { sum: number; count: number }>();
    for (const t of totals) {
      if (!t.blockId) continue;
      totalsMap.set(t.blockId, {
        sum: t._sum.amount || 0,
        count: t._count._all,
      });
    }

    const cagnottes = blocks.map((block) => {
      const cfg = (block.config as FundraiserConfig) || {};
      const stats = totalsMap.get(block.id) || { sum: 0, count: 0 };
      return {
        id: block.id,
        slug: block.slug,
        title: block.title,
        subtype: cfg.subtype ?? null,
        status: cfg.status ?? "active",
        visibility: cfg.visibility ?? "public",
        goalAmount: cfg.goalAmount ?? null,
        totalRaised: stats.sum,
        donorCount: stats.count,
        isActive: block.isActive,
        seller: block.seller,
        createdAt: block.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({ cagnottes, totalCount, totalPages, currentPage: page });
  } catch (err) {
    logger.error("admin:cagnottes:list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /:id — Block detail with seller + last 20 paid orders ──
cagnottesAdminRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const block = await prisma.block.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        config: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
    });

    if (!block || (block as { type?: string }).type !== undefined) {
      // Ensure it exists
    }
    if (!block) {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const cfg = (block.config as FundraiserConfig) || {};

    // Aggregate stats
    const agg = await prisma.order.aggregate({
      where: { blockId: id, paymentStatus: "PAID" },
      _sum: { amount: true, commissionAmount: true, sellerAmount: true },
      _count: { _all: true },
    });

    // Last 20 paid orders
    const recentOrders = await prisma.order.findMany({
      where: { blockId: id, paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        reference: true,
        amount: true,
        commissionAmount: true,
        sellerAmount: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        donorMessage: true,
        isAnonymous: true,
        paymentOperator: true,
        paidAt: true,
        createdAt: true,
      },
    });

    res.json({
      cagnotte: {
        id: block.id,
        slug: block.slug,
        title: block.title,
        subtype: cfg.subtype ?? null,
        status: cfg.status ?? "active",
        visibility: cfg.visibility ?? "public",
        goalAmount: cfg.goalAmount ?? null,
        endDate: cfg.endDate ?? null,
        description: cfg.description ?? null,
        coverUrl: cfg.coverUrl ?? null,
        isActive: block.isActive,
        createdAt: block.createdAt.toISOString(),
        updatedAt: block.updatedAt.toISOString(),
      },
      seller: block.seller,
      stats: {
        totalRaised: agg._sum.amount ?? 0,
        totalCommission: agg._sum.commissionAmount ?? 0,
        totalSellerAmount: agg._sum.sellerAmount ?? 0,
        donorCount: agg._count._all,
      },
      recentOrders,
    });
  } catch (err) {
    logger.error("admin:cagnottes:detail", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /:id/toggle-active — Toggle isActive ──
cagnottesAdminRouter.patch("/:id/toggle-active", requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    const block = await prisma.block.findUnique({
      where: { id },
      select: { id: true, isActive: true, type: true },
    });
    if (!block || block.type !== "FUNDRAISER") {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const newActive = !block.isActive;
    await prisma.block.update({
      where: { id },
      data: { isActive: newActive },
    });

    await logAdminAction(
      req.admin!.id,
      newActive ? "CAGNOTTE_ACTIVATED" : "CAGNOTTE_DEACTIVATED",
      `block:${id}`,
      {},
      req.ip,
    );

    res.json({ success: true, isActive: newActive });
  } catch (err) {
    logger.error("admin:cagnottes:toggle-active", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /:id/toggle-visibility — Toggle config.visibility (public ↔ private) ──
cagnottesAdminRouter.patch("/:id/toggle-visibility", requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    const block = await prisma.block.findUnique({
      where: { id },
      select: { id: true, config: true, type: true },
    });
    if (!block || block.type !== "FUNDRAISER") {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const cfg = (block.config as Record<string, unknown>) || {};
    const currentVisibility = (cfg.visibility as string) || "public";
    const newVisibility = currentVisibility === "public" ? "private" : "public";

    await prisma.block.update({
      where: { id },
      data: {
        config: { ...cfg, visibility: newVisibility },
      },
    });

    await logAdminAction(
      req.admin!.id,
      `CAGNOTTE_VISIBILITY_${newVisibility.toUpperCase()}`,
      `block:${id}`,
      { from: currentVisibility, to: newVisibility },
      req.ip,
    );

    res.json({ success: true, visibility: newVisibility });
  } catch (err) {
    logger.error("admin:cagnottes:toggle-visibility", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
