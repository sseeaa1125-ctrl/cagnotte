import crypto from "crypto";
import * as logger from "./logger.js";

const BICTORYS_API_URL = process.env.BICTORYS_API_URL;
// Payout requiert la clé PRIVÉE (secret), pas la clé publique
const BICTORYS_SECRET_KEY = process.env.BICTORYS_PRIVATE_KEY;
const MERCHANT_SECRET_CODE = process.env.BICTORYS_MERCHANT_SECRET_CODE;

const PAYOUT_PAYMENT_TYPES: Record<string, string> = {
  wave_money: "wave_money",
  orange_money: "orange_money",
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PayoutParams {
  amount: number;
  phone: string; // Format international sans le + (ex: 221XXXXXXXXX)
  operator: string; // "wave_money" ou "orange_money"
  recipientName: string;
  recipientEmail?: string;
  merchantReference: string;
  country?: string; // C9: ISO code (ex: "SN", "CI") — défaut "SN"
}

export interface BictorysPayoutResponse {
  id: string;
  merchantId: string;
  amount: number; // Négatif (argent sortant)
  merchantFee: number;
  customerFee: number;
  currency: string;
  paymentReference: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  customerCountry: string;
  transactionType: string;
  pspName: string;
  pspTransactionId: string;
  merchantReference: string | null;
  status: number;
  createdAt: string;
}

export interface PayoutResult {
  success: boolean;
  data?: BictorysPayoutResponse;
  idempotencyKey: string;
  error?: string;
  httpStatus?: number;
  rawResponse?: string;
}

// ─────────────────────────────────────────────
// Payout
// ─────────────────────────────────────────────

export async function initiatePayout(
  params: PayoutParams,
  idempotencyKey: string
): Promise<PayoutResult> {
  if (!BICTORYS_API_URL || !BICTORYS_SECRET_KEY) {
    logger.error("CRITIQUE: BICTORYS_API_URL ou BICTORYS_PRIVATE_KEY manquant");
    return { success: false, error: "Configuration payout manquante", idempotencyKey };
  }

  if (!MERCHANT_SECRET_CODE) {
    logger.error("CRITIQUE: BICTORYS_MERCHANT_SECRET_CODE manquant");
    return { success: false, error: "Configuration payout manquante", idempotencyKey };
  }

  const paymentType = PAYOUT_PAYMENT_TYPES[params.operator];
  if (!paymentType) {
    return { success: false, error: "Opérateur non supporté", idempotencyKey };
  }

  // C9: Country dynamique au lieu de hardcoder "SN"
  const country = params.country || "SN";

  // Bictorys attend le format +INDICATIF+NUMERO collé (ex: +221771234567)
  // Le phone arrive déjà normalisé via normalizePhone() → "+221XXXXXXXXX"
  const bictorysPhone = params.phone.startsWith("+") ? params.phone : "+" + params.phone;

  const body = {
    amount: params.amount,
    currency: "XOF",
    country,
    customerObject: {
      name: params.recipientName,
      phone: bictorysPhone, // Format Bictorys : +221771234567
      ...(params.recipientEmail && { email: params.recipientEmail }),
      country,
      locale: "fr-FR",
    },
    transactionType: "payment",
    paymentReason: "Appel de fonds",
    merchantReference: params.merchantReference,
    merchant: {
      secretCode: MERCHANT_SECRET_CODE,
    },
  };

  try {
    logger.log(`[PAYOUT] Appel Bictorys — ref=${params.merchantReference}, amount=${params.amount}, phone=${params.phone}, operator=${paymentType}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    const response = await fetch(
      `${BICTORYS_API_URL}/pay/v1/payouts?payment_type=${paymentType}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          "X-API-Key": BICTORYS_SECRET_KEY,
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    const rawText = await response.text();
    let data: BictorysPayoutResponse | undefined;

    try {
      data = JSON.parse(rawText);
    } catch {
      logger.error(`[PAYOUT] Réponse Bictorys non-JSON: ${rawText.slice(0, 500)}`);
      return {
        success: false,
        error: "Réponse invalide du service de paiement",
        httpStatus: response.status,
        idempotencyKey,
        rawResponse: rawText.slice(0, 1000),
      };
    }

    // 200 ou 201 = succès, l'argent est envoyé
    if (response.status === 200 || response.status === 201) {
      logger.log(`[PAYOUT] Succès — bictorysId=${data?.id}, ref=${params.merchantReference}, fee=${data?.merchantFee}`);
      return {
        success: true,
        data,
        idempotencyKey,
        httpStatus: response.status,
      };
    }

    // Erreur
    logger.error(`[PAYOUT] Échec HTTP ${response.status} — ref=${params.merchantReference}`, rawText.slice(0, 500));
    return {
      success: false,
      error: (data as unknown as Record<string, unknown>)?.message as string || (data as unknown as Record<string, unknown>)?.error as string || `HTTP ${response.status}`,
      httpStatus: response.status,
      idempotencyKey,
      rawResponse: rawText.slice(0, 1000),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur réseau";
    const isTimeout = err instanceof Error && err.name === "AbortError";

    logger.error(`[PAYOUT] Erreur réseau — ref=${params.merchantReference}`, message);

    return {
      success: false,
      error: isTimeout ? "Timeout — le service de paiement n'a pas répondu" : message,
      idempotencyKey,
    };
  }
}

// ─────────────────────────────────────────────
// Error parsing — user-friendly messages
// ─────────────────────────────────────────────

export function parseBictorysPayoutError(httpStatus: number | undefined, errorMessage: string | undefined): string {
  if (!httpStatus) {
    return "Le retrait est temporairement indisponible. Réessaie plus tard.";
  }

  if (httpStatus === 401) {
    logger.error("CRITIQUE: Clé API Bictorys invalide pour payout");
    return "Le retrait est temporairement indisponible. Réessaie plus tard.";
  }

  if (httpStatus === 403) {
    logger.error("CRITIQUE: Permission payout manquante sur la clé API Bictorys");
    return "Le retrait est temporairement indisponible. Réessaie plus tard.";
  }

  if (httpStatus === 400) {
    const msg = (errorMessage || "").toLowerCase();

    if (msg.includes("balance") || msg.includes("insufficient") || msg.includes("fonds")) {
      return "Le retrait est temporairement indisponible. Réessaie plus tard.";
    }
    if (msg.includes("plafon") || msg.includes("limit") || msg.includes("cap")) {
      return "Ton compte mobile money est plafonné. Essaie un montant inférieur ou un autre numéro.";
    }
    if (msg.includes("phone") || msg.includes("numéro") || msg.includes("number")) {
      return "Numéro de téléphone invalide. Vérifie et réessaie.";
    }
    if (msg.includes("operator") || msg.includes("opérateur")) {
      return "L'opérateur est temporairement indisponible. Réessaie dans quelques minutes.";
    }

    return "La demande de retrait n'a pas pu être traitée. Vérifie que ton numéro n'est pas plafonné ou essaie un autre numéro.";
  }

  if (httpStatus >= 500) {
    return "Le service de paiement est temporairement indisponible. Réessaie dans quelques minutes.";
  }

  return "La demande de retrait n'a pas pu être traitée. Vérifie que ton numéro n'est pas plafonné ou essaie un autre numéro.";
}

// ─────────────────────────────────────────────
// Payout status check — reconciliation
// ─────────────────────────────────────────────

/**
 * Audit 017 — polling de réconciliation pour les withdrawals bloqués.
 *
 * Le happy path est synchrone (initiatePayout → 200/201 = COMPLETED).
 * Cette fonction sert uniquement pour les edge cases :
 *   - Crash serveur entre initiatePayout() et l'update Prisma
 *   - Network timeout où le payout a réussi mais la réponse a été perdue
 *   - Withdrawal stuck en PENDING > 10 min avec un bictorysTransactionId set
 *
 * Endpoint symétrique au POST : `GET /pay/v1/payouts/{id}` avec la clé privée.
 * Safe-by-default : retourne `null` sur toute ambiguïté (404, parse error,
 * timeout, status inconnu) — l'appelant doit traiter `null` comme "skip, retry
 * au prochain tick" et JAMAIS comme "marquer FAILED".
 */
export async function checkPayoutStatus(
  transactionId: string,
): Promise<{ status: "succeeded" | "failed" | "pending"; reason?: string } | null> {
  if (!BICTORYS_API_URL || !BICTORYS_SECRET_KEY) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(
      `${BICTORYS_API_URL}/pay/v1/payouts/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-Key": BICTORYS_SECRET_KEY,
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      logger.warn(
        `[PAYOUT] status check HTTP ${res.status} for txn=${transactionId}`,
      );
      return null;
    }

    const raw = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      logger.warn(
        `[PAYOUT] status check non-JSON for txn=${transactionId}: ${raw.slice(0, 200)}`,
      );
      return null;
    }

    // Normalise le statut Bictorys vers notre enum. On accepte plusieurs
    // alias pour être résistants aux changements de nomenclature côté provider.
    const rawStatus = String(data.status || "").toLowerCase();
    const reason =
      (data.message as string | undefined) ||
      (data.error as string | undefined) ||
      undefined;

    if (
      rawStatus === "succeeded" ||
      rawStatus === "success" ||
      rawStatus === "completed" ||
      rawStatus === "paid"
    ) {
      return { status: "succeeded", reason };
    }
    if (
      rawStatus === "failed" ||
      rawStatus === "error" ||
      rawStatus === "cancelled" ||
      rawStatus === "canceled" ||
      rawStatus === "rejected"
    ) {
      return { status: "failed", reason };
    }
    if (
      rawStatus === "pending" ||
      rawStatus === "processing" ||
      rawStatus === "authorized"
    ) {
      return { status: "pending", reason };
    }

    // Statut inconnu — safe skip.
    logger.warn(
      `[PAYOUT] status check statut inconnu "${rawStatus}" pour txn=${transactionId}`,
    );
    return null;
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[PAYOUT] status check error for txn=${transactionId}: ${msg}`);
    return null;
  }
}
