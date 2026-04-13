import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf, hashPassword, verifyPassword } from "../lib/auth.js";
import { cleanPhoneForStorage } from "../lib/phone.js";
import { RedisRateLimitStore } from "../lib/rateLimitStore.js";
import { redis } from "../lib/redis.js";
import { generateVerificationCode } from "../lib/utils.js";
import { queueAuthEmail } from "../lib/queues/emailQueue.js";
import * as logger from "../lib/logger.js";
import { RESERVED_SLUGS } from "../lib/constants.js";
import { formatZodError } from "../lib/zodErrors.js";

export const sellersRouter = Router();

// S7+S8: Timing-safe string comparison with length guard
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  subtitle: z.string().max(80).nullable().optional(),
  bio: z.string().max(160).optional(),
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Lettres minuscules, chiffres et tirets uniquement")
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  showAvatar: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
  instagramUrl: z.string().max(200).nullable().optional(),
  tiktokUrl: z.string().max(200).nullable().optional(),
  youtubeUrl: z.string().url().nullable().optional(),
  facebookUrl: z.string().url().nullable().optional(),
  whatsappNumber: z.string().max(50).nullable().optional(),
  twitterUrl: z.string().url().nullable().optional(),
  telegramUrl: z.string().url().nullable().optional(),
  snapchatUrl: z.string().max(200).nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  activity: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  phoneCountry: z.string().max(5).optional(),
  timezone: z.string().max(50).optional(),
  bgImageUrl: z.string().url().nullable().optional(),
  themeId: z.string().min(1).max(30).optional(),
  notificationPrefs: z
    .object({
      emailOrders: z.boolean().optional(),
      emailBookings: z.boolean().optional(),
      emailMarketing: z.boolean().optional(),
      pushOrders: z.boolean().optional(),
      pushDonations: z.boolean().optional(),
      pushPayments: z.boolean().optional(),
      pushPartnerships: z.boolean().optional(),
      pushCommunities: z.boolean().optional(),
    })
    .optional(),
  payoutPhone: z.string().max(30).nullable().optional(),
  payoutProvider: z.string().max(30).nullable().optional(),
  payoutName: z.string().max(100).nullable().optional(),
  payoutCountry: z.string().max(5).nullable().optional(),

});

// Normalize @handle or plain username into a full URL
function normalizeSocialHandle(value: string | null | undefined, baseUrl: string): string | null | undefined {
  if (value === null || value === undefined) return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const handle = trimmed.replace(/^@/, "");
  return `${baseUrl}${handle}`;
}

// PUT /api/sellers/profile — mise à jour profil (auth requise)
// ⚠️ DOIT être AVANT /:slug sinon Express matche "profile" comme slug
sellersRouter.put("/profile", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const data = updateProfileSchema.parse(req.body);

    // Normalize @handles into full URLs for Instagram and TikTok
    if (data.instagramUrl !== undefined) {
      data.instagramUrl = normalizeSocialHandle(data.instagramUrl, "https://instagram.com/") ?? null;
    }
    if (data.tiktokUrl !== undefined) {
      data.tiktokUrl = normalizeSocialHandle(data.tiktokUrl, "https://tiktok.com/@") ?? null;
    }

    if (data.slug) {
      if (RESERVED_SLUGS.has(data.slug)) {
        res.status(409).json({ error: "Ce nom de page est réservé" });
        return;
      }
      const existing = await prisma.seller.findUnique({ where: { slug: data.slug } });
      if (existing && existing.id !== sellerId) {
        res.status(409).json({ error: "Ce nom de page est déjà pris" });
        return;
      }

      // Save old slug for redirect if slug is actually changing
      const currentSeller = await prisma.seller.findUnique({ where: { id: sellerId }, select: { slug: true } });
      if (currentSeller && currentSeller.slug !== data.slug) {
        // Invalidate old slug's store cache before rename
        try { await redis.del(storeCacheKey(currentSeller.slug)); } catch {}
        // Save old slug → this seller (upsert to avoid duplicates)
        await prisma.slugHistory.upsert({
          where: { oldSlug: currentSeller.slug },
          create: { oldSlug: currentSeller.slug, sellerId },
          update: { sellerId },
        });
        // If the new slug was someone's old slug, remove that redirect
        await prisma.slugHistory.deleteMany({ where: { oldSlug: data.slug } });
      }
    }

    const seller = await prisma.seller.update({
      where: { id: sellerId },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.slug && { slug: data.slug }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl }),
        ...(data.showAvatar !== undefined && { showAvatar: data.showAvatar }),
        ...(data.onboardingCompleted !== undefined && { onboardingCompleted: data.onboardingCompleted }),
        ...(data.instagramUrl !== undefined && { instagramUrl: data.instagramUrl }),
        ...(data.tiktokUrl !== undefined && { tiktokUrl: data.tiktokUrl }),
        ...(data.youtubeUrl !== undefined && { youtubeUrl: data.youtubeUrl }),
        ...(data.facebookUrl !== undefined && { facebookUrl: data.facebookUrl }),
        ...(data.whatsappNumber !== undefined && { whatsappNumber: data.whatsappNumber }),
        ...(data.twitterUrl !== undefined && { twitterUrl: data.twitterUrl }),
        ...(data.telegramUrl !== undefined && { telegramUrl: data.telegramUrl }),
        ...(data.snapchatUrl !== undefined && { snapchatUrl: data.snapchatUrl }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl }),
        ...(data.activity !== undefined && { activity: data.activity }),
        ...(data.phone !== undefined && { phone: data.phone ? cleanPhoneForStorage(data.phone) : null }),
        ...(data.phoneCountry !== undefined && { phoneCountry: data.phoneCountry }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.bgImageUrl !== undefined && { bgImageUrl: data.bgImageUrl }),
        ...(data.themeId !== undefined && { themeId: data.themeId }),
        ...(data.notificationPrefs !== undefined && { notificationPrefs: data.notificationPrefs }),
        ...(data.payoutPhone !== undefined && { payoutPhone: data.payoutPhone ? cleanPhoneForStorage(data.payoutPhone) : null }),
        ...(data.payoutProvider !== undefined && { payoutProvider: data.payoutProvider }),
        ...(data.payoutName !== undefined && { payoutName: data.payoutName }),
        ...(data.payoutCountry !== undefined && { payoutCountry: data.payoutCountry }),

      },
      select: {
        id: true,
        email: true,
        slug: true,
        displayName: true,
        subtitle: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        showAvatar: true,
        plan: true,
        instagramUrl: true,
        tiktokUrl: true,
        youtubeUrl: true,
        facebookUrl: true,
        whatsappNumber: true,
        twitterUrl: true,
        telegramUrl: true,
        snapchatUrl: true,
        websiteUrl: true,
        payoutPhone: true,
        payoutProvider: true,
        payoutName: true,
        payoutCountry: true,
        kycStatus: true,
      },
    });

    // Invalidate public store cache after profile update
    try { await redis.del(storeCacheKey(seller.slug)); } catch {}

    res.json({ seller });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur update profil", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// PUT /api/sellers/theme — mise à jour thème (auth requise)
const updateThemeSchema = z.object({
  themeId: z.string().min(1).max(30),
  themeFont: z.string().min(1).max(30).optional(),
  themeColors: z
    .object({
      primary: z.string().optional(),
      background: z.string().optional(),
      button: z.string().optional(),
    })
    .strict()
    .nullable()
    .optional(),
  bgImageUrl: z.string().url().nullable().optional(),
  headerLayout: z.enum(["centered", "left", "pro", "compact", "banner", "hero", "editorial", "sadio"]).optional(),
  imageStyle: z.enum(["circle", "rounded", "square"]).nullable().optional(),
});

sellersRouter.put("/theme", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const data = updateThemeSchema.parse(req.body);

    const updateData: Record<string, unknown> = { themeId: data.themeId };
    if (data.themeFont) updateData.themeFont = data.themeFont;
    if (data.themeColors !== undefined) {
      updateData.themeColors = data.themeColors === null
        ? { set: null }
        : data.themeColors;
    }
    if (data.bgImageUrl !== undefined) updateData.bgImageUrl = data.bgImageUrl;
    if (data.headerLayout) updateData.headerLayout = data.headerLayout;
    if (data.imageStyle !== undefined) updateData.imageStyle = data.imageStyle;

    const seller = await prisma.seller.update({
      where: { id: sellerId },
      data: updateData,
      select: {
        themeId: true,
        themeFont: true,
        themeColors: true,
        bgImageUrl: true,
        headerLayout: true,
        imageStyle: true,
      },
    });

    // Invalidate public store cache after theme update
    await invalidateStoreCache(sellerId);

    res.json({ theme: seller });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur update thème", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// POST /api/sellers/kyc — soumettre les documents KYC
// ⚠️ DOIT être AVANT /:slug sinon Express matche "kyc" comme slug
const kycSubmitSchema = z.object({
  fullName: z.string().min(2, "Nom complet requis").max(100),
  idUrl: z.string().url("URL de la pièce d'identité invalide"),
  selfieUrl: z.string().url("URL du selfie invalide"),
});

sellersRouter.post("/kyc", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const data = kycSubmitSchema.parse(req.body);

    // Vérifier le statut actuel — autorisé uniquement si NONE ou REJECTED
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { kycStatus: true },
    });

    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    if (seller.kycStatus !== "NONE" && seller.kycStatus !== "REJECTED") {
      res.status(400).json({
        error: seller.kycStatus === "PENDING"
          ? "Ta vérification est déjà en cours de traitement."
          : "Ton identité est déjà vérifiée.",
      });
      return;
    }

    await prisma.seller.update({
      where: { id: sellerId },
      data: {
        kycStatus: "PENDING",
        kycFullName: data.fullName.trim(),
        kycIdUrl: data.idUrl,
        kycSelfieUrl: data.selfieUrl,
        kycSubmittedAt: new Date(),
        kycReviewedAt: null,
      },
    });

    res.json({ ok: true, kycStatus: "PENDING" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur KYC submit", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// GET /api/sellers/dashboard/stats — stats vendeur (auth requise)
// ⚠️ DOIT être AVANT /:slug sinon Express matche "dashboard" comme slug
sellersRouter.get("/dashboard/stats", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const { period, from, to } = req.query;

    let since: Date;
    if (typeof from === "string" && typeof to === "string") {
      // Custom date range: from=YYYY-MM-DD&to=YYYY-MM-DD
      since = new Date(from);
      if (isNaN(since.getTime())) since = new Date(Date.now() - 14 * 86400000);
    } else {
      let daysBack = 14;
      if (period === "7") daysBack = 7;
      else if (period === "30") daysBack = 30;
      since = new Date();
      since.setDate(since.getDate() - daysBack);
    }

    // Exclure les lead magnets / waiting lists (gratuits) des stats de ventes
    const TEST_PROVIDERS = ["free", "dev_simulation", "dev_credit"];
    const paidOrdersWhere = { sellerId, paymentStatus: "PAID" as const, paymentProvider: { notIn: TEST_PROVIDERS } };

    // Calculate start of today for revenueToday
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalRevenue, communityRevenue, todayRevenue, todayCommunityRevenue, totalOrders, totalCommunityOrders, recentOrders, recentCommunityPayments, blocksCount] = await Promise.all([
      prisma.order.aggregate({
        where: { ...paidOrdersWhere, paidAt: { gte: since } },
        _sum: { sellerAmount: true },
        _count: true,
      }),
      // C8: Inclure revenus communautés dans les stats dashboard
      prisma.communityPayment.aggregate({
        where: { community: { sellerId }, status: "COMPLETED", createdAt: { gte: since } },
        _sum: { sellerAmount: true },
        _count: true,
      }),
      // Today's revenue (orders)
      prisma.order.aggregate({
        where: { ...paidOrdersWhere, paidAt: { gte: todayStart } },
        _sum: { sellerAmount: true },
      }),
      // Today's revenue (community payments)
      prisma.communityPayment.aggregate({
        where: { community: { sellerId }, status: "COMPLETED", createdAt: { gte: todayStart } },
        _sum: { sellerAmount: true },
      }),
      prisma.order.count({
        where: paidOrdersWhere,
      }),
      prisma.communityPayment.count({
        where: { community: { sellerId }, status: "COMPLETED" },
      }),
      prisma.order.findMany({
        where: { sellerId, paymentStatus: "PAID", paymentProvider: { notIn: ["free", "dev_simulation", "dev_credit"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          reference: true,
          orderType: true,
          amount: true,
          paymentStatus: true,
          customerName: true,
          customerEmail: true,
          createdAt: true,
        },
      }),
      // C8: Fetch recent community payments for "Dernières commandes"
      prisma.communityPayment.findMany({
        where: { community: { sellerId }, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          reference: true,
          amount: true,
          status: true,
          createdAt: true,
          subscription: { select: { memberName: true, memberEmail: true } },
          community: { select: { title: true } },
        },
      }),
      prisma.block.count({
        where: { sellerId, isActive: true },
      }),
    ]);

    // Merge orders + community payments into a unified recent list
    const communityAsOrders = recentCommunityPayments.map((cp) => ({
      id: cp.id,
      reference: cp.reference,
      orderType: "COMMUNITY" as string,
      amount: cp.amount,
      paymentStatus: cp.status === "COMPLETED" ? "PAID" : cp.status,
      customerName: cp.subscription?.memberName || null,
      customerEmail: cp.subscription?.memberEmail || "",
      createdAt: cp.createdAt,
    }));

    const mergedRecent = [...recentOrders, ...communityAsOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    res.json({
      revenue: (totalRevenue._sum.sellerAmount || 0) + (communityRevenue._sum.sellerAmount || 0),
      revenueToday: (todayRevenue._sum.sellerAmount || 0) + (todayCommunityRevenue._sum.sellerAmount || 0),
      salesCount: (totalRevenue._count || 0) + (communityRevenue._count || 0),
      totalOrders: totalOrders + totalCommunityOrders,
      recentOrders: mergedRecent,
      period: Math.ceil((Date.now() - since.getTime()) / 86400000),
    });
  } catch (err) {
    logger.error("Erreur dashboard stats", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// GET /api/sellers/dashboard/revenue-chart — revenus quotidiens (auth requise)
sellersRouter.get("/dashboard/revenue-chart", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const { period, from, to } = req.query;

    const now = new Date();
    let since: Date;
    let until: Date = now;

    if (typeof from === "string" && typeof to === "string") {
      since = new Date(from);
      until = new Date(to);
      until.setHours(23, 59, 59, 999);
      if (isNaN(since.getTime())) since = new Date(now.getTime() - 14 * 86400000);
      if (isNaN(until.getTime())) until = now;
    } else {
      let days = 14;
      if (period === "7") days = 7;
      else if (period === "30") days = 30;
      since = new Date(now.getTime() - days * 86400000);
    }

    const daysBack = Math.ceil((until.getTime() - since.getTime()) / 86400000);

    // A2: GROUP BY SQL au lieu de charger tous les orders en mémoire
    const [grouped, groupedCommunity] = await Promise.all([
      prisma.$queryRaw<{ day: string; amount: bigint; count: bigint }[]>(
        Prisma.sql`SELECT DATE("paidAt") as day, SUM("sellerAmount") as amount, COUNT(*) as count
         FROM "Order"
         WHERE "sellerId" = ${sellerId} AND "paymentStatus" = 'PAID'
           AND "paymentProvider" NOT IN ('free', 'dev_simulation', 'dev_credit')
           AND "paidAt" >= ${since} AND "paidAt" <= ${until}
         GROUP BY DATE("paidAt")
         ORDER BY day`
      ),
      // C8: Inclure revenus communautés dans le graphique
      prisma.$queryRaw<{ day: string; amount: bigint; count: bigint }[]>(
        Prisma.sql`SELECT DATE(cp."createdAt") as day, SUM(cp."sellerAmount") as amount, COUNT(*) as count
         FROM "CommunityPayment" cp
         JOIN "Community" c ON cp."communityId" = c.id
         WHERE c."sellerId" = ${sellerId} AND cp.status = 'COMPLETED' AND cp."createdAt" >= ${since} AND cp."createdAt" <= ${until}
         GROUP BY DATE(cp."createdAt")
         ORDER BY day`
      ),
    ]);

    // Build daily map with zeros, then fill from SQL results
    const dailyMap = new Map<string, { amount: number; count: number }>();
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(since.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { amount: 0, count: 0 });
    }
    for (const row of grouped) {
      const key = typeof row.day === "string" ? row.day : new Date(row.day).toISOString().slice(0, 10);
      dailyMap.set(key, { amount: Number(row.amount), count: Number(row.count) });
    }
    // C8: Merge community revenue into the same daily map
    for (const row of groupedCommunity) {
      const key = typeof row.day === "string" ? row.day : new Date(row.day).toISOString().slice(0, 10);
      const existing = dailyMap.get(key) || { amount: 0, count: 0 };
      dailyMap.set(key, { amount: existing.amount + Number(row.amount), count: existing.count + Number(row.count) });
    }

    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, amount: data.amount, count: data.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ dailyRevenue });
  } catch (err) {
    logger.error("Erreur revenue-chart", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// GET /api/sellers/sitemap — public list of seller slugs for sitemap generation
// MUST be before /:slug to avoid Express matching "sitemap" as a slug param
sellersRouter.get("/sitemap", async (_req, res) => {
  try {
    // NEW-M2: Exclude soft-deleted sellers from sitemap
    const sellers = await prisma.seller.findMany({
      where: { emailVerified: true, onboardingCompleted: true, deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    res.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
    res.json({ slugs: sellers });
  } catch (err) {
    logger.error("Erreur sitemap", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// Redis cache for public store pages — avoids 1-2s Prisma query on every load
const STORE_CACHE_TTL = 30; // seconds
function storeCacheKey(slug: string) { return `store:${slug}`; }

// Exported for use by blocks.ts and other routes that mutate store data
export async function invalidateStoreCache(sellerId: string) {
  try {
    const seller = await prisma.seller.findUnique({ where: { id: sellerId }, select: { slug: true } });
    if (seller) await redis.del(storeCacheKey(seller.slug));
  } catch { /* Redis down — no-op */ }
}

// H13: Remove sensitive fields from public endpoints
sellersRouter.get("/:slug", async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();

    // Check Redis cache first (~5ms vs ~1500ms Prisma)
    try {
      const cached = await redis.get(storeCacheKey(slug));
      if (cached) {
        const data = typeof cached === "string" ? JSON.parse(cached) : cached;
        res.set("Cache-Control", "public, s-maxage=5, stale-while-revalidate=10");
        res.set("X-Cache", "HIT");
        res.json(data);
        return;
      }
    } catch { /* Redis down → fall through to DB */ }

    // D1: Filter out soft-deleted sellers on public page
    const seller = await prisma.seller.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        slug: true,
        displayName: true,
        subtitle: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        showAvatar: true,
        plan: true,
        instagramUrl: true,
        tiktokUrl: true,
        youtubeUrl: true,
        facebookUrl: true,
        whatsappNumber: true,
        twitterUrl: true,
        telegramUrl: true,
        snapchatUrl: true,
        websiteUrl: true,
        themeId: true,
        themeFont: true,
        themeColors: true,
        bgImageUrl: true,
        headerLayout: true,
        imageStyle: true,
        timezone: true,
        kycStatus: true,
        isFlagged: true,
        metaPixelId: true,
        googleAdsId: true,
        googleAnalyticsId: true,
        tiktokPixelId: true,
        blocks: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: {
            product: {
              select: {
                id: true,
                blockId: true,
                title: true,
                subtitle: true,
                description: true,
                price: true,
                currency: true,
                coverUrl: true,
                buttonText: true,
                ctaStyle: true,
                discountPrice: true,
                totalSales: true,
                totalRevenue: true,
                leadFields: true,
                maxSubscribers: true,
                showSubscriberCount: true,
                videoUrl: true,
                checkoutSections: true,
                // S11: fileUrl, fileName, fileSize, redirectUrl, confirmationEmail* are EXCLUDED
                // to prevent free download of digital products
                reviews: { orderBy: { position: "asc" } },
                // M7: Limiter les order bumps retournés dans l'API publique
                orderBumps: {
                  where: { isActive: true },
                  take: 10,
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    price: true,
                    isActive: true,
                    // S11: fileUrl, fileName excluded from order bumps too
                  },
                },
              },
            },
            bookingService: {
              select: {
                id: true,
                blockId: true,
                title: true,
                description: true,
                price: true,
                currency: true,
                duration: true,
                location: true,
                coverUrl: true,
                buttonText: true,
                ctaStyle: true,
                minAdvanceHours: true,
                videoUrl: true,
                checkoutSections: true,
                slots: true,
              },
            },
            community: {
              select: {
                id: true,
                sellerId: true,
                blockId: true,
                // C1: telegramChatId retiré — ne pas exposer l'ID interne du groupe
                telegramChatTitle: true,
                title: true,
                description: true,
                coverUrl: true,
                priceAmount: true,
                currency: true,
                billingPeriod: true,
                subscribeFields: true,
                isActive: true,
                memberCount: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!seller) {
      // Check if this slug was previously used by someone who renamed
      const redirect = await prisma.slugHistory.findUnique({
        where: { oldSlug: slug },
        select: { seller: { select: { slug: true, deletedAt: true } } },
      });
      if (redirect && !redirect.seller.deletedAt) {
        res.status(301).json({ redirect: redirect.seller.slug });
        return;
      }
      res.status(404).json({ error: "Page introuvable" });
      return;
    }

    // Store in Redis cache for next requests
    const responseData = { seller };
    try {
      await redis.set(storeCacheKey(slug), JSON.stringify(responseData), { ex: STORE_CACHE_TTL });
    } catch { /* Redis down — no-op */ }

    // Cache public store pages: 5s CDN with short stale-while-revalidate
    // Kept short so seller edits are visible quickly on the store
    res.set("Cache-Control", "public, s-maxage=5, stale-while-revalidate=10");
    res.set("X-Cache", "MISS");
    res.json(responseData);
  } catch (err) {
    logger.error("Erreur sellers/:slug", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// GET /api/sellers/:slug/blocks/:blockId — single block for checkout page
sellersRouter.get("/:slug/blocks/:blockId", async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const { blockId } = req.params;

    const seller = await prisma.seller.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        slug: true,
        displayName: true,
        avatarUrl: true,
        themeId: true,
        themeFont: true,
        themeColors: true,
        bgImageUrl: true,
        headerLayout: true,
        imageStyle: true,
        timezone: true,
        plan: true,
        kycStatus: true,
        metaPixelId: true,
        googleAdsId: true,
        googleAnalyticsId: true,
        tiktokPixelId: true,
      },
    });

    if (!seller) {
      const redirect = await prisma.slugHistory.findUnique({
        where: { oldSlug: slug },
        select: { seller: { select: { slug: true, deletedAt: true } } },
      });
      if (redirect && !redirect.seller.deletedAt) {
        res.status(301).json({ redirect: redirect.seller.slug });
        return;
      }
      res.status(404).json({ error: "Page introuvable" });
      return;
    }

    const block = await prisma.block.findFirst({
      where: { id: blockId, sellerId: seller.id, isActive: true },
      include: {
        product: {
          select: {
            id: true,
            blockId: true,
            title: true,
            subtitle: true,
            description: true,
            price: true,
            currency: true,
            coverUrl: true,
            buttonText: true,
            ctaStyle: true,
            discountPrice: true,
            totalSales: true,
            leadFields: true,
            maxSubscribers: true,
            showSubscriberCount: true,
            videoUrl: true,
            checkoutSections: true,
            reviews: { orderBy: { position: "asc" } },
            orderBumps: {
              where: { isActive: true },
              take: 10,
              select: { id: true, title: true, description: true, price: true, isActive: true },
            },
          },
        },
        bookingService: {
          select: {
            id: true,
            blockId: true,
            title: true,
            description: true,
            price: true,
            currency: true,
            duration: true,
            location: true,
            coverUrl: true,
            buttonText: true,
            minAdvanceHours: true,
            videoUrl: true,
            checkoutSections: true,
            slots: true,
          },
        },
        community: {
          select: {
            id: true,
            sellerId: true,
            blockId: true,
            telegramChatTitle: true,
            title: true,
            description: true,
            coverUrl: true,
            priceAmount: true,
            currency: true,
            billingPeriod: true,
            subscribeFields: true,
            isActive: true,
            memberCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!block) {
      res.status(404).json({ error: "Bloc introuvable" });
      return;
    }

    res.set("Cache-Control", "public, s-maxage=5, stale-while-revalidate=10");
    res.json({ seller, block });
  } catch (err) {
    logger.error("Erreur sellers/:slug/blocks/:blockId", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// GET /api/sellers/:slug/availability — créneaux dispo booking
sellersRouter.get("/:slug/availability", async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
      res.status(400).json({ error: "serviceId et date requis" });
      return;
    }

    const seller = await prisma.seller.findFirst({ where: { slug, deletedAt: null } });
    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    const service = await prisma.bookingService.findUnique({
      where: { id: serviceId as string },
      include: { slots: true, block: { select: { sellerId: true } } },
    });

    // A7: Vérifier que le service appartient bien au seller demandé
    if (!service || service.block.sellerId !== seller.id) {
      res.status(404).json({ error: "Service introuvable" });
      return;
    }

    // H12: Parse date in seller's timezone (Africa/Dakar) to get correct day of week
    const sellerTz = seller.timezone || "Africa/Dakar";
    const targetDate = new Date(date as string);
    const dayOfWeek = new Date(
      targetDate.toLocaleString("en-US", { timeZone: sellerTz })
    ).getDay();

    // A12: Filter both recurring dayOfWeek slots AND specificDate slots matching the target date
    const targetDateStr = (date as string).slice(0, 10); // "YYYY-MM-DD"
    const daySlots = service.slots.filter((s) => {
      // Recurring slot: matches day of week and has no specificDate
      if (!s.specificDate && s.dayOfWeek === dayOfWeek) return true;
      // Specific date slot: matches the exact date
      if (s.specificDate) {
        const slotDate = new Date(s.specificDate).toISOString().slice(0, 10);
        return slotDate === targetDateStr;
      }
      return false;
    });

    // Récupérer les réservations existantes pour cette date
    const startOfDay = new Date(date as string + "T00:00:00");
    const endOfDay = new Date(date as string + "T23:59:59.999");

    const existingBookings = await prisma.order.findMany({
      where: {
        bookingServiceId: serviceId as string,
        bookingDate: { gte: startOfDay, lte: endOfDay },
        paymentStatus: { in: ["PAID", "PENDING"] },
        bookingCancelled: false,
      },
      select: { bookingDate: true, bookingDuration: true },
    });

    // Cache 15s — availability changes with bookings but short cache avoids hammering DB
    res.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
    res.json({ slots: daySlots, existingBookings });
  } catch (err) {
    logger.error("Erreur availability", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});


// ══════════════════════════════════════════════
// CODE DE RETRAIT (Withdrawal PIN)
// ══════════════════════════════════════════════

// ── GET /api/sellers/withdrawal-pin/status ──
sellersRouter.get("/withdrawal-pin/status", requireAuth, async (req, res) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: req.seller!.sub },
      select: { withdrawalPinHash: true },
    });
    res.json({ hasPin: !!seller?.withdrawalPinHash });
  } catch (err) {
    logger.error("Erreur withdrawal-pin status", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/sellers/withdrawal-pin — Créer ou modifier le code de retrait ──
const pinSchema = z.object({
  pin: z.string().length(4, "Le code doit contenir 4 chiffres").regex(/^\d{4}$/, "Le code doit contenir uniquement des chiffres"),
  currentPin: z.string().length(4).regex(/^\d{4}$/).optional(),
});

sellersRouter.post("/withdrawal-pin", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const data = pinSchema.parse(req.body);

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { withdrawalPinHash: true },
    });

    if (!seller) {
      res.status(404).json({ error: "Compte introuvable" });
      return;
    }

    // Si un code existe déjà, l'ancien code est requis pour le modifier
    if (seller.withdrawalPinHash) {
      if (!data.currentPin) {
        res.status(400).json({ error: "L'ancien code est requis pour modifier le code de retrait" });
        return;
      }
      const valid = await verifyPassword(data.currentPin, seller.withdrawalPinHash);
      if (!valid) {
        res.status(403).json({ error: "L'ancien code est incorrect" });
        return;
      }
    }

    const hash = await hashPassword(data.pin);
    await prisma.seller.update({
      where: { id: sellerId },
      data: { withdrawalPinHash: hash },
    });

    res.json({ message: seller.withdrawalPinHash ? "Code de retrait modifié" : "Code de retrait créé" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur withdrawal-pin create/update", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/sellers/withdrawal-pin/forgot — Envoyer un code de réinitialisation par email ──
const forgotPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("forgot-pin"),
  message: { error: "Trop de demandes. Réessaye dans 15 minutes." },
});

sellersRouter.post("/withdrawal-pin/forgot", forgotPinLimiter, verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { email: true, withdrawalPinHash: true },
    });

    if (!seller) {
      res.status(404).json({ error: "Compte introuvable" });
      return;
    }

    if (!seller.withdrawalPinHash) {
      res.status(400).json({ error: "Aucun code de retrait à réinitialiser" });
      return;
    }

    // Rate limit : 1 code par minute
    const recentCode = await prisma.verificationCode.findFirst({
      where: { email: seller.email, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
    });
    if (recentCode) {
      res.status(429).json({ error: "Attends 1 minute avant de renvoyer un code." });
      return;
    }

    const code = generateVerificationCode();

    await prisma.verificationCode.create({
      data: {
        email: seller.email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    queueAuthEmail({
      to: seller.email,
      subject: "Réinitialisation du code de retrait — Izy Store",
      html: `<h2>Code de retrait oublié</h2>
        <p>Entre ce code pour réinitialiser ton code de retrait :</p>
        <div style="margin:20px 0;padding:20px;background-color:#F0FDFA;border-radius:12px;text-align:center;">
          <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#0D9488;">${code}</span>
        </div>
        <p style="font-size:13px;color:#9CA3AF;">Ce code expire dans 10 minutes.</p>
        <p style="font-size:13px;color:#9CA3AF;">Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>`,
    });

    res.json({ message: "Un code de réinitialisation a été envoyé sur ton email." });
  } catch (err) {
    logger.error("Erreur withdrawal-pin forgot", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/sellers/withdrawal-pin/reset — Réinitialiser le code avec le code email ──
const resetPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("reset-pin"),
  message: { error: "Trop de tentatives. Réessaye plus tard." },
});

const resetPinSchema = z.object({
  code: z.string().length(6, "Code à 6 chiffres"),
  newPin: z.string().length(4, "Le code doit contenir 4 chiffres").regex(/^\d{4}$/, "Le code doit contenir uniquement des chiffres"),
});

sellersRouter.post("/withdrawal-pin/reset", resetPinLimiter, verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const data = resetPinSchema.parse(req.body);

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { email: true },
    });

    if (!seller) {
      res.status(404).json({ error: "Compte introuvable" });
      return;
    }

    // Vérifier le code email (S7: timing-safe + usedAt + attempts guard)
    const latestCode = await prisma.verificationCode.findFirst({
      where: { email: seller.email, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!latestCode) {
      res.status(400).json({ error: "Code invalide ou expiré" });
      return;
    }

    if (latestCode.attempts >= 5) {
      res.status(429).json({ error: "Trop de tentatives. Demande un nouveau code." });
      return;
    }

    // S7: Timing-safe code comparison
    if (!timingSafeCompare(latestCode.code, data.code)) {
      await prisma.verificationCode.update({
        where: { id: latestCode.id },
        data: { attempts: { increment: 1 } },
      });
      res.status(400).json({ error: "Code incorrect" });
      return;
    }

    // Marquer le code comme utilisé
    await prisma.verificationCode.update({
      where: { id: latestCode.id },
      data: { usedAt: new Date() },
    });

    // Hasher et sauvegarder le nouveau PIN
    const hash = await hashPassword(data.newPin);
    await prisma.seller.update({
      where: { id: sellerId },
      data: { withdrawalPinHash: hash },
    });

    res.json({ message: "Code de retrait réinitialisé avec succès" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur withdrawal-pin reset", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
