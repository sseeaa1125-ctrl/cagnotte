import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { queueTransactionalEmail, queueStandardEmail } from "../lib/queues/index.js";
import { escapeHtml, formatPrice } from "../lib/utils.js";
import { generateDownloadToken } from "./orders.js";
import * as logger from "../lib/logger.js";
// Phase 2 plan 02-02 — post-transaction notification dispatch (P01 + P06)
import {
  fireDonationReceived,
  fireMilestone,
  fireDonationMessage,
  type OrderForDispatch,
  type BlockForDispatch,
} from "../lib/notifications/dispatch.js";
import { detectCrossed } from "../lib/notifications/milestones.js";

// NOTE: cagnottes.sn fork — community/email-marketing/push/google-calendar features removed.
// Stubs preserved inline to keep the legacy webhook handler compiling.
const generateSubToken = (_id: string): string => "";

export const webhooksRouter = Router();

// ── Community payment webhook handler ──
async function handleCommunityPaymentWebhook(
  paymentReference: string,
  status: string,
  amount: number,
  transactionId: string
): Promise<void> {
  const payment = await prisma.communityPayment.findUnique({
    where: { reference: paymentReference },
    include: {
      subscription: true,
      community: {
        include: {
          telegramBot: true,
          seller: { select: { slug: true, displayName: true, email: true, notificationPrefs: true } },
        },
      },
    },
  });

  if (!payment) {
    logger.warn(`Webhook Bictorys: paiement communauté introuvable ref=${paymentReference}`);
    return;
  }

  // A2: Vérifier montant — marquer FAILED au lieu d'ignorer silencieusement
  if (amount !== payment.amount) {
    logger.warn(`Webhook Bictorys: montant mismatch communauté ref=${paymentReference} expected=${payment.amount} got=${amount}`);
    await prisma.communityPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED", providerTransactionId: transactionId },
    });
    return;
  }

  if (status === "succeeded" || status === "authorized") {
    // Idempotency
    if (payment.status === "COMPLETED") return;

    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

    // IMPORTANT: lire isFirstPayment AVANT la transaction qui change le statut
    const isFirstPayment = payment.subscription.status === "PENDING";

    await prisma.$transaction(async (tx) => {
      // A1: Re-check idempotency INSIDE the serializable transaction
      const freshPayment = await tx.communityPayment.findUnique({ where: { id: payment.id } });
      if (freshPayment?.status === "COMPLETED") return;

      // Marquer le paiement comme complété
      await tx.communityPayment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED", providerTransactionId: transactionId },
      });

      // Mettre à jour la subscription
      await tx.communitySubscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: "ACTIVE",
          lastPaymentAt: new Date(),
          currentPeriodStart: payment.periodStart,
          currentPeriodEnd: payment.periodEnd,
          ...(isFirstPayment ? {} : { gracePeriodEnd: null }),
        },
      });
    }, { isolationLevel: "Serializable" });
    if (isFirstPayment) {
      try {
        // Option C : Stocker le botLink (t.me/bot?start=join_{subId}) au lieu du lien du groupe
        // Le lien d'invitation sera créé par le bot quand l'utilisateur clique /start
        const botUsername = payment.community.telegramBot.botUsername;
        const botLink = `https://t.me/${botUsername}?start=join_${payment.subscriptionId}`;

        await prisma.communitySubscription.update({
          where: { id: payment.subscriptionId },
          data: {
            inviteLink: botLink,
            inviteLinkExpiresAt: null, // Le bot link n'expire pas — c'est le lien groupe qui expirera
          },
        });

        // Email de bienvenue avec le lien du bot (only if real email)
        const hasRealEmail = !payment.subscription.memberEmail.includes("@noemail.local");
        const safeName = escapeHtml(payment.subscription.memberName || (hasRealEmail ? payment.subscription.memberEmail : "Membre"));
        const safeCommunity = escapeHtml(payment.community.title);
        const safeSellerName = escapeHtml(payment.community.seller.displayName);
        const nextPaymentDate = payment.periodEnd.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        // C2: Inclure le token HMAC dans l'URL de gestion d'abonnement
        const subToken = generateSubToken(payment.subscriptionId);
        const cancelUrl = `${FRONTEND_URL}/community/cancel/${payment.subscriptionId}?token=${subToken}`;

        if (hasRealEmail) {
          // H6: Sujet email = texte brut → utiliser titre non-échappé
          queueTransactionalEmail({
            to: payment.subscription.memberEmail,
            subject: `Bienvenue dans ${payment.community.title} !`,
            html: `<h2>Bienvenue !</h2>
              <p>Salut ${safeName},</p>
              <p>Tu as rejoint <strong>${safeCommunity}</strong> de <strong>${safeSellerName}</strong> !</p>
              <div style="margin:16px 0;padding:16px;background-color:#F0FDFA;border-radius:12px;">
                <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#0D9488;">Pour rejoindre sur Telegram :</p>
                <p style="margin:0 0 4px 0;font-size:13px;color:#374151;">1. Clique sur le bouton bleu ci-dessous</p>
                <p style="margin:0 0 4px 0;font-size:13px;color:#374151;">2. Telegram va s'ouvrir — appuie sur le bouton <strong>« Démarrer »</strong> en bas de l'écran</p>
                <p style="margin:0;font-size:13px;color:#374151;">3. Tu recevras <strong>automatiquement</strong> le lien pour rejoindre</p>
              </div>
              <p style="margin-top:16px;"><a href="${botLink}" style="display:inline-block;padding:14px 28px;background-color:#0088cc;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">Ouvrir Telegram</a></p>
              <p style="font-size:12px;color:#9CA3AF;margin-top:8px;">Telegram doit être installé sur ton téléphone.</p>
              <div style="margin:16px 0;padding:12px 16px;background-color:#F9FAFB;border-radius:10px;">
                <p style="margin:0;font-size:13px;color:#6B7280;">Prochain paiement : <strong style="color:#111827;">${nextPaymentDate}</strong> — ${formatPrice(payment.amount)}</p>
              </div>
              <p style="font-size:13px;color:#9CA3AF;">Tu recevras un rappel 3 jours avant.</p>
              <p><a href="${cancelUrl}" style="color:#9CA3AF;font-size:12px;text-decoration:underline;">Gérer mon abonnement</a></p>`,
          });

          // NOTE: cagnottes.sn fork — email marketing sync removed.
        }

        // Notification au vendeur (standard — pas critique)
        queueStandardEmail({
          to: payment.community.seller.email,
          subject: `🎉 Nouvel abonné — ${payment.community.title}`,
          html: `<h2>Nouvel abonné !</h2>
            <p><strong>${safeName}</strong> a rejoint ta communauté <strong>${safeCommunity}</strong>.</p>
            <div style="margin:12px 0;padding:12px 16px;background-color:#F0FDFA;border-radius:10px;">
              <p style="margin:0;font-size:14px;color:#0D9488;font-weight:600;">${formatPrice(payment.amount)}/mois</p>
            </div>
            <p><a href="${FRONTEND_URL}/dashboard/communities" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Voir dans ton dashboard</a></p>`,
        });

        // NOTE: cagnottes.sn fork — push notifications removed.

        // Logger notification
        await prisma.communityNotification.create({
          data: { subscriptionId: payment.subscriptionId, type: "WELCOME", channel: "EMAIL" },
        });
      } catch (err) {
        logger.error("Erreur génération botLink communauté", err);
      }
    } else {
      // Renouvellement — juste un email de confirmation (only if real email)
      const hasRealEmailRenew = !payment.subscription.memberEmail.includes("@noemail.local");
      if (hasRealEmailRenew) {
        try {
          const safeName = escapeHtml(payment.subscription.memberName || payment.subscription.memberEmail);
          const safeCommunity = escapeHtml(payment.community.title);
          const nextDate = payment.periodEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

          queueTransactionalEmail({
            to: payment.subscription.memberEmail,
            subject: `Paiement confirmé — ${payment.community.title}`,
            html: `<h2>Paiement reçu !</h2>
              <p>Salut ${safeName},</p>
              <p>Ton paiement de <strong>${formatPrice(payment.amount)}</strong> pour <strong>${safeCommunity}</strong> a été confirmé.</p>
              <div style="margin:16px 0;padding:12px 16px;background-color:#F9FAFB;border-radius:10px;">
                <p style="margin:0;font-size:13px;color:#6B7280;">Prochain paiement : <strong style="color:#111827;">${nextDate}</strong></p>
              </div>`,
          });
        } catch (emailErr) {
          logger.error("Erreur email renouvellement communauté", emailErr);
        }
      }
    }
  } else if (status === "failed" || status === "cancelled" || status === "reversed") {
    await prisma.communityPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED", providerTransactionId: transactionId },
    });
  }
}

const BICTORYS_WEBHOOK_SECRET = process.env.BICTORYS_WEBHOOK_SECRET || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

// Format réel de la payload Bictorys (flat, pas nested)
interface BictorysWebhookPayload {
  id: string;
  merchantId?: string;
  type?: string;
  amount: number;
  currency: string;
  paymentReference: string;
  status: "succeeded" | "failed" | "cancelled" | "authorized" | "pending" | "processing" | "reversed";
  pspName?: string;
  paymentMeans?: string;
  merchantFees?: number;
  customerFees?: number;
  customerObject?: {
    name?: string;
    phone?: number | string;
    email?: string;
    country?: string;
  };
}

/**
 * Verify webhook signature using HMAC-SHA256 if available,
 * falls back to static secret key comparison.
 */
function verifyWebhookSignature(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined>): boolean {
  const signature = headers["x-webhook-signature"] as string | undefined;
  const timestamp = headers["x-webhook-timestamp"] as string | undefined;

  // C3: Webhook has no replay protection.
  // If HMAC signature is provided, use HMAC-SHA256 verification
  if (signature && timestamp) {
    const ts = parseInt(timestamp, 10);
    // C3: Replay protection - reject if timestamp is older than 5 minutes
    if (isNaN(ts) || Math.abs(Date.now() - ts) > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
      logger.warn(`Webhook timestamp invalide ou expiré: ${timestamp}`);
      return false; 
    }
    const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf-8") : rawBody;
    const expected = crypto
      .createHmac("sha256", BICTORYS_WEBHOOK_SECRET)
      .update(`${timestamp}.${body}`)
      .digest("hex");
    // S8: Length guard before timingSafeEqual
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  // Fallback: static secret key comparison (current Bictorys behavior)
  const secretKey = headers["x-secret-key"] as string | undefined;
  if (!secretKey || !BICTORYS_WEBHOOK_SECRET) return false;
  // S8: Length guard before timingSafeEqual
  const keyBuf = Buffer.from(secretKey);
  const secretBuf = Buffer.from(BICTORYS_WEBHOOK_SECRET);
  if (keyBuf.length !== secretBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, secretBuf);
}

// POST /api/webhooks/bictorys
webhooksRouter.post("/bictorys", async (req, res) => {
  try {
    // 1. Vérifier la signature (HMAC-SHA256 ou static key)
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf-8") : req.body;
    if (!verifyWebhookSignature(rawBody, req.headers as Record<string, string | string[] | undefined>)) {
      logger.warn("Webhook Bictorys: signature invalide");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const payload: BictorysWebhookPayload =
      typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

    const transactionId = payload.id;
    const paymentReference = payload.paymentReference;
    const status = payload.status;
    const amount = payload.amount;
    const currency = payload.currency;

    logger.log(`[Webhook Bictorys] ref=${paymentReference} status=${status} amount=${amount}`);

    // 2. Logger le webhook (idempotent) — Phase 1 added @@unique([externalId, eventType])
    // so a duplicate webhook delivery upserts the same row instead of throwing P2002.
    // The PAID branch below upserts AGAIN inside the Serializable transaction; this
    // outer write is just for non-PAID statuses + the dead community branch + audit.
    await prisma.webhookLog.upsert({
      where: { externalId_eventType: { externalId: transactionId, eventType: status } },
      create: {
        provider: "bictorys",
        eventType: status,
        externalId: transactionId,
        payload: JSON.parse(JSON.stringify(payload)),
        status: "received",
      },
      update: {},
    });

    // 3a. Vérifier si c'est un paiement communauté (ref commence par CM-)
    if (paymentReference.startsWith("CM-")) {
      await handleCommunityPaymentWebhook(paymentReference, status, amount, transactionId);
      // A6: Marquer le webhook log comme "processed" (comme pour les ordres)
      await prisma.webhookLog.updateMany({
        where: { externalId: transactionId },
        data: { status: "processed" },
      });
      res.status(200).json({ received: true });
      return;
    }

    // 3. Trouver la commande par référence
    const order = await prisma.order.findUnique({
      where: { reference: paymentReference },
      include: {
        seller: { select: { displayName: true, slug: true, email: true, timezone: true, notificationPrefs: true } },
        product: { select: { title: true, fileName: true, fileUrl: true, files: true, confirmationEmailSubject: true, confirmationEmailBody: true, systemeioCourseId: true, block: { select: { type: true } } } },
        bookingService: { select: { title: true, confirmationEmailSubject: true, confirmationEmailBody: true } },
        bumpSelections: { select: { title: true, price: true } },
      },
    });

    if (!order) {
      logger.warn(`Webhook Bictorys: commande introuvable ref=${paymentReference}`);
      res.status(200).json({ received: true });
      return;
    }

    // 4. Vérifier montant et devise (anti-fraude)
    if (amount !== order.amount || currency !== order.currency) {
      logger.warn(
        `Webhook Bictorys: montant mismatch ref=${paymentReference} expected=${order.amount} got=${amount}`
      );
      // C4: Marquer FAILED au lieu de laisser en PENDING indéfiniment
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED", paymentExternalId: transactionId },
      });
      res.status(200).json({ received: true });
      return;
    }

    // 5. Traiter selon le statut
    if (status === "succeeded" || status === "authorized") {
      // Générer lien de téléchargement si vente digitale (H2: signed token)
      // Calculé en dehors de la transaction car c'est une pure computation
      const productFiles = (order.product?.files as { url: string; fileName: string }[] | null) || [];
      const hasDigitalContent = !!(order.product?.fileUrl || productFiles.length > 0);

      const downloadToken = order.orderType === "SALE" && hasDigitalContent
        ? generateDownloadToken(order.reference)
        : undefined;
      const downloadUrl =
        order.orderType === "SALE" && hasDigitalContent
          ? `${FRONTEND_URL}/download/${order.reference}?token=${downloadToken}`
          : undefined;
      const downloadExpiresAt =
        order.orderType === "SALE"
          ? new Date(Date.now() + 72 * 60 * 60 * 1000) // A14: 72h (aligned with PRD)
          : undefined;

      // Phase 2 plan 02-02 — replaces the prior findFirst-then-update race with
      // a hard upsert on WebhookLog @@unique([externalId, eventType]) inside the
      // Serializable transaction. The combination is triple-protected against
      // double-delivery: (1) WebhookLog unique index, (2) Serializable isolation
      // (Postgres SSI aborts the loser), (3) Notification.dedupeKey @unique on
      // the post-tx fire path.
      //
      // CRITICAL: the transaction body MUST stay short (< 2s) — Neon serverless
      // tx ceiling. No email work, no notification dispatch, no Bictorys calls.
      type PaidTxResult =
        | { alreadyProcessed: true }
        | {
            alreadyProcessed: false;
            prevTotal: number;
            newTotal: number;
            blk: BlockForDispatch | null;
            ord: OrderForDispatch;
          };

      const paidResult = await prisma.$transaction(
        async (tx): Promise<PaidTxResult> => {
          // 1. Upsert webhook log atomically — first writer wins via the Phase 1
          // composite unique constraint.
          const log = await tx.webhookLog.upsert({
            where: { externalId_eventType: { externalId: transactionId, eventType: status } },
            create: {
              provider: "bictorys",
              eventType: status,
              externalId: transactionId,
              payload: JSON.parse(JSON.stringify(payload)),
              status: "received",
            },
            update: {},
          });

          // 2. If a previous in-flight webhook already marked this log processed,
          // we are the loser of the race — bail out idempotently.
          if (log.status === "processed") {
            return { alreadyProcessed: true };
          }

          // 3. Re-fetch order WITH block (for milestone detection + dispatch).
          // We re-read inside the tx so the paymentStatus check is consistent
          // with the eventual mutate.
          const ord = await tx.order.findUnique({
            where: { id: order.id },
            include: { block: true },
          });
          if (!ord || ord.paymentStatus === "PAID") {
            return { alreadyProcessed: true };
          }

          // 4. Aggregate prevTotal — paid orders on this block EXCLUDING this order.
          // Used post-tx by detectCrossed() to fire MILESTONE_REACHED at most once
          // per (block, threshold) via Notification.dedupeKey.
          let prevTotal = 0;
          if (ord.blockId) {
            const agg = await tx.order.aggregate({
              where: { blockId: ord.blockId, paymentStatus: "PAID", id: { not: ord.id } },
              _sum: { amount: true },
            });
            prevTotal = agg._sum.amount || 0;
          }

          // 5. Mutate order → PAID
          await tx.order.update({
            where: { id: ord.id },
            data: {
              paymentStatus: "PAID",
              paidAt: new Date(),
              paymentExternalId: transactionId,
              downloadUrl,
              downloadExpiresAt,
            },
          });

          // 6. Customer totals
          await tx.customer.updateMany({
            where: { sellerId: ord.sellerId, email: ord.customerEmail },
            data: {
              totalSpent: { increment: ord.amount },
              orderCount: { increment: 1 },
            },
          });

          // 7. Product totals (legacy SALE branch — kept for fork compat)
          if (ord.orderType === "SALE" && ord.productId) {
            await tx.product.update({
              where: { id: ord.productId },
              data: {
                totalSales: { increment: 1 },
                totalRevenue: { increment: ord.amount },
              },
            });
          }

          // 8. Mark log processed atomically with the order mutation.
          await tx.webhookLog.update({
            where: { id: log.id },
            data: { status: "processed" },
          });

          // 9. Project domain objects into dispatch shapes — the structural types
          // keep the dispatcher decoupled from Prisma include shapes.
          const ordForDispatch: OrderForDispatch = {
            id: ord.id,
            amount: ord.amount,
            customerName: ord.customerName,
            isAnonymous: ord.isAnonymous,
            donorMessage: ord.donorMessage,
            messageIsPrivate: ord.messageIsPrivate,
          };
          const blkForDispatch: BlockForDispatch | null = ord.block
            ? {
                id: ord.block.id,
                sellerId: ord.block.sellerId,
                title: ord.block.title,
                config: ord.block.config,
              }
            : null;

          return {
            alreadyProcessed: false,
            prevTotal,
            newTotal: prevTotal + ord.amount,
            blk: blkForDispatch,
            ord: ordForDispatch,
          };
        },
        { isolationLevel: "Serializable" },
      );

      if (paidResult.alreadyProcessed) {
        res.status(200).json({ received: true, already: "processed" });
        return;
      }

      // Phase 2 plan 02-02 — POST-TRANSACTION notification dispatch. Outside the
      // tx because (a) Neon's 2s ceiling, (b) email enqueue is fire-and-forget
      // and must not roll back the order mutation if it fails. Each fire is
      // wrapped in .catch() so a notification failure never 500s the webhook
      // (Bictorys would retry forever).
      if (paidResult.blk) {
        const blk = paidResult.blk;
        const ord = paidResult.ord;

        await fireDonationReceived(ord, blk).catch((err) =>
          logger.error("[notif] fireDonationReceived", err),
        );

        const goalAmount = ((blk.config as { goalAmount?: number } | null) || {}).goalAmount || 0;
        const crossed = detectCrossed(paidResult.prevTotal, paidResult.newTotal, goalAmount);
        for (const t of crossed) {
          await fireMilestone(blk, t).catch((err) =>
            logger.error(`[notif] fireMilestone ${t}`, err),
          );
        }

        // Per resolved Q1: private messages still fire to the creator (creator
        // sees everything in their feed; "private" is the public-wall masking
        // toggle, not a creator-feed toggle).
        if (ord.donorMessage && ord.donorMessage.trim().length > 0) {
          await fireDonationMessage(ord, blk).catch((err) =>
            logger.error("[notif] fireDonationMessage", err),
          );
        }
      }

      // NOTE: cagnottes.sn fork — Google Calendar auto-Meet, email marketing sync, and
      // Systeme.io course enrollment removed. These were fari.store-specific integrations.
      const meetingUrl: string | null = null;

      // Escape user-provided data for email HTML (H10: prevent stored XSS)
      const rawCustomerName = order.customerName || (order.customerEmail.endsWith("@noemail.local") ? "Client" : order.customerEmail);
      const rawSellerName = order.seller.displayName;
      const safeCustomerName = escapeHtml(rawCustomerName);
      const safeSellerName = escapeHtml(rawSellerName);

      // Email confirmation au client
      try {
        let customSubject = order.product?.confirmationEmailSubject || order.bookingService?.confirmationEmailSubject;
        let customBody = order.product?.confirmationEmailBody || order.bookingService?.confirmationEmailBody;

        // PAYMENT/DONATION: email templates are stored in block.config, not in product/bookingService
        if (!customSubject && !customBody && (order.orderType === "PAYMENT" || order.orderType === "DONATION")) {
          const block = await prisma.block.findFirst({
            where: { sellerId: order.sellerId, type: order.orderType, isActive: true },
            select: { config: true },
          });
          if (block?.config && typeof block.config === "object") {
            const cfg = block.config as Record<string, unknown>;
            customSubject = (cfg.confirmationEmailSubject as string) || null;
            customBody = (cfg.confirmationEmailBody as string) || null;
          }
        }

        let emailSubject: string;
        let emailHtml: string;

        if (customSubject && customBody) {
          const rawProductTitle = order.product?.title || order.bookingService?.title || "";
          const productTitle = escapeHtml(rawProductTitle);
          const filesLink = downloadUrl
            ? `<a href="${downloadUrl}" style="color:#0D9488;font-weight:bold;">Télécharger ton fichier</a>`
            : "";

          // Sujets = texte brut → pas d'échappement HTML (sinon &amp; &#x27; visibles)
          emailSubject = customSubject
            .replace(/\{customerName\}/g, rawCustomerName)
            .replace(/\{productName\}/g, rawProductTitle)
            .replace(/\{sellerName\}/g, rawSellerName);

          emailHtml = customBody
            .replace(/\{customerName\}/g, safeCustomerName)
            .replace(/\{productName\}/g, productTitle)
            .replace(/\{productFiles\}/g, filesLink)
            .replace(/\{sellerName\}/g, safeSellerName)
            .replace(/\n/g, "<br>");
        } else {
          emailSubject = `Confirmation — ${rawSellerName}`;
          emailHtml = `<h2>Paiement confirmé !</h2>
            <p>Salut ${safeCustomerName}, merci pour ta commande chez <strong>${safeSellerName}</strong>.</p>
            <div style="margin:16px 0;padding:16px;background-color:#F9FAFB;border-radius:12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Référence</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${escapeHtml(order.reference)}</td></tr>
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Montant</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${formatPrice(order.amount)}</td></tr>
              </table>
            </div>`;

          if (order.orderType === "SALE" && downloadUrl) {
            emailHtml += `<p><a href="${downloadUrl}" style="display:inline-block;padding:14px 28px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">Télécharger ton fichier</a></p>
              <p style="font-size:12px;color:#9CA3AF;">Ce lien expire dans 72 heures (5 téléchargements max).</p>`;
          }

          if (order.orderType === "BOOKING" && order.bookingService) {
            emailHtml += `<div style="margin:16px 0;padding:16px;background-color:#F0FDFA;border-radius:12px;border-left:3px solid #0D9488;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">${escapeHtml(order.bookingService.title)}</p>`;
            if (order.bookingDate) {
              const sellerTz = order.seller.timezone || "Africa/Dakar";
              const bookingFmt = new Date(order.bookingDate).toLocaleDateString("fr-FR", { timeZone: sellerTz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
              emailHtml += `<p style="margin:0 0 4px;font-size:14px;color:#374151;">📅 ${bookingFmt}</p>`;
            }
            if (order.bookingLocation) {
              emailHtml += `<p style="margin:0 0 4px;font-size:14px;color:#374151;">📍 ${escapeHtml(order.bookingLocation)}</p>`;
            }
            if (meetingUrl) {
              emailHtml += `<p style="margin:4px 0 0;"><a href="${meetingUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background-color:#1a73e8;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">🎥 Rejoindre le Google Meet</a></p>`;
            }
            emailHtml += `</div>`;
          }
        }

        // Only send client email if a real email was provided (not anonymous placeholder)
        if (!order.customerEmail.endsWith("@noemail.local")) {
          queueTransactionalEmail({
            to: order.customerEmail,
            subject: emailSubject,
            html: emailHtml,
          });
        }
      } catch (emailErr) {
        logger.error("Erreur email confirmation client", emailErr);
      }

      // Email notification au vendeur (créateur de cagnotte)
      try {
        const isFundraiser = order.orderType === "DONATION";
        const sellerSubject = isFundraiser
          ? `🎉 Nouvelle contribution — ${formatPrice(order.amount)}`
          : `💰 Nouvelle vente — ${formatPrice(order.amount)}`;
        const sellerHeading = isFundraiser ? "Nouvelle contribution !" : "Nouvelle vente !";
        const donorLabel = isFundraiser ? "Donateur" : "Client";
        const sellerDashboardUrl = isFundraiser
          ? `${FRONTEND_URL}/tableau-de-bord`
          : `${FRONTEND_URL}/dashboard/orders`;
        const sellerCtaLabel = isFundraiser ? "Voir ma cagnotte" : "Voir dans ton dashboard";

        let bumpsHtml = "";
        if (order.bumpSelections && order.bumpSelections.length > 0) {
          bumpsHtml = `<p><strong>Extras :</strong></p><ul>${order.bumpSelections.map((b) => `<li>${escapeHtml(b.title)} — ${formatPrice(b.price)}</li>`).join("")}</ul>`;
        }
        queueStandardEmail({
          to: order.seller.email,
          subject: sellerSubject,
          html: `<h2>${sellerHeading}</h2>
            <div style="margin:16px 0;padding:16px;background-color:#F0FDFA;border-radius:12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">${donorLabel}</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">${escapeHtml(order.customerEmail.endsWith("@noemail.local") ? (order.customerName || order.customerPhone || "Anonyme") : order.customerEmail)}</td></tr>
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Montant</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${formatPrice(order.amount)}</td></tr>
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Ta part</td><td style="padding:4px 0;font-size:14px;color:#0D9488;text-align:right;font-weight:700;">${formatPrice(order.sellerAmount)}</td></tr>
              </table>
            </div>
            ${bumpsHtml}
            ${meetingUrl ? `<div style="margin:16px 0;padding:12px 16px;background-color:#E8F0FE;border-radius:12px;border-left:3px solid #1a73e8;"><p style="margin:0;font-size:13px;color:#374151;">🎥 <a href="${meetingUrl}" style="color:#1a73e8;font-weight:600;text-decoration:none;">Lien Google Meet</a> créé automatiquement pour cette réservation.</p></div>` : ""}
            <p><a href="${sellerDashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#172866;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">${sellerCtaLabel}</a></p>`,
        });
      } catch (emailErr) {
        logger.error("Erreur email notification vendeur", emailErr);
      }

      // NOTE: cagnottes.sn fork — Web Push notifications removed.
    } else if (status === "failed" || status === "cancelled" || status === "reversed") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
          paymentExternalId: transactionId,
        },
      });
    } else {
      logger.log(`Webhook Bictorys: statut non traité: ${status}`);
    }

    // 7. Toujours retourner 200
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error("Erreur webhook Bictorys", err);
    res.status(200).json({ received: true, error: "internal" });
  }
});
