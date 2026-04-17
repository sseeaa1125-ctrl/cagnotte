import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../lib/rateLimitStore.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../lib/auth.js";
import { normalizePhone, maskPhone } from "../lib/phone.js";
import { verifyPassword } from "../lib/auth.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";

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
  maxAmountPerDay: 4000000,        // total toutes providers confondues
  maxAmountPerDayPerProvider: 2000000, // 2M par provider par numéro par jour
  cooldownMinutes: 1,
};

// cagnottes.sn v1 — retraits uniquement vers un numéro sénégalais (Wave
// ou Orange Money). `phoneCountry` est forcé à "SN" au schéma pour
// prévenir toute tentative de retrait international via un hint pays
// différent ; la vérification post-normalisation (`+221`) est un second
// garde-fou.
const createWithdrawalSchema = z.object({
  amount: z.number().int().min(PAYOUT_LIMITS.minAmount, `Le montant minimum est de ${PAYOUT_LIMITS.minAmount.toLocaleString("fr-FR")} FCFA`),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  phoneCountry: z.literal("SN").optional(),
  provider: z.enum(["wave_money", "orange_money"]),
  recipientName: z.string().min(2, "Le nom du titulaire est requis").max(100).trim(),
  withdrawalPin: z.string().length(4).regex(/^\d{4}$/).optional(),
  // Audit 015 D-05 — optional client-supplied idempotency key. When a frontend
  // retries a withdrawal (network error, Ctrl+R), sending the same UUID lets
  // the backend return the existing Withdrawal instead of creating a duplicate.
  // Backed by Withdrawal.idempotencyKey @unique; if absent, the server still
  // generates a fresh UUID so existing clients keep working.
  idempotencyKey: z.string().uuid().optional(),
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

// ── POST /api/withdrawals — demander un retrait (48h delay, traité par cron) ──
withdrawalsRouter.post("/", withdrawalLimiter, verifyCsrf, requireAuth, async (req, res) => {
  const sellerId = req.seller!.sub;

  try {
    const data = createWithdrawalSchema.parse(req.body);

    // ── Audit 015 D-05 — Idempotency replay check ──
    // If the client provided an idempotencyKey and a Withdrawal with that
    // key already exists for this seller, short-circuit and return the
    // existing row. Prevents Ctrl+R / network-retry from creating duplicate
    // withdrawals before the rate limiters / "PENDING in progress" check
    // catch it. The underlying Withdrawal.idempotencyKey @unique constraint
    // would still protect us at write time, but this surfaces a clean 200
    // instead of a 500 on a unique-violation.
    if (data.idempotencyKey) {
      const existing = await prisma.withdrawal.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        select: {
          id: true,
          sellerId: true,
          amount: true,
          status: true,
          reference: true,
          createdAt: true,
        },
      });
      if (existing && existing.sellerId === sellerId) {
        res.status(200).json({
          idempotent: true,
          withdrawal: {
            id: existing.id,
            amount: existing.amount,
            status: existing.status,
            reference: existing.reference,
            createdAt: existing.createdAt,
          },
        });
        return;
      }
    }

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

    // ── 1. Normaliser et valider le téléphone — Sénégal uniquement en v1.
    // `normalizePhone` accepte plusieurs pays WAEMU ; on hint "SN" pour
    // les numéros locaux sans indicatif, puis on rejette explicitement
    // tout ce qui ne matche pas +221XXXXXXXXX. Les retraits vers CI/ML/BF
    // sont désactivés jusqu'à une décision business v2.
    const normalizedPhone = normalizePhone(data.phone, "SN");
    if (!normalizedPhone || !normalizedPhone.startsWith("+221")) {
      res.status(400).json({
        error:
          "Retrait disponible uniquement vers un numéro sénégalais (Wave ou Orange Money). Vérifie le format +221XXXXXXXXX.",
      });
      return;
    }

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
      select: { amount: true, createdAt: true, provider: true, phone: true },
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

    // ── 3b. Limite par provider par numéro par jour (2M Wave / 2M OM) ──
    const todayProviderPhoneTotal = todayWithdrawals
      .filter((w) => w.provider === data.provider && w.phone === normalizedPhone)
      .reduce((sum, w) => sum + w.amount, 0);
    if (todayProviderPhoneTotal + data.amount > PAYOUT_LIMITS.maxAmountPerDayPerProvider) {
      const providerLabel = data.provider === "wave_money" ? "Wave" : "Orange Money";
      res.status(429).json({
        error: `Limite quotidienne de ${PAYOUT_LIMITS.maxAmountPerDayPerProvider.toLocaleString("fr-FR")} FCFA par numero ${providerLabel} atteinte. Essaie avec un autre numero ou un autre operateur.`,
      });
      return;
    }

    // ── 4. Cooldown supprimé — avec le délai 48h, le vendeur peut faire
    // plusieurs demandes coup sur coup. Le rate limiter (10/h) et la limite
    // quotidienne (étape 3) protègent contre l'abus.

    // ── 5. Vérifier qu'il n'y a pas de retrait PROCESSING (soumis à Bictorys) ──
    // Avec le délai 48h, plusieurs retraits PENDING sont autorisés (ils sont
    // déduits du solde dans la transaction Serializable ci-dessous). Seul un
    // retrait en cours d'exécution chez Bictorys bloque un nouveau retrait.
    const processingWithdrawal = await prisma.withdrawal.findFirst({
      where: { sellerId, status: "PROCESSING" },
    });
    if (processingWithdrawal) {
      res.status(409).json({ error: "Un retrait est en cours de traitement. Attends qu'il soit terminé." });
      return;
    }

    // ── 6. Générer les clés uniques ──
    const reference = `payout_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    // D-05: honor client-supplied idempotency key when present, otherwise
    // mint a fresh one. The pre-check above already handled the "replay"
    // case so we only land here for genuine new requests.
    const idempotencyKey = data.idempotencyKey ?? crypto.randomUUID();

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

    // ── 8. Retrait créé en PENDING — sera exécuté après 48h par le cron ──
    // Audit 034 — le payout Bictorys n'est plus appelé immédiatement. Le retrait
    // reste PENDING pendant 48h, donnant à l'admin une fenêtre pour l'annuler.
    // Le cron `processReadyWithdrawals` dans index.ts soumet à Bictorys les
    // retraits PENDING âgés de 48h+.

    logger.log(`[PAYOUT] Retrait créé en PENDING (48h) — sellerId=${sellerId}, ref=${reference}, amount=${data.amount}`);

    res.status(201).json({
      success: true,
      message: "Demande de retrait enregistrée ! Elle sera traitée sous 48h.",
      withdrawal: {
        id: withdrawal.id,
        amount: data.amount,
        fee: 0,
        reference,
        phone: maskPhone(normalizedPhone),
        provider: data.provider,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      res.status(400).json({ error: "Solde insuffisant" });
      return;
    }
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }

    logger.error("Erreur création retrait", err);
    res.status(500).json({ error: "Une erreur inattendue est survenue. Réessaie plus tard." });
  }
});
