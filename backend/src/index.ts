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
import { notificationsRouter } from "./routes/notifications.js";
import { adminRouter } from "./routes/admin/index.js";
import { verifyCsrf } from "./lib/auth.js";
import { RedisRateLimitStore } from "./lib/rateLimitStore.js";
import { requireAuth } from "./middleware/auth.js";
import { getEmailQueueStats } from "./lib/queues/index.js";
import { prisma } from "./lib/prisma.js";
import * as logger from "./lib/logger.js";
// Phase 2 plan 02-02 — ending-soon cron (NOTF-04 + P14 boot catch-up)
import { runEndingSoonSweep } from "./lib/notifications/endingSoonCron.js";
// Audit 026 MED-1 — cagnotte-ended cron (fires CAGNOTTE_ENDED when endDate passes)
import { runCagnotteEndedSweep } from "./lib/notifications/endedCron.js";
// Audit 017 — réconciliation des withdrawals bloqués en PENDING/PROCESSING
import { checkPayoutStatus } from "./lib/payout.js";
import {
  firePayoutCompleted,
  firePayoutFailed,
} from "./lib/notifications/dispatch.js";

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

// Audit 2026-04-14 #21 — boot guard: refuse to start if CORS is wide open in
// production. A wildcard "*" with credentials:true breaks the browser CORS
// preflight contract anyway, but a too-permissive allow-list (multiple unknown
// origins, an empty list, or a literal "*") would silently accept anyone.
if (process.env.NODE_ENV === "production") {
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes("*")) {
    throw new Error(
      "ALLOWED_ORIGINS must list explicit production origins. Wildcard '*' is forbidden in production.",
    );
  }
  if (ALLOWED_ORIGINS.some((o) => !/^https:\/\//.test(o))) {
    throw new Error(
      "ALLOWED_ORIGINS must contain HTTPS-only origins in production.",
    );
  }
}

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

// ── Correlation ID middleware — attaches a unique request ID to every log ──
import crypto from "crypto";
import { setRequestId } from "./lib/logger.js";

app.use((req, res, next) => {
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID().slice(0, 8);
  res.setHeader("x-request-id", requestId);
  setRequestId(requestId, () => next());
});

// Top-level health check — placed BEFORE rate limiters so platform probes
// (Railway, Uptime Robot, load balancers) never get throttled. Returns
// minimal payload so this doesn't surface internal state.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

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
  // Opt out of doubleCount validation: writeLimiter is mounted on multiple
  // /api/* subroutes under globalLimiter's umbrella, and express-rate-limit
  // incorrectly flags a single request passing through both as a "double
  // count" (ERR_ERL_DOUBLE_COUNT). The two limiters are actually separate
  // instances with distinct Redis keys ("global" vs "write"), so the
  // counting is correct — only the validator is confused.
  validate: { singleCount: false },
  message: { error: "Trop de requêtes, réessaye dans quelques minutes." },
  skip: (req) => {
    const url = req.originalUrl || req.url;
    // Public read-only GETs on /api/cagnottes are skipped: the Next.js
    // server-side fetches (LP `getFeatured`, /cagnottes `getInitial`) all
    // come from a single IP and would saturate the 300/15min budget at
    // modest traffic (cf. audit-020 HIGH-1). The endpoint is read-only,
    // no mutation path goes through here.
    if (req.method === "GET" && url.startsWith("/api/cagnottes")) return true;
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
  // Same doubleCount opt-out as globalLimiter — see comment above.
  validate: { singleCount: false },
  message: { error: "Trop de modifications. Réessaye dans une minute." },
});

// Routes
// Admin routes — mounted before seller routes, own CSRF via adminAuth.
app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/sellers", writeLimiter, verifyCsrf, sellersRouter);
app.use("/api/notifications", writeLimiter, verifyCsrf, notificationsRouter); // Phase 2 02-02
app.use("/api/blocks", writeLimiter, verifyCsrf, blocksRouter);
app.use("/api/orders", ordersRouter); // Public order creation — CSRF not needed
app.use("/api/cagnottes", cagnottesRouter); // Phase 2 02-01 — public GET-only, picks up global limiter
app.use("/api/webhooks", webhooksRouter); // Webhook signature verification — no cookies
app.use("/api/upload", writeLimiter, verifyCsrf, uploadRouter);
// Audit 030 HI-07 — requireAuth at mount level (defense-in-depth)
app.use("/api/withdrawals", requireAuth, verifyCsrf, withdrawalsRouter);

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

// GET /api/payment-methods — Public payment config.
// cagnottes.sn v1 — Senegalese mobile money only. 3 canaux Bictorys:
// Wave, Orange Money, Maxit (nouveau nom SN d'Orange Money, canal dédié
// chez Bictorys). Ni Free Money ni Moov — pas opérés au Sénégal. Bank
// cards sont désactivées.
app.get("/api/payment-methods", (_req, res) => {
  res.json({
    activeCountries: ["SN"],
    countryOperators: {
      SN: ["wave_money", "orange_money", "maxit"],
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

// Audit 034 — Process PENDING withdrawals after 48h delay.
//
// Withdrawals are now created in PENDING status without calling Bictorys.
// This cron picks up PENDING withdrawals older than 48h (that have NOT been
// cancelled by admin) and submits them to Bictorys. This gives the admin
// a 48h window to cancel suspicious withdrawals.
//
// The cron also handles reconciliation of PROCESSING withdrawals (submitted
// to Bictorys but not yet terminal).
import { initiatePayout, parseBictorysPayoutError } from "./lib/payout.js";
import { getCountryFromPhone } from "./lib/phone.js";

const WITHDRAWAL_DELAY_MS = 48 * 60 * 60 * 1000; // 48 hours

async function processReadyWithdrawals() {
  const cutoff = new Date(Date.now() - WITHDRAWAL_DELAY_MS);
  const BATCH = 10;

  // Find PENDING withdrawals older than 48h that haven't been submitted yet
  const ready = await prisma.withdrawal.findMany({
    where: {
      status: "PENDING",
      bictorysTransactionId: null, // not yet submitted
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      sellerId: true,
      reference: true,
      amount: true,
      provider: true,
      phone: true,
      recipientName: true,
      idempotencyKey: true,
    },
    take: BATCH,
    orderBy: { createdAt: "asc" },
  });

  if (ready.length === 0) return;
  logger.log(`[process-withdrawals] ${ready.length} retrait(s) pret(s) apres 48h`);

  for (const w of ready) {
    try {
      const dispatchPayload = {
        id: w.id,
        sellerId: w.sellerId,
        amount: w.amount,
        phone: w.phone,
        provider: w.provider,
      };

      const payoutCountry = getCountryFromPhone(w.phone);

      const result = await initiatePayout(
        {
          amount: w.amount,
          phone: w.phone,
          operator: w.provider,
          recipientName: w.recipientName || "Vendeur",
          merchantReference: w.reference,
          country: payoutCountry,
        },
        w.idempotencyKey || w.reference,
      );

      if (result.success) {
        await prisma.withdrawal.update({
          where: { id: w.id },
          data: {
            status: "COMPLETED",
            bictorysTransactionId: result.data?.id || null,
            merchantFee: result.data?.merchantFee || 0,
            processedAt: new Date(),
          },
        });
        firePayoutCompleted(dispatchPayload).catch((err) =>
          logger.error("[process-withdrawals] firePayoutCompleted", err),
        );
        logger.log(`[process-withdrawals] ${w.reference} COMPLETED`);
      } else {
        const userMessage = parseBictorysPayoutError(result.httpStatus, result.error);
        const failureReason = result.error?.slice(0, 500) || "Erreur Bictorys";
        await prisma.withdrawal.update({
          where: { id: w.id },
          data: {
            status: "REJECTED",
            failureReason,
            processedAt: new Date(),
          },
        });
        firePayoutFailed(dispatchPayload, userMessage).catch((err) =>
          logger.error("[process-withdrawals] firePayoutFailed", err),
        );
        logger.log(`[process-withdrawals] ${w.reference} REJECTED — ${failureReason}`);
      }
    } catch (err) {
      logger.error(
        `[process-withdrawals] erreur sur ${w.reference}`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// Reconcile PROCESSING withdrawals (submitted to Bictorys but status unknown)
async function reconcileStaleWithdrawals() {
  const STALE_MS = 10 * 60 * 1000; // 10 min after submission
  const cutoff = new Date(Date.now() - STALE_MS);
  const BATCH = 20;

  // Only reconcile withdrawals that HAVE a bictorysTransactionId (already submitted)
  const stale = await prisma.withdrawal.findMany({
    where: {
      status: { in: ["PROCESSING"] },
      bictorysTransactionId: { not: null },
      updatedAt: { lt: cutoff },
    },
    select: {
      id: true,
      sellerId: true,
      reference: true,
      amount: true,
      provider: true,
      phone: true,
      bictorysTransactionId: true,
    },
    take: BATCH,
    orderBy: { updatedAt: "asc" },
  });

  if (stale.length === 0) return;
  logger.log(`[reconcile-withdrawals] ${stale.length} candidat(s)`);

  for (const w of stale) {
    try {
      const dispatchPayload = {
        id: w.id,
        sellerId: w.sellerId,
        amount: w.amount,
        phone: w.phone,
        provider: w.provider,
      };

      const status = await checkPayoutStatus(w.bictorysTransactionId!);
      if (!status) continue;
      if (status.status === "pending") continue;

      if (status.status === "succeeded") {
        await prisma.withdrawal.update({
          where: { id: w.id },
          data: { status: "COMPLETED", processedAt: new Date() },
        });
        firePayoutCompleted(dispatchPayload).catch((err) =>
          logger.error("[reconcile-withdrawals] firePayoutCompleted", err),
        );
        logger.log(`[reconcile-withdrawals] ${w.reference} réconcilié COMPLETED`);
      } else {
        const reason = status.reason || "Rejeté par le provider";
        await prisma.withdrawal.update({
          where: { id: w.id },
          data: {
            status: "REJECTED",
            failureReason: reason,
            processedAt: new Date(),
          },
        });
        firePayoutFailed(dispatchPayload, reason).catch((err) =>
          logger.error("[reconcile-withdrawals] firePayoutFailed", err),
        );
        logger.log(`[reconcile-withdrawals] ${w.reference} réconcilié REJECTED`);
      }
    } catch (err) {
      logger.error(
        `[reconcile-withdrawals] erreur sur ${w.reference}`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// Schedule crons — Audit 015 B-02: the three cron bodies above already wrap
// their work in try/catch, so a rejection is theoretically impossible. The
// .catch() below is defense-in-depth against a future refactor that drops
// the internal try — an unhandled rejection would crash the process on Node
// 20+ (unhandledRejection=throw default).
const safeCron = (fn: () => Promise<void>, label: string) => () =>
  fn().catch((err) => logger.error(`[${label}-cron]`, err));

setInterval(safeCron(expirePendingOrders, "expire-pending"), 5 * 60 * 1000);
setInterval(safeCron(cleanupExpiredCodes, "cleanup-codes"), 60 * 60 * 1000);
setInterval(safeCron(cleanupOldWebhookLogs, "cleanup-webhooks"), 6 * 60 * 60 * 1000);
// Audit 034 — process PENDING withdrawals after 48h delay, every 15 min.
setInterval(safeCron(processReadyWithdrawals, "process-withdrawals"), 15 * 60 * 1000);
// Reconcile PROCESSING withdrawals every 5 min.
setInterval(safeCron(reconcileStaleWithdrawals, "reconcile-withdrawals"), 5 * 60 * 1000);
setTimeout(safeCron(expirePendingOrders, "expire-pending-boot"), 10_000);
setTimeout(safeCron(cleanupExpiredCodes, "cleanup-codes-boot"), 15_000);
setTimeout(safeCron(cleanupOldWebhookLogs, "cleanup-webhooks-boot"), 45_000);
setTimeout(safeCron(processReadyWithdrawals, "process-withdrawals-boot"), 30_000);
setTimeout(safeCron(reconcileStaleWithdrawals, "reconcile-withdrawals-boot"), 60_000);

// Phase 2 plan 02-02 — ending-soon notification sweep (NOTF-04).
// Hourly + 30s boot catch-up so cagnottes that entered the J-3 window during
// downtime are still picked up on next start (P14 mitigation). Block.endingSoonNotifiedAt
// is the dedupe field; Notification.dedupeKey is the secondary safety net.
setInterval(() => {
  runEndingSoonSweep().catch((err) => logger.error("[ending-soon-cron]", err));
}, 60 * 60 * 1000);
setTimeout(() => {
  runEndingSoonSweep().catch((err) => logger.error("[ending-soon-boot-catchup]", err));
}, 30_000);

// Audit 026 MED-1 — cagnotte-ended notification sweep.
// Same hourly + boot catch-up pattern. Fires CAGNOTTE_ENDED once per block
// when config.endDate passes. Block.endedNotifiedAt is the dedupe field;
// Notification.dedupeKey(`cagnotte_ended:{blockId}`) is the secondary safety
// net. Boot catch-up staggered 15s after the ending-soon catch-up so both
// crons don't hit the DB on the same tick at startup.
setInterval(() => {
  runCagnotteEndedSweep().catch((err) => logger.error("[cagnotte-ended-cron]", err));
}, 60 * 60 * 1000);
setTimeout(() => {
  runCagnotteEndedSweep().catch((err) => logger.error("[cagnotte-ended-boot-catchup]", err));
}, 45_000);

// ── Audit 030 CR-04 — Global error handler (must be 4-arg for Express) ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("[unhandled-route-error]", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Erreur interne du serveur" });
});

const server = app.listen(PORT, () => {
  logger.log(`🚀 Cagnottes.sn Backend running on http://localhost:${PORT}`);
});

// ── Audit 030 CR-05 — Graceful shutdown ──
async function gracefulShutdown(signal: string) {
  logger.log(`[shutdown] ${signal} received, draining...`);
  server.close(() => logger.log("[shutdown] HTTP server closed"));
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("[unhandledRejection]", reason instanceof Error ? reason : new Error(String(reason)));
});
