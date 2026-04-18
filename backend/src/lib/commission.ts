/**
 * FUNDRAISER commission helper — Phase 1 plan 01-03.
 *
 * Pure, integer-only math. Called by Phase 2 `routes/orders.ts` (which currently
 * uses a `Math.round` bug — that call site is Phase 2's replacement target, NOT
 * this file's problem).
 *
 * Pitfall guarded: P03 — commission rounding drift. Invariant `commission + net === gross`
 * is enforced inside this function AND re-tested in backend/scripts/test-commission.ts.
 *
 * LOCKED per PROJECT.md (2026-04-13):
 *   - solidaire = 6% (santé, éducation, urgence)
 *   - festive   = 8% (mariage, anniversaire, cadeau commun)
 *   - Rounding: Math.floor (favor seller)
 *   - NO PlatformConfig table in v1. To change rates in v2, introduce a config
 *     row with { subtype, rateBp } and inject it here.
 */

export const FUNDRAISER_COMMISSION_BP = {
  solidaire: 600, // 6% — santé, éducation, urgence
  festive: 800,   // 8% — mariage, anniversaire, cadeau commun
} as const;

// Bictorys processing fees — supported by the platform (deducted from
// gross commission, never charged to donors or sellers).
//   - 1.5% on each incoming transaction (donation)
//   - 1% on each outgoing payout (seller withdrawal) — stored per-row on
//     Withdrawal.merchantFee when the payout clears.
// Real net margin on commission:
//   festive   = 8% − 1.5% − 1% = 5.5%
//   solidaire = 6% − 1.5% − 1% = 3.5%
export const BICTORYS_TRANSACTION_FEE_RATE = 0.015;
export const BICTORYS_WITHDRAWAL_FEE_RATE = 0.01;

export type FundraiserSubtype = keyof typeof FUNDRAISER_COMMISSION_BP;

export interface CommissionResult {
  /** basis points (stored on Order.commissionRate) */
  rate: number;
  /** FCFA integer (stored on Order.commissionAmount) */
  commission: number;
  /** FCFA integer (stored on Order.sellerAmount) */
  net: number;
}

/**
 * Compute FUNDRAISER commission and net for a gross donation amount.
 *
 * Uses Math.floor (NOT Math.round). See P03 — the existing `routes/orders.ts`
 * uses Math.round and will be replaced by a call to this helper in Phase 2.
 *
 * Invariant: commission + net === gross. Holds by construction because
 *   net = gross - commission
 * and gross, commission are both integers.
 *
 * @param gross FCFA integer amount (must be a non-negative safe integer).
 * @param subtype "solidaire" | "festive"
 * @throws if gross is not a non-negative integer, or subtype is unknown.
 */
export function computeCommission(
  gross: number,
  subtype: FundraiserSubtype,
): CommissionResult {
  if (!Number.isInteger(gross) || gross < 0) {
    throw new Error(
      `computeCommission: gross must be a non-negative integer, got ${gross}`,
    );
  }
  if (!(subtype in FUNDRAISER_COMMISSION_BP)) {
    throw new Error(`computeCommission: unknown subtype "${subtype}"`);
  }

  const rate = FUNDRAISER_COMMISSION_BP[subtype];
  const commission = Math.floor((gross * rate) / 10000);
  const net = gross - commission;

  // Defense-in-depth. This can only fire if someone patches the math above.
  if (commission + net !== gross) {
    throw new Error(
      `computeCommission invariant violated: ${commission} + ${net} !== ${gross} (subtype=${subtype}, rate=${rate})`,
    );
  }

  return { rate, commission, net };
}
