import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../lib/rateLimitStore.js";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { requireAuth } from "../middleware/auth.js";
import { TelegramService } from "../lib/telegram.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { verifyCsrf } from "../lib/auth.js";
import { formatZodError } from "../lib/zodErrors.js";
import { invalidateStoreCache } from "./sellers.js";
import { getPaymentProvider } from "../lib/payments/index.js";
import { queueTransactionalEmail } from "../lib/queues/index.js";
import { escapeHtml, formatPrice, generateReference, billingPeriodToMs, getCountryFromRequest, getBictorysCountry, normalizeBictorysCountry } from "../lib/utils.js";
import { cleanPhoneForStorage } from "../lib/phone.js";
import * as logger from "../lib/logger.js";


// C2+C3: HMAC token pour sécuriser les routes subscription publiques
function getSubSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant — impossible de signer les tokens d'abonnement");
  return secret;
}
export function generateSubToken(subscriptionId: string): string {
  return crypto.createHmac("sha256", getSubSecret()).update(subscriptionId).digest("hex").slice(0, 32);
}
function verifySubToken(subscriptionId: string, token: string): boolean {
  const expected = generateSubToken(subscriptionId);
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export const communitiesRouter = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BICTORYS_REDIRECT_URL = process.env.BICTORYS_REDIRECT_URL || FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

// ─────────────────────────────────────────────────
// POST /api/communities — Créer une communauté
// ─────────────────────────────────────────────────
communitiesRouter.post("/", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      botToken: z.string().min(20).optional(), // Legacy: token vendeur. Si absent, on utilise le bot central
      chatId: z.string().min(1),
      title: z.string().min(1).max(200),
      description: z.string().max(500).optional(),
      priceAmount: z.number().int().min(500),
      billingPeriod: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).optional().default("MONTHLY"),
    });
    const data = schema.parse(req.body);
    const sellerId = req.seller!.sub;

    // Limiter à 3 communautés actives par vendeur
    const existingCount = await prisma.community.count({ where: { sellerId, isActive: true } });
    if (existingCount >= 3) {
      res.status(409).json({ error: "Tu as atteint la limite de 3 communautés par compte." });
      return;
    }

    // Utiliser le bot central (env) ou le token vendeur (legacy)
    const centralToken = process.env.TELEGRAM_BOT_TOKEN;
    const botToken = data.botToken || centralToken;
    if (!botToken) {
      res.status(500).json({ error: "Bot Telegram non configuré. Contacte le support." });
      return;
    }

    // Vérifier le bot
    const telegram = new TelegramService(botToken);
    const bot = await telegram.getMe();

    // Vérifier le groupe
    const chatId = /^-?\d+$/.test(data.chatId) ? parseInt(data.chatId) : data.chatId;
    const chat = await telegram.getChat(chatId);

    // Vérifier que ce groupe n'est pas déjà pris
    const existingCommunity = await prisma.community.findUnique({
      where: { telegramChatId: BigInt(chat.id) },
    });
    if (existingCommunity) {
      if (existingCommunity.sellerId !== sellerId) {
        res.status(409).json({ error: "Ce groupe/canal Telegram est déjà lié à une autre communauté." });
        return;
      }
      // Même vendeur, même groupe → déjà utilisé
      res.status(409).json({ error: "Tu as déjà une communauté liée à ce groupe/canal Telegram." });
      return;
    }

    // Créer ou mettre à jour le TelegramBot
    const encryptedToken = encrypt(botToken);
    const telegramBot = await prisma.telegramBot.upsert({
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

    // Configurer le webhook Telegram — utiliser le chemin "central" pour le bot partagé
    // (Telegram ne supporte qu'1 webhook par bot, donc tous les vendeurs partagent la même URL)
    const isCentralBot = !data.botToken; // Si pas de token vendeur, c'est le bot central
    const webhookPath = isCentralBot ? "central" : telegramBot.id;
    const webhookUrl = `${BACKEND_URL}/api/webhooks/telegram/${webhookPath}`;
    try {
      await telegram.setWebhook(webhookUrl, TELEGRAM_WEBHOOK_SECRET);
      logger.log(`Telegram webhook configuré: ${webhookUrl}`);
    } catch (err) {
      logger.error("Erreur configuration webhook Telegram", err);
    }

    // Créer le block + la communauté en transaction
    const result = await prisma.$transaction(async (tx) => {
      // Position max
      const lastBlock = await tx.block.findFirst({
        where: { sellerId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const position = (lastBlock?.position ?? -1) + 1;

      const block = await tx.block.create({
        data: {
          sellerId,
          type: "COMMUNITY",
          title: data.title,
          position,
          isActive: true,
          config: {
            communityId: "", // Placeholder, will be updated
          },
        },
      });

      // Compter les membres
      let memberCount = 0;
      try {
        memberCount = await telegram.getChatMemberCount(chat.id);
      } catch {
        // Ignore
      }

      const community = await tx.community.create({
        data: {
          sellerId,
          blockId: block.id,
          telegramBotId: telegramBot.id,
          telegramChatId: BigInt(chat.id),
          telegramChatTitle: chat.title,
          title: data.title,
          description: data.description || null,
          priceAmount: data.priceAmount,
          billingPeriod: data.billingPeriod,
          memberCount,
        },
      });

      // Mettre à jour le config du block avec le communityId
      await tx.block.update({
        where: { id: block.id },
        data: {
          config: { communityId: community.id },
        },
      });

      return { block, community };
    });

    res.status(201).json({
      block: result.block,
      community: {
        ...result.community,
        telegramChatId: result.community.telegramChatId.toString(),
      },
    });
  } catch (err) {
    logger.error("Erreur création communauté", err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    res.status(500).json({ error: "Erreur lors de la création de la communauté" });
  }
});

// ─────────────────────────────────────────────────
// PATCH /api/communities/:id — Modifier une communauté
// ─────────────────────────────────────────────────
communitiesRouter.patch("/:id", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const subscribeFieldSchema = z.object({
      id: z.string(),
      type: z.enum(["name", "email", "phone", "whatsapp", "custom"]),
      label: z.string(),
      placeholder: z.string().optional(),
      required: z.boolean(),
    });
    const schema = z.object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(500).nullable().optional(),
      coverUrl: z.string().url().nullable().optional(),
      priceAmount: z.number().int().min(500).optional(),
      billingPeriod: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
      subscribeFields: z.array(subscribeFieldSchema).nullable().optional(),
      isActive: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const sellerId = req.seller!.sub;

    const communityId = req.params.id as string;
    const community = await prisma.community.findFirst({
      where: { id: communityId, sellerId },
    });
    if (!community) {
      res.status(404).json({ error: "Communauté introuvable" });
      return;
    }

    // H5: Transaction pour mettre à jour communauté + bloc atomiquement
    const updated = await prisma.$transaction(async (tx) => {
      const updatedCommunity = await tx.community.update({
        where: { id: communityId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl }),
          ...(data.priceAmount !== undefined && { priceAmount: data.priceAmount }),
          ...(data.billingPeriod !== undefined && { billingPeriod: data.billingPeriod }),
          ...(data.subscribeFields !== undefined && { subscribeFields: data.subscribeFields === null ? Prisma.JsonNull : data.subscribeFields }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      // Mettre à jour le bloc associé (titre + isActive) si le bloc existe
      const blockUpdates: Record<string, unknown> = {};
      if (data.title !== undefined) blockUpdates.title = data.title;
      if (data.isActive !== undefined) blockUpdates.isActive = data.isActive;

      if (Object.keys(blockUpdates).length > 0) {
        await tx.block.updateMany({
          where: { id: community.blockId },
          data: blockUpdates,
        });
      }

      return updatedCommunity;
    });

    res.json({
      community: {
        ...updated,
        telegramChatId: updated.telegramChatId.toString(),
      },
    });
  } catch (err) {
    logger.error("Erreur modification communauté", err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────────
// DELETE /api/communities/:id — Soft delete
// ─────────────────────────────────────────────────
communitiesRouter.delete("/:id", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const communityId = req.params.id as string;
    const community = await prisma.community.findFirst({
      where: { id: communityId, sellerId },
      include: { telegramBot: true },
    });
    if (!community) {
      res.status(404).json({ error: "Communauté introuvable" });
      return;
    }

    // V1: Empêcher la suppression si des membres actifs existent
    const activeMembers = await prisma.communitySubscription.count({
      where: { communityId, status: { in: ["ACTIVE", "GRACE_PERIOD"] } },
    });
    if (activeMembers > 0) {
      res.status(409).json({
        error: `Impossible de supprimer : ${activeMembers} membre${activeMembers > 1 ? "s" : ""} actif${activeMembers > 1 ? "s" : ""}. Attends que tous les abonnements expirent.`,
      });
      return;
    }

    await prisma.$transaction([
      prisma.community.update({
        where: { id: communityId },
        data: { isActive: false },
      }),
      prisma.block.update({
        where: { id: community.blockId },
        data: { isActive: false },
      }),
    ]);

    // M13: NE PAS supprimer le webhook Telegram — le bot central est partagé par tous les vendeurs.
    // Supprimer le webhook ici casserait /connect et /start pour TOUS les vendeurs.

    await invalidateStoreCache(community.sellerId);
    res.json({ ok: true });
  } catch (err) {
    logger.error("Erreur suppression communauté", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────────
// GET /api/communities/:id/members — Liste des membres
// ─────────────────────────────────────────────────
communitiesRouter.get("/:id/members", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const communityId = req.params.id as string;
    const community = await prisma.community.findFirst({
      where: { id: communityId, sellerId },
    });
    if (!community) {
      res.status(404).json({ error: "Communauté introuvable" });
      return;
    }

    // M15: Pagination pour éviter timeout sur communautés à 10k+ membres
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      prisma.communitySubscription.findMany({
        where: { communityId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          memberEmail: true,
          memberName: true,
          telegramUsername: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          lastPaymentAt: true,
          gracePeriodEnd: true,
          canceledAt: true,
          lockedPrice: true,
          createdAt: true,
        },
      }),
      prisma.communitySubscription.count({ where: { communityId } }),
    ]);

    res.json({
      members: subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      community: {
        ...community,
        telegramChatId: community.telegramChatId.toString(),
      },
    });
  } catch (err) {
    logger.error("Erreur liste membres", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────────
// GET /api/communities/:id — Infos publiques d'une communauté
// ─────────────────────────────────────────────────
communitiesRouter.get("/:id", async (req, res) => {
  try {
    const communityId = req.params.id as string;

    // Si authentifié (seller), retourner toutes les infos
    // Vérifier via cookie JWT sans bloquer si absent
    let sellerId: string | null = null;
    try {
      const { verifyToken } = await import("../lib/auth.js");
      const token = req.cookies?.["izy-token"];
      if (token) {
        const payload = await verifyToken(token);
        if (payload) sellerId = payload.sub;
      }
    } catch {
      // Pas authentifié — OK
    }

    if (sellerId) {
      // Seller-authenticated: retourner toutes les infos pour l'édition
      const community = await prisma.community.findFirst({
        where: { id: communityId, sellerId },
        include: {
          telegramBot: { select: { botUsername: true } },
          _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
        },
      });
      if (community) {
        res.json({
          community: {
            ...community,
            telegramChatId: community.telegramChatId.toString(),
            activeMembers: community._count.subscriptions,
          },
        });
        return;
      }
    }

    // Public: infos limitées
    const community = await prisma.community.findFirst({
      where: { id: communityId, isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        coverUrl: true,
        priceAmount: true,
        currency: true,
        billingPeriod: true,
        memberCount: true,
        telegramChatTitle: true,
        seller: { select: { slug: true, displayName: true } },
      },
    });
    if (!community) {
      res.status(404).json({ error: "Communauté introuvable" });
      return;
    }

    res.json({ community });
  } catch (err) {
    logger.error("Erreur get communauté", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// H1+C5: Rate limit abonnements (10/min/IP)
const subscribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("subscribe"),
  message: { error: "Trop de demandes. Réessaye dans une minute." },
});

// ─────────────────────────────────────────────────
// POST /api/communities/:id/subscribe — S'abonner
// ─────────────────────────────────────────────────
communitiesRouter.post("/:id/subscribe", subscribeLimiter, async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email("Email invalide").optional(),
      name: z.string().max(200).optional(),
      phone: z.string().min(1, "Numéro de téléphone requis").max(30),
      paymentType: z.enum(["wave_money", "orange_money", "maxit", "mtn_money", "moov", "togocell", "mobicash", "card"]),
      paymentCountry: z.string().length(2).optional(),
      customFields: z.record(z.string()).optional(),
      timezone: z.string().max(100).optional(),
      otp: z.string().max(10).optional(),
    });
    const data = schema.parse(req.body);

    const communityId = req.params.id as string;
    const community = await prisma.community.findFirst({
      where: { id: communityId, isActive: true },
      include: {
        seller: { select: { id: true, slug: true, displayName: true, plan: true, customCommissionRate: true, payoutCountry: true } },
      },
    });
    if (!community) {
      res.status(404).json({ error: "Communauté introuvable" });
      return;
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + billingPeriodToMs(community.billingPeriod));
    const reference = `CM-${generateReference().replace("FA-", "")}`;

    // C1: Commission calculée côté serveur — 8% FREE, 4% PRO (basis points)
    // Admin peut définir un taux custom via customCommissionRate
    const commissionRate = community.seller.customCommissionRate ?? (community.seller.plan === "PRO" ? 400 : 800);
    const commissionAmount = Math.round(community.priceAmount * commissionRate / 10000);
    const sellerAmount = community.priceAmount - commissionAmount;

    // Resolve email: use provided or generate anonymous placeholder
    const memberEmail = data.email || `anon-${Date.now()}@noemail.local`;

    // BUG-2 FIX: Vérifier + créer/réutiliser la subscription dans une transaction sérialisable
    // pour empêcher deux requêtes concurrentes de créer des doublons
    const subscription = await prisma.$transaction(async (tx) => {
      // Chercher par email (si fourni) ou par téléphone (pour les anonymes)
      const existingSub = data.email
        ? await tx.communitySubscription.findFirst({
            where: { communityId: community.id, memberEmail: memberEmail },
          })
        : data.phone
          ? await tx.communitySubscription.findFirst({
              where: { communityId: community.id, memberPhone: cleanPhoneForStorage(data.phone) },
            })
          : null;

      if (existingSub) {
        if (existingSub.status === "ACTIVE" || existingSub.status === "GRACE_PERIOD") {
          throw new Error("ALREADY_SUBSCRIBED");
        }
        if (existingSub.status === "PENDING") {
          const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
          if (existingSub.updatedAt > threeMinAgo) {
            // Vérifier si le dernier paiement a échoué — si oui, on laisse réessayer
            const lastPayment = await tx.communityPayment.findFirst({
              where: { subscriptionId: existingSub.id },
              orderBy: { createdAt: "desc" },
              select: { status: true },
            });
            if (lastPayment && lastPayment.status === "FAILED") {
              // Le paiement précédent a échoué → on autorise un nouveau paiement
            } else {
              const elapsedMs = Date.now() - existingSub.updatedAt.getTime();
              const remainingMin = Math.max(1, Math.ceil((3 * 60 * 1000 - elapsedMs) / 60000));
              throw new Error(`PAYMENT_IN_PROGRESS:${remainingMin}`);
            }
          }
        }
      }

      // Réutiliser une subscription CANCELED/EXPIRED/stale-PENDING ou en créer une nouvelle
      if (existingSub && (existingSub.status === "CANCELED" || existingSub.status === "EXPIRED" || existingSub.status === "PENDING")) {
        return tx.communitySubscription.update({
          where: { id: existingSub.id },
          data: {
            memberName: data.name || null,
            memberPhone: data.phone ? cleanPhoneForStorage(data.phone) : null,
            memberCountry: getCountryFromRequest(req, data.timezone) || community.seller.payoutCountry || "SN",
            memberPaymentType: data.paymentType,
            customFields: data.customFields || undefined,
            status: "PENDING",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            lockedPrice: community.priceAmount,
            inviteLink: null,
            inviteLinkExpiresAt: null,
          },
        });
      }

      return tx.communitySubscription.create({
        data: {
          communityId: community.id,
          memberEmail: memberEmail,
          memberName: data.name || null,
          memberPhone: data.phone ? cleanPhoneForStorage(data.phone) : null,
          memberCountry: getCountryFromRequest(req, data.timezone) || community.seller.payoutCountry || "SN",
          memberPaymentType: data.paymentType,
          customFields: data.customFields || undefined,
          status: "PENDING",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          lockedPrice: community.priceAmount,
        },
      });
    }, { isolationLevel: "Serializable" });

    // A3: Appeler Bictorys AVANT de créer le payment pour éviter les orphelins
    const provider = getPaymentProvider("bictorys");
    const sellerSlug = community.seller.slug;
    // Pays acheteur : header géo → timezone → validé contre paymentType → fallback vendeur → SN
    const detectedCountry = getCountryFromRequest(req, data.timezone);
    const rawCountry = data.paymentCountry || getBictorysCountry(detectedCountry, data.paymentType, community.seller.payoutCountry, data.phone);
    const customerCountry = normalizeBictorysCountry(data.paymentType, rawCountry);
    const transaction = await provider.createTransaction({
      amount: community.priceAmount,
      currency: "XOF",
      country: customerCountry,
      paymentType: data.paymentType,
      reference,
      successRedirectUrl: `${BICTORYS_REDIRECT_URL}/${sellerSlug}/community-success?ref=${reference}&communityId=${community.id}`,
      errorRedirectUrl: `${BICTORYS_REDIRECT_URL}/${sellerSlug}/error?ref=${reference}`,
      ...(data.otp && { otp: data.otp }),
      customer: {
        name: data.name,
        phone: data.phone ? cleanPhoneForStorage(data.phone) : undefined,
        email: data.email || undefined,
        country: customerCountry,
      },
    });

    // Créer le paiement avec commission + externalId en une seule opération
    const paymentUrl = transaction.redirectUrl || transaction.link || null;
    const payment = await prisma.communityPayment.create({
      data: {
        subscriptionId: subscription.id,
        communityId: community.id,
        amount: community.priceAmount,
        commissionRate,
        commissionAmount,
        sellerAmount,
        reference,
        providerTransactionId: transaction.externalId,
        paymentUrl,
        periodStart: now,
        periodEnd: periodEnd,
      },
    });

    res.status(201).json({
      subscription: { id: subscription.id },
      payment: { id: payment.id, reference },
      redirectUrl: transaction.redirectUrl,
      link: transaction.link,
      qrCode: transaction.qrCode,
      message: transaction.message,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_SUBSCRIBED") {
      res.status(400).json({ error: "Tu es déjà abonné(e) à cette communauté. Vérifie ton email pour le lien d'invitation Telegram." });
      return;
    }
    if (err instanceof Error && err.message.startsWith("PAYMENT_IN_PROGRESS")) {
      const remainingMin = parseInt(err.message.split(":")[1]) || 10;
      const minuteText = remainingMin <= 1 ? "1 minute" : `${remainingMin} minutes`;
      res.status(400).json({ error: `Un paiement est déjà en cours. Réessaye dans ${minuteText} si tu n'as pas finalisé le paiement.` });
      return;
    }
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur abonnement communauté", err);
    res.status(500).json({ error: "Erreur lors de l'abonnement" });
  }
});

// ─────────────────────────────────────────────────
// GET /api/communities/payment/:ref/status — Statut paiement (pour page success)
// ─────────────────────────────────────────────────
communitiesRouter.get("/payment/:ref/status", async (req, res) => {
  try {
    const ref = req.params.ref as string;
    const payment = await prisma.communityPayment.findUnique({
      where: { reference: ref },
      select: {
        status: true,
        subscription: {
          select: {
            id: true,
            status: true,
            inviteLink: true,
            inviteLinkExpiresAt: true,
            currentPeriodEnd: true,
            lockedPrice: true,
            community: {
              select: {
                title: true,
                seller: { select: { slug: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
    if (!payment) {
      res.status(404).json({ error: "Paiement introuvable" });
      return;
    }

    // H7: Ne retourner inviteLink que si le paiement est COMPLETED
    const sub = payment.subscription;
    const safeSubscription = {
      ...sub,
      inviteLink: payment.status === "COMPLETED" ? sub.inviteLink : null,
      inviteLinkExpiresAt: payment.status === "COMPLETED" ? sub.inviteLinkExpiresAt : null,
    };

    res.json({
      paymentStatus: payment.status,
      subscription: safeSubscription,
    });
  } catch (err) {
    logger.error("Erreur get payment status", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────────
// GET /api/communities/subscription/:id — Infos abonnement
// C3: Requière ?token=HMAC pour accéder aux infos
// ─────────────────────────────────────────────────
communitiesRouter.get("/subscription/:id", async (req, res) => {
  try {
    const subId = req.params.id as string;
    const token = req.query.token as string | undefined;
    if (!token || !verifySubToken(subId, token)) {
      res.status(403).json({ error: "Lien invalide ou expiré" });
      return;
    }
    const subscription = await prisma.communitySubscription.findUnique({
      where: { id: subId },
      select: {
        id: true,
        memberEmail: true,
        memberName: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        lockedPrice: true,
        canceledAt: true,
        community: {
          select: {
            title: true,
            priceAmount: true,
            billingPeriod: true,
            seller: { select: { slug: true, displayName: true } },
          },
        },
      },
    });
    if (!subscription) {
      res.status(404).json({ error: "Abonnement introuvable" });
      return;
    }

    // Masquer l'email partiellement pour la sécurité
    const [localPart, domain] = subscription.memberEmail.split("@");
    const maskedEmail = `${localPart.slice(0, 2)}***@${domain}`;

    res.json({
      subscription: {
        ...subscription,
        memberEmail: maskedEmail,
      },
    });
  } catch (err) {
    logger.error("Erreur get abonnement", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────────
// POST /api/communities/subscription/:id/regenerate-link — Régénérer le lien d'invitation expiré
// ─────────────────────────────────────────────────
const regenerateLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("regenerate-link"),
  message: { error: "Trop de demandes. Réessaye dans 15 minutes." },
});

communitiesRouter.post("/subscription/:id/regenerate-link", regenerateLinkLimiter, async (req, res) => {
  try {
    const regenerateSchema = z.object({
      email: z.string().email("Email invalide").optional(),
      token: z.string().min(1, "Token manquant"),
    });
    const { email, token } = regenerateSchema.parse(req.body);
    const subId = req.params.id as string;

    if (!verifySubToken(subId, token)) {
      res.status(403).json({ error: "Lien invalide ou expiré" });
      return;
    }

    const subscription = await prisma.communitySubscription.findUnique({
      where: { id: subId },
      include: {
        community: {
          include: {
            telegramBot: true,
          },
        },
      },
    });

    if (!subscription) {
      res.status(404).json({ error: "Abonnement introuvable" });
      return;
    }

    // Skip email verification for anonymous members (token HMAC is sufficient)
    const isAnonymousMember = subscription.memberEmail.endsWith("@noemail.local");
    if (!isAnonymousMember) {
      if (!email) {
        res.status(400).json({ error: "Email requis pour régénérer le lien." });
        return;
      }
      if (subscription.memberEmail.toLowerCase() !== email.toLowerCase()) {
        res.status(403).json({ error: "L'email ne correspond pas à cet abonnement." });
        return;
      }
    }

    if (subscription.status !== "ACTIVE" && subscription.status !== "GRACE_PERIOD") {
      res.status(400).json({ error: "Ton abonnement n'est plus actif." });
      return;
    }

    // Vérifier si le lien actuel est encore valide
    if (subscription.inviteLink && subscription.inviteLinkExpiresAt && subscription.inviteLinkExpiresAt > new Date()) {
      res.json({ inviteLink: subscription.inviteLink, expiresAt: subscription.inviteLinkExpiresAt });
      return;
    }

    // Révoquer l'ancien lien si présent
    if (subscription.inviteLink && subscription.community.telegramBot) {
      try {
        const oldToken = decrypt(subscription.community.telegramBot.botToken);
        const oldTelegram = new TelegramService(oldToken);
        await oldTelegram.revokeInviteLink(subscription.community.telegramChatId.toString(), subscription.inviteLink);
      } catch {
        // L'ancien lien est peut-être déjà révoqué ou expiré — on ignore
      }
    }

    // Générer un nouveau lien
    if (!subscription.community.telegramBot) {
      res.status(500).json({ error: "Bot Telegram non configuré pour cette communauté." });
      return;
    }

    const decryptedToken = decrypt(subscription.community.telegramBot.botToken);
    const telegram = new TelegramService(decryptedToken);
    const inviteResult = await telegram.createInviteLink(subscription.community.telegramChatId.toString());
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.communitySubscription.update({
      where: { id: subId },
      data: {
        inviteLink: inviteResult.invite_link,
        inviteLinkExpiresAt: expiresAt,
      },
    });

    // Envoyer par email aussi (skip for anonymous members)
    if (!isAnonymousMember) {
      try {
        const safeName = escapeHtml(subscription.memberName || subscription.memberEmail);
        const safeCommunity = escapeHtml(subscription.community.title);
        queueTransactionalEmail({
          to: subscription.memberEmail,
          subject: `Nouveau lien d'invitation — ${subscription.community.title}`,
          html: `<h2>Nouveau lien d'invitation</h2>
            <p>Salut ${safeName},</p>
            <p>Voici ton nouveau lien pour rejoindre <strong>${safeCommunity}</strong> sur Telegram :</p>
            <p><a href="${inviteResult.invite_link}" style="display:inline-block;padding:14px 28px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">Rejoindre sur Telegram</a></p>
            <p style="font-size:12px;color:#9CA3AF;">Ce lien expire dans 24h.</p>`,
        });
      } catch (emailErr) {
        logger.error(`Erreur email regenerate link sub=${subId}`, emailErr);
      }
    }

    res.json({ inviteLink: inviteResult.invite_link, expiresAt });
  } catch (err) {
    logger.error("Erreur régénération lien invitation", err);
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────────
// POST /api/communities/subscription/:id/cancel — Annuler
// ─────────────────────────────────────────────────
const cancelSubLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("cancel-sub"),
  message: { error: "Trop de demandes. Réessaye dans 15 minutes." },
});

communitiesRouter.post("/subscription/:id/cancel", cancelSubLimiter, async (req, res) => {
  try {
    const cancelSchema = z.object({
      email: z.string().email("Email invalide").optional(),
      token: z.string().min(1, "Token manquant"),
    });
    const { email, token } = cancelSchema.parse(req.body);

    const subId = req.params.id as string;

    // C2: Vérifier le token HMAC avant toute opération
    if (!verifySubToken(subId, token)) {
      res.status(403).json({ error: "Lien invalide ou expiré" });
      return;
    }
    const subscription = await prisma.communitySubscription.findUnique({
      where: { id: subId },
      include: {
        community: {
          select: {
            title: true,
            seller: { select: { slug: true, displayName: true } },
          },
        },
      },
    });
    if (!subscription) {
      res.status(404).json({ error: "Abonnement introuvable" });
      return;
    }

    // Vérifier que l'email correspond (anti-abus) — skip for anonymous members (token is sufficient)
    const isAnonymousMember = subscription.memberEmail.endsWith("@noemail.local");
    if (!isAnonymousMember) {
      if (!email) {
        res.status(400).json({ error: "Email requis pour confirmer l'annulation." });
        return;
      }
      if (subscription.memberEmail.toLowerCase() !== email.toLowerCase()) {
        res.status(403).json({ error: "L'email ne correspond pas à cet abonnement." });
        return;
      }
    }

    if (subscription.status === "EXPIRED" || subscription.status === "CANCELED") {
      res.status(400).json({ error: "Cet abonnement est déjà annulé ou expiré." });
      return;
    }

    await prisma.communitySubscription.update({
      where: { id: subId },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
    });

    // Logger notification
    await prisma.communityNotification.create({
      data: {
        subscriptionId: subscription.id,
        type: "CANCELED",
        channel: "EMAIL",
      },
    });

    // Email de confirmation d'annulation (skip for anonymous members)
    if (!isAnonymousMember) {
      try {
        const safeName = escapeHtml(subscription.memberName || subscription.memberEmail);
        const safeCommunity = escapeHtml(subscription.community.title);
        const endDate = subscription.currentPeriodEnd.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        queueTransactionalEmail({
          to: subscription.memberEmail,
          subject: `Annulation de ton abonnement — ${subscription.community.title}`,
          html: `<h2>Abonnement annulé</h2>
            <p>Salut ${safeName},</p>
            <p>Ton abonnement à <strong>${safeCommunity}</strong> a été annulé.</p>
            <div style="margin:16px 0;padding:12px 16px;background-color:#FEF3C7;border-radius:10px;">
              <p style="margin:0;font-size:13px;color:#92400E;">Tu conserves ton accès jusqu'au <strong>${endDate}</strong>.</p>
            </div>
            <p>Tu peux te réabonner à tout moment depuis la page du créateur.</p>`,
        });
      } catch (emailErr) {
        logger.error("Erreur email annulation", emailErr);
      }
    }

    res.json({
      ok: true,
      message: `Abonnement annulé. Accès maintenu jusqu'au ${subscription.currentPeriodEnd.toLocaleDateString("fr-FR")}`,
    });
  } catch (err) {
    logger.error("Erreur annulation abonnement", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────────
// GET /api/communities/seller — Liste des communautés du vendeur
// ─────────────────────────────────────────────────
communitiesRouter.get("/seller/list", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    const communities = await prisma.community.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      include: {
        telegramBot: { select: { botUsername: true, botName: true } },
        _count: {
          select: {
            subscriptions: { where: { status: { in: ["ACTIVE", "GRACE_PERIOD"] } } },
          },
        },
      },
    });

    res.json({
      communities: communities.map((c) => ({
        ...c,
        telegramChatId: c.telegramChatId.toString(),
        activeMembers: c._count.subscriptions,
      })),
    });
  } catch (err) {
    logger.error("Erreur liste communautés vendeur", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
