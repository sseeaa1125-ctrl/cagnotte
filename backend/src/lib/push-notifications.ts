import webpush from "web-push";
import { prisma } from "./prisma.js";
import * as logger from "./logger.js";

// ── VAPID configuration ──
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "contact@izy.store";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ── Notification payload type ──
interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

// ── Send push notification to all devices of a seller ──
export async function sendPushToSeller(sellerId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn("[Push] VAPID keys not configured, skipping push notification");
    return;
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { sellerId },
    });

    if (subscriptions.length === 0) return;

    const notification = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon-192x192.png",
      badge: payload.badge || "/icon-192x192.png",
      data: {
        url: payload.url || "/dashboard/orders",
      },
      tag: payload.tag || "izy-notification",
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notification
        )
      )
    );

    // Clean up expired/invalid subscriptions (410 Gone or 404)
    const expiredIds: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(subscriptions[index].id);
        } else {
          logger.warn(`[Push] Erreur envoi push sellerId=${sellerId}: ${result.reason}`);
        }
      }
    });

    if (expiredIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      });
      logger.log(`[Push] ${expiredIds.length} subscription(s) expirée(s) supprimée(s) pour sellerId=${sellerId}`);
    }
  } catch (err) {
    logger.error(`[Push] Erreur globale push sellerId=${sellerId}`, err);
  }
}

// ── Helper: format price for notification body ──
export function formatPushPrice(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/,/g, " ") + " FCFA";
}
