import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../lib/auth.js";
import { generateUniqueReference } from "../lib/utils.js";
import { generateDownloadToken } from "./orders.js";
import * as logger from "../lib/logger.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export const devRouter = Router();

// ── POST /api/dev/credit-balance — ajouter du solde test ──
// S21: Plafonné à 50 000 FCFA par crédit, max 500 000 FCFA cumulé
devRouter.post("/credit-balance", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const rawAmount = Number(req.body.amount) || 5000;
    const amount = Math.min(Math.max(rawAmount, 100), 50000);

    // Vérifier le total déjà crédité en dev pour ce vendeur
    const devCredits = await prisma.order.aggregate({
      where: { sellerId, paymentProvider: "dev_credit", paymentStatus: "PAID" },
      _sum: { amount: true },
    });
    const totalDevCredits = devCredits._sum.amount || 0;
    if (totalDevCredits + amount > 500000) {
      res.status(400).json({ error: "Limite dev de 500 000 FCFA atteinte" });
      return;
    }

    const order = await prisma.order.create({
      data: {
        sellerId,
        reference: `DEV-${Date.now()}`,
        orderType: "PAYMENT",
        amount,
        commissionRate: 0,
        commissionAmount: 0,
        sellerAmount: amount,
        paymentProvider: "dev_credit",
        paymentStatus: "PAID",
        customerEmail: "dev@test.com",
        customerName: "Dev Test",
        paidAt: new Date(),
      },
    });

    logger.log(`[DEV] Crédit test ${amount} FCFA pour seller ${sellerId}`);
    res.json({ success: true, message: `${amount} FCFA ajoutés au solde`, orderId: order.id });
  } catch (err) {
    logger.error("Erreur dev credit-balance", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/dev/reset-onboarding — remet onboardingCompleted à false ──
devRouter.post("/reset-onboarding", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    await prisma.seller.update({
      where: { id: sellerId },
      data: { onboardingCompleted: false },
    });

    logger.log(`[DEV] Reset onboarding for seller ${sellerId}`);
    res.json({ success: true, message: "Onboarding réinitialisé" });
  } catch (err) {
    logger.error("Erreur dev reset-onboarding", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/dev/seller-products — liste les produits/services/communautés du vendeur pour le DevTools ──
devRouter.get("/seller-products", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { slug: true },
    });
    if (!seller) { res.status(404).json({ error: "Vendeur introuvable" }); return; }

    // Produits digitaux (blocs SALE)
    const saleProducts = await prisma.product.findMany({
      where: { block: { sellerId, type: "SALE", isActive: true } },
      select: { id: true, title: true, price: true, fileUrl: true },
      take: 10,
    });

    // Services de booking
    const bookingServices = await prisma.bookingService.findMany({
      where: { block: { sellerId, type: "BOOKING", isActive: true } },
      select: { id: true, title: true, price: true },
      take: 10,
    });

    // Blocs paiement + dons
    const paymentBlocks = await prisma.block.findMany({
      where: { sellerId, type: { in: ["PAYMENT", "DONATION"] }, isActive: true },
      select: { id: true, type: true, config: true },
      take: 10,
    });

    // Communautés
    const communities = await prisma.community.findMany({
      where: { sellerId, isActive: true },
      select: { id: true, title: true, priceAmount: true },
      take: 5,
    });

    res.json({
      slug: seller.slug,
      saleProducts,
      bookingServices,
      paymentBlocks: paymentBlocks.map((b) => ({
        id: b.id,
        title: (b.config as Record<string, unknown>)?.title || (b.type === "DONATION" ? "Don" : "Paiement"),
        blockType: b.type,
      })),
      communities,
    });
  } catch (err) {
    logger.error("Erreur dev seller-products", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/dev/simulate-payment — simule un paiement réussi et retourne la page de livraison ──
devRouter.post("/simulate-payment", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const { type, productId, serviceId, communityId } = req.body as {
      type: "SALE" | "BOOKING" | "PAYMENT" | "COMMUNITY";
      productId?: string;
      serviceId?: string;
      communityId?: string;
    };

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { slug: true, plan: true, displayName: true, email: true, customCommissionRate: true },
    });
    if (!seller) { res.status(404).json({ error: "Vendeur introuvable" }); return; }

    const reference = await generateUniqueReference(prisma);
    const commissionRate = seller.customCommissionRate ?? (seller.plan === "PRO" ? 400 : 800);

    // ── SALE: Produit digital ──
    if (type === "SALE") {
      if (!productId) { res.status(400).json({ error: "productId requis pour SALE" }); return; }

      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, title: true, price: true, discountPrice: true, fileUrl: true, block: { select: { sellerId: true } } },
      });
      if (!product || product.block.sellerId !== sellerId) {
        res.status(404).json({ error: "Produit introuvable" }); return;
      }

      const amount = product.discountPrice ?? product.price;
      const commissionAmount = Math.round(amount * commissionRate / 10000);

      // Générer download URL si fichier digital
      const downloadToken = product.fileUrl ? generateDownloadToken(reference) : undefined;
      const downloadUrl = product.fileUrl
        ? `${FRONTEND_URL}/download/${reference}?token=${downloadToken}`
        : undefined;

      await prisma.order.create({
        data: {
          reference,
          sellerId,
          orderType: "SALE",
          amount,
          commissionRate,
          commissionAmount,
          sellerAmount: amount - commissionAmount,
          paymentProvider: "dev_simulation",
          paymentOperator: "wave_money",
          paymentStatus: "PAID",
          paidAt: new Date(),
          paymentExternalId: `dev-sim-${Date.now()}`,
          customerEmail: "simulation@dev.test",
          customerName: "Client Simulé",
          productId: product.id,
          downloadUrl,
          downloadExpiresAt: product.fileUrl ? new Date(Date.now() + 72 * 60 * 60 * 1000) : undefined,
        },
      });

      logger.log(`[DEV] Simulation SALE ref=${reference} product=${product.title}`);
      res.json({
        success: true,
        reference,
        redirectUrl: `/${seller.slug}/success?ref=${reference}&type=SALE`,
      });
      return;
    }

    // ── BOOKING: Coaching / Réservation ──
    if (type === "BOOKING") {
      if (!serviceId) { res.status(400).json({ error: "serviceId requis pour BOOKING" }); return; }

      const service = await prisma.bookingService.findUnique({
        where: { id: serviceId },
        select: { id: true, title: true, price: true, duration: true, location: true, block: { select: { sellerId: true } } },
      });
      if (!service || service.block.sellerId !== sellerId) {
        res.status(404).json({ error: "Service introuvable" }); return;
      }

      const amount = service.price;
      const commissionAmount = Math.round(amount * commissionRate / 10000);

      // Date fictive = demain à 14h
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 1);
      bookingDate.setHours(14, 0, 0, 0);

      await prisma.order.create({
        data: {
          reference,
          sellerId,
          orderType: "BOOKING",
          amount,
          commissionRate,
          commissionAmount,
          sellerAmount: amount - commissionAmount,
          paymentProvider: "dev_simulation",
          paymentOperator: "wave_money",
          paymentStatus: "PAID",
          paidAt: new Date(),
          paymentExternalId: `dev-sim-${Date.now()}`,
          customerEmail: "simulation@dev.test",
          customerName: "Client Simulé",
          customerPhone: "771234567",
          bookingServiceId: service.id,
          bookingDate,
          bookingDuration: service.duration,
          bookingLocation: service.location || "En ligne",
        },
      });

      logger.log(`[DEV] Simulation BOOKING ref=${reference} service=${service.title}`);
      res.json({
        success: true,
        reference,
        redirectUrl: `/${seller.slug}/success?ref=${reference}&type=BOOKING`,
      });
      return;
    }

    // ── PAYMENT: Don / Paiement libre ──
    if (type === "PAYMENT") {
      const amount = 5000;
      const commissionAmount = Math.round(amount * commissionRate / 10000);

      await prisma.order.create({
        data: {
          reference,
          sellerId,
          orderType: "PAYMENT",
          amount,
          commissionRate,
          commissionAmount,
          sellerAmount: amount - commissionAmount,
          paymentProvider: "dev_simulation",
          paymentOperator: "wave_money",
          paymentStatus: "PAID",
          paidAt: new Date(),
          paymentExternalId: `dev-sim-${Date.now()}`,
          customerEmail: "simulation@dev.test",
          customerName: "Client Simulé",
          donorMessage: "Message de test — simulation DevTools",
        },
      });

      logger.log(`[DEV] Simulation PAYMENT/DON ref=${reference}`);
      res.json({
        success: true,
        reference,
        redirectUrl: `/${seller.slug}/success?ref=${reference}&type=PAYMENT`,
      });
      return;
    }

    // ── COMMUNITY: Abonnement Telegram ──
    if (type === "COMMUNITY") {
      if (!communityId) { res.status(400).json({ error: "communityId requis pour COMMUNITY" }); return; }

      const community = await prisma.community.findUnique({
        where: { id: communityId },
        select: { id: true, title: true, priceAmount: true, sellerId: true },
      });
      if (!community || community.sellerId !== sellerId) {
        res.status(404).json({ error: "Communauté introuvable" }); return;
      }

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const commissionAmount = Math.round(community.priceAmount * commissionRate / 10000);
      const cmRef = `CM-${reference.replace("FA-", "")}`;

      // Chercher une subscription existante pour cette email, ou en créer une
      let subscription = await prisma.communitySubscription.findFirst({
        where: { communityId: community.id, memberEmail: "simulation@dev.test" },
      });

      if (subscription) {
        subscription = await prisma.communitySubscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            lockedPrice: community.priceAmount,
            lastPaymentAt: now,
            inviteLink: "https://t.me/+dev_simulation_link",
            inviteLinkExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      } else {
        subscription = await prisma.communitySubscription.create({
          data: {
            communityId: community.id,
            memberEmail: "simulation@dev.test",
            memberName: "Client Simulé",
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            lockedPrice: community.priceAmount,
            lastPaymentAt: now,
            inviteLink: "https://t.me/+dev_simulation_link",
            inviteLinkExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }

      await prisma.communityPayment.create({
        data: {
          subscriptionId: subscription.id,
          communityId: community.id,
          amount: community.priceAmount,
          commissionRate,
          commissionAmount,
          sellerAmount: community.priceAmount - commissionAmount,
          reference: cmRef,
          providerTransactionId: `dev-sim-${Date.now()}`,
          status: "COMPLETED",
          periodStart: now,
          periodEnd,
        },
      });

      logger.log(`[DEV] Simulation COMMUNITY ref=${cmRef} community=${community.title}`);
      res.json({
        success: true,
        reference: cmRef,
        redirectUrl: `/${seller.slug}/community-success?ref=${cmRef}&communityId=${community.id}`,
      });
      return;
    }

    res.status(400).json({ error: `Type non supporté: ${type}` });
  } catch (err) {
    logger.error("Erreur dev simulate-payment", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
