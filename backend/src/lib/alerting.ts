/**
 * Alerting — Notifications admin via Telegram
 *
 * D3: Envoie des alertes au SUPER_ADMIN quand quelque chose nécessite
 * une attention immédiate (queues saturées, erreurs critiques, etc.)
 *
 * Env vars requises :
 *   ALERT_TELEGRAM_BOT_TOKEN — Token du bot Telegram dédié aux alertes
 *   ALERT_TELEGRAM_CHAT_ID  — Chat ID du groupe/utilisateur admin
 *
 * Si les env vars ne sont pas configurées, les alertes sont silencieusement ignorées (log only).
 */
import * as logger from "./logger.js";

const BOT_TOKEN = process.env.ALERT_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.ALERT_TELEGRAM_CHAT_ID;

// Anti-spam: ne pas envoyer la même alerte plus d'une fois par 30min
const COOLDOWN_MS = 30 * 60 * 1000;
const lastAlertTimes = new Map<string, number>();

/**
 * Envoie une alerte admin via Telegram.
 * Si le bot n'est pas configuré, log uniquement en warn.
 */
export async function notifyAdmin(alertKey: string, message: string): Promise<void> {
  // Anti-spam
  const lastSent = lastAlertTimes.get(alertKey) || 0;
  if (Date.now() - lastSent < COOLDOWN_MS) return;

  logger.warn(`[ALERT] ${alertKey}: ${message}`);

  if (!BOT_TOKEN || !CHAT_ID) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `⚠️ <b>ALERTE FARI</b>\n\n<b>${alertKey}</b>\n${message}`,
        parse_mode: "HTML",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      lastAlertTimes.set(alertKey, Date.now());
    } else {
      const body = await res.text();
      logger.error(`[ALERT] Telegram send failed: ${res.status} ${body}`);
    }
  } catch (err) {
    logger.error("[ALERT] Telegram send error", err);
  }
}
