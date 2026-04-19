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
import { verifyToken } from "../lib/auth.js";
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
  status?: "active" | "closed";
  suggestedAmounts?: number[];
  gallery?: Array<{
    kind: "image" | "youtube";
    url: string;
    videoId?: string;
  }>;
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
    voluntaryContribution: number;
    donorMessage: string | null;
    isAnonymous: boolean;
    messageIsPrivate: boolean;
    customerName: string | null;
    createdAt: Date;
  },
  cfg: FundraiserConfig,
) {
  // The voluntary contribution ("Soutenir cagnotte.sn") is a tip to the
  // platform, not a contribution to the cagnotte. Surface the cagnotte-only
  // amount to creators and the public.
  const cagnotteAmount = o.amount - (o.voluntaryContribution ?? 0);
  return {
    id: o.id,
    name: o.isAnonymous ? "Anonyme" : (o.customerName || "Anonyme"),
    amount: cfg.hideAmount ? null : cagnotteAmount,
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
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  // Sort modes:
  //  - recent (default, desc createdAt, offset pagination)
  //  - oldest (asc createdAt, offset pagination)
  //  - popular (top by paid-order count, single-page / home)
  //  - raised_desc / raised_asc (by total raised, JS post-sort, paginated)
  sort: z.enum(["recent", "oldest", "popular", "raised_desc", "raised_asc"]).optional().default("recent"),
  // Phase 12 — server-side filters. `subtype` narrows to festive/solidaire;
  // `q` is a case-insensitive substring match on the block title. Both are
  // optional and stack multiplicatively. The frontend /cagnottes page wires
  // `q` to a <input type="search"> and `subtype` to the filter chip bar.
  subtype: z.enum(["festive", "solidaire"]).optional(),
  q: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
});

cagnottesRouter.get("/", async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);

    // Shared AND filters for both branches (popular + recent). Built from
    // the query so we apply subtype/q consistently. NOTE: Prisma needs
    // separate entries in AND for each JSON `path` since multiple `path`
    // filters on the same `config` key cannot be merged into one object.
    // NOTE: status filter is applied in JS post-fetch (not SQL) because
    // Prisma JSON `path` filters return NULL for rows missing the field,
    // and both `equals: "active"` and `NOT equals: "closed"` silently
    // exclude those rows. Legacy blocks without a status field are treated
    // as active.
    const sharedAnd: Array<Record<string, unknown>> = [
      { config: { path: ["visibility"], equals: "public" } },
    ];
    if (query.subtype) {
      sharedAnd.push({
        config: { path: ["subtype"], equals: query.subtype },
      });
    }
    // Title-only case-insensitive contains. Description search via JSON
    // path would be case-sensitive (Prisma limitation) → skipped in v1.
    const titleSearch = query.q
      ? { title: { contains: query.q, mode: "insensitive" as const } }
      : {};

    // ── Popular sort branch ──────────────────────────────────────────────
    // Fetch a wider pool (up to 200) of eligible blocks, compute their paid
    // order counts, sort in JS, and return the top N. No cursor in this
    // branch — the home page shows a fixed top-3 and never paginates.
    if (query.sort === "popular") {
      const poolSize = Math.min(200, Math.max(query.limit * 10, 60));
      const pool = await prisma.block.findMany({
        where: {
          type: "FUNDRAISER",
          isActive: true,
          // SQL-level visibility + status filters.
          //
          // POSITIVE assertion on status (`equals: "active"`) — do NOT use
          // `not: "closed"` here. Postgres JSON `config->'status'` returns
          // NULL for rows whose config blob is missing the field, and
          // `NULL != 'closed'` evaluates to NULL, which is falsy in WHERE
          // → rows without a status were silently excluded. Any seed data
          // or legacy block pre-Phase-10 would disappear from the list.
          // Backfilled via scripts/backfill-fundraiser-status.ts; the web
          // create path (Zod) defaults to "active", and seed-dev.ts
          // explicitly writes it. Keep the assertion positive.
          AND: sharedAnd,
          ...titleSearch,
          seller: { deletedAt: null },
          slug: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: poolSize,
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

      // JS post-filter: exclude closed cagnottes (see sharedAnd comment)
      const activePool = pool.filter((r) => {
        const s = (r.config as FundraiserConfig)?.status;
        return !s || s === "active";
      });

      const poolIds = activePool.map((r) => r.id);
      const poolTotals = poolIds.length === 0
        ? []
        : await prisma.order.groupBy({
            by: ["blockId"],
            where: { blockId: { in: poolIds }, paymentStatus: "PAID" },
            _sum: { amount: true, voluntaryContribution: true },
            _count: { _all: true },
          });
      const poolMap = new Map<string, { sum: number; count: number }>();
      for (const t of poolTotals) {
        if (!t.blockId) continue;
        poolMap.set(t.blockId, {
          sum: (t._sum.amount || 0) - (t._sum.voluntaryContribution || 0),
          count: t._count._all,
        });
      }

      const sortedPool = activePool
        .slice()
        .sort((a, b) => {
          const sa = poolMap.get(a.id)?.count ?? 0;
          const sb = poolMap.get(b.id)?.count ?? 0;
          if (sb !== sa) return sb - sa;
          // Tie-break on total raised, then on createdAt desc for stable order.
          const ra = poolMap.get(a.id)?.sum ?? 0;
          const rb = poolMap.get(b.id)?.sum ?? 0;
          if (rb !== ra) return rb - ra;
          return b.createdAt.getTime() - a.createdAt.getTime();
        })
        .slice(0, query.limit);

      const popular = sortedPool.map((row) => {
        const cfg = (row.config as FundraiserConfig) || {};
        const stats = poolMap.get(row.id) || { sum: 0, count: 0 };
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

      res.setHeader("Cache-Control", "public, max-age=60");
      res.json({ cagnottes: popular, nextCursor: null });
      return;
    }

    // ── Recent sort branch (default) ─────────────────────────────────────
    // Supports both cursor-based ("Charger plus") and page-based pagination.
    // When `page` is provided (and no cursor), offset pagination is used and
    // totalCount/totalPages are returned for the <Pagination> component.
    const pageNum = query.page ?? 1;

    const whereClause = {
      type: "FUNDRAISER" as const,
      isActive: true,
      AND: sharedAnd,
      ...titleSearch,
      seller: { deletedAt: null },
      slug: { not: null },
    };

    const selectFields = {
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
    };

    // ── Raised-based sort branch (raised_desc / raised_asc) ────────────
    // Fetch the full matching set, compute totals, sort, then paginate in JS.
    // Dataset is modest in v1; if it grows, switch to a raw SQL LEFT JOIN
    // with aggregate SUM to keep pagination server-side.
    if (query.sort === "raised_desc" || query.sort === "raised_asc") {
      const all = await prisma.block.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        select: selectFields,
      });
      // Exclude closed cagnottes (JS post-filter, see sharedAnd comment)
      const activeAll = all.filter((r) => {
        const s = (r.config as FundraiserConfig)?.status;
        return !s || s === "active";
      });
      const ids = activeAll.map((r) => r.id);
      const sums = ids.length === 0
        ? []
        : await prisma.order.groupBy({
            by: ["blockId"],
            where: { blockId: { in: ids }, paymentStatus: "PAID" },
            _sum: { amount: true, voluntaryContribution: true },
            _count: { _all: true },
          });
      const sumMap = new Map<string, { sum: number; count: number }>();
      for (const t of sums) {
        if (!t.blockId) continue;
        sumMap.set(t.blockId, {
          sum: (t._sum.amount || 0) - (t._sum.voluntaryContribution || 0),
          count: t._count._all,
        });
      }
      const sorted = activeAll.slice().sort((a, b) => {
        const sa = sumMap.get(a.id)?.sum ?? 0;
        const sb = sumMap.get(b.id)?.sum ?? 0;
        if (sa !== sb) {
          return query.sort === "raised_desc" ? sb - sa : sa - sb;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      const totalCountRaised = sorted.length;
      const startIdx = (pageNum - 1) * query.limit;
      const pageRows = sorted.slice(startIdx, startIdx + query.limit);
      const totalPagesRaised = Math.max(1, Math.ceil(totalCountRaised / query.limit));
      const cagnottesRaised = pageRows.map((row) => {
        const cfg = (row.config as FundraiserConfig) || {};
        const stats = sumMap.get(row.id) || { sum: 0, count: 0 };
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
      res.setHeader("Cache-Control", "public, max-age=60");
      res.json({
        cagnottes: cagnottesRaised,
        nextCursor: null,
        totalCount: totalCountRaised,
        totalPages: totalPagesRaised,
        currentPage: pageNum,
      });
      return;
    }

    const orderBy =
      query.sort === "oldest"
        ? { createdAt: "asc" as const }
        : { createdAt: "desc" as const };

    const [rows, totalCount] = await Promise.all([
      prisma.block.findMany({
        where: whereClause,
        orderBy,
        take: query.limit + 1,
        ...(query.cursor
          ? { cursor: { id: query.cursor }, skip: 1 }
          : { skip: (pageNum - 1) * query.limit }),
        select: selectFields,
      }),
      prisma.block.count({ where: whereClause }),
    ]);

    // JS post-filter: exclude closed cagnottes (see sharedAnd comment)
    const activeRows = rows.filter((r) => {
      const s = (r.config as FundraiserConfig)?.status;
      return !s || s === "active";
    });

    const hasMore = activeRows.length > query.limit;
    const page = hasMore ? activeRows.slice(0, query.limit) : activeRows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;
    const totalPages = Math.ceil(totalCount / query.limit);

    // Single grouped aggregate per page — NEVER N+1.
    const blockIds = page.map((r) => r.id);
    const totals = blockIds.length === 0
      ? []
      : await prisma.order.groupBy({
          by: ["blockId"],
          where: { blockId: { in: blockIds }, paymentStatus: "PAID" },
          _sum: { amount: true, voluntaryContribution: true },
          _count: { _all: true },
        });
    const totalsMap = new Map<string, { sum: number; count: number }>();
    for (const t of totals) {
      if (!t.blockId) continue;
      totalsMap.set(t.blockId, {
        sum: (t._sum.amount || 0) - (t._sum.voluntaryContribution || 0),
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
    res.json({ cagnottes, nextCursor, totalCount, totalPages, currentPage: pageNum });
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

    // Phase 9 fixpack — owner detection. If the caller presents a valid
    // izy-token cookie AND the JWT's sub matches the block's seller, we
    // unmask hideAmount/hideDonors so the creator can always see their own
    // totals on the dashboard. Public callers keep the masked response.
    const cookieToken = (req.cookies?.["izy-token"] as string) ?? null;
    let isOwner = false;
    if (cookieToken) {
      const payload = await verifyToken(cookieToken);
      if (payload?.sub && payload.sub === block.seller.id) {
        isOwner = true;
      }
    }

    // T-02-02 — private cagnottes must NEVER be cached by CDNs/proxies.
    // Public detail uses a short max-age to keep SSR friendly without staling.
    // Owner responses are also never cached since they carry unmasked data.
    if (cfg.visibility === "private" || isOwner) {
      res.setHeader("Cache-Control", "private, no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=60");
    }

    // Stats — single aggregate query.
    const agg = await prisma.order.aggregate({
      where: { blockId: block.id, paymentStatus: "PAID" },
      _sum: { amount: true, voluntaryContribution: true },
      _count: { _all: true },
    });
    const totalRaised =
      (agg._sum.amount || 0) - (agg._sum.voluntaryContribution || 0);
    const donorCount = agg._count._all;

    // Top 3 most-recent paid donations as a preview wall (Banani screen 21).
    const recent = await prisma.order.findMany({
      where: { blockId: block.id, paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        amount: true,
        voluntaryContribution: true,
        donorMessage: true,
        isAnonymous: true,
        messageIsPrivate: true,
        customerName: true,
        createdAt: true,
      },
    });

    // Owner bypasses hideAmount/hideDonors masking and recentDonations masking
    // so the creator dashboard always sees their real numbers + donor names.
    const ownerCfg: FundraiserConfig = isOwner
      ? { ...cfg, hideAmount: false, hideDonors: false }
      : cfg;

    // Creator-set suggested amounts drive the /participer presets. Fallback
    // to the schema default so the flow never ends up with an empty preset
    // row. Hard-capped to the first 3 entries — the participer form only
    // renders 3 pills and the editor enforces the same cap.
    const rawSuggested = Array.isArray(cfg.suggestedAmounts)
      ? cfg.suggestedAmounts.filter(
          (n): n is number => typeof n === "number" && Number.isFinite(n) && n >= 500,
        )
      : [];
    const suggestedAmounts = (
      rawSuggested.length > 0 ? rawSuggested : [2000, 5000, 10000]
    ).slice(0, 3);

    res.json({
      id: block.id,
      slug: block.slug,
      title: block.title,
      description: cfg.description ?? null,
      coverUrl: cfg.coverUrl ?? null,
      subtype: cfg.subtype ?? null,
      visibility: cfg.visibility ?? "public",
      status: cfg.status ?? "active",
      gallery: cfg.gallery ?? [],
      goalAmount: cfg.goalAmount ?? null,
      endDate: cfg.endDate ?? null,
      suggestedAmounts,
      hideAmount: cfg.hideAmount ?? false,
      hideDonors: cfg.hideDonors ?? false,
      totalRaised: isOwner || !cfg.hideAmount ? totalRaised : null,
      donorCount: isOwner || !cfg.hideDonors ? donorCount : null,
      recentDonations: recent.map((o) => maskDonation(o, ownerCfg)),
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
      select: {
        id: true,
        config: true,
        seller: { select: { id: true } },
      },
    });

    if (!block) {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const cfg = (block.config as FundraiserConfig) || {};

    // Owner detection — same pattern as detail endpoint. Creator can always
    // see their own donor list regardless of hideDonors.
    const cookieToken = (req.cookies?.["izy-token"] as string) ?? null;
    let isOwner = false;
    if (cookieToken) {
      const payload = await verifyToken(cookieToken);
      if (payload?.sub && payload.sub === block.seller.id) {
        isOwner = true;
      }
    }

    // Inherit the same Cache-Control branch as the detail endpoint — private
    // cagnottes' participant lists must NEVER be cached. Owner responses are
    // also uncacheable since they carry unmasked data.
    if (cfg.visibility === "private" || isOwner) {
      res.setHeader("Cache-Control", "private, no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=60");
    }

    // hideDonors enforcement — non-owners get an empty list. The public page
    // skips rendering the participant wall when the flag is set, so this also
    // stops direct API scraping.
    if (cfg.hideDonors && !isOwner) {
      res.json({ participants: [], nextCursor: null });
      return;
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
        voluntaryContribution: true,
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

    // Owner bypasses hideAmount masking on individual donations.
    const maskCfg: FundraiserConfig = isOwner
      ? { ...cfg, hideAmount: false, hideDonors: false }
      : cfg;

    res.json({
      participants: page.map((o) => maskDonation(o, maskCfg)),
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
