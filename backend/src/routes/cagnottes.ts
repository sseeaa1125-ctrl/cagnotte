/**
 * Public cagnottes routes — Phase 2 plan 02-01.
 *
 * Three GET-only handlers consumed by Banani screens 1, 2, 21, 22:
 *
 *   GET /api/cagnottes                    — paginated public list (P05 mitigation)
 *   GET /api/cagnottes/:slug              — single cagnotte detail
 *   GET /api/cagnottes/:slug/participants — paginated wall of paid donors
 *
 * Pitfalls guarded:
 *   P05 — private cagnotte SEO leak. The list endpoint applies a SQL-level
 *         visibility filter via Prisma's JSON path operator. Private cagnottes
 *         are NEVER post-filtered in JS — the full smoke-test in plan 02-03
 *         asserts absence of a known private slug from the list response.
 *
 * Trust boundary: every request is anonymous and untrusted. No CSRF check
 * (GET-only) and the global 300/15min limiter from index.ts applies.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import * as logger from "../lib/logger.js";

export const cagnottesRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface FundraiserConfig {
  title?: string;
  description?: string;
  coverUrl?: string | null;
  subtype?: "festive" | "solidaire";
  visibility?: "public" | "private";
  hideAmount?: boolean;
  hideDonors?: boolean;
  goalAmount?: number;
  endDate?: string | null;
}

interface PublicSeller {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Build the public-facing seller object from a Prisma seller row. */
function shapeSeller(seller: {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
}): PublicSeller {
  return {
    id: seller.id,
    slug: seller.slug,
    displayName: seller.displayName,
    avatarUrl: seller.avatarUrl,
  };
}

/**
 * Mask a paid order for public consumption. Centralized here so the detail
 * endpoint's "top-3 recent donations" preview and the participants endpoint
 * apply the EXACT same redaction rules — keeps the threat model tight.
 */
function maskDonation(
  o: {
    id: string;
    amount: number;
    donorMessage: string | null;
    isAnonymous: boolean;
    messageIsPrivate: boolean;
    customerName: string | null;
    createdAt: Date;
  },
  cfg: FundraiserConfig,
) {
  return {
    id: o.id,
    name: o.isAnonymous ? "Anonyme" : (o.customerName || "Anonyme"),
    amount: cfg.hideAmount ? null : o.amount,
    message: o.messageIsPrivate ? null : o.donorMessage,
    createdAt: o.createdAt.toISOString(),
    // customerEmail is NEVER returned (T-02-03)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cagnottes — paginated public list
// ─────────────────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  cursor: z.string().min(1).max(40).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

cagnottesRouter.get("/", async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);

    // Fetch limit+1 to detect whether there's a next page without a count query.
    const rows = await prisma.block.findMany({
      where: {
        type: "FUNDRAISER",
        isActive: true,
        // SQL-level visibility filter — P05 mitigation. Postgres JSON path
        // operator, supported on Neon. NEVER post-filter in JS.
        config: { path: ["visibility"], equals: "public" },
        // Exclude soft-deleted sellers (NEW-M3 pattern from existing routes)
        seller: { deletedAt: null },
        // Slug must exist — Phase 1 added a unique index but legacy rows may
        // still be NULL. Without this filter the cursor would have to handle
        // NULL slugs which complicates pagination.
        slug: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: query.limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        slug: true,
        title: true,
        config: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Single grouped aggregate per page — NEVER N+1.
    const blockIds = page.map((r) => r.id);
    const totals = blockIds.length === 0
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

    const cagnottes = page.map((row) => {
      const cfg = (row.config as FundraiserConfig) || {};
      const stats = totalsMap.get(row.id) || { sum: 0, count: 0 };
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        coverUrl: cfg.coverUrl ?? null,
        subtype: cfg.subtype ?? null,
        goalAmount: cfg.goalAmount ?? null,
        endDate: cfg.endDate ?? null,
        totalRaised: cfg.hideAmount ? null : stats.sum,
        donorCount: cfg.hideDonors ? null : stats.count,
        seller: shapeSeller(row.seller),
        createdAt: row.createdAt.toISOString(),
      };
    });

    // Public list — short browser/CDN cache is safe (no private rows possible).
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json({ cagnottes, nextCursor });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Paramètres invalides" });
      return;
    }
    logger.error("[cagnottes:list] Erreur:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des cagnottes" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cagnottes/:slug — single cagnotte detail
// ─────────────────────────────────────────────────────────────────────────────

const slugParamSchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "Slug invalide"),
});

cagnottesRouter.get("/:slug", async (req, res) => {
  try {
    const { slug } = slugParamSchema.parse(req.params);

    const block = await prisma.block.findFirst({
      where: {
        slug,
        type: "FUNDRAISER",
        isActive: true,
        seller: { deletedAt: null },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        config: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!block) {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const cfg = (block.config as FundraiserConfig) || {};

    // T-02-02 — private cagnottes must NEVER be cached by CDNs/proxies.
    // Public detail uses a short max-age to keep SSR friendly without staling.
    if (cfg.visibility === "private") {
      res.setHeader("Cache-Control", "private, no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=60");
    }

    // Stats — single aggregate query.
    const agg = await prisma.order.aggregate({
      where: { blockId: block.id, paymentStatus: "PAID" },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const totalRaised = agg._sum.amount || 0;
    const donorCount = agg._count._all;

    // Top 3 most-recent paid donations as a preview wall (Banani screen 21).
    const recent = await prisma.order.findMany({
      where: { blockId: block.id, paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        amount: true,
        donorMessage: true,
        isAnonymous: true,
        messageIsPrivate: true,
        customerName: true,
        createdAt: true,
      },
    });

    res.json({
      id: block.id,
      slug: block.slug,
      title: block.title,
      description: cfg.description ?? null,
      coverUrl: cfg.coverUrl ?? null,
      subtype: cfg.subtype ?? null,
      visibility: cfg.visibility ?? "public",
      goalAmount: cfg.goalAmount ?? null,
      endDate: cfg.endDate ?? null,
      hideAmount: cfg.hideAmount ?? false,
      hideDonors: cfg.hideDonors ?? false,
      totalRaised: cfg.hideAmount ? null : totalRaised,
      donorCount: cfg.hideDonors ? null : donorCount,
      recentDonations: recent.map((o) => maskDonation(o, cfg)),
      seller: shapeSeller(block.seller),
      createdAt: block.createdAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Slug invalide" });
      return;
    }
    logger.error("[cagnottes:detail] Erreur:", err);
    res.status(500).json({ error: "Erreur lors de la récupération de la cagnotte" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cagnottes/:slug/participants — paginated wall of paid donors
// ─────────────────────────────────────────────────────────────────────────────

const participantsQuerySchema = z.object({
  cursor: z.string().min(1).max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

cagnottesRouter.get("/:slug/participants", async (req, res) => {
  try {
    const { slug } = slugParamSchema.parse(req.params);
    const query = participantsQuerySchema.parse(req.query);

    const block = await prisma.block.findFirst({
      where: {
        slug,
        type: "FUNDRAISER",
        isActive: true,
        seller: { deletedAt: null },
      },
      select: { id: true, config: true },
    });

    if (!block) {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const cfg = (block.config as FundraiserConfig) || {};

    // Inherit the same Cache-Control branch as the detail endpoint — private
    // cagnottes' participant lists must NEVER be cached.
    if (cfg.visibility === "private") {
      res.setHeader("Cache-Control", "private, no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=60");
    }

    const rows = await prisma.order.findMany({
      where: { blockId: block.id, paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
      take: query.limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        amount: true,
        donorMessage: true,
        isAnonymous: true,
        messageIsPrivate: true,
        customerName: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    res.json({
      participants: page.map((o) => maskDonation(o, cfg)),
      nextCursor,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Paramètres invalides" });
      return;
    }
    logger.error("[cagnottes:participants] Erreur:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des participants" });
  }
});
