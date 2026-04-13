import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { queueTransactionalEmail, queueStandardEmail } from "../lib/queues/index.js";
import { escapeHtml, formatPrice } from "../lib/utils.js";
import { generateDownloadToken } from "./orders.js";
import { generateSubToken } from "./communities.js";
import * as logger from "../lib/logger.js";

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

          // Sync contact vers l'outil email marketing (community = client)
          try {
            const { syncContactToProvider } = await import("../lib/email-marketing.js");
            const memberParts = (payment.subscription.memberName || "").split(" ");
            await syncContactToProvider(payment.community.sellerId, {
              email: payment.subscription.memberEmail,
              firstName: memberParts[0] || undefined,
              lastName: memberParts.slice(1).join(" ") || undefined,
              tags: ["community"],
            });
          } catch (syncErr) {
            logger.error(`[Webhook] Erreur sync email marketing communauté ref=${paymentReference}`, syncErr);
          }
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

        // Push notification au vendeur (PWA) — respect notification preferences
        try {
          const { sendPushToSeller, formatPushPrice } = await import("../lib/push-notifications.js");
          const communityPrefs = (payment.community.seller.notificationPrefs as Record<string, boolean> | null) || {};
          if (communityPrefs.pushCommunities !== false) {
            await sendPushToSeller(payment.community.sellerId, {
              title: "Nouvel abonné !",
              body: `${payment.subscription.memberName || (hasRealEmail ? payment.subscription.memberEmail : "Un membre")} a rejoint ${payment.community.title} — ${formatPushPrice(payment.amount)}/mois`,
              url: "/dashboard/communities",
              tag: `community-${payment.id}`,
            });
          }
        } catch (pushErr) {
          logger.error(`[Push] Erreur push communauté ref=${paymentReference}`, pushErr);
        }

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

    // 2. Logger le webhook avant tout traitement
    await prisma.webhookLog.create({
      data: {
        provider: "bictorys",
        eventType: status,
        externalId: transactionId,
        payload: JSON.parse(JSON.stringify(payload)),
        status: "received",
      },
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

      // S3: Idempotency + processing dans une transaction sérialisable
      // Empêche le double-processing en cas de webhooks concurrents
      const alreadyProcessed = await prisma.$transaction(async (tx) => {
        // Check idempotency DANS la transaction (atomique)
        const existingLog = await tx.webhookLog.findFirst({
          where: { externalId: transactionId, eventType: status, status: "processed" },
        });
        if (existingLog || order.paymentStatus === "PAID") {
          return true;
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            paidAt: new Date(),
            paymentExternalId: transactionId,
            downloadUrl,
            downloadExpiresAt,
          },
        });

        await tx.customer.updateMany({
          where: { sellerId: order.sellerId, email: order.customerEmail },
          data: {
            totalSpent: { increment: order.amount },
            orderCount: { increment: 1 },
          },
        });

        if (order.orderType === "SALE" && order.productId) {
          await tx.product.update({
            where: { id: order.productId },
            data: {
              totalSales: { increment: 1 },
              totalRevenue: { increment: order.amount },
            },
          });
        }

        // Mark webhook log as processed (idempotency)
        await tx.webhookLog.updateMany({
          where: { externalId: transactionId },
          data: { status: "processed" },
        });

        return false;
      }, { isolationLevel: "Serializable" });

      if (alreadyProcessed) {
        res.status(200).json({ received: true, already: "processed" });
        return;
      }

      // Auto-création Google Meet pour les bookings si le vendeur a Google Calendar connecté
      let meetingUrl: string | null = null;
      if (order.orderType === "BOOKING" && order.bookingDate && order.bookingService) {
        try {
          const { createMeetingEvent } = await import("../lib/google-calendar.js");
          const meetResult = await createMeetingEvent(order.sellerId, {
            title: `${order.bookingService.title} — ${order.customerName || order.customerEmail}`,
            startTime: new Date(order.bookingDate),
            durationMinutes: order.bookingDuration || 60,
            location: order.bookingLocation || undefined,
            attendees: [
              { email: order.seller.email },
              { email: order.customerEmail },
            ],
            reference: order.reference,
            sellerTimezone: order.seller.timezone || "Africa/Dakar",
          });
          if (meetResult?.meetingUrl) {
            meetingUrl = meetResult.meetingUrl;
            await prisma.order.update({
              where: { id: order.id },
              data: { meetingUrl, googleEventId: meetResult.eventId || null },
            });
            logger.log(`[Webhook] Meet créé pour booking ref=${order.reference}: ${meetingUrl}, eventId=${meetResult.eventId}`);
          }
        } catch (meetErr) {
          logger.error(`[Webhook] Erreur création Meet pour ref=${order.reference}`, meetErr);
        }
      }

      // Sync contact vers l'outil email marketing du vendeur (Mailchimp, Brevo, Systeme.io)
      // Skip if no real email provided (anonymous placeholder for DONATION/PAYMENT without email)
      if (!order.customerEmail.endsWith("@noemail.local")) try {
        const { syncContactToProvider } = await import("../lib/email-marketing.js");
        const nameParts = (order.customerName || "").split(" ");
        // Use block type (LEAD_MAGNET, WAITING_LIST, etc.) for accurate client/lead tagging
        const blockType = order.product?.block?.type || order.orderType;
        await syncContactToProvider(order.sellerId, {
          email: order.customerEmail,
          firstName: nameParts[0] || undefined,
          lastName: nameParts.slice(1).join(" ") || undefined,
          tags: [blockType.toLowerCase()],
        });
      } catch (syncErr) {
        logger.error(`[Webhook] Erreur sync email marketing ref=${order.reference}`, syncErr);
      }

      // FORMATION: inscrire l'étudiant au cours Systeme.io après paiement
      if (order.orderType === "SALE" && order.product?.systemeioCourseId && order.product.block?.type === "FORMATION") {
        try {
          const { enrollStudentInCourse } = await import("../lib/email-marketing.js");
          await enrollStudentInCourse(order.sellerId, order.product.systemeioCourseId, order.customerEmail);
          logger.log(`[Webhook] Inscription Systeme.io cours=${order.product.systemeioCourseId} email=${order.customerEmail} ref=${order.reference}`);
        } catch (enrollErr) {
          logger.error(`[Webhook] Erreur inscription Systeme.io ref=${order.reference}`, enrollErr);
        }
      }

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

      // Email notification au vendeur
      try {
        let bumpsHtml = "";
        if (order.bumpSelections && order.bumpSelections.length > 0) {
          bumpsHtml = `<p><strong>Extras :</strong></p><ul>${order.bumpSelections.map((b) => `<li>${escapeHtml(b.title)} — ${formatPrice(b.price)}</li>`).join("")}</ul>`;
        }
        queueStandardEmail({
          to: order.seller.email,
          subject: `💰 Nouvelle vente — ${formatPrice(order.amount)}`,
          html: `<h2>Nouvelle vente !</h2>
            <div style="margin:16px 0;padding:16px;background-color:#F0FDFA;border-radius:12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Client</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">${escapeHtml(order.customerEmail.endsWith("@noemail.local") ? (order.customerName || order.customerPhone || "Anonyme") : order.customerEmail)}</td></tr>
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Montant</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${formatPrice(order.amount)}</td></tr>
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Ta part</td><td style="padding:4px 0;font-size:14px;color:#0D9488;text-align:right;font-weight:700;">${formatPrice(order.sellerAmount)}</td></tr>
              </table>
            </div>
            ${bumpsHtml}
            ${meetingUrl ? `<div style="margin:16px 0;padding:12px 16px;background-color:#E8F0FE;border-radius:12px;border-left:3px solid #1a73e8;"><p style="margin:0;font-size:13px;color:#374151;">🎥 <a href="${meetingUrl}" style="color:#1a73e8;font-weight:600;text-decoration:none;">Lien Google Meet</a> créé automatiquement pour cette réservation.</p></div>` : ""}
            <p><a href="${FRONTEND_URL}/dashboard/orders" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Voir dans ton dashboard</a></p>`,
        });
      } catch (emailErr) {
        logger.error("Erreur email notification vendeur", emailErr);
      }

      // Push notification au vendeur (PWA) — respect notification preferences
      try {
        const { sendPushToSeller, formatPushPrice } = await import("../lib/push-notifications.js");
        const sellerPrefs = (order.seller.notificationPrefs as Record<string, boolean> | null) || {};
        const pushKey = order.orderType === "DONATION" ? "pushDonations" : order.orderType === "PAYMENT" ? "pushPayments" : order.orderType === "BOOKING" ? "pushOrders" : "pushOrders";
        if (sellerPrefs[pushKey] !== false) {
          const pushTitle = order.orderType === "BOOKING"
            ? "Réservation confirmée !"
            : order.orderType === "DONATION"
              ? "Nouveau don reçu !"
              : order.orderType === "PAYMENT"
                ? "Paiement reçu !"
                : "Nouvelle vente !";
          const customerLabel = order.customerName || (order.customerEmail.endsWith("@noemail.local") ? (order.customerPhone || "Anonyme") : order.customerEmail);
          await sendPushToSeller(order.sellerId, {
            title: pushTitle,
            body: `${customerLabel} — ${formatPushPrice(order.amount)}`,
            url: "/dashboard/orders",
            tag: `order-${order.id}`,
          });
        }
      } catch (pushErr) {
        logger.error(`[Push] Erreur push order ref=${order.reference}`, pushErr);
      }
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
