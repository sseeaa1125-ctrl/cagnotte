import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { requireAuth } from "../middleware/auth.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";
import { redis } from "../lib/redis.js";
import { parseSource } from "../lib/sources.js";
import { getCountryFromRequest } from "../lib/utils.js";

export const analyticsRouter = Router();

const COUNTRY_NAMES: Record<string, string> = {
  SN: "S\u00e9n\u00e9gal", CI: "C\u00f4te d'Ivoire", ML: "Mali", BF: "Burkina Faso",
  GN: "Guin\u00e9e", CM: "Cameroun", BJ: "B\u00e9nin", TG: "Togo",
  NE: "Niger", GW: "Guin\u00e9e-Bissau", TD: "Tchad", GA: "Gabon",
  CG: "Congo", CD: "RD Congo", MR: "Mauritanie", FR: "France",
  US: "\u00c9tats-Unis", CA: "Canada", BE: "Belgique", CH: "Suisse",
  MA: "Maroc", TN: "Tunisie", DZ: "Alg\u00e9rie", GB: "Royaume-Uni",
  DE: "Allemagne", ES: "Espagne", IT: "Italie",
};

const trackSchema = z.object({
  slug: z.string(),
  path: z.string(),
  referrer: z.string().optional(),
  timezone: z.string().max(50).optional(),
});

// ── POST /api/analytics/track — enregistrer une visite (public, rate-limited) ──
analyticsRouter.post("/track", async (req, res) => {
  try {
    const data = trackSchema.parse(req.body);

    // NEW-M4: Exclude soft-deleted sellers
    const seller = await prisma.seller.findFirst({
      where: { slug: data.slug, deletedAt: null },
      select: { id: true },
    });

    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    // H11: Hash IP before storing (GDPR compliance — no raw IPs in DB)
    const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.socket.remoteAddress
      || null;
    const ip = rawIp
      ? crypto.createHash("sha256").update(rawIp).digest("hex").slice(0, 16)
      : null;
    const userAgent = (req.headers["user-agent"] as string) || null;

    // A16: Deduplicate by IP + path within a 1-hour window (Redis — ~1ms vs ~50ms DB)
    if (ip) {
      const dedupKey = `dedup:pv:${seller.id}:${ip}:${data.path}`;
      const already = await redis.get(dedupKey);
      if (already) {
        res.json({ ok: true });
        return;
      }
      await redis.set(dedupKey, "1", { ex: 3600 });
    }

    const source = parseSource(data.referrer);
    const country = getCountryFromRequest(req, data.timezone);

    await prisma.pageView.create({
      data: {
        sellerId: seller.id,
        path: data.path,
        referrer: data.referrer,
        userAgent,
        ip,
        source,
        country,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur tracking", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/analytics/block-click — enregistrer un clic sur un bloc (public) ──
const blockClickSchema = z.object({
  slug: z.string(),
  blockId: z.string(),
  action: z.string().optional(),
});

analyticsRouter.post("/block-click", async (req, res) => {
  try {
    const data = blockClickSchema.parse(req.body);

    // NEW-M4: Exclude soft-deleted sellers
    const seller = await prisma.seller.findFirst({
      where: { slug: data.slug, deletedAt: null },
      select: { id: true },
    });
    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    const block = await prisma.block.findUnique({
      where: { id: data.blockId },
      select: { id: true, sellerId: true },
    });
    if (!block || block.sellerId !== seller.id) {
      res.json({ ok: true });
      return;
    }

    const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.socket.remoteAddress
      || null;
    const ip = rawIp
      ? crypto.createHash("sha256").update(rawIp).digest("hex").slice(0, 16)
      : null;

    // Deduplicate: same IP + block within 5 minutes (Redis — ~1ms vs ~50ms DB)
    if (ip) {
      const dedupKey = `dedup:bc:${ip}:${data.blockId}`;
      const already = await redis.get(dedupKey);
      if (already) {
        res.json({ ok: true });
        return;
      }
      await redis.set(dedupKey, "1", { ex: 300 });
    }

    await prisma.blockClick.create({
      data: {
        sellerId: seller.id,
        blockId: data.blockId,
        action: data.action || "click",
        ip,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur block click tracking", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/analytics/stats — stats agrégées du vendeur (auth requise) ──
analyticsRouter.get("/stats", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const { period, from, to } = req.query;

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    if (typeof from === "string" && typeof to === "string") {
      periodStart = new Date(from);
      const parsedTo = new Date(to);
      if (!isNaN(parsedTo.getTime())) {
        // Set end to end of the 'to' day
        periodEnd = new Date(parsedTo.getTime() + 86400000 - 1);
      }
      if (isNaN(periodStart.getTime())) periodStart = new Date(now.getTime() - 30 * 86400000);
    } else {
      let days = 30;
      if (period === "7") days = 7;
      else if (period === "14") days = 14;
      periodStart = new Date(now.getTime() - days * 86400000);
    }

    const daysBack = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000);

    // All stats use the selected period range
    const dateFilter = { gte: periodStart, lte: periodEnd };

    const [viewsPeriod, viewsTotal, ordersPeriod, uniqueVisitors, dailyViewsGrouped] = await Promise.all([
      prisma.pageView.count({
        where: { sellerId, createdAt: dateFilter },
      }),
      prisma.pageView.count({
        where: { sellerId },
      }),
      prisma.order.count({
        where: {
          sellerId,
          createdAt: dateFilter,
          paymentProvider: { notIn: ["dev_simulation", "dev_credit"] },
        },
      }),
      prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(DISTINCT ip) as count FROM "PageView" WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${periodStart} AND "createdAt" <= ${periodEnd} AND ip IS NOT NULL`
      ).then(rows => Number(rows[0]?.count ?? 0)),
      prisma.$queryRaw<{ day: string; count: bigint }[]>(
        Prisma.sql`SELECT DATE("createdAt") as day, COUNT(*) as count
         FROM "PageView"
         WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${periodStart} AND "createdAt" <= ${periodEnd}
         GROUP BY DATE("createdAt")
         ORDER BY day`
      ),
    ]);

    // Build daily map with zeros, fill from SQL
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(periodStart.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }
    for (const row of dailyViewsGrouped) {
      const key = typeof row.day === "string" ? row.day : new Date(row.day).toISOString().slice(0, 10);
      dailyMap.set(key, Number(row.count));
    }

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const conversionRate = viewsPeriod > 0 ? Math.round((ordersPeriod / viewsPeriod) * 10000) / 100 : 0;

    res.json({
      viewsPeriod,
      viewsTotal,
      uniqueVisitors,
      ordersPeriod,
      conversionRate,
      dailyData,
      period: daysBack,
    });
  } catch (err) {
    logger.error("Erreur analytics", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/analytics/stats/countries — top pays visiteurs (auth requise) ──
analyticsRouter.get("/stats/countries", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const { period, from, to } = req.query;

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    if (typeof from === "string" && typeof to === "string") {
      periodStart = new Date(from);
      const parsedTo = new Date(to);
      if (!isNaN(parsedTo.getTime())) periodEnd = new Date(parsedTo.getTime() + 86400000 - 1);
      if (isNaN(periodStart.getTime())) periodStart = new Date(now.getTime() - 30 * 86400000);
    } else {
      let days = 30;
      if (period === "7") days = 7;
      else if (period === "14") days = 14;
      periodStart = new Date(now.getTime() - days * 86400000);
    }

    const [viewRows, orderRows] = await Promise.all([
      prisma.$queryRaw<{ country: string; count: bigint }[]>(
        Prisma.sql`SELECT country, COUNT(*) as count
         FROM "PageView"
         WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${periodStart} AND "createdAt" <= ${periodEnd} AND country IS NOT NULL
         GROUP BY country
         ORDER BY count DESC
         LIMIT 20`
      ),
      prisma.$queryRaw<{ country: string; count: bigint }[]>(
        Prisma.sql`SELECT country, COUNT(*) as count
         FROM "Order"
         WHERE "sellerId" = ${sellerId} AND "paymentStatus" = 'PAID'
           AND "paymentProvider" NOT IN ('dev_simulation', 'dev_credit')
           AND "paidAt" >= ${periodStart} AND "paidAt" <= ${periodEnd} AND country IS NOT NULL
         GROUP BY country`
      ),
    ]);

    const orderMap = new Map(orderRows.map(r => [r.country, Number(r.count)]));

    const countries = viewRows.map(r => ({
      code: r.country,
      name: COUNTRY_NAMES[r.country] || r.country,
      views: Number(r.count),
      orders: orderMap.get(r.country) || 0,
    }));

    const total = countries.reduce((s, c) => s + c.views, 0);

    res.json({ countries, total });
  } catch (err) {
    logger.error("Erreur country stats", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/analytics/stats/sources — top sources/réseaux (auth requise) ──
analyticsRouter.get("/stats/sources", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const { period, from, to } = req.query;

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    if (typeof from === "string" && typeof to === "string") {
      periodStart = new Date(from);
      const parsedTo = new Date(to);
      if (!isNaN(parsedTo.getTime())) periodEnd = new Date(parsedTo.getTime() + 86400000 - 1);
      if (isNaN(periodStart.getTime())) periodStart = new Date(now.getTime() - 30 * 86400000);
    } else {
      let days = 30;
      if (period === "7") days = 7;
      else if (period === "14") days = 14;
      periodStart = new Date(now.getTime() - days * 86400000);
    }

    // Views by source + orders by source (for conversion)
    const [viewRows, orderRows] = await Promise.all([
      prisma.$queryRaw<{ source: string; count: bigint }[]>(
        Prisma.sql`SELECT COALESCE(source, 'Direct') as source, COUNT(*) as count
         FROM "PageView"
         WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${periodStart} AND "createdAt" <= ${periodEnd}
         GROUP BY source
         ORDER BY count DESC
         LIMIT 20`
      ),
      prisma.$queryRaw<{ source: string; count: bigint }[]>(
        Prisma.sql`SELECT COALESCE(source, 'Direct') as source, COUNT(*) as count
         FROM "Order"
         WHERE "sellerId" = ${sellerId} AND "paymentStatus" = 'PAID'
           AND "paymentProvider" NOT IN ('dev_simulation', 'dev_credit')
           AND "paidAt" >= ${periodStart} AND "paidAt" <= ${periodEnd}
         GROUP BY source`
      ),
    ]);

    const orderMap = new Map(orderRows.map(r => [r.source || "Direct", Number(r.count)]));
    const total = viewRows.reduce((s, r) => s + Number(r.count), 0);

    const sources = viewRows.map(r => {
      const name = r.source || "Direct";
      const views = Number(r.count);
      const orders = orderMap.get(name) || 0;
      return {
        name,
        views,
        orders,
        percentage: total > 0 ? Math.round((views / total) * 1000) / 10 : 0,
        conversionRate: views > 0 ? Math.round((orders / views) * 1000) / 10 : 0,
      };
    });

    res.json({ sources, total });
  } catch (err) {
    logger.error("Erreur source stats", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/analytics/block-stats — clics par bloc + conversion (auth requise) ──
analyticsRouter.get("/block-stats", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const { period, from, to } = req.query;

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    if (typeof from === "string" && typeof to === "string") {
      periodStart = new Date(from);
      const parsedTo = new Date(to);
      if (!isNaN(parsedTo.getTime())) {
        periodEnd = new Date(parsedTo.getTime() + 86400000 - 1);
      }
      if (isNaN(periodStart.getTime())) periodStart = new Date(now.getTime() - 30 * 86400000);
    } else {
      let days = 30;
      if (period === "7") days = 7;
      else if (period === "14") days = 14;
      periodStart = new Date(now.getTime() - days * 86400000);
    }

    // Get all active blocks for the seller
    const blocks = await prisma.block.findMany({
      where: { sellerId, isActive: true },
      select: {
        id: true,
        type: true,
        title: true,
        position: true,
        product: { select: { title: true } },
        bookingService: { select: { title: true } },
      },
      orderBy: { position: "asc" },
    });

    // Count clicks per block in period
    const clickCounts = await prisma.$queryRaw<{ blockId: string; count: bigint }[]>(
      Prisma.sql`SELECT "blockId", COUNT(*) as count
       FROM "BlockClick"
       WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${periodStart} AND "createdAt" <= ${periodEnd}
       GROUP BY "blockId"`
    );
    const clickMap = new Map(clickCounts.map(r => [r.blockId, Number(r.count)]));

    // Count orders per block in period (for blocks with products or bookingServices)
    const orderCounts = await prisma.$queryRaw<{ blockRef: string; count: bigint }[]>(
      Prisma.sql`SELECT COALESCE(p."blockId", bs."blockId") as "blockRef", COUNT(*) as count
       FROM "Order" o
       LEFT JOIN "Product" p ON o."productId" = p.id
       LEFT JOIN "BookingService" bs ON o."bookingServiceId" = bs.id
       WHERE o."sellerId" = ${sellerId}
         AND o."createdAt" >= ${periodStart} AND o."createdAt" <= ${periodEnd}
         AND o."paymentStatus" = 'PAID'
         AND o."paymentProvider" NOT IN ('dev_simulation', 'dev_credit')
         AND (p."blockId" IS NOT NULL OR bs."blockId" IS NOT NULL)
       GROUP BY COALESCE(p."blockId", bs."blockId")`
    );
    const orderMap = new Map(orderCounts.map(r => [r.blockRef, Number(r.count)]));

    // Total clicks across all blocks
    const totalClicks = Array.from(clickMap.values()).reduce((s, c) => s + c, 0);

    const blockStats = blocks.map(block => {
      const clicks = clickMap.get(block.id) || 0;
      const orders = orderMap.get(block.id) || 0;
      const conversionRate = clicks > 0 ? Math.round((orders / clicks) * 10000) / 100 : 0;
      const displayTitle = block.product?.title || block.bookingService?.title || block.title || "Sans titre";

      return {
        blockId: block.id,
        type: block.type,
        title: displayTitle,
        position: block.position,
        clicks,
        orders,
        conversionRate,
      };
    });

    res.json({ blockStats, totalClicks });
  } catch (err) {
    logger.error("Erreur block stats", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
