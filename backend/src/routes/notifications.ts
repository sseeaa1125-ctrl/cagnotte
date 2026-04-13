/**
 * Notifications API — Phase 2 plan 02-02 (NOTF-01..05, NOTF-11, NOTF-12).
 *
 * Authed creator-only feed surface. All handlers run behind requireAuth +
 * the parent verifyCsrf middleware mounted in index.ts. Every query filters
 * by `sellerId: req.seller!.sub` so cross-seller leaks are impossible
 * (T-02-14 mitigation).
 *
 * Endpoints:
 *   GET    /api/notifications              cursor-paginated feed
 *   GET    /api/notifications/count        { total, unread }
 *   POST   /api/notifications/mark-read    { ids?: string[], all?: boolean }
 *   GET    /api/notifications/prefs        Seller.notificationPrefs
 *   PATCH  /api/notifications/prefs        merge prefs JSON
 *
 * Note on `readAt`: the Notification model uses a nullable timestamp
 * (`readAt DateTime?`) rather than a boolean. "Unread" = `readAt: null`.
 * The mark-read mutation sets it to `now()`.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";

export const notificationsRouter = Router();

// All handlers require auth — req.seller!.sub is the sellerId post-middleware.
notificationsRouter.use(requireAuth);

// ── GET / — cursor-paginated feed ──
notificationsRouter.get("/", async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const cursor = (req.query.cursor as string) || undefined;
    const rawLimit = parseInt((req.query.limit as string) || "20", 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 20 : rawLimit, 1), 100);

    const items = await prisma.notification.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        icon: true,
        blockId: true,
        orderId: true,
        withdrawalId: true,
        data: true,
        readAt: true,
        createdAt: true,
      },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

    // Cheap unread badge for the same response — saves a /count round-trip
    // on the most common entry path (open the feed → know if anything's new).
    const hasUnread = await prisma.notification.findFirst({
      where: { sellerId, readAt: null },
      select: { id: true },
    });

    res.json({
      items: trimmed,
      nextCursor,
      hasUnread: !!hasUnread,
    });
  } catch (err) {
    logger.error("[notifications] GET /", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /count — { total, unread } badge data ──
notificationsRouter.get("/count", async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const [total, unread] = await Promise.all([
      prisma.notification.count({ where: { sellerId } }),
      prisma.notification.count({ where: { sellerId, readAt: null } }),
    ]);
    res.json({ total, unread });
  } catch (err) {
    logger.error("[notifications] GET /count", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /mark-read — { ids? } | { all: true } ──
const markReadSchema = z
  .object({
    ids: z.array(z.string().min(1)).max(500).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => v.all === true || (Array.isArray(v.ids) && v.ids.length > 0), {
    message: "ids[] ou all=true requis",
  });

notificationsRouter.post("/mark-read", async (req, res) => {
  try {
    const data = markReadSchema.parse(req.body);
    const sellerId = req.seller!.sub;
    const now = new Date();

    let updated;
    if (data.all === true) {
      updated = await prisma.notification.updateMany({
        where: { sellerId, readAt: null },
        data: { readAt: now },
      });
    } else {
      // Filter by both sellerId AND id IN (...) to prevent cross-seller mark-read
      updated = await prisma.notification.updateMany({
        where: { sellerId, id: { in: data.ids! }, readAt: null },
        data: { readAt: now },
      });
    }

    res.json({ updated: updated.count });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("[notifications] POST /mark-read", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /prefs — Seller.notificationPrefs JSON ──
// Default-safe: missing keys are interpreted as enabled (matches createNotification()).
notificationsRouter.get("/prefs", async (req, res) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: req.seller!.sub },
      select: { notificationPrefs: true },
    });
    res.json(seller?.notificationPrefs || {});
  } catch (err) {
    logger.error("[notifications] GET /prefs", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /prefs — merge JSON patch into Seller.notificationPrefs ──
const prefsSchema = z.object({
  donations: z.boolean().optional(),
  milestones: z.boolean().optional(),
  payouts: z.boolean().optional(),
  kyc: z.boolean().optional(),
  endingSoon: z.boolean().optional(),
  cagnotteEnded: z.boolean().optional(),
  donationMessages: z.boolean().optional(),
});

notificationsRouter.patch("/prefs", async (req, res) => {
  try {
    const patch = prefsSchema.parse(req.body);
    const sellerId = req.seller!.sub;

    const current = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { notificationPrefs: true },
    });
    const existing = (current?.notificationPrefs as Record<string, boolean> | null) || {};
    const merged = { ...existing, ...patch };

    await prisma.seller.update({
      where: { id: sellerId },
      data: { notificationPrefs: merged },
    });

    res.json(merged);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("[notifications] PATCH /prefs", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
