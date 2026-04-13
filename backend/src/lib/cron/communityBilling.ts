import { prisma } from "../prisma.js";
import { TelegramService } from "../telegram.js";
import { decrypt } from "../crypto.js";
import { getPaymentProvider } from "../payments/index.js";
import { BictorysProvider } from "../payments/bictorys.js";
import { queueCommunityEmail, queueTelegramDM, queueCommunityReminder, queueTransactionalEmail, queueStandardEmail } from "../queues/index.js";
import { escapeHtml, generateReference, formatPrice, billingPeriodToMs, billingPeriodLabel, normalizeBictorysCountry } from "../utils.js";
import { generateSubToken } from "../../routes/communities.js";
import * as logger from "../logger.js";
import { redis } from "../redis.js";
import type { CommunityNotifType } from "../../generated/prisma/client.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

async function getTelegramService(botId: string): Promise<TelegramService | null> {
  try {
    const bot = await prisma.telegramBot.findUnique({ where: { id: botId } });
    if (!bot) return null;
    const token = decrypt(bot.botToken);
    return new TelegramService(token);
  } catch (err) {
    logger.error("Erreur déchiffrement token bot", err);
    return null;
  }
}

// B5: Rate limit — pause entre les appels Telegram API (ban, health check)
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Check if memberEmail is a real address (not an anonymous placeholder)
function isRealEmail(email: string): boolean {
  return !email.includes("@noemail.local");
}

// B2: Désactiver la communauté quand le bot est retiré du groupe
async function handleBotRemoved(communityId: string, sellerEmail: string, communityTitle: string): Promise<void> {
  logger.warn(`[Cron] Bot retiré du groupe — désactivation communauté ${communityId}`);
  await prisma.community.update({
    where: { id: communityId },
    data: { isActive: false },
  });
  queueCommunityEmail({
    to: sellerEmail,
    subject: `⚠️ Action requise — ${communityTitle}`,
    html: `<h2>Bot retiré du groupe</h2>
      <p>Le bot Telegram a été retiré du groupe <strong>${escapeHtml(communityTitle)}</strong>.</p>
      <div style="margin:16px 0;padding:12px 16px;background-color:#FEF2F2;border-radius:10px;">
        <p style="margin:0;font-size:13px;color:#991B1B;">La communauté a été <strong>désactivée</strong> automatiquement. Les nouveaux abonnements sont suspendus.</p>
      </div>
      <p>Pour réactiver, ajoute le bot comme admin dans le groupe / canal Telegram puis réactive la communauté depuis ton dashboard.</p>
      <p><a href="${FRONTEND_URL}/dashboard/communities" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Voir dans ton dashboard</a></p>`,
  });
}

async function wasNotificationSent(subscriptionId: string, type: CommunityNotifType): Promise<boolean> {
  const existing = await prisma.communityNotification.findFirst({
    where: { subscriptionId, type },
  });
  return !!existing;
}

async function createPaymentLink(
  subscription: { id: string; communityId: string; lockedPrice: number; memberEmail: string; memberName: string | null; memberPhone: string | null; memberCountry: string | null; memberPaymentType: string | null; currentPeriodEnd: Date },
  community: { id: string; billingPeriod?: string; seller: { slug: string; plan?: string; customCommissionRate?: number | null; payoutCountry?: string | null } }
): Promise<{ reference: string; paymentUrl: string | null }> {
  const periodStart = subscription.currentPeriodEnd;
  const periodEnd = new Date(periodStart.getTime() + billingPeriodToMs(community.billingPeriod || "MONTHLY"));
  const reference = `CM-${generateReference().replace("FA-", "")}`;

  // Vérifier qu'il n'y a pas déjà un paiement pending pour cette période
  const existingPayment = await prisma.communityPayment.findFirst({
    where: {
      subscriptionId: subscription.id,
      status: "PENDING",
      periodStart: { gte: new Date(periodStart.getTime() - 24 * 60 * 60 * 1000) },
    },
  });

  if (existingPayment?.paymentUrl) {
    // H8: Vérifier que le paiement n'est pas trop ancien (les liens Bictorys expirent)
    const paymentAge = Date.now() - existingPayment.createdAt.getTime();
    const MAX_PAYMENT_LINK_AGE = 24 * 60 * 60 * 1000; // 24h
    if (paymentAge < MAX_PAYMENT_LINK_AGE) {
      return { reference: existingPayment.reference, paymentUrl: existingPayment.paymentUrl };
    }
    // Lien expiré — marquer comme failed et en créer un nouveau
    await prisma.communityPayment.update({
      where: { id: existingPayment.id },
      data: { status: "FAILED" as const },
    });
  }

  // C1: Commission calculée côté serveur — 8% FREE, 4% PRO
  // Admin peut définir un taux custom via customCommissionRate
  const commissionRate = community.seller.customCommissionRate ?? (community.seller.plan === "PRO" ? 400 : 800);
  const commissionAmount = Math.round(subscription.lockedPrice * commissionRate / 10000);
  const sellerAmount = subscription.lockedPrice - commissionAmount;

  const provider = getPaymentProvider("bictorys");
  const sellerSlug = community.seller.slug;

  // S1 FIX: Utiliser le pays stocké au subscribe, fallback pays vendeur, fallback SN
  const rawMemberCountry = subscription.memberCountry || community.seller.payoutCountry || "SN";
  const memberPaymentType = (subscription.memberPaymentType || "wave_money") as "wave_money" | "orange_money" | "maxit" | "mtn_money" | "moov" | "togocell" | "mobicash" | "card";
  const memberCountry = normalizeBictorysCountry(memberPaymentType, rawMemberCountry);
  const transaction = await provider.createTransaction({
    amount: subscription.lockedPrice,
    currency: "XOF",
    country: memberCountry,
    paymentType: memberPaymentType,
    reference,
    successRedirectUrl: `${FRONTEND_URL}/${sellerSlug}/community-success?ref=${reference}&communityId=${community.id}&renewal=1`,
    errorRedirectUrl: `${FRONTEND_URL}/${sellerSlug}/error?ref=${reference}`,
    customer: {
      name: subscription.memberName || undefined,
      phone: subscription.memberPhone || undefined,
      email: isRealEmail(subscription.memberEmail) ? subscription.memberEmail : undefined,
      country: memberCountry,
    },
  });

  const paymentUrl = transaction.redirectUrl || transaction.link || null;

  await prisma.communityPayment.create({
    data: {
      subscriptionId: subscription.id,
      communityId: subscription.communityId,
      amount: subscription.lockedPrice,
      commissionRate,
      commissionAmount,
      sellerAmount,
      reference,
      providerTransactionId: transaction.externalId,
      paymentUrl,
      periodStart,
      periodEnd,
    },
  });

  return { reference, paymentUrl };
}

// ─────────────────────────────────────────────────
// Job 1 : Rappels de renouvellement (J-3)
// ─────────────────────────────────────────────────
async function processRenewalReminders(): Promise<void> {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const fourDaysLater = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  // Trouver les abonnements actifs qui expirent dans ~3 jours
  // H11: Ignorer les communautés désactivées
  // P4: Limiter à 500 par batch pour éviter les fetches non-bornés
  const subscriptions = await prisma.communitySubscription.findMany({
    where: {
      status: "ACTIVE",
      community: { isActive: true },
      currentPeriodEnd: {
        gte: threeDaysLater,
        lt: fourDaysLater,
      },
    },
    include: {
      community: {
        include: {
          telegramBot: true,
          seller: { select: { slug: true, displayName: true, plan: true, customCommissionRate: true, payoutCountry: true } },
        },
      },
    },
    take: 500,
  });

  for (const sub of subscriptions) {
    // Éviter les doublons
    if (await wasNotificationSent(sub.id, "RENEWAL_REMINDER")) continue;

    try {
      const { paymentUrl } = await createPaymentLink(sub, sub.community);
      const hasEmail = isRealEmail(sub.memberEmail);
      const safeName = escapeHtml(sub.memberName || (hasEmail ? sub.memberEmail : "Membre"));
      const safeCommunity = escapeHtml(sub.community.title);
      const rawCommunity = sub.community.title;
      const renewDate = sub.currentPeriodEnd.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      });
      const cancelUrl = `${FRONTEND_URL}/community/cancel/${sub.id}?token=${generateSubToken(sub.id)}`;
      const priceText = formatPrice(sub.lockedPrice);

      // Email + Telegram via queue communauté (skip email if anonymous)
      if (hasEmail) {
        queueCommunityReminder({
          email: {
            to: sub.memberEmail,
            subject: `Ton abonnement ${rawCommunity} se renouvelle bientôt`,
            html: `<h2>Rappel de renouvellement</h2>
              <p>Salut ${safeName},</p>
              <p>Ton abonnement à <strong>${safeCommunity}</strong> se renouvelle le <strong>${renewDate}</strong>.</p>
              <div style="margin:16px 0;padding:12px 16px;background-color:#F9FAFB;border-radius:10px;">
                <p style="margin:0;font-size:13px;color:#6B7280;">Montant : <strong style="color:#111827;">${priceText}</strong></p>
              </div>
              ${paymentUrl ? `<p><a href="${paymentUrl}" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Payer maintenant</a></p>` : ""}
              <p style="font-size:13px;color:#9CA3AF;">Si tu ne souhaites pas continuer : <a href="${cancelUrl}" style="color:#9CA3AF;text-decoration:underline;">Annuler</a></p>`,
          },
          telegram: {
            botId: sub.community.telegramBotId,
            userId: sub.telegramUserId,
            text: `📅 Ton abonnement à « ${sub.community.title} » se renouvelle le ${renewDate}.\n\n💰 ${priceText}\n${paymentUrl ? `👉 Payer : ${paymentUrl}` : ""}\n\nPour annuler : ${cancelUrl}`,
          },
        });
      } else if (sub.telegramUserId) {
        queueTelegramDM({
          botId: sub.community.telegramBotId,
          userId: sub.telegramUserId,
          text: `📅 Ton abonnement à « ${sub.community.title} » se renouvelle le ${renewDate}.\n\n💰 ${priceText}\n${paymentUrl ? `👉 Payer : ${paymentUrl}` : ""}\n\nPour annuler : ${cancelUrl}`,
        });
      }

      // Logger notification
      await prisma.communityNotification.create({
        data: { subscriptionId: sub.id, type: "RENEWAL_REMINDER", channel: "EMAIL" },
      });

      logger.log(`[Cron] Rappel J-3 envoyé: sub=${sub.id}`);
    } catch (err) {
      logger.error(`[Cron] Erreur rappel J-3 sub=${sub.id}`, err);
    }
  }
}

// ─────────────────────────────────────────────────
// Job 2 : Vérifier les paiements à l'échéance (Jour J)
// ─────────────────────────────────────────────────
async function processExpirations(): Promise<void> {
  const now = new Date();

  // Abonnements actifs dont la période est terminée
  // H11: Ignorer les communautés désactivées
  // P4: Limiter à 500 par batch
  const subscriptions = await prisma.communitySubscription.findMany({
    where: {
      status: "ACTIVE",
      community: { isActive: true },
      currentPeriodEnd: { lte: now },
    },
    include: {
      community: {
        include: {
          telegramBot: true,
          seller: { select: { slug: true, displayName: true, plan: true, email: true, customCommissionRate: true, payoutCountry: true } },
        },
      },
    },
    take: 500,
  });

  for (const sub of subscriptions) {
    try {
      // Vérifier si un paiement completed existe pour la prochaine période
      const completedPayment = await prisma.communityPayment.findFirst({
        where: {
          subscriptionId: sub.id,
          status: "COMPLETED",
          periodStart: { gte: new Date(sub.currentPeriodEnd.getTime() - 2 * 24 * 60 * 60 * 1000) },
        },
      });

      if (completedPayment) {
        // Renouveler
        await prisma.communitySubscription.update({
          where: { id: sub.id },
          data: {
            currentPeriodStart: completedPayment.periodStart,
            currentPeriodEnd: completedPayment.periodEnd,
            status: "ACTIVE",
            lastPaymentAt: new Date(),
          },
        });
        logger.log(`[Cron] Renouvelé: sub=${sub.id}`);
      } else {
        // H5: Grace period basée sur currentPeriodEnd (déterministe), pas sur now
        const gracePeriodEnd = new Date(sub.currentPeriodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
        await prisma.communitySubscription.update({
          where: { id: sub.id },
          data: {
            status: "GRACE_PERIOD",
            gracePeriodEnd,
          },
        });

        const { paymentUrl } = await createPaymentLink(sub, sub.community);
        const hasEmail = isRealEmail(sub.memberEmail);
        const safeName = escapeHtml(sub.memberName || (hasEmail ? sub.memberEmail : "Membre"));
        const safeCommunity = escapeHtml(sub.community.title);
        const rawCommunity = sub.community.title;
        const priceText = formatPrice(sub.lockedPrice);

        // Email + Telegram via queue communauté (skip email if anonymous)
        if (hasEmail) {
          queueCommunityReminder({
            email: {
              to: sub.memberEmail,
              subject: `Paiement échoué — ${rawCommunity}`,
              html: `<h2>Paiement échoué</h2>
                <p>Salut ${safeName},</p>
                <p>Ton paiement de <strong>${priceText}</strong> pour <strong>${safeCommunity}</strong> n'a pas été effectué.</p>
                <div style="margin:16px 0;padding:12px 16px;background-color:#FEF3C7;border-radius:10px;">
                  <p style="margin:0;font-size:13px;color:#92400E;">Tu as <strong>3 jours</strong> pour régulariser, sinon tu seras retiré(e) du groupe / canal Telegram.</p>
                </div>
                ${paymentUrl ? `<p><a href="${paymentUrl}" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Payer maintenant</a></p>` : ""}`,
            },
            telegram: {
              botId: sub.community.telegramBotId,
              userId: sub.telegramUserId,
              text: `⚠️ Ton paiement pour « ${sub.community.title} » a échoué.\n\nTu as 3 jours pour payer, sinon tu seras retiré(e) du groupe.\n\n${paymentUrl ? `👉 Payer maintenant : ${paymentUrl}` : ""}`,
            },
          });
        } else if (sub.telegramUserId) {
          queueTelegramDM({
            botId: sub.community.telegramBotId,
            userId: sub.telegramUserId,
            text: `⚠️ Ton paiement pour « ${sub.community.title} » a échoué.\n\nTu as 3 jours pour payer, sinon tu seras retiré(e) du groupe.\n\n${paymentUrl ? `👉 Payer maintenant : ${paymentUrl}` : ""}`,
          });
        }

        await prisma.communityNotification.create({
          data: { subscriptionId: sub.id, type: "PAYMENT_FAILED", channel: "EMAIL" },
        });

        // M14: Notifier le vendeur du paiement échoué
        queueCommunityEmail({
          to: sub.community.seller.email,
          subject: `Paiement échoué — ${rawCommunity}`,
          html: `<h2>Paiement échoué</h2>
            <p>Le paiement de <strong>${safeName}</strong> pour <strong>${safeCommunity}</strong> a échoué.</p>
            <div style="margin:12px 0;padding:12px 16px;background-color:#FEF3C7;border-radius:10px;">
              <p style="margin:0;font-size:13px;color:#92400E;">Le membre a 3 jours pour régulariser avant d'être retiré du groupe.</p>
            </div>
            <p><a href="${FRONTEND_URL}/dashboard/communities" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Voir dans ton dashboard</a></p>`,
        });

        logger.log(`[Cron] Grace period: sub=${sub.id}`);
      }
    } catch (err) {
      logger.error(`[Cron] Erreur expiration sub=${sub.id}`, err);
    }
  }
}

// ─────────────────────────────────────────────────
// Job 3 : Grace period — rappels + kick
// ─────────────────────────────────────────────────
async function processGracePeriod(): Promise<void> {
  const now = new Date();

  // H11: Ignorer les communautés désactivées
  // P4: Limiter à 500 par batch
  const subscriptions = await prisma.communitySubscription.findMany({
    where: { status: "GRACE_PERIOD", community: { isActive: true } },
    include: {
      community: {
        include: {
          telegramBot: true,
          seller: { select: { slug: true, displayName: true, plan: true, email: true, customCommissionRate: true, payoutCountry: true } },
        },
      },
    },
    take: 500,
  });

  for (const sub of subscriptions) {
    if (!sub.gracePeriodEnd) continue;

    try {
      // Vérifier si un paiement est arrivé entre temps
      const completedPayment = await prisma.communityPayment.findFirst({
        where: {
          subscriptionId: sub.id,
          status: "COMPLETED",
          createdAt: { gte: sub.currentPeriodEnd },
        },
      });

      if (completedPayment) {
        // Paiement reçu pendant la grace period — réactiver
        await prisma.communitySubscription.update({
          where: { id: sub.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart: completedPayment.periodStart,
            currentPeriodEnd: completedPayment.periodEnd,
            lastPaymentAt: new Date(),
            gracePeriodEnd: null,
          },
        });
        logger.log(`[Cron] Paiement reçu pendant grace, réactivé: sub=${sub.id}`);
        continue;
      }

      const msLeft = sub.gracePeriodEnd.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

      if (daysLeft <= 0) {
        // KICK
        if (sub.telegramUserId) {
          const telegram = await getTelegramService(sub.community.telegramBotId);
          if (telegram) {
            try {
              await telegram.banMember(sub.community.telegramChatId.toString(), sub.telegramUserId.toString());
              logger.log(`[Cron] Membre kické: sub=${sub.id} user=${sub.telegramUserId}`);
            } catch (banErr) {
              // B2: Détecter si le bot a été retiré du groupe
              const errMsg = banErr instanceof Error ? banErr.message : "";
              if (errMsg.includes("bot was kicked") || errMsg.includes("bot is not a member") || errMsg.includes("chat not found") || errMsg.includes("Forbidden")) {
                await handleBotRemoved(sub.community.id, sub.community.seller.email, sub.community.title);
                continue;
              }
              logger.error(`[Cron] Erreur kick sub=${sub.id}`, banErr);
            }
          }
        }

        await prisma.communitySubscription.update({
          where: { id: sub.id },
          data: { status: "EXPIRED" },
        });

        // BUG-7 FIX: GREATEST(0) pour éviter memberCount négatif
        await prisma.$executeRaw`UPDATE "Community" SET "memberCount" = GREATEST("memberCount" - 1, 0) WHERE id = ${sub.communityId}`;

        const hasEmail = isRealEmail(sub.memberEmail);
        const safeName = escapeHtml(sub.memberName || (hasEmail ? sub.memberEmail : "Membre"));
        const safeCommunity = escapeHtml(sub.community.title);
        const rawCommunity = sub.community.title;
        const storeUrl = `${FRONTEND_URL}/${sub.community.seller.slug}`;

        if (hasEmail) {
          queueCommunityEmail({
            to: sub.memberEmail,
            subject: `Tu as été retiré(e) de ${rawCommunity}`,
            html: `<h2>Abonnement expiré</h2>
              <p>Salut ${safeName},</p>
              <p>Ton abonnement à <strong>${safeCommunity}</strong> a expiré et tu as été retiré(e) du groupe / canal Telegram.</p>
              <p>Tu peux te réabonner à tout moment :</p>
              <p><a href="${storeUrl}" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Se réabonner</a></p>`,
          });
        }

        await prisma.communityNotification.create({
          data: { subscriptionId: sub.id, type: "KICKED", channel: "EMAIL" },
        });
      } else {
        // Rappel quotidien
        const graceDay = 4 - daysLeft; // 1, 2, 3
        const graceDayEnums = ["GRACE_DAY_1", "GRACE_DAY_2", "GRACE_DAY_3"] as const;
        const notifType = graceDayEnums[graceDay - 1] || "GRACE_DAY_1";

        if (await wasNotificationSent(sub.id, notifType)) continue;

        const hasEmail = isRealEmail(sub.memberEmail);
        const safeName = escapeHtml(sub.memberName || (hasEmail ? sub.memberEmail : "Membre"));
        const safeCommunity = escapeHtml(sub.community.title);
        const rawCommunity = sub.community.title;
        const priceText = formatPrice(sub.lockedPrice);

        // Réutiliser le lien de paiement existant
        const existingPayment = await prisma.communityPayment.findFirst({
          where: { subscriptionId: sub.id, status: "PENDING" },
          orderBy: { createdAt: "desc" },
        });
        const paymentUrl = existingPayment?.paymentUrl || "";

        // C4: Pluralisation correcte en français
        const daysText = daysLeft <= 1 ? "Dernier jour" : `Plus que ${daysLeft} jours`;

        // Email + Telegram via queue communauté (skip email if anonymous)
        if (hasEmail) {
          queueCommunityReminder({
            email: {
              to: sub.memberEmail,
              subject: `${daysText} — ${rawCommunity}`,
              html: `<h2>Rappel de paiement</h2>
                <p>Salut ${safeName},</p>
                <p>Ton paiement de <strong>${priceText}</strong> pour <strong>${safeCommunity}</strong> n'a pas été effectué.</p>
                <div style="margin:16px 0;padding:12px 16px;background-color:#FEF3C7;border-radius:10px;">
                  <p style="margin:0;font-size:13px;color:#92400E;">Tu as <strong>${daysLeft} jour${daysLeft > 1 ? "s" : ""}</strong> pour régulariser, sinon tu seras retiré(e) du groupe.</p>
                </div>
                ${paymentUrl ? `<p><a href="${paymentUrl}" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Payer maintenant</a></p>` : ""}`,
            },
            telegram: {
              botId: sub.community.telegramBotId,
              userId: sub.telegramUserId,
              text: `⚠️ Ton paiement pour « ${sub.community.title} » a échoué.\n\nPlus que ${daysLeft} jour${daysLeft > 1 ? "s" : ""} pour payer.\n\n${paymentUrl ? `👉 Payer maintenant : ${paymentUrl}` : ""}`,
            },
          });
        } else if (sub.telegramUserId) {
          queueTelegramDM({
            botId: sub.community.telegramBotId,
            userId: sub.telegramUserId,
            text: `⚠️ Ton paiement pour « ${sub.community.title} » a échoué.\n\nPlus que ${daysLeft} jour${daysLeft > 1 ? "s" : ""} pour payer.\n\n${paymentUrl ? `👉 Payer maintenant : ${paymentUrl}` : ""}`,
          });
        }

        await prisma.communityNotification.create({
          data: { subscriptionId: sub.id, type: notifType, channel: "EMAIL" },
        });

        logger.log(`[Cron] Grace rappel jour ${graceDay}: sub=${sub.id}`);
      }
    } catch (err) {
      logger.error(`[Cron] Erreur grace period sub=${sub.id}`, err);
    }
  }
}

// ─────────────────────────────────────────────────
// Job 4 : Annulations programmées
// ─────────────────────────────────────────────────
async function processCancelations(): Promise<void> {
  const now = new Date();

  // P4: Limiter à 500 par batch
  const subscriptions = await prisma.communitySubscription.findMany({
    where: {
      status: "CANCELED",
      currentPeriodEnd: { lte: now },
    },
    include: {
      community: {
        include: {
          telegramBot: true,
          seller: { select: { slug: true, plan: true, email: true, customCommissionRate: true, payoutCountry: true } },
        },
      },
    },
    take: 500,
  });

  for (const sub of subscriptions) {
    try {
      // Kick si on a le telegram user id
      if (sub.telegramUserId) {
        const telegram = await getTelegramService(sub.community.telegramBotId);
        if (telegram) {
          try {
            await telegram.banMember(sub.community.telegramChatId.toString(), sub.telegramUserId.toString());
          } catch (banErr) {
            // B2: Détecter si le bot a été retiré du groupe
            const errMsg = banErr instanceof Error ? banErr.message : "";
            if (errMsg.includes("bot was kicked") || errMsg.includes("bot is not a member") || errMsg.includes("chat not found") || errMsg.includes("Forbidden")) {
              await handleBotRemoved(sub.community.id, sub.community.seller.email ?? "", sub.community.title);
              continue;
            }
            logger.error(`[Cron] Erreur kick annulation sub=${sub.id}`, banErr);
          }
        }
      }

      await prisma.communitySubscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });

      // BUG-7 FIX: GREATEST(0) pour éviter memberCount négatif
      await prisma.$executeRaw`UPDATE "Community" SET "memberCount" = GREATEST("memberCount" - 1, 0) WHERE id = ${sub.communityId}`;

      const hasEmail = isRealEmail(sub.memberEmail);
      const safeName = escapeHtml(sub.memberName || (hasEmail ? sub.memberEmail : "Membre"));
      const safeCommunity = escapeHtml(sub.community.title);
      const rawCommunity = sub.community.title;

      if (hasEmail) {
        queueCommunityEmail({
          to: sub.memberEmail,
          subject: `Ton abonnement à ${rawCommunity} est terminé`,
          html: `<h2>Abonnement terminé</h2>
            <p>Salut ${safeName},</p>
            <p>Ton abonnement à <strong>${safeCommunity}</strong> est terminé comme demandé.</p>
            <p>Tu peux te réabonner à tout moment depuis la page du créateur.</p>`,
        });
      }

      await prisma.communityNotification.create({
        data: { subscriptionId: sub.id, type: "CANCELED", channel: "EMAIL" },
      });

      logger.log(`[Cron] Annulation effective: sub=${sub.id}`);
    } catch (err) {
      logger.error(`[Cron] Erreur annulation sub=${sub.id}`, err);
    }
  }
}

// ─────────────────────────────────────────────────
// Job 8 : Re-vérifier les paiements PENDING avec Bictorys
// Rattrape les webhooks manqués pour donner accès aux membres
// ─────────────────────────────────────────────────
async function recheckPendingPayments(): Promise<void> {
  // Paiements PENDING créés il y a plus de 2 min mais moins de 24h
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const pendingPayments = await prisma.communityPayment.findMany({
    where: {
      status: "PENDING",
      providerTransactionId: { not: null },
      createdAt: { gte: twentyFourHoursAgo, lte: twoMinAgo },
    },
    include: {
      subscription: true,
      community: {
        include: {
          telegramBot: true,
          seller: { select: { slug: true, displayName: true, email: true } },
        },
      },
    },
  });

  if (pendingPayments.length === 0) return;

  const bictorys = new BictorysProvider();
  let rechecked = 0;
  let completed = 0;

  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  for (const payment of pendingPayments) {
    if (!payment.providerTransactionId) continue;
    
    // Circuit breaker : si Bictorys est en carafe (500), on arrête de boucler pour ce cycle
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      logger.warn(`[Cron recheck] Trop d'erreurs consécutives (${consecutiveErrors}), arrêt du cycle recheck.`);
      break;
    }

    rechecked++;

    try {
      const result = await bictorys.checkTransactionStatus(payment.providerTransactionId);
      
      if (!result) {
        consecutiveErrors++;
        continue;
      }
      
      consecutiveErrors = 0; // Reset on success

      if (result.status === "succeeded" || result.status === "authorized") {
        // Vérifier montant
        if (result.amount !== payment.amount) {
          logger.warn(`[Cron recheck] Montant mismatch payment=${payment.id} expected=${payment.amount} got=${result.amount}`);
          await prisma.communityPayment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
          });
          continue;
        }

        const isFirstPayment = payment.subscription.status === "PENDING";

        // Marquer comme complété + activer l'abonnement
        // Returns true if we actually processed (not already done by webhook)
        const wasProcessed = await prisma.$transaction(async (tx) => {
          const fresh = await tx.communityPayment.findUnique({ where: { id: payment.id } });
          if (fresh?.status === "COMPLETED") return false; // Already processed by webhook

          await tx.communityPayment.update({
            where: { id: payment.id },
            data: { status: "COMPLETED", providerTransactionId: payment.providerTransactionId },
          });

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
          return true;
        }, { isolationLevel: "Serializable" });

        // Skip email if already processed by webhook (avoid duplicates)
        if (!wasProcessed) {
          logger.log(`[Cron recheck] Payment already processed by webhook: payment=${payment.id}`);
          continue;
        }

        // Premier paiement — Option C : stocker botLink + envoyer email
        if (isFirstPayment) {
          try {
            const botUsername = payment.community.telegramBot.botUsername;
            const botLink = `https://t.me/${botUsername}?start=join_${payment.subscriptionId}`;

            await prisma.communitySubscription.update({
              where: { id: payment.subscriptionId },
              data: {
                inviteLink: botLink,
                inviteLinkExpiresAt: null,
              },
            });

            const hasEmail = isRealEmail(payment.subscription.memberEmail);
            const safeName = escapeHtml(payment.subscription.memberName || (hasEmail ? payment.subscription.memberEmail : "Membre"));
            const safeCommunity = escapeHtml(payment.community.title);
            const safeSellerName = escapeHtml(payment.community.seller.displayName);
            const nextPaymentDate = payment.periodEnd.toLocaleDateString("fr-FR", {
              day: "numeric", month: "long", year: "numeric",
            });
            const subToken = generateSubToken(payment.subscriptionId);
            const cancelUrl = `${FRONTEND_URL}/community/cancel/${payment.subscriptionId}?token=${subToken}`;

            if (hasEmail) {
              queueTransactionalEmail({
                to: payment.subscription.memberEmail,
                subject: `Bienvenue dans ${payment.community.title} !`,
                html: `<h2>Bienvenue !</h2>
                  <p>Salut ${safeName},</p>
                  <p>Ton paiement a été confirmé ! Tu as rejoint <strong>${safeCommunity}</strong> de <strong>${safeSellerName}</strong>.</p>
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
                  <p><a href="${cancelUrl}" style="color:#9CA3AF;font-size:12px;text-decoration:underline;">Gérer mon abonnement</a></p>`,
              });
            }

            // Notification vendeur (toujours envoyée, c'est au vendeur)
            queueStandardEmail({
              to: payment.community.seller.email,
              subject: `🎉 Nouvel abonné — ${payment.community.title}`,
              html: `<h2>Nouvel abonné !</h2>
                <p><strong>${safeName}</strong> a rejoint ta communauté <strong>${safeCommunity}</strong>.</p>
                <div style="margin:12px 0;padding:12px 16px;background-color:#F0FDFA;border-radius:10px;">
                  <p style="margin:0;font-size:14px;color:#0D9488;font-weight:600;">${formatPrice(payment.amount)}${billingPeriodLabel(payment.community.billingPeriod || "MONTHLY")}</p>
                </div>
                <p><a href="${FRONTEND_URL}/dashboard/communities" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Voir dans ton dashboard</a></p>`,
            });
          } catch (invErr) {
            logger.error(`[Cron recheck] Erreur botLink payment=${payment.id}`, invErr);
          }
        }

        completed++;
        logger.log(`[Cron recheck] Paiement confirmé: payment=${payment.id} sub=${payment.subscriptionId} first=${isFirstPayment}`);
      } else if (result.status === "failed" || result.status === "cancelled") {
        await prisma.communityPayment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        logger.log(`[Cron recheck] Paiement échoué: payment=${payment.id} bictorys_status=${result.status}`);
      }
      // "pending" / "processing" → on laisse pour le prochain cycle

      await sleep(200); // Rate limit Bictorys API
    } catch (err) {
      logger.error(`[Cron recheck] Erreur payment=${payment.id}`, err);
    }

    // Circuit breaker : si Bictorys est en carafe (500), on arrete de boucler pour ce cycle
    // (L'erreur est déjà logguée par checkTransactionStatus)
  }

  if (rechecked > 0) {
    logger.log(`[Cron recheck] ${rechecked} paiements vérifiés, ${completed} confirmés`);
  }
}

// ─────────────────────────────────────────────────
// Job 5 : A5 — Nettoyage des abonnements PENDING abandonnés
// ─────────────────────────────────────────────────
async function cleanupStalePending(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h

  const staleSubscriptions = await prisma.communitySubscription.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
    },
    select: { id: true },
  });

  if (staleSubscriptions.length === 0) return;

  const ids = staleSubscriptions.map((s) => s.id);

  // Expirer les abonnements et leurs paiements PENDING
  await prisma.communitySubscription.updateMany({
    where: { id: { in: ids } },
    data: { status: "EXPIRED" },
  });

  await prisma.communityPayment.updateMany({
    where: { subscriptionId: { in: ids }, status: "PENDING" },
    data: { status: "FAILED" },
  });

  logger.log(`[Cron] Nettoyage: ${ids.length} abonnements PENDING expirés après 24h`);
}

// ─────────────────────────────────────────────────
// Job 6 : B3 — Health check Telegram (groupes supprimés)
// ─────────────────────────────────────────────────
async function healthCheckCommunities(): Promise<void> {
  // P4: Limiter à 500 par batch
  const communities = await prisma.community.findMany({
    where: { isActive: true },
    include: {
      telegramBot: true,
      seller: { select: { email: true } },
    },
    take: 500,
  });

  for (const community of communities) {
    try {
      const telegram = await getTelegramService(community.telegramBotId);
      if (!telegram) continue;

      // Tenter un appel simple pour vérifier que le bot a accès au groupe
      await telegram.getChatMemberCount(community.telegramChatId.toString());
      await sleep(100); // B5: Rate limit
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg.includes("bot was kicked") || errMsg.includes("bot is not a member") || errMsg.includes("chat not found") || errMsg.includes("Forbidden") || errMsg.includes("Bad Request: chat not found")) {
        await handleBotRemoved(community.id, community.seller.email, community.title);
      } else {
        logger.warn(`[Cron] Health check erreur communauté=${community.id}: ${errMsg}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────
// Job 7 : Détecter les membres partis (webhook raté)
// Vérifie via getChatMember si les abonnés actifs sont
// toujours dans le groupe Telegram. Si non → CANCELED.
// ─────────────────────────────────────────────────
async function detectLeftMembers(): Promise<void> {
  // H11: Ignorer les communautés désactivées
  // P4: Limiter à 500 par batch pour éviter des milliers d'appels Telegram API
  const subscriptions = await prisma.communitySubscription.findMany({
    where: {
      status: { in: ["ACTIVE", "GRACE_PERIOD"] },
      community: { isActive: true },
      telegramUserId: { not: null },
    },
    select: {
      id: true,
      telegramUserId: true,
      community: {
        select: {
          id: true,
          telegramChatId: true,
          telegramBotId: true,
        },
      },
    },
    take: 500,
  });

  // Grouper par bot pour minimiser les appels getTelegramService
  const byBot = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    const botId = sub.community.telegramBotId;
    if (!byBot.has(botId)) byBot.set(botId, []);
    byBot.get(botId)!.push(sub);
  }

  for (const [botId, subs] of byBot) {
    const telegram = await getTelegramService(botId);
    if (!telegram) continue;

    for (const sub of subs) {
      if (!sub.telegramUserId) continue;
      try {
        const member = await telegram.getChatMember(
          sub.community.telegramChatId.toString(),
          Number(sub.telegramUserId)
        );
        await sleep(100); // B5: Rate limit

        if (member.status === "left" || member.status === "kicked") {
          await prisma.communitySubscription.update({
            where: { id: sub.id },
            data: { status: "CANCELED", canceledAt: new Date() },
          });
          // BUG-7 FIX: GREATEST(0) pour éviter memberCount négatif
          await prisma.$executeRaw`UPDATE "Community" SET "memberCount" = GREATEST("memberCount" - 1, 0) WHERE id = ${sub.community.id}`;
          logger.log(`[Cron] Membre parti détecté (webhook raté): sub=${sub.id} status=${member.status}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "";
        // B2: Bot retiré du groupe — déjà géré par healthCheck, on ignore ici
        if (errMsg.includes("bot was kicked") || errMsg.includes("Forbidden") || errMsg.includes("chat not found")) {
          continue;
        }
        // Utilisateur inconnu — peut arriver si le user a supprimé son compte
        if (errMsg.includes("user not found")) {
          await prisma.communitySubscription.update({
            where: { id: sub.id },
            data: { status: "CANCELED", canceledAt: new Date() },
          });
          logger.log(`[Cron] Utilisateur Telegram supprimé: sub=${sub.id}`);
          continue;
        }
        logger.warn(`[Cron] detectLeftMembers erreur sub=${sub.id}: ${errMsg}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────
// Fonction principale — exécutée toutes les heures
// ─────────────────────────────────────────────────
let cronRunning = false;

export async function runCommunityBilling(): Promise<void> {
  if (cronRunning) {
    logger.warn("[Cron] Community billing déjà en cours, skip ce cycle");
    return;
  }
  cronRunning = true;
  logger.log("[Cron] Démarrage community billing...");
  const startTime = Date.now();

  const jobs = [
    { name: "recheckPendingPayments", fn: recheckPendingPayments },
    { name: "cleanupStalePending", fn: cleanupStalePending },
    { name: "healthCheckCommunities", fn: healthCheckCommunities },
    { name: "detectLeftMembers", fn: detectLeftMembers },
    { name: "processRenewalReminders", fn: processRenewalReminders },
    { name: "processExpirations", fn: processExpirations },
    { name: "processGracePeriod", fn: processGracePeriod },
    { name: "processCancelations", fn: processCancelations },
  ];

  const results: Record<string, string> = {};

  for (const job of jobs) {
    try {
      await job.fn();
      results[job.name] = "ok";
    } catch (err) {
      logger.error(`[Cron] Erreur ${job.name}`, err);
      results[job.name] = err instanceof Error ? err.message.slice(0, 200) : "error";
    }
  }

  const durationMs = Date.now() - startTime;
  cronRunning = false;
  logger.log(`[Cron] Community billing terminé en ${durationMs}ms.`);

  // Persister le statut dans Redis pour le dashboard admin (TTL 25h — 1 cycle de marge)
  try {
    await redis.set("cron:communityBilling:lastRun", JSON.stringify({
      timestamp: new Date().toISOString(),
      durationMs,
      results,
    }), { ex: 90000 });
  } catch (redisErr) {
    logger.error("[Cron] Erreur persistance Redis cron status", redisErr);
  }
}
