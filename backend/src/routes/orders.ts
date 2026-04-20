import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../lib/rateLimitStore.js";
import { prisma } from "../lib/prisma.js";
import { getPaymentProvider } from "../lib/payments/index.js";
import { BictorysProvider } from "../lib/payments/bictorys.js";
import { generateUniqueReference, escapeHtml, formatPrice, getCountryFromRequest, getBictorysCountry, normalizeBictorysCountry } from "../lib/utils.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../lib/auth.js";
import { cleanPhoneForStorage } from "../lib/phone.js";
import crypto from "crypto";
import { JWT_SECRET_BYTES } from "../lib/auth.js";
import { getFromR2, extractR2Key, streamFromR2 } from "../lib/storage.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";
import { queueTransactionalEmail } from "../lib/queues/index.js";
import { parseSource } from "../lib/sources.js";
import { computeCommission, type FundraiserSubtype } from "../lib/commission.js";
import {
  isBictorysCircuitOpen,
  recordBictorysFailure,
  recordBictorysSuccess,
} from "../lib/payments/circuitBreaker.js";

export const ordersRouter = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BICTORYS_REDIRECT_URL = process.env.BICTORYS_REDIRECT_URL || FRONTEND_URL;

const createOrderSchema = z.object({
  sellerSlug: z.string(),
  orderType: z.enum(["SALE", "BOOKING", "PAYMENT", "DONATION"]),
  amount: z.number().int().min(500).max(10_000_000),
  // cagnottes.sn v1 — donations SN uniquement. Les opérateurs acceptés
  // sont Wave (wave_money), Orange Money (orange_money) et Maxit (maxit,
  // canal Bictorys dédié au nouveau nom SN d'Orange Money). Les opérateurs
  // régionaux (mtn_money CI, togocell TG, mobicash BF, moov BF/TG/BJ,
  // etc.) sont retirés de l'enum public — un ré-élargissement WAEMU
  // passera par une décision business explicite + ajout cas-par-cas.
  paymentType: z.enum(["orange_money", "wave_money", "maxit"]),
  paymentCountry: z.string().length(2).optional(),
  customerEmail: z.string().email().optional(),
  // Audit 011 B-01: cap free-text name to prevent DB bloat / DoS.
  customerName: z.string().trim().max(120).optional(),
  customerPhone: z.string().min(1, "Numéro de téléphone requis").max(30),
  productId: z.string().optional(),
  bookingServiceId: z.string().optional(),
  bookingDate: z.string().optional(),
  bookingDuration: z.number().optional(),
  bookingLocation: z.string().optional(),
  paymentNote: z.string().optional(),
  donorMessage: z.string().max(500).optional(),
  blockId: z.string().optional(),
  selectedBumpIds: z.array(z.string()).optional(),
  referrer: z.string().max(2000).optional(),
  timezone: z.string().max(100).optional(),
  otp: z.string().max(10).optional(),
  // Phase 2 plan 02-01 — cagnottes.sn donor flags. Default false to preserve
  // backward compatibility with non-cagnotte order types.
  isAnonymous: z.boolean().default(false),
  messageIsPrivate: z.boolean().default(false),
  cagnotteSlug: z.string().min(1).max(120).optional(),
  // "Soutenir cagnotte.sn" — voluntary 3% contribution from donor
  baseAmount: z.number().int().min(0).optional(),
  voluntaryContribution: z.number().int().min(0).optional(),
});


// Phase 2 plan 02-01 — three composed rate limiters replace the single
// `createOrderLimiter` (10/min IP) per RESEARCH Q2. Mitigates P07 (orders DDoS).
//
//   1. orderIpMinuteLimiter — 20/min per IP   (cheapest, fails fast)
//   2. orderIpHourLimiter   — 100/hour per IP
//   3. orderEmailMinuteLimiter — 5/min per customerEmail (lowercased)
//
// All three are stacked as middlewares on POST /api/orders. The /api/orders
// skip on the global 300/15min limiter (index.ts:91) is preserved on purpose:
// the dedicated stack is tighter and the global skip avoids double-counting.
const orderIpMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("order-ip-min"),
  message: { error: "Trop de commandes, réessaye dans une minute." },
  // Stacked with orderIpHourLimiter below — both share the default IP key,
  // which trips express-rate-limit's singleCount validator. The stacking is
  // intentional (tighter minute + hourly ceilings), so disable the false-positive.
  validate: { singleCount: false },
});

const orderIpHourLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("order-ip-hour"),
  message: { error: "Trop de commandes cette heure. Patiente un moment." },
  validate: { singleCount: false },
});

const orderEmailMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("order-email-min"),
  // Custom keyGenerator: bucket by lowercased customerEmail. Anonymous donors
  // (no email) collapse to the single "email:anon" key and are bound by the
  // IP layers above — accepted v1 collateral per T-02-06.
  keyGenerator: (req) => {
    const email = (req.body as { customerEmail?: string })?.customerEmail?.toLowerCase() || "anon";
    return `email:${email}`;
  },
  // Same pattern as leadMagnetProductLimiter (orders.ts:574–583): keyGenerator
  // doesn't use the default IP, so disable express-rate-limit's singleCount
  // validation warning.
  validate: false,
  message: { error: "Trop de dons depuis cet email. Réessaye dans une minute." },
});

// ── POST /api/orders — créer commande + lancer paiement Bictorys ──
ordersRouter.post(
  "/",
  orderIpMinuteLimiter,
  orderIpHourLimiter,
  orderEmailMinuteLimiter,
  async (req, res) => {
  try {
    const data = createOrderSchema.parse(req.body);
    data.sellerSlug = data.sellerSlug.toLowerCase();

    // Email requis pour SALE et BOOKING (optionnel pour DONATION/PAYMENT)
    if ((data.orderType === "SALE" || data.orderType === "BOOKING") && !data.customerEmail) {
      res.status(400).json({ error: "Email requis" });
      return;
    }

    // NEW-M3: Trouver le vendeur (exclure soft-deleted)
    const seller = await prisma.seller.findFirst({
      where: { slug: data.sellerSlug, deletedAt: null },
    });
    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    // Vérifier que le produit/service appartient bien au vendeur et valider le montant
    let expectedAmount = data.amount;

    if (data.orderType === "SALE" && data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        include: { block: { select: { sellerId: true } } },
      });
      if (!product || product.block.sellerId !== seller.id) {
        res.status(400).json({ error: "Produit introuvable" });
        return;
      }
      expectedAmount = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price)
        ? product.discountPrice
        : product.price;
    }

    if (data.orderType === "BOOKING" && data.bookingServiceId) {
      const service = await prisma.bookingService.findUnique({
        where: { id: data.bookingServiceId },
        include: { block: { select: { sellerId: true } }, slots: true },
      });
      if (!service || service.block.sellerId !== seller.id) {
        res.status(400).json({ error: "Service introuvable" });
        return;
      }
      // Prix fixe par slot (pas de multiplication par durée)
      expectedAmount = service.price;

      // A5: Validation serveur des créneaux booking
      if (!data.bookingDate) {
        res.status(400).json({ error: "Date de réservation requise" });
        return;
      }
      const bookingDate = new Date(data.bookingDate);
      const now = new Date();

      // Vérifier que la date n'est pas passée
      if (bookingDate <= now) {
        res.status(400).json({ error: "La date de réservation est passée" });
        return;
      }

      // Vérifier minAdvanceHours
      const minAdvanceMs = (service.minAdvanceHours || 0) * 60 * 60 * 1000;
      if (bookingDate.getTime() - now.getTime() < minAdvanceMs) {
        res.status(400).json({ error: `Réservation possible ${service.minAdvanceHours}h à l'avance minimum` });
        return;
      }

      // S17: Booking slot check moved inside Serializable transaction below
      // to prevent double-booking race condition
    }

    // PAYMENT type: amount is user-provided but must be validated (C4)
    if (data.orderType === "PAYMENT") {
      // A4: Vérifier que le seller a un bloc PAYMENT actif
      const paymentBlock = await prisma.block.findFirst({
        where: { sellerId: seller.id, type: "PAYMENT", isActive: true },
      });
      if (!paymentBlock) {
        res.status(400).json({ error: "Aucun bloc paiement actif pour ce vendeur" });
        return;
      }
      expectedAmount = data.amount; // Accept client amount for PAYMENT, but it's still validated by Zod (min 500, max 10M)
    }

    // DONATION type: same flow as PAYMENT but with separate block type
    // Also handles FUNDRAISER blocks (they use orderType DONATION)
    // Hoisted out of the if-block so the commission calc downstream can branch
    // on `donationBlock?.type === "FUNDRAISER"` and read `config.subtype`.
    let donationBlock: Awaited<ReturnType<typeof prisma.block.findFirst>> = null;
    if (data.orderType === "DONATION") {
      donationBlock = await prisma.block.findFirst({
        where: {
          sellerId: seller.id,
          type: { in: ["DONATION", "FUNDRAISER"] },
          isActive: true,
          ...(data.blockId ? { id: data.blockId } : {}),
        },
      });
      if (!donationBlock) {
        res.status(400).json({ error: "Aucun bloc donation/cagnotte actif pour ce vendeur" });
        return;
      }

      // Check endDate for FUNDRAISER blocks — reject if expired
      if (donationBlock.type === "FUNDRAISER") {
        const config = donationBlock.config as Record<string, unknown>;
        // Phase 10 — reject donations on closed cagnottes. Status is stored in
        // the JSON config (no migration). The public page swaps the CTA, but
        // a donor with the direct /c/:slug/participer URL could still POST —
        // guard server-side.
        if (config.status === "closed") {
          res.status(400).json({ error: "Cette cagnotte est clôturée" });
          return;
        }
        const endDate = config.endDate as string | null;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (new Date() > end) {
            res.status(400).json({ error: "Cette levée de fonds est terminée" });
            return;
          }
        }
      }

      // Store the resolved blockId for order creation
      if (!data.blockId) data.blockId = donationBlock.id;
      expectedAmount = data.amount;
    }

    // Calculer le total attendu avec les order bumps
    // H6: Verify bumps belong to a product owned by this seller
    let bumpTotal = 0;
    let verifiedBumps: { id: string; title: string; price: number }[] = [];
    if (data.selectedBumpIds && data.selectedBumpIds.length > 0) {
      verifiedBumps = await prisma.orderBump.findMany({
        where: {
          id: { in: data.selectedBumpIds },
          isActive: true,
          product: { block: { sellerId: seller.id } },
        },
        select: { id: true, title: true, price: true },
      });
      bumpTotal = verifiedBumps.reduce((sum, b) => sum + b.price, 0);
    }

    // Vérifier que le montant envoyé correspond au prix réel (anti-fraude) (C4/C5)
    const totalExpected = expectedAmount + bumpTotal;
    
    // C4: Le paiement est déjà validé par le schema Zod (500 FCFA min). 
    // Pour les autres types (SALE, BOOKING), on vérifie strictement que le montant client === le prix calculé serveur.
    if (data.orderType !== "PAYMENT" && data.orderType !== "DONATION" && data.amount !== totalExpected) {
      res.status(400).json({ error: "Le montant ne correspond pas au prix du produit" });
      return;
    }

    // C5: Calculer la commission sur le montant attendu (calculé côté serveur), pas data.amount du client
    // D5: commissionRate stocké en basis points (entier) — 800 = 8%, 400 = 4%
    //
    // Phase 2 plan 02-01 — FUNDRAISER orders go through computeCommission()
    // (Phase 1 plan 01-03 helper). Mitigates P03: the legacy Math.round path
    // could over-collect by 1 FCFA on certain fractional results. The helper
    // uses Math.floor (favors seller) and asserts the invariant
    // commission + net === gross internally.
    //
    // Non-FUNDRAISER orders (legacy DONATION, SALE, BOOKING, PAYMENT) keep
    // the existing Math.round path so we don't regress the fari.store fork
    // surface that's still wired in this codebase.
    let commissionRate: number;
    let commissionAmount: number;
    let sellerAmount: number;
    if (donationBlock?.type === "FUNDRAISER") {
      const cfg = donationBlock.config as { subtype?: string };
      const subtype: FundraiserSubtype =
        cfg.subtype === "festive" ? "festive" : "solidaire";
      // Commission is computed on baseAmount (excluding voluntary contribution).
      // The voluntary contribution goes 100% to the platform.
      const voluntary = data.voluntaryContribution ?? 0;
      const base = voluntary > 0 && data.baseAmount ? data.baseAmount : totalExpected;
      const result = computeCommission(base, subtype);
      commissionRate = result.rate;
      commissionAmount = result.commission;
      // sellerAmount = base - commission (seller never touches voluntary)
      sellerAmount = result.net;
    } else {
      // Legacy non-FUNDRAISER path — preserved verbatim.
      commissionRate = seller.customCommissionRate ?? (seller.plan === "PRO" ? 400 : 800);
      commissionAmount = Math.round(totalExpected * commissionRate / 10000);
      sellerAmount = totalExpected - commissionAmount;
    }

    // Générer référence unique (avec retry anti-collision)
    const reference = await generateUniqueReference(prisma);

    // Résoudre l'email client (fallback pour DONATION/PAYMENT sans email)
    const resolvedEmail = data.customerEmail || `anon-${Date.now()}@noemail.local`;

    // Audit 030 CR-01 — circuit breaker fast-fail BEFORE creating Order row.
    // Previously checked after $transaction, leaving dangling PENDING orders
    // when Bictorys was down. Moved here so no DB row is created if the
    // breaker is open.
    if (isBictorysCircuitOpen()) {
      res.status(503).json({
        error: "Paiement temporairement indisponible. Réessaye dans 1 minute.",
      });
      return;
    }

    // S17: Serializable transaction for booking slot check + order creation
    // Prevents two concurrent requests from double-booking the same slot
    const order = await prisma.$transaction(
      async (tx) => {
        // Audit 030 HI-05 — Customer find-or-create moved inside the
        // Serializable transaction to prevent duplicate Customer rows
        // from concurrent orders with the same email.
        let customer = await tx.customer.findUnique({
          where: {
            sellerId_email: {
              sellerId: seller.id,
              email: resolvedEmail,
            },
          },
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              sellerId: seller.id,
              email: resolvedEmail,
              name: data.customerName,
              phone: cleanPhoneForStorage(data.customerPhone),
            },
          });
        }

        // S17: Re-check booking slot availability inside transaction
        if (data.orderType === "BOOKING" && data.bookingServiceId && data.bookingDate) {
          // BUG-4 FIX: Vérifier aussi les commandes PENDING récentes (< 30min)
          // pour éviter le double-booking quand deux utilisateurs paient en même temps
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
          const existingBooking = await tx.order.findFirst({
            where: {
              bookingServiceId: data.bookingServiceId,
              bookingDate: new Date(data.bookingDate),
              bookingCancelled: false,
              OR: [
                { paymentStatus: "PAID" },
                { paymentStatus: "PENDING", createdAt: { gt: thirtyMinAgo } },
              ],
            },
          });
          if (existingBooking) {
            throw new Error("SLOT_TAKEN");
          }
        }

        const ord = await tx.order.create({
          data: {
            reference,
            sellerId: seller.id,
            orderType: data.orderType,
            amount: totalExpected,
            commissionRate,
            commissionAmount,
            sellerAmount,
            paymentProvider: "bictorys",
            paymentOperator: data.paymentType,
            customerId: customer.id,
            customerEmail: resolvedEmail,
            customerName: data.customerName,
            customerPhone: cleanPhoneForStorage(data.customerPhone),
            productId: data.productId,
            bookingServiceId: data.bookingServiceId,
            bookingDate: data.bookingDate ? new Date(data.bookingDate) : undefined,
            bookingDuration: data.bookingDuration,
            bookingLocation: data.bookingLocation,
            paymentNote: data.paymentNote,
            donorMessage: data.donorMessage,
            blockId: data.blockId || undefined,
            source: parseSource(data.referrer),
            country: getCountryFromRequest(req, data.timezone),
            // Phase 2 plan 02-01 — cagnottes.sn donor flags (Phase 1 schema cols)
            isAnonymous: data.isAnonymous,
            messageIsPrivate: data.messageIsPrivate,
            // "Soutenir cagnotte.sn" — voluntary contribution tracking
            baseAmount: data.baseAmount ?? totalExpected,
            voluntaryContribution: data.voluntaryContribution ?? 0,
          },
        });

        // Sauvegarder les order bumps sélectionnés (H6: already verified above)
        if (verifiedBumps.length > 0) {
          await tx.orderBumpSelection.createMany({
            data: verifiedBumps.map((b) => ({
              orderId: ord.id,
              orderBumpId: b.id,
              title: b.title,
              price: b.price,
            })),
          });
        }

        return ord;
      },
      // S17: Serializable isolation prevents concurrent double-booking
      { isolationLevel: "Serializable" }
    );

    // Lancer le paiement Bictorys
    const provider = getPaymentProvider("bictorys");
    let transaction;
    try {
      transaction = await provider.createTransaction({
        amount: totalExpected,
        currency: "XOF",
        country: normalizeBictorysCountry(data.paymentType, data.paymentCountry || getBictorysCountry(getCountryFromRequest(req, data.timezone), data.paymentType, seller.payoutCountry, data.customerPhone)),
        paymentType: data.paymentType,
        reference,
        successRedirectUrl: data.cagnotteSlug
          ? `${BICTORYS_REDIRECT_URL}/c/${data.cagnotteSlug}/merci?ref=${reference}`
          : `${BICTORYS_REDIRECT_URL}/${data.sellerSlug}/success?ref=${reference}&type=${data.orderType}`,
        errorRedirectUrl: `${BICTORYS_REDIRECT_URL}/${data.sellerSlug}/error?ref=${reference}`,
        ...(data.otp && { otp: data.otp }),
        customer: {
          name: data.customerName,
          phone: cleanPhoneForStorage(data.customerPhone),
          email: resolvedEmail,
          country: normalizeBictorysCountry(data.paymentType, data.paymentCountry || getBictorysCountry(getCountryFromRequest(req, data.timezone), data.paymentType, seller.payoutCountry, data.customerPhone)),
        },
      });
      // Success — reset the circuit breaker (no-op if already CLOSED).
      recordBictorysSuccess();
    } catch (err) {
      // Record the failure (may transition the circuit to OPEN if this is the
      // 5th in the rolling 30s window) and re-throw so the existing catch
      // block at the bottom of the handler returns the standard 500 error.
      recordBictorysFailure();
      throw err;
    }

    // Sauvegarder l'ID externe Bictorys
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentExternalId: transaction.externalId },
    });

    res.status(201).json({
      order: { id: order.id, reference: order.reference },
      redirectUrl: transaction.redirectUrl,
      link: transaction.link,
      qrCode: transaction.qrCode,
      message: transaction.message,
    });
  } catch (err) {
    // S17: Handle SLOT_TAKEN error from Serializable transaction
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      res.status(409).json({ error: "Ce créneau est déjà réservé" });
      return;
    }
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur création commande", err);
    res.status(500).json({ error: "Erreur lors de la création de la commande" });
  }
});

// ── POST /api/orders/:id/refund — rembourser un booking PAID via Bictorys payout ──
const refundLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("refund"),
  message: { error: "Trop de demandes de remboursement. Réessaye dans une heure." },
});

ordersRouter.post("/:id/refund", refundLimiter, verifyCsrf, requireAuth, async (req, res) => {
  const sellerId = req.seller!.sub;

  try {
    const orderId = req.params.id as string;

    // 0. Vérifier que le vendeur a fait son KYC
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { kycStatus: true, displayName: true, payoutCountry: true },
    });

    if (!seller || seller.kycStatus !== "APPROVED") {
      res.status(403).json({ error: "Tu dois compléter ta vérification d'identité (KYC) avant de pouvoir rembourser" });
      return;
    }

    // 1. Trouver la commande avec vérification ownership
    const order = await prisma.order.findFirst({
      where: { id: orderId, sellerId },
    });

    if (!order) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }

    // 2. Validations
    if (order.orderType !== "BOOKING") {
      res.status(400).json({ error: "Seules les réservations peuvent être remboursées" });
      return;
    }
    if (order.paymentStatus !== "PAID") {
      res.status(400).json({ error: "Seules les commandes payées peuvent être remboursées" });
      return;
    }

    if (!order.customerPhone) {
      res.status(400).json({ error: "Pas de numéro de téléphone client pour le remboursement" });
      return;
    }

    // Le payout Bictorys ne fonctionne qu'au Sénégal (+221)
    const refundPhone = order.customerPhone.replace(/\s+/g, "");
    if (!refundPhone.startsWith("+221") && !refundPhone.startsWith("221")) {
      res.status(400).json({ error: "Le remboursement n'est disponible que pour les numéros sénégalais (+221)" });
      return;
    }

    // 3. Déterminer l'opérateur de payout (même que le paiement original, ou wave_money par défaut)
    const payoutOperator = order.paymentOperator === "orange_money" ? "orange_money" : "wave_money";

    // 4. Transaction sérialisable : vérifier le solde + marquer REFUNDED
    const refundReference = `refund_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const idempotencyKey = crypto.randomUUID();

    await prisma.$transaction(
      async (tx) => {
        // Recalculer le solde vendeur (même formule que withdrawals — exclure crédits dev/test)
        const earnedOrders = await tx.order.aggregate({
          where: { sellerId, paymentStatus: "PAID", paymentProvider: { notIn: ["dev_credit", "dev_simulation"] } },
          _sum: { sellerAmount: true },
        });
        const earnedCommunity = await tx.communityPayment.aggregate({
          where: { community: { sellerId }, status: "COMPLETED" },
          _sum: { sellerAmount: true },
        });
        const totalEarned = (earnedOrders._sum.sellerAmount || 0) + (earnedCommunity._sum.sellerAmount || 0);

        const withdrawnResult = await tx.withdrawal.aggregate({
          where: { sellerId, status: { in: ["COMPLETED", "PROCESSING", "PENDING"] } },
          _sum: { amount: true },
        });
        const totalWithdrawn = withdrawnResult._sum.amount || 0;

        const balance = totalEarned - totalWithdrawn;

        if (order.sellerAmount > balance) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // Marquer la commande REFUNDED + annuler le booking dans la transaction
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "REFUNDED",
            bookingCancelled: true,
          },
        });
      },
      { isolationLevel: "Serializable" }
    );

    // 5. Appeler Bictorys payout API (en dehors de la transaction pour ne pas bloquer trop longtemps)
    const { initiatePayout, parseBictorysPayoutError } = await import("../lib/payout.js");
    const { normalizePhone, getCountryFromPhone } = await import("../lib/phone.js");

    const normalizedPhone = normalizePhone(order.customerPhone) || order.customerPhone;
    const payoutCountry = getCountryFromPhone(normalizedPhone);

    const payoutResult = await initiatePayout(
      {
        amount: order.sellerAmount, // Rembourser la part vendeur (hors commission Izy)
        phone: normalizedPhone,
        operator: payoutOperator,
        recipientName: order.customerName || order.customerEmail,
        recipientEmail: order.customerEmail,
        merchantReference: refundReference,
        country: payoutCountry,
      },
      idempotencyKey
    );

    if (payoutResult.success) {
      // Mettre à jour refundedAt maintenant que le payout a réussi
      await prisma.order.update({
        where: { id: order.id },
        data: {
          refundedAt: new Date(),
          refundReference,
          refundBictorysId: payoutResult.data?.id || null,
        },
      });

      logger.log(`[REFUND] Remboursement réussi — orderId=${order.id}, ref=${refundReference}, amount=${order.sellerAmount} (sur ${order.amount} payés)`);

      // Email notification au client
      try {
        const { escapeHtml, formatPrice } = await import("../lib/utils.js");
        const { queueTransactionalEmail } = await import("../lib/queues/index.js");
        const rawSellerName = seller.displayName;
        const safeCustomerName = escapeHtml(order.customerName || order.customerEmail);
        const safeSellerName = escapeHtml(rawSellerName);

        queueTransactionalEmail({
          to: order.customerEmail,
          subject: `Remboursement confirmé — ${rawSellerName}`,
          html: `<h2>Remboursement confirmé</h2>
            <p>Salut ${safeCustomerName},</p>
            <p>Ta réservation chez <strong>${safeSellerName}</strong> a été remboursée.</p>
            <div style="margin:16px 0;padding:16px;background-color:#F0FDFA;border-radius:12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Référence</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;font-weight:600;">${escapeHtml(order.reference)}</td></tr>
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Montant payé</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">${formatPrice(order.amount)}</td></tr>
                <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Montant remboursé</td><td style="padding:4px 0;font-size:14px;color:#0D9488;text-align:right;font-weight:700;">${formatPrice(order.sellerAmount)}</td></tr>
              </table>
            </div>
            <p style="font-size:13px;color:#6B7280;">Le montant remboursé correspond au prix hors frais de service. Il sera crédité sur ton compte mobile money sous quelques minutes.</p>`,
        });
      } catch (emailErr) {
        logger.error("Erreur email remboursement client", emailErr);
      }

      res.json({ success: true, refundReference });
      return;
    }

    // 6. Payout échoué → rollback : remettre la commande en PAID + réactiver le booking
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        bookingCancelled: false,
      },
    });

    const userMessage = parseBictorysPayoutError(payoutResult.httpStatus, payoutResult.error);
    logger.error(`[REFUND] Payout échoué — orderId=${order.id}, ref=${refundReference}`, payoutResult.error);
    res.status(422).json({ error: userMessage });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      res.status(400).json({ error: "Solde insuffisant pour rembourser cette commande" });
      return;
    }
    logger.error("Erreur remboursement commande", err);
    res.status(500).json({ error: "Erreur lors du remboursement" });
  }
});

// ── POST /api/orders/lead-magnet — inscription gratuite lead magnet ──
const leadMagnetSchema = z.object({
  sellerSlug: z.string(),
  productId: z.string(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().max(30).optional(),
  customFields: z.record(z.string().max(500), z.string().max(500)).refine(
    (obj) => Object.keys(obj).length <= 20,
    { message: "Trop de champs personnalisés (max 20)" }
  ).optional(),
});

// Rate limit lead magnet submissions per IP (prevent spam)
const leadMagnetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("lead-magnet"),
  message: { error: "Trop de soumissions. Réessaye dans une minute." },
});

// Rate limit lead magnet submissions per productId (prevent bot-filling from multiple IPs)
// validate: false — this endpoint already has leadMagnetLimiter (per-IP), skip singleCount check
const leadMagnetProductLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("lead-product"),
  keyGenerator: (req) => `lead-product-${(req.body as Record<string, string>)?.productId || "unknown"}`,
  message: { error: "Trop d'inscriptions pour ce produit. Réessaye dans une minute." },
  validate: false,
});

ordersRouter.post("/lead-magnet", leadMagnetLimiter, leadMagnetProductLimiter, async (req, res) => {
  try {
    const data = leadMagnetSchema.parse(req.body);
    data.sellerSlug = data.sellerSlug.toLowerCase();

    // NEW-M3: Exclude soft-deleted sellers
    const seller = await prisma.seller.findFirst({
      where: { slug: data.sellerSlug, deletedAt: null },
    });
    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: { block: { select: { type: true, sellerId: true } } },
    });
    if (!product || !["LEAD_MAGNET", "WAITING_LIST"].includes(product.block.type) || product.block.sellerId !== seller.id) {
      res.status(400).json({ error: "Produit introuvable" });
      return;
    }

    // A6: Vérifier que le produit est bien gratuit (prix=0)
    if (product.price !== 0) {
      res.status(400).json({ error: "Ce produit n'est pas gratuit" });
      return;
    }

    // S18: Prevent duplicate submissions (same email + same product)
    if (data.customerEmail) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          productId: data.productId,
          customerEmail: data.customerEmail,
          paymentStatus: "PAID",
        },
      });
      if (existingOrder) {
        res.status(409).json({ error: "Tu es déjà inscrit(e)" });
        return;
      }
    }

    // Check max subscribers for waiting lists
    if (product.block.type === "WAITING_LIST" && product.maxSubscribers) {
      const currentCount = await prisma.order.count({
        where: { productId: product.id, paymentStatus: "PAID" },
      });
      if (currentCount >= product.maxSubscribers) {
        res.status(400).json({ error: "Cette liste d'attente est complète" });
        return;
      }
    }

    const reference = await generateUniqueReference(prisma);

    // Find or create customer
    const customerEmail = data.customerEmail || `anon-${Date.now()}@noemail.local`;
    let customer = await prisma.customer.findUnique({
      where: { sellerId_email: { sellerId: seller.id, email: customerEmail } },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { sellerId: seller.id, email: customerEmail, name: data.customerName },
      });
    }

    // Build download URL (H2: include signed token)
    const productFiles = (product.files as { url: string; fileName: string }[] | null) || [];
    const hasDigitalFile = product.fileUrl || productFiles.length > 0;
    const downloadToken = hasDigitalFile ? generateDownloadToken(reference) : undefined;
    const downloadUrl = hasDigitalFile
      ? `${FRONTEND_URL}/download/${reference}?token=${downloadToken}`
      : product.redirectUrl || undefined;
    const downloadExpiresAt = hasDigitalFile
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours pour lead magnet
      : undefined;

    // A10: Create order + update stats in a single transaction for consistency
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          reference,
          sellerId: seller.id,
          orderType: "SALE",
          amount: 0,
          commissionRate: 0,
          commissionAmount: 0,
          sellerAmount: 0,
          paymentProvider: "free",
          paymentOperator: "free",
          paymentStatus: "PAID",
          paidAt: new Date(),
          customerId: customer.id,
          customerEmail: customerEmail,
          customerName: data.customerName,
          customerPhone: data.customerPhone ? cleanPhoneForStorage(data.customerPhone) : undefined,
          productId: data.productId,
          customFields: data.customFields || undefined,
          downloadUrl,
          downloadExpiresAt,
        },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: { orderCount: { increment: 1 } },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { totalSales: { increment: 1 } },
      });

      return created;
    });

    // Send confirmation email via queue (only if email provided)
    if (data.customerEmail) {
      try {
        const customSubject = product.confirmationEmailSubject;
        const customBody = product.confirmationEmailBody;

        let emailSubject: string;
        let emailHtml: string;

        // N1: Escape user-provided data for email HTML (prevent stored XSS)
        const rawCustomerName = data.customerName || data.customerEmail;
        const rawProductTitle = product.title;
        const rawSellerName = seller.displayName;
        const safeCustomerName = escapeHtml(rawCustomerName);
        const safeProductTitle = escapeHtml(rawProductTitle);
        const safeSellerName = escapeHtml(rawSellerName);

        if (customSubject && customBody) {
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
            .replace(/\{productName\}/g, safeProductTitle)
            .replace(/\{productFiles\}/g, filesLink)
            .replace(/\{sellerName\}/g, safeSellerName)
            .replace(/\n/g, "<br>");
        } else {
          emailSubject = `Voici ton contenu : ${rawProductTitle}`;
          emailHtml = `<h2>Merci !</h2>
            <p>Voici ton contenu gratuit : <strong>${safeProductTitle}</strong> de <strong>${safeSellerName}</strong>.</p>`;
          if (downloadUrl) {
            emailHtml += `<p><a href="${downloadUrl}" style="display:inline-block;padding:14px 28px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">Télécharger ton fichier</a></p>
              <p style="font-size:12px;color:#9CA3AF;">Ce lien expire dans 30 jours (5 téléchargements max).</p>`;
          }
        }

        queueTransactionalEmail({ to: data.customerEmail, subject: emailSubject, html: emailHtml });
      } catch (emailErr) {
        logger.error("Erreur email lead magnet", emailErr);
      }

      // NOTE: email marketing sync (Mailchimp/Brevo/Systeme.io) removed for cagnottes.sn fork
    }

    res.status(201).json({
      success: true,
      downloadUrl,
      order: { id: order.id, reference: order.reference },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur lead magnet", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/orders — liste unifiée : commandes + paiements communauté (auth requise, paginé) ──
ordersRouter.get("/", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const cursor = req.query.cursor as string | undefined;
    const page = parseInt(req.query.page as string) || 0; // 0-indexed page for offset pagination
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const typeFilter = req.query.type as string | undefined;
    const statusFilter = req.query.status as string | undefined;

    const fromParam = req.query.from as string | undefined;
    const toParam = req.query.to as string | undefined;
    const periodParam = req.query.period as string | undefined;

    // Date range commune
    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    if (fromParam && toParam) {
      dateFilter = {
        gte: new Date(fromParam + "T00:00:00Z"),
        lte: new Date(toParam + "T23:59:59Z"),
      };
    } else if (periodParam) {
      const days = parseInt(periodParam) || 14;
      const since = new Date();
      since.setDate(since.getDate() - days);
      dateFilter = { gte: since };
    }

    const wantCommunity = !typeFilter || typeFilter === "COMMUNITY";
    const wantOrders = !typeFilter || ["SALE", "BOOKING", "PAYMENT", "DONATION"].includes(typeFilter);

    // ── 1. Fetch orders (sauf si filtre COMMUNITY uniquement) ──
    let orders: Record<string, unknown>[] = [];
    let ordersTotal = 0;
    let ordersHasMore = false;

    if (wantOrders && typeFilter !== "COMMUNITY") {
      const where: Record<string, unknown> = {
        sellerId,
        paymentProvider: { not: "free" },
      };
      if (typeFilter && ["SALE", "BOOKING", "PAYMENT", "DONATION"].includes(typeFilter)) {
        where.orderType = typeFilter;
      }
      if (statusFilter && ["PAID", "PENDING", "FAILED"].includes(statusFilter)) {
        where.paymentStatus = statusFilter;
      }
      if (dateFilter) where.createdAt = dateFilter;

      // Support both cursor-based and page-based pagination
      const usePagePagination = !cursor && page > 0;
      const [raw, count] = await Promise.all([
        prisma.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
          ...(usePagePagination && { skip: page * limit }),
          select: {
            id: true,
            reference: true,
            orderType: true,
            amount: true,
            currency: true,
            sellerAmount: true,
            paymentStatus: true,
            paymentOperator: true,
            paymentProvider: true,
            customerEmail: true,
            customerName: true,
            customerPhone: true,
            paymentNote: true,
            donorMessage: true,
            bookingDate: true,
            bookingDuration: true,
            bookingLocation: true,
            paidAt: true,
            createdAt: true,
            product: { select: { title: true, fileName: true } },
            bookingService: { select: { title: true } },
            bumpSelections: { select: { title: true, price: true } },
          },
        }),
        // Always count for page-based pagination
        prisma.order.count({ where }),
      ]);

      ordersHasMore = raw.length > limit;
      orders = ordersHasMore ? raw.slice(0, limit) : raw;
      ordersTotal = count ?? 0;
    }

    // ── 2. Fetch community payments (première page uniquement, ou filtre COMMUNITY) ──
    let communityOrders: Record<string, unknown>[] = [];
    let communityTotal = 0;

    if (wantCommunity && !cursor) {
      const cpWhere: Record<string, unknown> = {
        community: { sellerId },
      };
      if (statusFilter === "PAID") cpWhere.status = "COMPLETED";
      else if (statusFilter === "PENDING") cpWhere.status = "PENDING";
      else if (statusFilter === "FAILED") cpWhere.status = "FAILED";
      if (dateFilter) cpWhere.createdAt = dateFilter;

      const [cpRaw, cpCount] = await Promise.all([
        prisma.communityPayment.findMany({
          where: cpWhere,
          orderBy: { createdAt: "desc" },
          take: typeFilter === "COMMUNITY" ? limit + 1 : 50,
          select: {
            id: true,
            reference: true,
            amount: true,
            sellerAmount: true,
            status: true,
            createdAt: true,
            subscription: { select: { memberName: true, memberEmail: true, memberPhone: true } },
            community: { select: { title: true } },
          },
        }),
        prisma.communityPayment.count({ where: cpWhere }),
      ]);

      communityTotal = cpCount;
      communityOrders = cpRaw.map((cp) => ({
        id: cp.id,
        reference: cp.reference,
        orderType: "COMMUNITY",
        amount: cp.amount,
        currency: "XOF",
        sellerAmount: cp.sellerAmount,
        paymentStatus: cp.status === "COMPLETED" ? "PAID" : cp.status,
        paymentOperator: null,
        customerEmail: cp.subscription?.memberEmail || "",
        customerName: cp.subscription?.memberName || null,
        customerPhone: cp.subscription?.memberPhone || null,
        paymentNote: null,
        donorMessage: null,
        bookingDate: null,
        bookingDuration: null,
        bookingLocation: null,
        paidAt: cp.status === "COMPLETED" ? cp.createdAt : null,
        createdAt: cp.createdAt,
        product: { title: cp.community?.title || "Communauté", fileName: null },
        bookingService: null,
        bumpSelections: [],
      }));
    }

    // ── 3. Merge + sort ──
    const merged = [...(orders as Record<string, unknown>[]), ...communityOrders]
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
      .slice(0, limit);

    const hasMore = ordersHasMore || (typeFilter === "COMMUNITY" && communityOrders.length > limit);
    const nextCursor = ordersHasMore && orders.length > 0
      ? (orders[orders.length - 1] as { id: string }).id
      : null;
    const totalCount = ordersTotal + communityTotal;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({ orders: merged, nextCursor, hasMore, totalCount, totalPages, currentPage: page });
  } catch (err) {
    logger.error("Erreur liste commandes", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/orders/bookings — liste des réservations du vendeur (auth requise) ──
ordersRouter.get("/bookings", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    // N2: Limit bookings query to prevent memory exhaustion
    const bookings = await prisma.order.findMany({
      where: { sellerId, orderType: "BOOKING" },
      orderBy: { bookingDate: "asc" },
      take: 500,
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        sellerAmount: true,
        paymentStatus: true,
        paymentOperator: true,
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        bookingDate: true,
        bookingDuration: true,
        bookingLocation: true,
        bookingCancelled: true,
        bookingCancelledAt: true,
        bookingService: {
          select: { title: true, price: true, duration: true },
        },
        paidAt: true,
        createdAt: true,
      },
    });

    res.json({ bookings });
  } catch (err) {
    logger.error("Erreur liste réservations", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PUT /api/orders/:id/cancel-booking — annuler une réservation (auth requise) ──
ordersRouter.put("/:id/cancel-booking", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const orderId = req.params.id as string;

    const order = await prisma.order.findFirst({
      where: { id: orderId, sellerId, orderType: "BOOKING" },
    });

    if (!order) {
      res.status(404).json({ error: "Réservation introuvable" });
      return;
    }

    if (order.bookingCancelled) {
      res.status(400).json({ error: "Réservation déjà annulée" });
      return;
    }

    // Si la commande est PAID, il faut d'abord rembourser avant d'annuler
    if (order.paymentStatus === "PAID") {
      res.status(400).json({ error: "Tu dois d'abord rembourser le client avant d'annuler cette réservation" });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        bookingCancelled: true,
        bookingCancelledAt: new Date(),
      },
    });



    res.json({ message: "Réservation annulée" });
  } catch (err) {
    logger.error("Erreur cancel booking", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── Bictorys status poll cache (30s) — évite de harceler l'API Bictorys sur chaque poll client ──
const bictorysStatusCache = new Map<string, { result: { status: string; amount: number | null } | null; expiresAt: number }>();
const BICTORYS_CACHE_TTL = 30_000; // 30s

function getCachedBictorysStatus(externalId: string): { status: string; amount: number | null } | null | undefined {
  const entry = bictorysStatusCache.get(externalId);
  if (!entry) return undefined; // pas en cache
  if (entry.expiresAt <= Date.now()) {
    bictorysStatusCache.delete(externalId);
    return undefined;
  }
  return entry.result;
}

// Audit 030 HI-02 — cap cache size to prevent unbounded memory growth under load
const BICTORYS_CACHE_MAX_SIZE = 10_000;

function setCachedBictorysStatus(externalId: string, result: { status: string; amount: number | null } | null): void {
  if (bictorysStatusCache.size >= BICTORYS_CACHE_MAX_SIZE) {
    // Evict oldest 1000 entries (Map iteration order = insertion order)
    const iter = bictorysStatusCache.keys();
    for (let i = 0; i < 1000; i++) {
      const key = iter.next().value;
      if (key) bictorysStatusCache.delete(key);
    }
  }
  bictorysStatusCache.set(externalId, { result, expiresAt: Date.now() + BICTORYS_CACHE_TTL });
}

// Nettoyage périodique du cache (toutes les 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of bictorysStatusCache) {
    if (v.expiresAt <= now) bictorysStatusCache.delete(k);
  }
}, 5 * 60 * 1000);

// ── GET /api/orders/:ref/status — statut public d'une commande (polling) ──
const statusPollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("status-poll"),
  message: { error: "Trop de requêtes" },
});
ordersRouter.get("/:ref/status", statusPollLimiter, async (req, res) => {
  try {
    let order = await prisma.order.findUnique({
      where: { reference: req.params.ref as string },
      select: {
        id: true,
        paymentStatus: true,
        orderType: true,
        reference: true,
        downloadUrl: true,
        paymentExternalId: true,
        amount: true,
        currency: true,
        sellerId: true,
        customerEmail: true,
        sellerAmount: true,
        productId: true,
        customerName: true,
        donorMessage: true,
        blockId: true,
        bookingDate: true,
        bookingDuration: true,
        bookingLocation: true,
        product: { select: { title: true, coverUrl: true, fileName: true, fileUrl: true, systemeioCourseId: true, block: { select: { type: true } } } },
        bookingService: { select: { title: true, location: true } },
        // Audit 032 S-01 — public endpoint: only expose display fields, not tracking IDs
        seller: { select: { displayName: true, slug: true, avatarUrl: true } },
      },
    });

    // Fallback: si la référence commence par CM-, c'est un paiement communauté
    if (!order && (req.params.ref as string).startsWith("CM-")) {
      const communityPayment = await prisma.communityPayment.findUnique({
        where: { reference: req.params.ref as string },
        select: { id: true, status: true, reference: true, providerTransactionId: true, amount: true },
      });
      if (!communityPayment) {
        res.status(404).json({ error: "Paiement introuvable" });
        return;
      }

      // Fallback Bictorys pour les paiements communauté PENDING (avec cache 30s)
      if (communityPayment.status === "PENDING" && communityPayment.providerTransactionId) {
        try {
          const cached = getCachedBictorysStatus(communityPayment.providerTransactionId);
          let txStatus = cached !== undefined ? cached : null;
          if (cached === undefined) {
            const bictorys = new BictorysProvider();
            txStatus = await bictorys.checkTransactionStatus(communityPayment.providerTransactionId);
            setCachedBictorysStatus(communityPayment.providerTransactionId, txStatus);
          }
          if (txStatus && (txStatus.status === "succeeded" || txStatus.status === "authorized")) {
            // Le webhook devrait traiter le paiement — on signale juste PAID au frontend
            res.json({ status: "PAID", orderType: "COMMUNITY", reference: communityPayment.reference });
            return;
          } else if (txStatus && (txStatus.status === "failed" || txStatus.status === "cancelled")) {
            res.json({ status: "FAILED", orderType: "COMMUNITY", reference: communityPayment.reference });
            return;
          }
        } catch { /* ignore, return current status */ }
      }

      // Mapper le statut communauté vers le format attendu par le frontend
      const statusMap: Record<string, string> = { PENDING: "PENDING", COMPLETED: "PAID", FAILED: "FAILED" };
      res.json({
        status: statusMap[communityPayment.status] || communityPayment.status,
        orderType: "COMMUNITY",
        reference: communityPayment.reference,
      });
      return;
    }

    if (!order) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }

    // Fallback: if still PENDING, check Bictorys directly (avec cache 30s)
    if (order.paymentStatus === "PENDING" && order.paymentExternalId) {
      try {
        const cached = getCachedBictorysStatus(order.paymentExternalId);
        let txStatus = cached !== undefined ? cached : null;
        if (cached === undefined) {
          const bictorys = new BictorysProvider();
          txStatus = await bictorys.checkTransactionStatus(order.paymentExternalId);
          setCachedBictorysStatus(order.paymentExternalId, txStatus);
        }

        if (txStatus && (txStatus.status === "succeeded" || txStatus.status === "authorized")) {
          // Verify amount matches. Null-safe: Bictorys peut renvoyer amount=null
          // (changement API avril 2026). Dans ce cas on trust le status=succeeded
          // et on skip l'anti-fraude plutôt que laisser l'ordre en PENDING pour toujours.
          if (txStatus.amount == null) {
            logger.warn(`[Fallback] Bictorys amount absent ref=${order.reference} type=${typeof txStatus.amount} — skip anti-fraude`);
          }
          if (txStatus.amount == null || txStatus.amount === order.amount) {
            logger.log(`[Fallback] Bictorys confirms PAID for ref=${order.reference}, processing...`);

            // Generate download URL if digital product (must have fileUrl)
            const downloadToken = order.orderType === "SALE" && order.product?.fileUrl
              ? generateDownloadToken(order.reference)
              : undefined;
            const downloadUrl = downloadToken
              ? `${FRONTEND_URL}/download/${order.reference}?token=${downloadToken}`
              : undefined;
            const downloadExpiresAt = order.orderType === "SALE"
              ? new Date(Date.now() + 72 * 60 * 60 * 1000)
              : undefined;

            // Update order atomically
            await prisma.$transaction(async (tx) => {
              const fresh = await tx.order.findUnique({ where: { id: order!.id }, select: { paymentStatus: true } });
              if (fresh?.paymentStatus === "PAID") return;

              await tx.order.update({
                where: { id: order!.id },
                data: {
                  paymentStatus: "PAID",
                  paidAt: new Date(),
                  paymentExternalId: order!.paymentExternalId,
                  downloadUrl,
                  downloadExpiresAt,
                },
              });

              // Audit 032 S-03 — create WebhookLog so a later webhook won't
              // re-trigger notifications (prevents double donation_received).
              await tx.webhookLog.upsert({
                where: { externalId_eventType: {
                  externalId: order!.paymentExternalId!,
                  eventType: "succeeded_poll_fallback",
                }},
                create: {
                  provider: "bictorys",
                  eventType: "succeeded_poll_fallback",
                  externalId: order!.paymentExternalId!,
                  payload: { source: "polling", amount: order!.amount },
                  status: "processed",
                },
                update: {},
              });

              await tx.customer.updateMany({
                where: { sellerId: order!.sellerId, email: order!.customerEmail },
                data: { totalSpent: { increment: order!.amount }, orderCount: { increment: 1 } },
              });

              if (order!.orderType === "SALE" && order!.productId) {
                await tx.product.update({
                  where: { id: order!.productId },
                  data: { totalSales: { increment: 1 }, totalRevenue: { increment: order!.amount } },
                });
              }
            }, { isolationLevel: "Serializable" });

            // Re-read updated order (include email fields)
            const updatedOrder = await prisma.order.findUnique({
              where: { reference: req.params.ref as string },
              include: {
                product: { select: { title: true, coverUrl: true, fileName: true, fileUrl: true, systemeioCourseId: true, confirmationEmailSubject: true, confirmationEmailBody: true, block: { select: { type: true } } } },
                bookingService: { select: { title: true, location: true, confirmationEmailSubject: true, confirmationEmailBody: true } },
                seller: { select: { displayName: true, slug: true, avatarUrl: true, email: true, timezone: true, supportPhone: true, metaPixelId: true, googleAdsId: true, googleAnalyticsId: true, tiktokPixelId: true } },
              },
            });
            if (updatedOrder) {
              order = updatedOrder as unknown as typeof order;
              // NOTE: Emails are sent ONLY via webhook (webhooks.ts) to avoid duplicates.
              // The client can download directly from the success page using downloadUrl.
            }
          }
        } else if (txStatus && (txStatus.status === "failed" || txStatus.status === "cancelled")) {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: "FAILED" },
          });
          order = { ...order, paymentStatus: "FAILED" };
        }
      } catch (checkErr) {
        logger.warn("Fallback Bictorys check error (non-blocking)", checkErr);
      }
    }

    // Build enriched response for success pages
    const isPaid = order.paymentStatus === "PAID";
    res.json({
      status: order.paymentStatus,
      orderType: order.orderType,
      reference: order.reference,
      // P1: Expose downloadUrl only when payment is confirmed
      ...(isPaid && order.downloadUrl && { downloadUrl: order.downloadUrl }),
      // Enriched data for success page redesign
      ...(isPaid && {
        amount: order.amount,
        currency: order.currency,
        customerName: order.customerName,
        seller: order.seller,
        ...(order.orderType === "SALE" && order.product && {
          product: {
            title: order.product.title,
            coverUrl: order.product.coverUrl,
            fileName: order.product.fileName,
          },
          // Expose blockType so frontend can distinguish FORMATION from regular SALE
          ...((order.product as unknown as { block?: { type?: string } }).block?.type === "FORMATION" && {
            blockType: "FORMATION",
            formation: {
              title: order.product.title,
              courseId: (order.product as unknown as { systemeioCourseId?: string }).systemeioCourseId || null,
            },
          }),
        }),
        ...(order.orderType === "BOOKING" && order.bookingService && {
          booking: {
            serviceTitle: order.bookingService.title,
            date: order.bookingDate,
            duration: order.bookingDuration,
            location: order.bookingLocation || order.bookingService.location,
          },
        }),
        ...((order.orderType === "PAYMENT" || order.orderType === "DONATION") && {
          donorMessage: order.donorMessage,
        }),
      }),
      // Fetch thankYouMessage from block config for DONATION orders (includes FUNDRAISER)
      ...(isPaid && order.orderType === "DONATION" && await (async () => {
        const donationBlock = order.blockId
          ? await prisma.block.findUnique({ where: { id: order.blockId }, select: { config: true } })
          : await prisma.block.findFirst({
              where: { sellerId: order.sellerId, type: { in: ["DONATION", "FUNDRAISER"] }, isActive: true },
              select: { config: true },
            });
        const config = donationBlock?.config as Record<string, unknown> | null;
        const thankYouMessage = config?.thankYouMessage as string | undefined;
        return thankYouMessage ? { thankYouMessage } : {};
      })()),
    });
  } catch (err) {
    logger.error("Erreur order status", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/orders/:id — détails commande (auth requise) ──
ordersRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const order = await prisma.order.findUnique({
      where: { id: req.params.id as string },
      include: {
        product: { select: { title: true, fileName: true } },
        bookingService: { select: { title: true } },
        bumpSelections: { select: { title: true, price: true } },
      },
    });

    if (!order || order.sellerId !== sellerId) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }

    res.json({ order });
  } catch (err) {
    logger.error("Erreur détails commande", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/orders/:ref/download-check — lightweight validation (no file stream) ──
// S18: Validates token, payment status, expiry, and download limit without streaming the file
ordersRouter.get("/:ref/download-check", async (req, res) => {
  try {
    const token = req.query.token as string | undefined;
    const order = await prisma.order.findUnique({
      where: { reference: req.params.ref as string },
      include: { product: { select: { fileName: true, fileUrl: true, files: true } } },
    });

    if (!order || order.paymentStatus !== "PAID") {
      res.status(403).json({ error: "Paiement non confirmé" });
      return;
    }
    if (!token || !order.downloadUrl) {
      res.status(403).json({ error: "Lien de téléchargement invalide" });
      return;
    }
    const expectedToken = crypto
      .createHmac("sha256", JWT_SECRET_BYTES)
      .update(order.reference)
      .digest("hex")
      .slice(0, 32);
    const tokenBuf = Buffer.from(token as string);
    const expectedBuf = Buffer.from(expectedToken);
    if (tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      res.status(403).json({ error: "Token de téléchargement invalide" });
      return;
    }

    // Multi-file support: check files array first, fallback to fileUrl
    const productFiles = (order.product?.files as { url: string; fileName: string; fileSize?: number }[] | null) || [];
    const hasFiles = productFiles.length > 0;
    if (!hasFiles && !order.product?.fileUrl) {
      res.status(404).json({ error: "Fichier introuvable" });
      return;
    }
    if (order.downloadExpiresAt && new Date() > order.downloadExpiresAt) {
      res.status(410).json({ error: "Lien de téléchargement expiré" });
      return;
    }
    const MAX_DOWNLOADS = 5;
    if (order.downloadCount >= MAX_DOWNLOADS) {
      res.status(403).json({ error: "Nombre maximum de téléchargements atteint" });
      return;
    }

    // Return files list for multi-file, or single fileName for legacy
    if (hasFiles) {
      res.json({ files: productFiles, remaining: MAX_DOWNLOADS - order.downloadCount });
    } else {
      res.json({ fileName: order.product!.fileName, remaining: MAX_DOWNLOADS - order.downloadCount });
    }
  } catch (err) {
    logger.error("Erreur download-check", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/orders/:ref/download — téléchargement fichier digital ──
// H2: Requires a signed token query param to prevent reference enumeration
ordersRouter.get("/:ref/download", async (req, res) => {
  try {
    const token = req.query.token as string | undefined;
    const order = await prisma.order.findUnique({
      where: { reference: req.params.ref },
      include: { product: true },
    });

    if (!order || order.paymentStatus !== "PAID") {
      res.status(403).json({ error: "Paiement non confirmé" });
      return;
    }

    // Validate download token (HMAC of reference)
    if (!token || !order.downloadUrl) {
      res.status(403).json({ error: "Lien de téléchargement invalide" });
      return;
    }
    const expectedToken = crypto
      .createHmac("sha256", JWT_SECRET_BYTES)
      .update(order.reference)
      .digest("hex")
      .slice(0, 32);
    // S8: Length guard before timingSafeEqual
    const tokenBuf = Buffer.from(token as string);
    const expectedBuf = Buffer.from(expectedToken);
    if (tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      res.status(403).json({ error: "Token de téléchargement invalide" });
      return;
    }

    // Multi-file support: resolve which file to download
    const productFiles = (order.product?.files as { url: string; fileName: string; fileSize?: number }[] | null) || [];
    const fileIndexParam = req.query.fileIndex as string | undefined;
    let targetFileUrl: string | null = null;
    let targetFileName: string = "download";

    if (productFiles.length > 0) {
      const idx = fileIndexParam ? parseInt(fileIndexParam, 10) : 0;
      if (isNaN(idx) || idx < 0 || idx >= productFiles.length) {
        res.status(400).json({ error: "Index de fichier invalide" });
        return;
      }
      targetFileUrl = productFiles[idx].url;
      targetFileName = productFiles[idx].fileName || "download";
    } else if (order.product?.fileUrl) {
      targetFileUrl = order.product.fileUrl;
      targetFileName = order.product.fileName || "download";
    }

    if (!targetFileUrl) {
      res.status(404).json({ error: "Fichier introuvable" });
      return;
    }

    if (order.downloadExpiresAt && new Date() > order.downloadExpiresAt) {
      res.status(410).json({ error: "Lien de téléchargement expiré" });
      return;
    }

    // A13: Enforce download limit (max 5 downloads per order)
    // BUG-5 FIX: Atomic check + increment pour éviter le dépassement en cas de requêtes concurrentes
    const MAX_DOWNLOADS = 5;
    const updated = await prisma.$executeRaw`UPDATE "Order" SET "downloadCount" = "downloadCount" + 1 WHERE id = ${order.id} AND "downloadCount" < ${MAX_DOWNLOADS}`;
    if (updated === 0) {
      res.status(403).json({ error: "Nombre maximum de téléchargements atteint" });
      return;
    }

    // PERF-5 FIX: Stream file from R2 instead of buffering entirely in memory
    const r2Key = extractR2Key(targetFileUrl);
    if (!r2Key) {
      if (targetFileUrl.startsWith("http")) {
        // Redirection directe pour les URLs externes (non R2) - utile pour le dev/test
        res.redirect(targetFileUrl);
        return;
      }
      res.status(404).json({ error: "Fichier introuvable" });
      return;
    }

    const stream = await streamFromR2(r2Key);
    if (!stream) {
      res.status(404).json({ error: "Fichier introuvable" });
      return;
    }

    res.set({
      "Content-Type": stream.contentType,
      ...(stream.contentLength && { "Content-Length": String(stream.contentLength) }),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(targetFileName)}"`,
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    for await (const chunk of stream.body) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    logger.error("Erreur download", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

/**
 * Generate a signed download token for a given order reference
 */
export function generateDownloadToken(reference: string): string {
  return crypto
    .createHmac("sha256", JWT_SECRET_BYTES)
    .update(reference)
    .digest("hex")
    .slice(0, 32);
}
