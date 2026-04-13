import type {
  PaymentProvider,
  CreateTransactionParams,
  TransactionResult,
} from "./types.js";
import * as logger from "../logger.js";

const BICTORYS_API_URL = process.env.BICTORYS_API_URL;
const BICTORYS_API_KEY = process.env.BICTORYS_API_KEY;

export class BictorysProvider implements PaymentProvider {
  async createTransaction(
    params: CreateTransactionParams
  ): Promise<TransactionResult> {
    if (!BICTORYS_API_URL || !BICTORYS_API_KEY) {
      throw new Error(
        "Bictorys API non configurée (BICTORYS_API_URL ou BICTORYS_API_KEY manquant)"
      );
    }

    let url = `${BICTORYS_API_URL}/pay/v1/charges?payment_type=${params.paymentType}`;
    if (params.paymentType === "card") {
      url += "&payment_category=card";
    }

    const body: Record<string, unknown> = {
      amount: params.amount,
      currency: params.currency || "XOF",
      country: params.country || "SN",
      paymentReference: params.reference,
      successRedirectUrl: params.successRedirectUrl,
      ErrorRedirectUrl: params.errorRedirectUrl, // E majuscule — convention Bictorys
      customerObject: params.customer,
    };

    // Orange Money CI requiert un code OTP généré via #144*82#
    if (params.otp) {
      body.otp = params.otp;
    }

    logger.log(`[Bictorys] POST ${url}`);
    logger.log(`[Bictorys] Body:`, JSON.stringify(body));

    // Retry with exponential backoff for WAF 403 (doc §8)
    const MAX_RETRIES = 3;
    let lastError = "";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        logger.log(`[Bictorys] WAF 403 — retry ${attempt}/${MAX_RETRIES} dans ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Api-Key": BICTORYS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as {
          transactionId: string;
          redirectUrl?: string;
          link?: string;
          qrCode?: string;
          message?: string;
        };

        logger.log(`[Bictorys] Response: transactionId=${data.transactionId}, link=${data.link || "empty"}, qrCode=${data.qrCode ? "present" : "empty"}, message=${data.message || "empty"}, redirectUrl=${data.redirectUrl || "empty"}`);

        return {
          externalId: data.transactionId,
          redirectUrl: data.redirectUrl || undefined,
          link: data.link || undefined,
          qrCode: data.qrCode || undefined,
          message: data.message || undefined,
        };
      }

      const errorText = await response.text();
      lastError = errorText;

      // Only retry on 403 WAF HTML block, not on other errors
      if (response.status === 403 && errorText.includes("Forbidden") && attempt < MAX_RETRIES) {
        continue;
      }

      logger.error(`[Bictorys] API error ${response.status}: ${errorText}`);
      throw new Error(`Erreur paiement (${response.status}). Vérifie ta connexion et réessaye.`);
    }

    logger.error(`[Bictorys] Échec après ${MAX_RETRIES} retries WAF: ${lastError}`);
    throw new Error("Le service de paiement est temporairement indisponible. Réessaye dans 2-3 minutes.");
  }

  /**
   * Check transaction status directly with Bictorys API.
   * Fallback when webhook doesn't arrive (local dev, network issues).
   */
  async checkTransactionStatus(transactionId: string): Promise<{
    status: "succeeded" | "failed" | "cancelled" | "pending" | "processing" | "authorized" | "reversed";
    amount: number;
    paymentReference: string;
  } | null> {
    if (!BICTORYS_API_URL || !BICTORYS_API_KEY) return null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000); // 15s timeout
      const res = await fetch(`${BICTORYS_API_URL}/pay/v1/charges/${transactionId}`, {
        headers: { "X-Api-Key": BICTORYS_API_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        // Reduire le niveau de log pour les erreurs 500 (probleme cote provider) pour eviter le bruit
        if (res.status === 500) {
          logger.log(`[Bictorys] status check failed: 500 (internal error) for txn=${transactionId}`);
        } else {
          logger.warn(`Bictorys status check failed: ${res.status} for txn=${transactionId}`);
        }
        return null;
      }
      const data = await res.json() as {
        status: string;
        amount: number;
        paymentReference: string;
      };
      return {
        status: data.status as "succeeded" | "failed" | "cancelled" | "pending" | "processing" | "authorized" | "reversed",
        amount: data.amount,
        paymentReference: data.paymentReference,
      };
    } catch (err) {
      logger.warn("Bictorys status check error", err);
      return null;
    }
  }
}
