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
import { cagnottesRouter } from "./routes/cagnottes.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { uploadRouter } from "./routes/upload.js";
import { sellersRouter } from "./routes/sellers.js";
import { withdrawalsRouter } from "./routes/withdrawals.js";
import { filesRouter } from "./routes/files.js";
import { verifyCsrf } from "./lib/auth.js";
import { RedisRateLimitStore } from "./lib/rateLimitStore.js";
import { requireAuth } from "./middleware/auth.js";
import { getEmailQueueStats } from "./lib/queues/index.js";
import { prisma } from "./lib/prisma.js";
import * as logger from "./lib/logger.js";

const app = express();
// Trust first proxy (Railway) — needed for rate limiting + secure cookies in production
app.set("trust proxy", 1);
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Support multiple origins (comma-separated in env)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || FRONTEND_URL)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    maxAge: 86400,
  })
);

app.use(compression());

// Raw body for webhooks (Bictorys signature verification needs the raw payload)
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cookieParser());

// Serve R2 files via proxy (no auth needed, public access)
app.use("/api/files", filesRouter);

// Intercept upload responses to rewrite direct R2 URLs as proxy URLs
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

// ── Rate limiters (Upstash Redis-backed) ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("global"),
  message: { error: "Trop de requêtes, réessaye dans quelques minutes." },
  skip: (req) => {
    const url = req.originalUrl || req.url;
    return url.startsWith("/api/withdrawals") || url.startsWith("/api/orders") || url.startsWith("/api/auth");
  },
});
app.use("/api", globalLimiter);

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("write"),
  message: { error: "Trop de modifications. Réessaye dans une minute." },
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/sellers", writeLimiter, verifyCsrf, sellersRouter);
app.use("/api/blocks", writeLimiter, verifyCsrf, blocksRouter);
app.use("/api/orders", ordersRouter); // Public order creation — CSRF not needed
app.use("/api/cagnottes", cagnottesRouter); // Phase 2 02-01 — public GET-only, picks up global limiter
app.use("/api/webhooks", webhooksRouter); // Webhook signature verification — no cookies
app.use("/api/upload", writeLimiter, verifyCsrf, uploadRouter);
app.use("/api/withdrawals", verifyCsrf, withdrawalsRouter);

// Redirection post-paiement Bictorys (ngrok → frontend)
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
app.get("/:slug/error", (req, res) => {
  const { slug } = req.params;
  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(302, `${FRONTEND_URL}/${slug}/error${query ? `?${query}` : ""}`);
});

// GET /api/payment-methods — Public payment config (Wave, Orange Money, Free Money, card)
app.get("/api/payment-methods", (_req, res) => {
  res.json({
    activeCountries: ["SN", "CI", "OTHER"],
    countryOperators: {
      SN: ["wave_money", "orange_money", "maxit", "card"],
      CI: ["wave_money", "orange_money", "mtn_money", "card"],
      OTHER: ["card"],
    },
  });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Queue stats (monitoring) — authenticated
app.get("/api/queues/stats", requireAuth, async (_req, res) => {
  const email = await getEmailQueueStats();
  res.json({ email, timestamp: new Date().toISOString() });
});

// ── Background jobs (setInterval-based — lost on restart) ──

// Expire PENDING orders > 10min (Phase 2 plan 02-01: was 30min, reduced to
// 10min per DONA-05 + P07 mitigation — caps stale-row buildup under DDoS).
// The 5-minute setInterval tick below is unchanged: a worst-case order can
// linger ~14m45s before being collected (10min TTL + 5min tick lag), still
// well under the legacy 30min ceiling.
async function expirePendingOrders() {
  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const result = await prisma.order.updateMany({
      where: {
        paymentStatus: "PENDING",
        createdAt: { lt: tenMinAgo },
      },
      data: { paymentStatus: "EXPIRED" },
    });
    if (result.count > 0) {
      logger.log(`[expirePendingOrders] ${result.count} commande(s) PENDING expirée(s)`);
    }
  } catch (err) {
    logger.error("[expirePendingOrders] Erreur:", err);
  }
}

// Clean up expired VerificationCodes
async function cleanupExpiredCodes() {
  try {
    const result = await prisma.verificationCode.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      logger.log(`[cleanupExpiredCodes] ${result.count} code(s) expiré(s)`);
    }
  } catch (err) {
    logger.error("[cleanupExpiredCodes] Erreur:", err);
  }
}

// Clean up WebhookLog > 90 days
async function cleanupOldWebhookLogs() {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await prisma.webhookLog.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    });
    if (result.count > 0) {
      logger.log(`[cleanupOldWebhookLogs] ${result.count} webhook log(s) supprimé(s)`);
    }
  } catch (err) {
    logger.error("[cleanupOldWebhookLogs] Erreur:", err);
  }
}

// Schedule crons
setInterval(expirePendingOrders, 5 * 60 * 1000);
setInterval(cleanupExpiredCodes, 60 * 60 * 1000);
setInterval(cleanupOldWebhookLogs, 6 * 60 * 60 * 1000);
setTimeout(expirePendingOrders, 10_000);
setTimeout(cleanupExpiredCodes, 15_000);
setTimeout(cleanupOldWebhookLogs, 45_000);

app.listen(PORT, () => {
  console.log(`🚀 Cagnottes.sn Backend running on http://localhost:${PORT}`);
});
