import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../lib/rateLimitStore.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../lib/auth.js";
import { normalizePhone, maskPhone, getCountryFromPhone } from "../lib/phone.js";
import { initiatePayout, parseBictorysPayoutError } from "../lib/payout.js";
import { verifyPassword } from "../lib/auth.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";
// Phase 2 plan 02-02 — payout state-transition notifications (NOTF-09 / NOTF-10)
import { firePayoutCompleted, firePayoutFailed } from "../lib/notifications/dispatch.js";

export const withdrawalsRouter = Router();

// Rate limit uniquement sur POST (création de retrait), pas sur GET balance/liste
const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("withdrawal"),
  message: { error: "Trop de demandes de retrait. Réessaye dans une heure." },
});

// ── Payout limits ──
const PAYOUT_LIMITS = {
  minAmount: 1000,
  maxAmount: 500000,
  maxPerDay: 10,
  maxAmountPerDay: 1000000,
  cooldownMinutes: 1,
};

const createWithdrawalSchema = z.object({
  amount: z.number().int().min(PAYOUT_LIMITS.minAmount, `Le montant minimum est de ${PAYOUT_LIMITS.minAmount.toLocaleString("fr-FR")} FCFA`),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  phoneCountry: z.string().length(2).optional(),
  provider: z.enum(["wave_money", "orange_money"]),
  recipientName: z.string().min(2, "Le nom du titulaire est requis").max(100).trim(),
  withdrawalPin: z.string().length(4).regex(/^\d{4}$/).optional(),
});

// ── GET /api/withdrawals — liste des retraits du vendeur ──
withdrawalsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const limit = Math.min(parseInt(req.query.limit as string) || 15, 100);
    const cursor = req.query.cursor as string | undefined;

    const withdrawals = await prisma.withdrawal.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        phone: true,
        provider: true,
        recipientName: true,
        reference: true,
        bictorysTransactionId: true,
        note: true,
        merchantFee: true,
        failureReason: true,
        processedAt: true,
        createdAt: true,
      },
    });

    const hasMore = withdrawals.length > limit;
    const results = hasMore ? withdrawals.slice(0, limit) : withdrawals;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    // Mask phone numbers for display security
    const masked = results.map((w) => ({
      ...w,
      phone: maskPhone(w.phone),
    }));

    res.json({ withdrawals: masked, nextCursor, hasMore });
  } catch (err) {
    logger.error("Erreur liste retraits", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/withdrawals/balance — solde disponible du vendeur ──
withdrawalsRouter.get("/balance", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    // Total gagné — commandes PAID (exclure crédits dev/test)
    const earnedOrders = await prisma.order.aggregate({
      where: { sellerId, paymentStatus: "PAID", paymentProvider: { notIn: ["dev_credit", "dev_simulation"] } },
      _sum: { sellerAmount: true },
    });

    // C7: Total gagné — paiements communautés COMPLETED
    const earnedCommunity = await prisma.communityPayment.aggregate({
      where: { community: { sellerId }, status: "COMPLETED" },
      _sum: { sellerAmount: true },
    });

    const totalEarned = (earnedOrders._sum.sellerAmount || 0) + (earnedCommunity._sum.sellerAmount || 0);

    // Total retiré (COMPLETED + PROCESSING)
    const withdrawnResult = await prisma.withdrawal.aggregate({
      where: {
        sellerId,
        status: { in: ["COMPLETED", "PROCESSING"] },
      },
      _sum: { amount: true },
    });
    const totalWithdrawn = withdrawnResult._sum.amount || 0;

    // Retraits en attente (PENDING)
    const pendingResult = await prisma.withdrawal.aggregate({
      where: { sellerId, status: "PENDING" },
      _sum: { amount: true },
    });
    const pendingWithdrawals = pendingResult._sum.amount || 0;

    const balance = totalEarned - totalWithdrawn - pendingWithdrawals;

    // Seller payout info for pre-filling the form
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { payoutPhone: true, payoutProvider: true, payoutName: true, payoutCountry: true, kycStatus: true, displayName: true, withdrawalPinHash: true, withdrawalBlocked: true, withdrawalBlockReason: true },
    });

    res.json({
      balance,
      totalEarned,
      totalWithdrawn,
      pendingWithdrawals,
      payoutPhone: seller?.payoutPhone || null,
      payoutProvider: seller?.payoutProvider || null,
      payoutName: seller?.payoutName || seller?.displayName || null,
      payoutCountry: seller?.payoutCountry || null,
      kycStatus: seller?.kycStatus || "NONE",
      hasWithdrawalPin: !!seller?.withdrawalPinHash,
      withdrawalBlocked: seller?.withdrawalBlocked || false,
      withdrawalBlockReason: seller?.withdrawalBlockReason || null,
    });
  } catch (err) {
    logger.error("Erreur balance", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/withdrawals — demander un retrait (avec payout Bictorys) ──
withdrawalsRouter.post("/", withdrawalLimiter, verifyCsrf, requireAuth, async (req, res) => {
  const sellerId = req.seller!.sub;

  try {
    const data = createWithdrawalSchema.parse(req.body);

    // ── 0a. Vérifier que les retraits ne sont pas bloqués par l'admin ──
    const sellerCheck = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { withdrawalBlocked: true, kycStatus: true, withdrawalPinHash: true },
    });
    if (!sellerCheck) {
      res.status(404).json({ error: "Compte introuvable" });
      return;
    }
    if (sellerCheck.withdrawalBlocked) {
      res.status(403).json({ error: "Tes retraits sont temporairement bloqués. Contacte le support." });
      return;
    }

    // ── 0b. Vérifier que le KYC est approuvé avant de retirer ──
    if (sellerCheck.kycStatus !== "APPROVED") {
      res.status(403).json({ error: "Tu dois vérifier ton identité (KYC) avant de pouvoir retirer." });
      return;
    }

    // ── 0c. Vérifier le code de retrait s'il est configuré ──
    if (sellerCheck.withdrawalPinHash) {
      if (!data.withdrawalPin) {
        res.status(400).json({ error: "Le code de retrait est requis", code: "PIN_REQUIRED" });
        return;
      }
      const pinValid = await verifyPassword(data.withdrawalPin, sellerCheck.withdrawalPinHash);
      if (!pinValid) {
        res.status(403).json({ error: "Code de retrait incorrect" });
        return;
      }
    }

    // ── 1. Normaliser et valider le téléphone (C9: multi-pays) ──
    const normalizedPhone = normalizePhone(data.phone, data.phoneCountry);
    if (!normalizedPhone) {
      res.status(400).json({ error: "Numéro de téléphone invalide. Vérifie le format et le pays sélectionné." });
      return;
    }
    const payoutCountry = getCountryFromPhone(normalizedPhone);

    // ── 2. Vérifier le montant max ──
    if (data.amount > PAYOUT_LIMITS.maxAmount) {
      res.status(400).json({ error: `Le montant maximum par retrait est de ${PAYOUT_LIMITS.maxAmount.toLocaleString("fr-FR")} FCFA` });
      return;
    }

    // ── 3. Anti-spam : max par jour + montant quotidien ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayWithdrawals = await prisma.withdrawal.findMany({
      where: {
        sellerId,
        createdAt: { gte: todayStart },
        status: { not: "REJECTED" },
      },
      select: { amount: true, createdAt: true },
    });

    if (todayWithdrawals.length >= PAYOUT_LIMITS.maxPerDay) {
      res.status(429).json({ error: `Tu as atteint la limite de ${PAYOUT_LIMITS.maxPerDay} retraits par jour.` });
      return;
    }

    const todayTotal = todayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    if (todayTotal + data.amount > PAYOUT_LIMITS.maxAmountPerDay) {
      res.status(429).json({ error: `Limite quotidienne de ${PAYOUT_LIMITS.maxAmountPerDay.toLocaleString("fr-FR")} FCFA atteinte.` });
      return;
    }

    // ── 4. Cooldown : 5 minutes entre deux retraits ──
    if (todayWithdrawals.length > 0) {
      const lastWithdrawal = todayWithdrawals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const minutesSinceLast = (Date.now() - lastWithdrawal.createdAt.getTime()) / 60_000;
      if (minutesSinceLast < PAYOUT_LIMITS.cooldownMinutes) {
        const wait = Math.ceil(PAYOUT_LIMITS.cooldownMinutes - minutesSinceLast);
        res.status(429).json({ error: `Attends ${wait} minute(s) avant de refaire un retrait.` });
        return;
      }
    }

    // ── 5. Vérifier qu'il n'y a pas de retrait PENDING/PROCESSING en cours ──
    const pendingWithdrawal = await prisma.withdrawal.findFirst({
      where: { sellerId, status: { in: ["PENDING", "PROCESSING"] } },
    });
    if (pendingWithdrawal) {
      res.status(409).json({ error: "Un retrait est déjà en cours. Attends qu'il soit terminé." });
      return;
    }

    // ── 6. Générer les clés uniques ──
    const reference = `payout_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const idempotencyKey = crypto.randomUUID();

    // ── 7. Créer le withdrawal en base + vérifier le solde (serializable) ──
    const withdrawal = await prisma.$transaction(
      async (tx) => {
        // Recalculer le solde dans la transaction (exclure crédits dev/test)
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
          where: {
            sellerId,
            status: { in: ["COMPLETED", "PROCESSING", "PENDING"] },
          },
          _sum: { amount: true },
        });
        const totalWithdrawn = withdrawnResult._sum.amount || 0;

        const balance = totalEarned - totalWithdrawn;

        if (balance <= 0 || data.amount > balance) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // Créer le retrait en status PENDING
        const w = await tx.withdrawal.create({
          data: {
            sellerId,
            amount: data.amount,
            phone: normalizedPhone,
            provider: data.provider,
            recipientName: data.recipientName,
            reference,
            idempotencyKey,
          },
        });

        // Sauvegarder les préférences de payout du vendeur
        await tx.seller.update({
          where: { id: sellerId },
          data: {
            payoutPhone: normalizedPhone,
            payoutProvider: data.provider,
            ...(data.recipientName && { payoutName: data.recipientName }),
            ...(data.phoneCountry && { payoutCountry: data.phoneCountry }),
          },
        });

        return w;
      },
      { isolationLevel: "Serializable" }
    );

    // ── 8. Appeler Bictorys Payout API ──
    // C9: Passer le country dynamiquement au lieu de hardcoder "SN"
    const result = await initiatePayout(
      {
        amount: data.amount,
        phone: normalizedPhone,
        operator: data.provider,
        recipientName: data.recipientName,
        merchantReference: reference,
        country: payoutCountry,
      },
      idempotencyKey
    );

    // ── 9. Mettre à jour le retrait en base selon la réponse ──
    if (result.success) {
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "COMPLETED",
          bictorysTransactionId: result.data?.id || null,
          merchantFee: result.data?.merchantFee || 0,
          processedAt: new Date(),
        },
      });

      logger.log(`[PAYOUT] Retrait complété — sellerId=${sellerId}, ref=${reference}, amount=${data.amount}`);

      // Phase 2 plan 02-02 — fire-and-forget PAYOUT_COMPLETED notification.
      // Post-commit only; never inside any $transaction. Caught so a notif
      // failure cannot 500 the payout response (the user's money already
      // moved at this point — the response MUST go through).
      firePayoutCompleted({
        id: withdrawal.id,
        sellerId,
        amount: data.amount,
        phone: normalizedPhone,
        provider: data.provider,
      }).catch((err) => logger.error("[notif] firePayoutCompleted", err));

      res.status(201).json({
        success: true,
        message: "Retrait effectué ! Tu vas recevoir l'argent sur ton mobile money.",
        withdrawal: {
          id: withdrawal.id,
          amount: data.amount,
          fee: result.data?.merchantFee || 0,
          reference,
          phone: maskPhone(normalizedPhone),
          provider: data.provider,
        },
      });
      return;
    }

    // ── 10. Échec Bictorys — marquer le retrait comme REJECTED pour libérer le solde ──
    const userMessage = parseBictorysPayoutError(result.httpStatus, result.error);
    const failureReason = result.error?.slice(0, 500) || "Erreur Bictorys inconnue";

    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: "REJECTED",
        failureReason,
      },
    });

    logger.error(`[PAYOUT] Retrait échoué — sellerId=${sellerId}, ref=${reference}, httpStatus=${result.httpStatus}`, result.error);

    // Phase 2 plan 02-02 — fire-and-forget PAYOUT_FAILED notification (NOTF-10).
    // attempt=1 constant per T-02-20 accepted risk; v2 will track real attempts
    // on the Withdrawal model.
    firePayoutFailed(
      {
        id: withdrawal.id,
        sellerId,
        amount: data.amount,
        phone: normalizedPhone,
        provider: data.provider,
      },
      userMessage,
      1,
    ).catch((err) => logger.error("[notif] firePayoutFailed", err));

    res.status(422).json({ error: userMessage });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      res.status(400).json({ error: "Solde insuffisant" });
      return;
    }
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }

    // Nettoyage : si un withdrawal PENDING a été créé mais le payout a échoué avec exception,
    // le marquer REJECTED pour ne pas bloquer les prochains essais
    try {
      await prisma.withdrawal.updateMany({
        where: { sellerId, status: "PENDING" },
        data: { status: "REJECTED", failureReason: "Erreur interne lors du traitement" },
      });
    } catch (cleanupErr) {
      logger.error("Erreur cleanup withdrawal PENDING", cleanupErr);
    }

    logger.error("Erreur création retrait", err);
    res.status(500).json({ error: "Une erreur inattendue est survenue. Réessaie plus tard." });
  }
});
