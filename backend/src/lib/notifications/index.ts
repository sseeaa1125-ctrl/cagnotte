/**
 * createNotification — single entry point for every Notification row written
 * outside of `lib/notifications/`.
 *
 * Phase 2 plan 02-02. Phase 1 created `Notification.dedupeKey @unique`; this
 * file is the SOLE writer of `Notification` rows and the dedup constraint is
 * the at-most-once delivery guarantee (P01 + P06 mitigations).
 *
 * Contract (per RESEARCH Q6):
 *   1. Read seller.notificationPrefs and skip the email enqueue when the
 *      relevant pref key is `false`. Default-safe — missing/undefined keys
 *      are treated as enabled.
 *   2. Insert Notification with caller-supplied dedupeKey. P2002 unique
 *      violation = "already fired" → return { created: false } silently.
 *   3. On success AND seller.emailUnsubscribed === false AND input.email
 *      provided → call the appropriate fire-and-forget queue helper.
 *   4. Email enqueue happens AFTER the insert succeeds; duplicate inserts
 *      never enqueue an email.
 *
 * The duck-typed P2002 catch mirrors the Phase 1 slug.ts pattern so we
 * tolerate Prisma client edges that don't always tag the error with the
 * proper subclass.
 */

import { Prisma } from "../../generated/prisma/client.js";
import type { NotificationType } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import * as logger from "../logger.js";
import {
  queueAuthEmail,
  queueTransactionalEmail,
  queueStandardEmail,
} from "../queues/emailQueue.js";

export interface CreateNotificationInput {
  sellerId: string;
  type: NotificationType;
  dedupeKey: string;
  title: string;
  body?: string;
  icon?: string;
  blockId?: string;
  orderId?: string;
  withdrawalId?: string;
  data?: Record<string, unknown>;
  email?: {
    subject: string;
    html: string;
    tier: "critical" | "transactional" | "standard";
  };
}

export interface CreateNotificationResult {
  created: boolean;
  // Use a wide type — the generated Prisma model type is namespaced and pulling it
  // through here would force every consumer to do the same.
  notification: { id: string; sellerId: string; type: NotificationType; dedupeKey: string } | null;
}

/**
 * Map NotificationType → list of Seller.notificationPrefs JSON keys.
 *
 * Returns BOTH the legacy Phase 2 key and the Phase 6 Banani key for each
 * type. `createNotification` skips the notification if ANY of the returned
 * keys is explicitly set to `false` — so a user flipping either toggle in
 * any version of the prefs UI actually takes effect.
 *
 * Audit 026 HIGH-2: previously returned a single legacy key, which meant
 * the Banani /profil/preferences toggles were silently ignored (frontend
 * wrote `newParticipation: false`, backend only checked `donations`).
 */
export function notifTypeToPrefKeys(
  type: NotificationType,
): readonly string[] {
  switch (type) {
    case "DONATION_RECEIVED":
      return ["donations", "newParticipation"];
    case "MILESTONE_REACHED":
      return ["milestones", "milestoneReached"];
    case "CAGNOTTE_ENDING_SOON":
      return ["endingSoon", "endingSoonReminder"];
    case "CAGNOTTE_ENDED":
      // No Banani equivalent — legacy key only
      return ["cagnotteEnded"];
    case "DONATION_MESSAGE":
      // organizerUpdates is donor-side in Banani; donationMessages is
      // creator-side. No clean overlap — legacy key only.
      return ["donationMessages"];
    case "PAYOUT_COMPLETED":
    case "PAYOUT_FAILED":
      return ["payouts", "paymentReceipts"];
    case "KYC_APPROVED":
    case "KYC_REJECTED":
    case "CARD_APPROVED":
    case "CARD_REJECTED":
      return ["kyc", "paymentReceipts"];
    case "SYSTEM":
      // Admin broadcasts — always delivered, no user pref opt-out
      return [];
    default: {
      // Exhaustiveness — TypeScript will flag a missing case here at compile
      // time if NotificationType ever grows.
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<CreateNotificationResult> {
  try {
    // 1. Pref + email lookup (single seller read)
    const seller = await prisma.seller.findUnique({
      where: { id: input.sellerId },
      select: { notificationPrefs: true, email: true, emailUnsubscribed: true },
    });
    if (!seller) {
      logger.warn(`[notifications] Skip ${input.type} — seller ${input.sellerId} not found`);
      return { created: false, notification: null };
    }

    const prefs = (seller.notificationPrefs as Record<string, boolean> | null) || {};
    const prefKeys = notifTypeToPrefKeys(input.type);
    // Audit 026 HIGH-2: skip if ANY legacy OR Banani key is set to false.
    // Default-safe: missing keys mean enabled (matches Phase 2 behavior).
    const disabledKey = prefKeys.find((k) => prefs[k] === false);
    if (disabledKey) {
      logger.log(`[notifications] Skip ${input.type} for ${input.sellerId} — pref ${disabledKey} disabled`);
      return { created: false, notification: null };
    }

    // 2. Insert — dedupeKey unique violation = already fired
    const notification = await prisma.notification.create({
      data: {
        sellerId: input.sellerId,
        type: input.type,
        dedupeKey: input.dedupeKey,
        title: input.title,
        body: input.body,
        icon: input.icon,
        blockId: input.blockId,
        orderId: input.orderId,
        withdrawalId: input.withdrawalId,
        data: input.data as Prisma.InputJsonValue | undefined,
      },
      select: { id: true, sellerId: true, type: true, dedupeKey: true },
    });

    // 3. Fire-and-forget email enqueue — only if not unsubscribed AND email payload
    if (input.email && !seller.emailUnsubscribed) {
      const enqueue =
        input.email.tier === "critical"
          ? queueAuthEmail
          : input.email.tier === "transactional"
          ? queueTransactionalEmail
          : queueStandardEmail;
      try {
        enqueue({ to: seller.email, subject: input.email.subject, html: input.email.html });
      } catch (err) {
        // queueXEmail is sync (.catch'd internally) so this branch is defensive.
        logger.error("[notifications] Email enqueue threw synchronously", err);
      }
    }

    return { created: true, notification };
  } catch (err) {
    // Duck-typed P2002 — mirrors the Phase 1 slug.ts pattern
    const isUniqueViolation =
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") ||
      (err as { code?: string })?.code === "P2002";
    if (isUniqueViolation) {
      logger.log(`[notifications] Dedupe hit for ${input.dedupeKey}`);
      return { created: false, notification: null };
    }
    throw err;
  }
}
