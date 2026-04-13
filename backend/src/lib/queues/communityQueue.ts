/**
 * Community Reminder Queue — Queue dédiée aux relances communauté :
 * - Emails de relance (renouvellement, grace period, kick)
 * - Messages Telegram DM (rappels, avertissements)
 *
 * Rate-limité pour respecter les limites Telegram API (30 msg/s).
 * Gère les deux canaux (email + Telegram) dans une seule queue
 * pour garantir l'ordre et éviter les doublons.
 *
 * Persisté dans Upstash Redis — les jobs survivent aux redémarrages serveur.
 */
import { JobQueue } from "./JobQueue.js";
import { sendEmail as sendEmailDirect } from "../email.js";
import { TelegramService } from "../telegram.js";
import { decrypt } from "../crypto.js";
import { prisma } from "../prisma.js";
import * as logger from "../logger.js";
import { notifyAdmin } from "../alerting.js";

// ── Types ──

interface EmailReminderJob {
  type: "email";
  to: string;
  subject: string;
  html: string;
}

interface TelegramReminderJob {
  type: "telegram";
  botId: string;
  userId: string | bigint;
  text: string;
}

export type CommunityReminderJob = EmailReminderJob | TelegramReminderJob;

// ── Queue ──

const communityQueue = new JobQueue<CommunityReminderJob>({
  name: "community-reminder",
  concurrency: 3,       // 3 jobs en parallèle (respecte rate limits Telegram)
  maxRetries: 2,        // 2 retries pour les relances
  retryDelayMs: 5000,   // 5s → 10s (backoff)
  rateLimitMs: 100,     // 100ms entre chaque job (10/s — safe pour Telegram)
});

// Cache Telegram services pour éviter de redéchiffrer le token à chaque message
const telegramCache = new Map<string, TelegramService>();

async function getTelegramServiceCached(botId: string): Promise<TelegramService | null> {
  if (telegramCache.has(botId)) return telegramCache.get(botId)!;

  try {
    const bot = await prisma.telegramBot.findUnique({ where: { id: botId } });
    if (!bot) return null;
    const token = decrypt(bot.botToken);
    const service = new TelegramService(token);
    telegramCache.set(botId, service);
    return service;
  } catch (err) {
    logger.error(`[CommunityQueue] Erreur chargement bot ${botId}`, err);
    return null;
  }
}

// Enregistrer le handler
communityQueue.process(async (job) => {
  if (job.type === "email") {
    await sendEmailDirect({
      to: job.to,
      subject: job.subject,
      html: job.html,
    });
  } else if (job.type === "telegram") {
    const telegram = await getTelegramServiceCached(job.botId);
    if (!telegram) {
      logger.warn(`[CommunityQueue] Bot ${job.botId} introuvable, skip Telegram DM`);
      return;
    }
    const userId = typeof job.userId === "bigint" ? job.userId.toString() : String(job.userId);
    if (!userId || userId === "null" || userId === "undefined") return;
    try {
      await telegram.sendMessage(userId, job.text);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      // Ne pas retry si l'utilisateur a bloqué le bot
      if (errMsg.includes("bot was blocked") || errMsg.includes("user is deactivated") || errMsg.includes("chat not found")) {
        logger.warn(`[CommunityQueue] Telegram DM impossible (user ${userId}): ${errMsg}`);
        return;
      }
      throw err; // Retry pour les autres erreurs
    }
  }
});

// ── API publique ──
// Note: add() est async (Redis) mais on fire-and-forget avec .catch()
// pour ne pas bloquer les appelants (cron jobs, routes HTTP).

/**
 * Enqueue un email de relance communauté
 */
export function queueCommunityEmail(params: { to: string; subject: string; html: string }): void {
  communityQueue.add(
    { type: "email", ...params },
    1
  ).catch((err) => logger.error("[CommunityQueue] Erreur enqueue community email", err));
}

/**
 * Enqueue un message Telegram DM de relance
 */
export function queueTelegramDM(params: { botId: string; userId: string | bigint; text: string }): void {
  communityQueue.add(
    { type: "telegram", ...params },
    1
  ).catch((err) => logger.error("[CommunityQueue] Erreur enqueue telegram DM", err));
}

/**
 * Enqueue un email + Telegram DM ensemble (relance complète)
 */
export function queueCommunityReminder(params: {
  email: { to: string; subject: string; html: string };
  telegram?: { botId: string; userId: string | bigint | null; text: string };
}): void {
  queueCommunityEmail(params.email);
  if (params.telegram && params.telegram.userId) {
    queueTelegramDM({
      botId: params.telegram.botId,
      userId: params.telegram.userId,
      text: params.telegram.text,
    });
  }
}

/**
 * Stats de la queue communauté (pour monitoring / health check)
 */
export async function getCommunityQueueStats() {
  return communityQueue.getStats();
}

// Log stats toutes les 5 minutes + D3: alerte si queue saturée
const COMMUNITY_QUEUE_ALERT_THRESHOLD = 50;
setInterval(async () => {
  try {
    const stats = await communityQueue.getStats();
    if (stats.enqueued > 0) {
      logger.log(`[CommunityQueue] pending=${stats.pending} delayed=${stats.delayed} active=${stats.active} processed=${stats.processed} failed=${stats.failed} retried=${stats.retried} deadLetter=${stats.deadLetter}`);
    }
    // D3: Alerte si trop de jobs en attente
    if (stats.pending + stats.delayed > COMMUNITY_QUEUE_ALERT_THRESHOLD) {
      await notifyAdmin("COMMUNITY_QUEUE_HIGH", `${stats.pending} pending + ${stats.delayed} delayed (seuil: ${COMMUNITY_QUEUE_ALERT_THRESHOLD})\nDead letter: ${stats.deadLetter}`);
    }
    if (stats.deadLetter > 0) {
      await notifyAdmin("COMMUNITY_DEAD_LETTER", `${stats.deadLetter} jobs communauté en dead letter queue`);
    }
  } catch (err) {
    logger.error("[CommunityQueue] Erreur lecture stats", err);
  }
}, 5 * 60 * 1000);
