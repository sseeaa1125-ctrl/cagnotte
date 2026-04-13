import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { decrypt } from "../lib/crypto.js";
import { TelegramService } from "../lib/telegram.js";
import * as logger from "../lib/logger.js";

export const telegramWebhooksRouter = Router();

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

// Helper: résout le token bot à partir d'un botId (DB) ou "central" (env)
async function getBotTokenFromId(botId: string): Promise<string | null> {
  if (botId === "central") {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  }
  const bot = await prisma.telegramBot.findUnique({ where: { id: botId } });
  return bot ? decrypt(bot.botToken) : null;
}

interface TelegramWebhookPayload {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
  channel_post?: {
    message_id: number;
    chat: { id: number; type: string; title?: string };
    from?: { id: number; first_name?: string; username?: string };
    sender_chat?: { id: number; type: string };
    text?: string;
  };
  chat_member?: {
    chat: { id: number; title?: string; type: string };
    from: { id: number; first_name?: string; username?: string };
    date: number;
    old_chat_member: { status: string; user: { id: number; username?: string } };
    new_chat_member: { status: string; user: { id: number; username?: string; first_name?: string } };
    invite_link?: { invite_link: string; creator: { id: number } };
  };
}

// ─────────────────────────────────────────────────
// Handler /start join_{subId} — Option C : lien d'invitation via le bot
// L'utilisateur clique sur t.me/bot?start=join_{subId} → on vérifie la subscription,
// crée un lien d'invitation unique, et on l'envoie en DM.
// ─────────────────────────────────────────────────
async function handleStartJoin(botId: string, userId: number, username: string | undefined, subscriptionId: string): Promise<void> {
  // Accepter ACTIVE (normal) et PENDING (race condition: /start avant que le webhook mette à jour le status)
  const subscription = await prisma.communitySubscription.findFirst({
    where: {
      id: subscriptionId,
      status: { in: ["ACTIVE", "PENDING"] },
    },
    include: {
      community: {
        include: {
          telegramBot: true,
          seller: { select: { displayName: true } },
        },
      },
      payments: {
        where: { status: "COMPLETED" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!subscription) {
    // Pas de subscription valide → message d'erreur
    const token = await getBotTokenFromId(botId);
    if (token) {
      const telegram = new TelegramService(token);
      await telegram.sendMessage(userId, "❌ Ce lien n'est plus valide. Contacte le vendeur si tu as déjà payé.");
    }
    return;
  }

  // Si PENDING sans paiement COMPLETED → le paiement n'est pas encore confirmé
  if (subscription.status === "PENDING" && subscription.payments.length === 0) {
    const token = await getBotTokenFromId(botId);
    if (token) {
      const telegram = new TelegramService(token);
      await telegram.sendMessage(userId, "⏳ Ton paiement est en cours de vérification. Réessaye dans quelques minutes en cliquant à nouveau sur le lien.");
    }
    return;
  }

  // Vérifier que le bot correspond à la communauté (skip pour le bot central)
  if (botId !== "central" && subscription.community.telegramBotId !== botId) {
    logger.warn(`[Telegram /start] Bot mismatch: expected=${subscription.community.telegramBotId} got=${botId}`);
    return;
  }

  // Si le membre a déjà un telegramUserId, il a déjà rejoint → renvoyer le message
  if (subscription.telegramUserId) {
    const token = await getBotTokenFromId(botId);
    if (token) {
      const telegram = new TelegramService(token);
      await telegram.sendMessage(userId, `✅ Tu es déjà membre de « ${subscription.community.title} ». Ton abonnement est actif !`);
    }
    return;
  }

  // Créer un lien d'invitation unique (1 utilisation, 24h)
  // IMPORTANT: On crée le lien AVANT de stocker le telegramUserId
  // Si createInviteLink échoue, l'utilisateur peut réessayer /start
  const telegram = new TelegramService(decrypt(subscription.community.telegramBot.botToken));

  let inviteResult: { invite_link: string };
  try {
    inviteResult = await telegram.createInviteLink(subscription.community.telegramChatId.toString());
  } catch (err) {
    // Bot probablement pas admin dans le groupe → message clair + log
    logger.error(`[Telegram /start] createInviteLink échoué sub=${subscription.id}: ${err instanceof Error ? err.message : "unknown"}`);
    try {
      await telegram.sendMessage(userId, "❌ Impossible de créer le lien d'invitation. Le bot n'est peut-être plus administrateur du groupe. Contacte le vendeur.");
    } catch { /* bot bloqué par user — on ne peut rien faire */ }
    return;
  }

  // Envoyer le lien en DM (avant le update DB pour que le retry marche si le DM échoue)
  try {
    await telegram.sendMessage(
      userId,
      `🎉 Bienvenue ! Voici ton lien pour rejoindre « ${subscription.community.title} » :\n\n👉 ${inviteResult.invite_link}\n\n⏳ Ce lien expire dans 24h et ne peut être utilisé qu'une seule fois.\n\nTu recevras un rappel 3 jours avant ton prochain paiement.`
    );
  } catch (dmErr) {
    // Bot bloqué par l'utilisateur — stocker quand même le lien pour fallback email
    logger.warn(`[Telegram /start] DM échoué sub=${subscription.id} user=${userId}: ${dmErr instanceof Error ? dmErr.message : "unknown"}`);
    // On continue : le lien sera stocké et envoyé par email si nécessaire
  }

  // Stocker telegramUserId + lien d'invitation en une seule opération
  await prisma.communitySubscription.update({
    where: { id: subscription.id },
    data: {
      telegramUserId: BigInt(userId),
      telegramUsername: username || null,
      inviteLink: inviteResult.invite_link,
      inviteLinkExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  logger.log(`[Telegram /start] Lien d'invitation envoyé: sub=${subscription.id} user=${userId}`);
}

// ─────────────────────────────────────────────────
// Handler /connect CODE — Vérification sécurisée du groupe vendeur
// Le vendeur tape /connect IZY-XXXXX dans son groupe → le bot vérifie
// que l'envoyeur est admin du groupe, et lie le code au chatId.
// ─────────────────────────────────────────────────
async function handleConnectCode(botId: string, chatId: number, fromUserId: number | null, code: string): Promise<void> {
  // Résoudre le token bot
  const botToken = await getBotTokenFromId(botId);
  if (!botToken) return;

  const telegram = new TelegramService(botToken);

  // Chercher le code de vérification
  const verification = await prisma.telegramVerification.findUnique({ where: { code } });

  if (!verification || verification.expiresAt < new Date()) {
    await telegram.sendMessage(chatId, "❌ Code invalide ou expiré. Retourne sur izy.store pour générer un nouveau code.");
    return;
  }

  if (verification.verified) {
    await telegram.sendMessage(chatId, "✅ Ce code a déjà été utilisé.");
    return;
  }

  // Vérifier que l'envoyeur est admin du groupe/canal
  // Dans un canal, seuls les admins peuvent poster — pas besoin de vérifier
  if (fromUserId) {
    try {
      const member = await telegram.getChatMember(chatId, fromUserId);
      if (member.status !== "administrator" && member.status !== "creator") {
        await telegram.sendMessage(chatId, "❌ Seul un administrateur peut utiliser cette commande.");
        return;
      }
    } catch {
      await telegram.sendMessage(chatId, "❌ Impossible de vérifier tes permissions. Réessaye.");
      return;
    }
  }

  // Vérifier que le bot a les bonnes permissions
  const botMe = await telegram.getMe();
  const botMember = await telegram.getChatMember(chatId, botMe.id);

  if (botMember.status !== "administrator") {
    await telegram.sendMessage(chatId, "❌ Je ne suis pas administrateur. Ajoute-moi comme admin avec les permissions d'inviter et bannir.");
    return;
  }

  if (!botMember.can_invite_users || !botMember.can_restrict_members) {
    const missing = [];
    if (!botMember.can_invite_users) missing.push("inviter des utilisateurs");
    if (!botMember.can_restrict_members) missing.push("bannir des utilisateurs");
    await telegram.sendMessage(chatId, `❌ Il me manque des permissions : ${missing.join(", ")}. Modifie mes droits d'admin.`);
    return;
  }

  // Vérifier que ce chat n'est pas déjà pris par une autre communauté
  const existingCommunity = await prisma.community.findUnique({ where: { telegramChatId: BigInt(chatId) } });
  if (existingCommunity && existingCommunity.sellerId !== verification.sellerId) {
    await telegram.sendMessage(chatId, "❌ Ce groupe/canal est déjà lié à une autre communauté Izy Store.");
    return;
  }

  // Récupérer le titre et le type du groupe/canal
  let chatTitle = "Groupe Telegram";
  let chatType = "groupe";
  try {
    const chat = await telegram.getChat(chatId);
    chatTitle = chat.title || chatTitle;
    if (chat.type === "channel") chatType = "canal";
  } catch { /* fallback */ }

  // Marquer le code comme vérifié
  await prisma.telegramVerification.update({
    where: { code },
    data: {
      chatId: BigInt(chatId),
      chatTitle,
      verified: true,
    },
  });

  await telegram.sendMessage(chatId, `✅ ${chatType === "canal" ? "Canal" : "Groupe"} vérifié ! Retourne sur izy.store pour terminer la configuration de ta communauté.`);
  logger.log(`[Telegram /connect] Code=${code} vérifié pour ${chatType}=${chatId} (${chatTitle})`);
}

// POST /api/webhooks/telegram/:botId
// Reçoit les messages (/start, /connect) et les events chat_member (join/leave)
telegramWebhooksRouter.post("/:botId", async (req, res) => {
  try {
    // Vérifier le secret token — TOUJOURS requis
    const secret = req.headers["x-telegram-bot-api-secret-token"] as string | undefined;
    if (!TELEGRAM_WEBHOOK_SECRET) {
      logger.error("Telegram webhook: TELEGRAM_WEBHOOK_SECRET non configuré — rejet");
      res.status(500).json({ error: "Server misconfigured" });
      return;
    }
    // NEW-S4: Timing-safe comparison to prevent timing attacks
    const secretBuf = Buffer.from(secret || "");
    const expectedBuf = Buffer.from(TELEGRAM_WEBHOOK_SECRET);
    if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
      logger.warn("Telegram webhook: secret invalide");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const botId = req.params.botId;

    // Le body peut être raw (Buffer) car le middleware express.raw est appliqué sur /api/webhooks
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf-8") : req.body;
    const payload: TelegramWebhookPayload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

    // ── Handle /connect CODE command in groups AND channels ──
    // Groupes : payload.message  |  Canaux : payload.channel_post
    const msgText = payload.message?.text || payload.channel_post?.text || "";
    const isConnectCmd = /^\/connect(@\w+)?(\s|$)/i.test(msgText);
    const connectSource = payload.message || payload.channel_post;
    if (isConnectCmd && connectSource && connectSource.chat.type !== "private") {
      const chatId = connectSource.chat.id;
      // Dans un canal, from peut être absent — seuls les admins postent, donc on skip le check
      const fromUserId = connectSource.from?.id || null;
      const code = msgText.replace(/^\/connect(@\w+)?\s*/i, "").trim().toUpperCase();

      if (code) {
        try {
          await handleConnectCode(botId, chatId, fromUserId, code);
        } catch (err) {
          logger.error(`[Telegram /connect] Erreur code=${code} chat=${chatId}`, err);
        }
      }
      res.status(200).json({ ok: true });
      return;
    }

    // ── Handle /start command (Option C : lien via le bot) ──
    if (payload.message?.text?.startsWith("/start")) {
      const text = payload.message.text;
      const userId = payload.message.from.id;
      const username = payload.message.from.username;
      const args = text.split(" ").slice(1).join(" ").trim();

      if (args.startsWith("join_")) {
        const subscriptionId = args.replace("join_", "");
        try {
          await handleStartJoin(botId, userId, username, subscriptionId);
        } catch (err) {
          logger.error(`[Telegram /start] Erreur join sub=${subscriptionId}`, err);
          // Tenter un message d'erreur au user
          try {
            const token = await getBotTokenFromId(botId);
            if (token) {
              const telegram = new TelegramService(token);
              await telegram.sendMessage(userId, "❌ Une erreur est survenue. Réessaye en cliquant à nouveau sur le lien.");
            }
          } catch { /* ignore */ }
        }
      } else {
        // /start sans argument — message générique
        try {
          const token = await getBotTokenFromId(botId);
          if (token) {
            const telegram = new TelegramService(token);
            await telegram.sendMessage(userId, "👋 Salut ! Ce bot gère les abonnements d'une communauté payante. Si tu as un lien d'abonnement, clique dessus pour rejoindre.");
          }
        } catch { /* ignore */ }
      }
      res.status(200).json({ ok: true });
      return;
    }

    // ── Handle chat_member updates (join/leave) ──
    if (!payload.chat_member) {
      res.status(200).json({ ok: true });
      return;
    }

    const update = payload.chat_member;
    const newStatus = update.new_chat_member.status;
    const userId = update.new_chat_member.user.id;
    const username = update.new_chat_member.user.username;
    const inviteLink = update.invite_link?.invite_link;

    logger.log(`[Telegram Webhook] bot=${botId} user=${userId} status=${newStatus} invite=${inviteLink || "none"}`);

    // Quand quelqu'un rejoint le groupe (member ou admin)
    if (newStatus === "member" || newStatus === "administrator") {
      let subscription = null;

      if (inviteLink) {
        // Trouver la subscription qui a cet invite link
        subscription = await prisma.communitySubscription.findFirst({
          where: {
            inviteLink: inviteLink,
            status: { in: ["ACTIVE", "PENDING"] },
          },
          include: {
            community: {
              select: { id: true, telegramBotId: true, telegramChatId: true },
            },
          },
        });
      }

      // B6: Si pas d'invite link (ajout manuel par admin), chercher par chatId + ACTIVE uniquement
      // IMPORTANT: On ne match que ACTIVE (pas PENDING) pour éviter qu'un ajout manuel
      // "vole" la subscription d'un vrai abonné qui n'a pas encore cliqué /start
      if (!subscription && update.chat?.id) {
        subscription = await prisma.communitySubscription.findFirst({
          where: {
            community: { telegramChatId: BigInt(update.chat.id) },
            status: "ACTIVE",
            telegramUserId: null,
          },
          include: {
            community: {
              select: { id: true, telegramBotId: true, telegramChatId: true },
            },
          },
        });
      }

      if (subscription) {
        // B8: Transaction atomique pour éviter que deux webhooks écrivent en parallèle
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.communitySubscription.findUnique({
            where: { id: subscription.id },
            select: { telegramUserId: true, status: true },
          });

          // Si telegramUserId déjà set (par /start), on met juste à jour le status + memberCount
          const alreadyLinked = !!fresh?.telegramUserId;

          // Ne passer en ACTIVE que si le paiement a été confirmé (sub déjà ACTIVE via webhook Bictorys)
          // ou si un paiement COMPLETED existe. Un PENDING sans paiement = ajout manuel → ne pas activer.
          let shouldActivate = fresh?.status === "ACTIVE";
          if (!shouldActivate) {
            const hasCompletedPayment = await tx.communityPayment.findFirst({
              where: { subscriptionId: subscription.id, status: "COMPLETED" },
              select: { id: true },
            });
            shouldActivate = !!hasCompletedPayment;
          }

          // Si pas de paiement confirmé et sub pas déjà ACTIVE → ajout manuel non payant → ignorer
          if (!shouldActivate && !alreadyLinked) {
            logger.log(`[Telegram Webhook] Ajout manuel ignoré: sub=${subscription.id} user=${userId} (pas de paiement COMPLETED)`);
            return;
          }

          await tx.communitySubscription.update({
            where: { id: subscription.id },
            data: {
              ...(!alreadyLinked ? { telegramUserId: BigInt(userId), telegramUsername: username || null } : {}),
              ...(shouldActivate ? { status: "ACTIVE" } : {}),
            },
          });

          // memberCount++ seulement si le paiement est confirmé
          if (shouldActivate) {
            await tx.community.update({
              where: { id: subscription.communityId },
              data: { memberCount: { increment: 1 } },
            });
          }
        });

        logger.log(`[Telegram Webhook] Membre associé: sub=${subscription.id} user=${userId}`);

        // DM de bienvenue — garanti car l'utilisateur a déjà interagi avec le bot via /start
        try {
          const token = await getBotTokenFromId(botId);
          if (token) {
            const telegram = new TelegramService(token);
            await telegram.sendMessage(
              userId,
              `✅ Tu as rejoint le groupe ! Ton abonnement est actif. Tu recevras un rappel 3 jours avant le prochain paiement.`
            );
          }
        } catch (dmErr) {
          logger.log(`[Telegram Webhook] Impossible d'envoyer DM à ${userId}: ${dmErr instanceof Error ? dmErr.message : "unknown"}`);
        }
      }
    }

    // Quand quelqu'un quitte le groupe (left ou kicked)
    if (newStatus === "left" || newStatus === "kicked") {
      // Trouver la subscription active de cet utilisateur
      // Pour le bot central, chercher par chatId au lieu de botId
      const subscription = await prisma.communitySubscription.findFirst({
        where: {
          telegramUserId: BigInt(userId),
          community: botId === "central"
            ? { telegramChatId: BigInt(update.chat.id) }
            : { telegramBot: { id: botId } },
          status: { in: ["ACTIVE", "GRACE_PERIOD"] },
        },
        include: { community: { select: { id: true } } },
      });

      if (subscription) {
        // Auto-cancel si le membre a quitté lui-même
        if (newStatus === "left") {
          await prisma.communitySubscription.update({
            where: { id: subscription.id },
            data: {
              status: "CANCELED",
              canceledAt: new Date(),
            },
          });
          logger.log(`[Telegram Webhook] Membre a quitté, abonnement annulé: sub=${subscription.id}`);
        }

        // H10: Décrémenter memberCount (left ou kicked) — BUG-3 FIX: ne jamais passer en négatif
        await prisma.$executeRaw`UPDATE "Community" SET "memberCount" = GREATEST(0, "memberCount" - 1) WHERE id = ${subscription.community.id}`;
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error("Erreur webhook Telegram", err);
    res.status(200).json({ ok: true });
  }
});
