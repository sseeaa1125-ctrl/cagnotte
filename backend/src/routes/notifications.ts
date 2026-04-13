import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../lib/auth.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";

export const notificationsRouter = Router();

// ── GET /api/notifications/vapid-public-key — Clé publique VAPID pour le frontend ──
notificationsRouter.get("/vapid-public-key", (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || "";
  if (!key) {
    res.status(503).json({ error: "Push notifications non configurées" });
    return;
  }
  res.json({ publicKey: key });
});

// ── POST /api/notifications/subscribe — Enregistrer un abonnement push ──
const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(10).max(500),
    auth: z.string().min(10).max(500),
  }),
});

notificationsRouter.post("/subscribe", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const data = subscribeSchema.parse(req.body);
    const sellerId = req.seller!.sub;

    // Upsert: si l'endpoint existe déjà, mettre à jour les clés
    await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: {
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        sellerId,
      },
      create: {
        sellerId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
      },
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("[Push] Erreur subscribe", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── DELETE /api/notifications/unsubscribe — Supprimer un abonnement push ──
notificationsRouter.delete("/unsubscribe", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, sellerId: req.seller!.sub },
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("[Push] Erreur unsubscribe", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/notifications/status — Vérifier si le vendeur a des abonnements actifs ──
notificationsRouter.get("/status", requireAuth, async (req, res) => {
  try {
    const count = await prisma.pushSubscription.count({
      where: { sellerId: req.seller!.sub },
    });
    res.json({ subscribed: count > 0, deviceCount: count });
  } catch (err) {
    logger.error("[Push] Erreur status", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
