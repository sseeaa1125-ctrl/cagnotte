import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireRole } from "../../middleware/requireAdmin.js";
import { logAdminAction } from "../../lib/adminLog.js";
import { createNotification } from "../../lib/notifications/index.js";
import * as logger from "../../lib/logger.js";

export const notificationsAdminRouter = Router();

// All routes require ADMIN or SUPER_ADMIN role (SUPPORT cannot send notifications)
notificationsAdminRouter.use(requireRole("ADMIN", "SUPER_ADMIN"));

// ── POST /broadcast — Send notification to ALL active sellers ──
const broadcastSchema = z.object({
  title: z.string().min(1, "Titre requis").max(200),
  body: z.string().min(1, "Message requis").max(2000),
});

notificationsAdminRouter.post("/broadcast", async (req: Request, res: Response) => {
  try {
    const parsed = broadcastSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }

    const { title, body } = parsed.data;

    // Get all active sellers (not soft-deleted, email verified)
    const sellers = await prisma.seller.findMany({
      where: {
        deletedAt: null,
        emailVerified: true,
      },
      select: { id: true },
    });

    const timestamp = Date.now();
    let created = 0;
    let skipped = 0;

    // Batch create notifications — use Promise.allSettled to not fail on individual errors
    const results = await Promise.allSettled(
      sellers.map((seller) =>
        createNotification({
          sellerId: seller.id,
          type: "SYSTEM",
          dedupeKey: `admin-broadcast:${timestamp}:${seller.id}`,
          title,
          body,
          icon: "bell",
          data: { adminBroadcast: true, adminId: req.admin!.id },
        }),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.created) {
        created++;
      } else {
        skipped++;
      }
    }

    await logAdminAction(
      req.admin!.id,
      "NOTIFICATION_BROADCAST",
      "broadcast",
      { title, recipientCount: sellers.length, created, skipped },
      req.ip,
    );

    res.json({ ok: true, recipientCount: sellers.length, created, skipped });
  } catch (err) {
    logger.error("admin:notifications:broadcast", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /send — Send targeted notification to a single seller ──
const sendSchema = z.object({
  sellerId: z.string().min(1, "Seller ID requis"),
  title: z.string().min(1, "Titre requis").max(200),
  body: z.string().min(1, "Message requis").max(2000),
});

notificationsAdminRouter.post("/send", async (req: Request, res: Response) => {
  try {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }

    const { sellerId, title, body } = parsed.data;

    // Verify seller exists
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, displayName: true, slug: true },
    });

    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    const timestamp = Date.now();
    const result = await createNotification({
      sellerId,
      type: "SYSTEM",
      dedupeKey: `admin-send:${timestamp}:${sellerId}`,
      title,
      body,
      icon: "bell",
      data: { adminTargeted: true, adminId: req.admin!.id },
    });

    await logAdminAction(
      req.admin!.id,
      "NOTIFICATION_SENT",
      `seller:${sellerId}`,
      { title, sellerSlug: seller.slug, created: result.created },
      req.ip,
    );

    res.json({ ok: true, created: result.created });
  } catch (err) {
    logger.error("admin:notifications:send", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /sellers/search — Search sellers for targeted notification ──
const searchSchema = z.object({
  q: z.string().min(1),
});

notificationsAdminRouter.get("/sellers/search", async (req: Request, res: Response) => {
  try {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Parametre q requis" });
      return;
    }

    const { q } = parsed.data;

    const sellers = await prisma.seller.findMany({
      where: {
        deletedAt: null,
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        displayName: true,
        slug: true,
        email: true,
      },
      take: 10,
      orderBy: { displayName: "asc" },
    });

    res.json({ sellers });
  } catch (err) {
    logger.error("admin:notifications:search", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
