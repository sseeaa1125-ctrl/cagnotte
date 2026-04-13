import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { TelegramService } from "../lib/telegram.js";
import { prisma } from "../lib/prisma.js";
import { encrypt } from "../lib/crypto.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../lib/auth.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";

export const telegramRouter = Router();

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

// ── Central bot token (env) ──
function getCentralBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN non configuré");
  return token;
}

// POST /api/telegram/verify-bot
telegramRouter.post("/verify-bot", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      token: z.string().min(20, "Token invalide").optional(),
    });
    const data = schema.parse(req.body);

    const token = data.token || getCentralBotToken();
    const telegram = new TelegramService(token);
    const bot = await telegram.getMe();

    res.json({
      ok: true,
      botUsername: bot.username,
      botName: bot.first_name,
      botId: bot.id,
    });
  } catch (err) {
    logger.error("Erreur vérification bot Telegram", err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    res.status(400).json({ error: "Impossible de vérifier le bot. Vérifie que le token est correct." });
  }
});

// GET /api/telegram/bot-info — Infos du bot central (pour le frontend)
telegramRouter.get("/bot-info", requireAuth, async (_req, res) => {
  try {
    const token = getCentralBotToken();
    const telegram = new TelegramService(token);
    const bot = await telegram.getMe();
    res.json({ ok: true, botUsername: bot.username, botName: bot.first_name });
  } catch (err) {
    logger.error("Erreur bot-info", err);
    res.status(500).json({ error: "Bot Telegram non configuré" });
  }
});

// POST /api/telegram/verify-group
// Supporte le token vendeur (legacy) OU le bot central (env)
telegramRouter.post("/verify-group", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      token: z.string().min(20, "Token invalide").optional(),
      chatId: z.string().min(1, "ID du groupe requis"),
    });
    const data = schema.parse(req.body);

    const token = data.token || getCentralBotToken();
    const telegram = new TelegramService(token);

    // Récupérer le bot ID
    const bot = await telegram.getMe();

    // Vérifier le groupe
    let chatId: number | string = data.chatId.trim();

    // Détecter les liens d'invitation privés (https://t.me/+XXX) — non résolvables par le Bot API
    const privateInvitePattern = /t\.me\/\+/;
    if (privateInvitePattern.test(chatId)) {
      res.status(400).json({
        error: "Les liens d'invitation privés (t.me/+...) ne sont pas supportés. Colle l'ID numérique du groupe (ex: -1001234567890) ou utilise la commande /connect.",
      });
      return;
    }

    // Si c'est un lien t.me public, extraire le username
    if (chatId.startsWith("https://t.me/")) {
      chatId = "@" + chatId.replace("https://t.me/", "").replace(/\/.*$/, "");
    } else if (chatId.startsWith("t.me/")) {
      chatId = "@" + chatId.replace("t.me/", "").replace(/\/.*$/, "");
    } else if (/^-?\d+$/.test(chatId)) {
      chatId = parseInt(chatId);
    } else if (!chatId.startsWith("@")) {
      chatId = "@" + chatId;
    }

    const chat = await telegram.getChat(chatId);

    if (!["group", "supergroup", "channel"].includes(chat.type)) {
      res.status(400).json({ error: "Ce n'est pas un groupe ou un channel Telegram." });
      return;
    }

    // Vérifier que le bot est admin
    const member = await telegram.getChatMember(chat.id, bot.id);

    if (member.status !== "administrator") {
      res.status(400).json({
        error: "Le bot n'est pas administrateur du groupe. Ajoute-le comme admin avec les permissions requises.",
      });
      return;
    }

    if (!member.can_invite_users) {
      res.status(400).json({
        error: "Le bot n'a pas la permission d'inviter des utilisateurs. Active cette permission dans les paramètres admin.",
      });
      return;
    }

    if (!member.can_restrict_members) {
      res.status(400).json({
        error: "Le bot n'a pas la permission de bannir des utilisateurs. Active cette permission dans les paramètres admin.",
      });
      return;
    }

    res.json({
      ok: true,
      chatId: chat.id.toString(),
      chatTitle: chat.title || "Groupe sans nom",
      chatType: chat.type,
    });
  } catch (err) {
    logger.error("Erreur vérification groupe Telegram", err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    // H3: Message user-friendly sans fuite d'erreur interne
    const raw = err instanceof Error ? err.message : "";
    const userMessage = raw.includes("chat not found")
      ? "Groupe introuvable. Colle l'ID numérique du groupe (ex: -1001234567890) ou utilise la commande /connect."
      : "Impossible de vérifier le groupe. Vérifie que le bot est bien ajouté comme admin.";
    res.status(400).json({ error: userMessage });
  }
});

// ───────────────────────────────────────────────────────────
// /connect CODE flow — Vérification sécurisée du groupe
// ───────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sans I/O/0/1 pour éviter confusion
  let code = "IZY-";
  for (let i = 0; i < 5; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

// ── Ensure central bot webhook is configured (once per server lifecycle) ──
let centralWebhookReady = false;

async function ensureCentralBotWebhook(sellerId: string): Promise<{ botUsername: string }> {
  const token = getCentralBotToken();
  const telegram = new TelegramService(token);
  const bot = await telegram.getMe();

  // Upsert TelegramBot record for this seller (reuse for community creation later)
  const encryptedToken = encrypt(token);
  await prisma.telegramBot.upsert({
    where: { sellerId },
    create: {
      sellerId,
      botToken: encryptedToken,
      botUsername: bot.username,
      botName: bot.first_name,
    },
    update: {
      botToken: encryptedToken,
      botUsername: bot.username,
      botName: bot.first_name,
    },
  });

  // Configure webhook once per server lifecycle — use FIXED "central" path
  // (Telegram allows only 1 webhook per bot, so all sellers share the same URL)
  if (!centralWebhookReady && TELEGRAM_WEBHOOK_SECRET) {
    const webhookUrl = `${BACKEND_URL}/api/webhooks/telegram/central`;
    try {
      await telegram.setWebhook(webhookUrl, TELEGRAM_WEBHOOK_SECRET);
      centralWebhookReady = true;
      logger.log(`[Central bot] Webhook configuré: ${webhookUrl}`);
    } catch (err) {
      logger.error("[Central bot] Erreur configuration webhook", err);
    }
  }

  return { botUsername: bot.username };
}

// POST /api/telegram/generate-code — Génère un code de vérification unique
telegramRouter.post("/generate-code", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    // Ensure central bot webhook is set up + get bot info
    let botUsername = "izystore_bot";
    try {
      const result = await ensureCentralBotWebhook(sellerId);
      botUsername = result.botUsername;
    } catch (err) {
      logger.error("Erreur setup bot central", err);
    }

    // Supprimer TOUS les anciens codes de ce vendeur (un seul code actif à la fois)
    await prisma.telegramVerification.deleteMany({
      where: { sellerId },
    });

    // Générer un code unique (max 10 tentatives)
    let code = "";
    for (let i = 0; i < 10; i++) {
      const candidate = generateCode();
      const existing = await prisma.telegramVerification.findUnique({ where: { code: candidate } });
      if (!existing) { code = candidate; break; }
    }
    if (!code) {
      res.status(500).json({ error: "Impossible de générer un code unique. Réessaye." });
      return;
    }

    // Créer la vérification (expire dans 15 min)
    const verification = await prisma.telegramVerification.create({
      data: {
        sellerId,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    res.json({
      ok: true,
      code: verification.code,
      botUsername,
      expiresAt: verification.expiresAt.toISOString(),
    });
  } catch (err) {
    logger.error("Erreur generate-code", err);
    res.status(500).json({ error: "Impossible de générer le code." });
  }
});

// GET /api/telegram/check-code/:code — Vérifie si le code a été validé par /connect
telegramRouter.get("/check-code/:code", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const code = req.params.code as string;

    const verification = await prisma.telegramVerification.findUnique({
      where: { code },
    });

    if (!verification || verification.sellerId !== sellerId) {
      res.json({ ok: true, verified: false });
      return;
    }

    if (verification.expiresAt < new Date()) {
      res.json({ ok: true, verified: false, expired: true });
      return;
    }

    if (verification.verified && verification.chatId) {
      res.json({
        ok: true,
        verified: true,
        chatId: verification.chatId.toString(),
        chatTitle: verification.chatTitle || "Groupe / Canal Telegram",
      });
    } else {
      res.json({ ok: true, verified: false });
    }
  } catch (err) {
    logger.error("Erreur check-code", err);
    res.status(500).json({ error: "Erreur de vérification." });
  }
});
