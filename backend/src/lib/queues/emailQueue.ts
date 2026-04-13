/**
 * Email Queue — Queue dédiée aux emails avec 3 niveaux de priorité :
 *
 * Priority 0 — CRITIQUE (auth) : inscription, vérification, mot de passe oublié
 *   → Concurrency élevée, retry agressif, traitement immédiat
 *
 * Priority 1 — IMPORTANT (transactionnel) : confirmation paiement, welcome communauté
 *   → Retry standard
 *
 * Priority 2 — STANDARD (notifications) : rappels vendeur, relances cron
 *   → Retry léger, rate-limité
 *
 * Persisté dans Upstash Redis — les jobs survivent aux redémarrages serveur.
 */
import { JobQueue } from "./JobQueue.js";
import { sendEmail as sendEmailDirect } from "../email.js";
import { prisma } from "../prisma.js";
import * as logger from "../logger.js";
import { notifyAdmin } from "../alerting.js";

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  unsubscribeUrl?: string;
  tier: "critical" | "transactional" | "standard";
}

// Queue unique pour tous les emails — la priorité gère l'ordre
const emailQueue = new JobQueue<EmailJob>({
  name: "email",
  concurrency: 8,     // 8 emails en parallèle max
  maxRetries: 3,       // 3 tentatives
  retryDelayMs: 2000,  // 2s → 4s → 8s (backoff exponentiel)
});

// Enregistrer le handler
emailQueue.process(async (job) => {
  // Vérifier le flag emailUnsubscribed pour les emails non-critiques (standard = notifs vendeur)
  if (job.tier === "standard") {
    const seller = await prisma.seller.findFirst({
      where: { email: job.to.toLowerCase(), deletedAt: null },
      select: { emailUnsubscribed: true },
    });
    if (seller?.emailUnsubscribed) {
      logger.log(`[EmailQueue] Skip email standard → ${job.to} (désabonné)`);
      return;
    }
  }

  await sendEmailDirect({
    to: job.to,
    subject: job.subject,
    html: job.html,
    unsubscribeUrl: job.unsubscribeUrl,
  });
});

// ── API publique ──
// Note: add() est async (Redis) mais on fire-and-forget avec .catch()
// pour ne pas bloquer les routes HTTP appelantes.

/**
 * Email critique (auth) — priorité 0, ne bloque PAS la réponse HTTP
 * Utilisé pour : inscription, vérification, mot de passe oublié
 */
export function queueAuthEmail(params: { to: string; subject: string; html: string }): void {
  emailQueue.add(
    { ...params, tier: "critical" },
    0 // priorité max
  ).catch((err) => logger.error("[EmailQueue] Erreur enqueue auth email", err));
}

/**
 * Email transactionnel — priorité 1
 * Utilisé pour : confirmation paiement, welcome communauté, download link
 */
export function queueTransactionalEmail(params: { to: string; subject: string; html: string; unsubscribeUrl?: string }): void {
  emailQueue.add(
    { ...params, tier: "transactional" },
    1
  ).catch((err) => logger.error("[EmailQueue] Erreur enqueue transactional email", err));
}

/**
 * Email standard — priorité 2
 * Utilisé pour : rappels cron, notifications vendeur
 */
export function queueStandardEmail(params: { to: string; subject: string; html: string; unsubscribeUrl?: string }): void {
  emailQueue.add(
    { ...params, tier: "standard" },
    2
  ).catch((err) => logger.error("[EmailQueue] Erreur enqueue standard email", err));
}

/**
 * Stats de la queue email (pour monitoring / health check)
 */
export async function getEmailQueueStats() {
  return emailQueue.getStats();
}

// Log stats toutes les 5 minutes + D3: alerte si queue saturée
const EMAIL_QUEUE_ALERT_THRESHOLD = 100;
setInterval(async () => {
  try {
    const stats = await emailQueue.getStats();
    if (stats.enqueued > 0) {
      logger.log(`[EmailQueue] pending=${stats.pending} delayed=${stats.delayed} active=${stats.active} processed=${stats.processed} failed=${stats.failed} retried=${stats.retried} deadLetter=${stats.deadLetter}`);
    }
    // D3: Alerte si trop de jobs en attente
    if (stats.pending + stats.delayed > EMAIL_QUEUE_ALERT_THRESHOLD) {
      await notifyAdmin("EMAIL_QUEUE_HIGH", `${stats.pending} pending + ${stats.delayed} delayed (seuil: ${EMAIL_QUEUE_ALERT_THRESHOLD})\nDead letter: ${stats.deadLetter}`);
    }
    if (stats.deadLetter > 0) {
      await notifyAdmin("EMAIL_DEAD_LETTER", `${stats.deadLetter} emails en dead letter queue`);
    }
  } catch (err) {
    logger.error("[EmailQueue] Erreur lecture stats", err);
  }
}, 5 * 60 * 1000);
