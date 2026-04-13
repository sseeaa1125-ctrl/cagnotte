import "dotenv/config";
import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { blocksRouter } from "./routes/blocks.js";
import { ordersRouter } from "./routes/orders.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { uploadRouter } from "./routes/upload.js";
import { sellersRouter } from "./routes/sellers.js";
import { customersRouter } from "./routes/customers.js";
import { withdrawalsRouter } from "./routes/withdrawals.js";
import { analyticsRouter } from "./routes/analytics.js";
import { googleAuthRouter } from "./routes/google-auth.js";
import { devRouter } from "./routes/dev.js";
import { filesRouter } from "./routes/files.js";
import { partnershipsRouter } from "./routes/partnerships.js";
import { leadsRouter } from "./routes/leads.js";
import { telegramRouter } from "./routes/telegram.js";
import { communitiesRouter } from "./routes/communities.js";
import { telegramWebhooksRouter } from "./routes/webhooksTelegram.js";
import { adminRouter } from "./routes/admin/index.js";
import { reportsRouter } from "./routes/reports.js";
import { inboxRouter } from "./routes/inbox.js";
import { linkPreviewRouter } from "./routes/linkPreview.js";
import { integrationsRouter } from "./routes/integrations.js";
import { notificationsRouter } from "./routes/notifications.js";
import { verifyCsrf } from "./lib/auth.js";
import { RedisRateLimitStore } from "./lib/rateLimitStore.js";
import { requireAuth } from "./middleware/auth.js";
import { requireAdmin } from "./middleware/adminAuth.js";
import { runCommunityBilling } from "./lib/cron/communityBilling.js";
import { getEmailQueueStats, getCommunityQueueStats } from "./lib/queues/index.js";
import { prisma } from "./lib/prisma.js";
import * as logger from "./lib/logger.js";
import { decrypt } from "./lib/crypto.js";
import { TelegramService } from "./lib/telegram.js";

// v2 — force tsx reload
const app = express();
// Trust first proxy (Railway) — needed for rate limiting + secure cookies in production
app.set("trust proxy", 1);
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// L7: Support multiple origins (comma-separated in env, e.g. "https://izy.store,https://www.izy.store")
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || FRONTEND_URL)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Sécurité HTTP headers — relax cross-origin pour permettre uploads depuis le frontend
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS — autorise le frontend (multi-origin)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    maxAge: 86400, // Cache CORS preflight 24h — évite OPTIONS+POST sur chaque requête cross-origin
  })
);

// IMM-6: Gzip compression for all JSON responses
app.use(compression());

// Parse JSON (sauf pour les webhooks qui ont besoin du raw body)
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cookieParser());

// Serve R2 files via proxy (no auth needed, public access)
app.use("/api/files", filesRouter);

// Intercept upload responses to ensure proxy URLs are returned (not direct R2 URLs)
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
app.use("/api/upload", (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body: Record<string, unknown>) => {
    if (body && typeof body === "object" && typeof body.url === "string" && body.url.includes(R2_PUBLIC_URL) && R2_PUBLIC_URL) {
      const key = (body.url as string).replace(`${R2_PUBLIC_URL}/`, "");
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
      body.url = `${backendUrl}/api/files/${key}`;
    }
    return originalJson(body);
  };
  next();
});

// ── Rate limiters ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("global"),
  message: { error: "Trop de requêtes, réessaye dans quelques minutes." },
  // S22: Skip routes that have their own rate limiter to avoid ERR_ERL_DOUBLE_COUNT
  // Note: req.originalUrl is the full path, req.path is relative to mount point
  skip: (req) => {
    const url = req.originalUrl || req.url;
    return url.startsWith("/api/withdrawals") || url.startsWith("/api/orders") || url.startsWith("/api/communities") || url.startsWith("/api/auth") || url.startsWith("/api/inbox") || url.startsWith("/api/partnerships");
  },
});
app.use("/api", globalLimiter);

const trackLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("track"),
  message: { error: "Trop de requêtes" },
});

// R1: Rate limiter for write-heavy endpoints (blocks, withdrawals, sellers profile, uploads)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("write"),
  message: { error: "Trop de modifications. Réessaye dans une minute." },
});

// Auth routes — each endpoint has its own dedicated rate limiter (signup, login, forgot-password, etc.)
app.use("/api/auth", authRouter, googleAuthRouter);
// S6: CSRF protection on authenticated mutation routes
app.use("/api/sellers", writeLimiter, verifyCsrf, sellersRouter);
app.use("/api/blocks", writeLimiter, verifyCsrf, blocksRouter);
app.use("/api/orders", ordersRouter); // Public order creation (unauthenticated) — CSRF not needed
app.use("/api/webhooks", webhooksRouter); // Webhook signature verification — no cookies
app.use("/api/upload", writeLimiter, verifyCsrf, uploadRouter);
app.use("/api/customers", verifyCsrf, customersRouter);
app.use("/api/withdrawals", verifyCsrf, withdrawalsRouter);
app.use("/api/analytics", trackLimiter, analyticsRouter);
app.use("/api/partnerships", partnershipsRouter); // Public POST + auth GET/PUT
app.use("/api/leads", verifyCsrf, leadsRouter);
app.use("/api/telegram", verifyCsrf, telegramRouter);
app.use("/api/communities", communitiesRouter); // Limiters dédiés dans le router (subscribe, cancel, regenerate) — pas de writeLimiter global pour éviter ERR_ERL_DOUBLE_COUNT
app.use("/api/webhooks/telegram", telegramWebhooksRouter); // Telegram webhook — no CSRF
app.use("/api/admin", adminRouter); // Admin routes — auth handled by requireAdmin middleware
app.use("/api/reports", reportsRouter); // reportLimiter dédié dans le router — pas de writeLimiter pour éviter ERR_ERL_DOUBLE_COUNT
app.use("/api/inbox", writeLimiter, inboxRouter);
app.use("/api/link-preview", writeLimiter, linkPreviewRouter); // Public report submission — no auth, rate limited
app.use("/api/integrations", integrationsRouter); // Google Calendar OAuth — callback is public, rest is authenticated
app.use("/api/notifications", notificationsRouter); // Push notifications — VAPID key is public, subscribe/unsubscribe authenticated

// Dev tools — STRICTEMENT hors production (double guard)
// S21: Même si NODE_ENV n'est pas set, on bloque en prod si BACKEND_URL contient un domaine réel
const isProduction = process.env.NODE_ENV === "production" || (process.env.BACKEND_URL || "").includes("railway.app");
if (!isProduction) {
  app.use("/api/dev", devRouter);
} else {
  // En production, retourner 404 pour toutes les routes dev
  app.use("/api/dev", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
}

// Redirection post-paiement Bictorys
// Bictorys redirige vers ngrok (backend), on redirige vers le frontend
app.get("/:slug/pending", (req, res) => {
  const { slug } = req.params;
  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(302, `${FRONTEND_URL}/${slug}/pending${query ? `?${query}` : ""}`);
});
app.get("/:slug/success", (req, res) => {
  const { slug } = req.params;
  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(302, `${FRONTEND_URL}/${slug}/success${query ? `?${query}` : ""}`);
});
app.get("/:slug/community-success", (req, res) => {
  const { slug } = req.params;
  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(302, `${FRONTEND_URL}/${slug}/community-success${query ? `?${query}` : ""}`);
});
app.get("/:slug/error", (req, res) => {
  const { slug } = req.params;
  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(302, `${FRONTEND_URL}/${slug}/error${query ? `?${query}` : ""}`);
});

// ── GET /api/payment-methods — Config publique des moyens de paiement actifs ──
app.get("/api/payment-methods", async (_req, res) => {
  try {
    const row = await prisma.platformConfig.findUnique({
      where: { key: "payment_methods" },
    });

    // Défaut si pas encore configuré via l'admin
    const defaultConfig = {
      activeCountries: ["SN", "CI", "OTHER"],
      countryOperators: {
        SN: ["wave_money", "orange_money", "maxit", "card"],
        CI: ["wave_money", "orange_money", "mtn_money", "card"],
        OTHER: ["card"],
      },
    };

    const config = row ? row.value : defaultConfig;
    res.json(config);
  } catch (err) {
    logger.error("Erreur lecture payment methods", err);
    // Fallback safe — toujours retourner quelque chose
    res.json({
      activeCountries: ["SN", "CI", "OTHER"],
      countryOperators: {
        SN: ["wave_money", "orange_money", "maxit", "card"],
        CI: ["wave_money", "orange_money", "mtn_money", "card"],
        OTHER: ["card"],
      },
    });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Queue stats (monitoring) — protégé, sera réservé au dashboard admin
app.get("/api/queues/stats", requireAdmin, async (_req, res) => {
  const [email, community] = await Promise.all([
    getEmailQueueStats(),
    getCommunityQueueStats(),
  ]);
  res.json({ email, community, timestamp: new Date().toISOString() });
});

// A9: Expiration automatique des commandes PENDING > 30min
// Exécuté toutes les 5 minutes
async function expirePendingOrders() {
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const result = await prisma.order.updateMany({
      where: {
        paymentStatus: "PENDING",
        createdAt: { lt: thirtyMinAgo },
      },
      data: { paymentStatus: "EXPIRED" },
    });
    if (result.count > 0) {
      logger.log(`[A9] ${result.count} commande(s) PENDING expirée(s)`);
    }
  } catch (err) {
    logger.error("[A9] Erreur expiration commandes:", err);
  }
}

// A15: Clean up expired VerificationCodes periodically
async function cleanupExpiredCodes() {
  try {
    const result = await prisma.verificationCode.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      logger.log(`[A15] ${result.count} code(s) de vérification expiré(s) supprimé(s)`);
    }
  } catch (err) {
    logger.error("[A15] Erreur nettoyage codes:", err);
  }
}

// S20: Nettoyage PageView + BlockClick > 12 mois — garde la DB légère
async function cleanupOldAnalytics() {
  try {
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const [pv, bc] = await Promise.all([
      prisma.pageView.deleteMany({ where: { createdAt: { lt: twelveMonthsAgo } } }),
      prisma.blockClick.deleteMany({ where: { createdAt: { lt: twelveMonthsAgo } } }),
    ]);
    if (pv.count > 0 || bc.count > 0) {
      logger.log(`[S20] Nettoyage analytics: ${pv.count} pageViews + ${bc.count} blockClicks > 12 mois supprimés`);
    }
  } catch (err) {
    logger.error("[S20] Erreur nettoyage analytics:", err);
  }
}

// H14: Nettoyage des WebhookLog > 90 jours
async function cleanupOldWebhookLogs() {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await prisma.webhookLog.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    });
    if (result.count > 0) {
      logger.log(`[H14] ${result.count} webhook log(s) > 90 jours supprimé(s)`);
    }
  } catch (err) {
    logger.error("[H14] Erreur nettoyage webhook logs:", err);
  }
}

// ─────────────────────────────────────────────────
// D2 NOTE: Crons basés sur setInterval — limites connues :
//   1. Si le process redémarre, les timers sont perdus (aucun rattrapage).
//   2. Pas de garantie d'exécution unique en multi-instance.
//   3. Un job bloqué ne bloque pas les suivants (async), mais un crash process = perte.
// TODO (V2): Migrer vers un scheduler externe (ex: Quirrel, BullMQ, Railway Cron)
//   pour garantir at-least-once execution et observabilité.
// ─────────────────────────────────────────────────
// Run cleanup every 5 minutes
setInterval(expirePendingOrders, 5 * 60 * 1000);
// Run code cleanup every hour
setInterval(cleanupExpiredCodes, 60 * 60 * 1000);
// Community billing cron — run every 1 hour (H7: ensure J-3 window is not missed)
setInterval(runCommunityBilling, 1 * 60 * 60 * 1000);
// H14: Nettoyage webhook logs — toutes les 6 heures
setInterval(cleanupOldWebhookLogs, 6 * 60 * 60 * 1000);
// S20: Nettoyage analytics > 12 mois — toutes les 24 heures
setInterval(cleanupOldAnalytics, 24 * 60 * 60 * 1000);
// Run once on startup after a short delay
setTimeout(expirePendingOrders, 10_000);
setTimeout(cleanupExpiredCodes, 15_000);
// H7: Run billing cron after 5 min in dev to avoid noise during restarts, 30s in prod
setTimeout(runCommunityBilling, isProduction ? 30_000 : 5 * 60 * 1000);
setTimeout(cleanupOldWebhookLogs, 45_000);
setTimeout(cleanupOldAnalytics, 60_000);

// Option C: re-register Telegram webhooks at startup (only if BACKEND_URL is HTTPS)
setTimeout(async () => {
  const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  if (!BACKEND_URL.startsWith("https://")) {
    logger.log("[Startup] Skip webhook re-registration (BACKEND_URL pas HTTPS — dev local)");
    return;
  }
  try {
    const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
    const bots = await prisma.telegramBot.findMany({ select: { id: true, botToken: true, botUsername: true } });
    let updated = 0;
    for (const bot of bots) {
      try {
        const token = decrypt(bot.botToken);
        const telegram = new TelegramService(token);
        // Utiliser le chemin "central" pour le bot partagé
        const webhookUrl = `${BACKEND_URL}/api/webhooks/telegram/central`;
        await telegram.setWebhook(webhookUrl, TELEGRAM_WEBHOOK_SECRET);
        updated++;
        // Délai entre chaque appel pour éviter le rate limit Telegram
        if (bots.length > 1) await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        logger.warn(`[Startup] Erreur re-register webhook bot=${bot.botUsername}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }
    if (updated > 0) logger.log(`[Startup] ${updated}/${bots.length} webhooks Telegram re-registered`);
  } catch (err) {
    logger.error("[Startup] Erreur migration webhooks Telegram", err);
  }
}, 20_000);

app.listen(PORT, () => {
  console.log(`🚀 Izy Backend running on http://localhost:${PORT}`);
});
