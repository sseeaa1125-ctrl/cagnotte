// MIRROR OF backend/src/lib/commission.ts — any edit here MUST be mirrored there.
// Phase 4 plan 04-01 / Pitfall P03 / Deviation D-04.
// Compare: `diff backend/src/lib/commission.ts src/lib/commission.ts | head`
// Should differ only in import comments, never in math.
//
// LOCKED per PROJECT.md (2026-04-13):
//   - solidaire = 6% (santé, éducation, urgence)
//   - festive   = 8% (mariage, anniversaire, cadeau commun)
//   - Rounding: Math.floor (favor seller)
//   - Invariant: commission + net === gross
//
// This file is Ring 0 (pure math) — NO imports from @/lib/format, @/lib/utils,
// @/lib/constants or anything else. Zero-dependency.

export const FUNDRAISER_COMMISSION_BP = {
  solidaire: 600, // 6% — santé, éducation, urgence
  festive: 800, // 8% — mariage, anniversaire, cadeau commun
} as const;

export type FundraiserSubtype = keyof typeof FUNDRAISER_COMMISSION_BP;

export interface CommissionResult {
  /** basis points (e.g. 600 | 800) — matches backend Order.commissionRate */
  rate: number;
  /** FCFA integer — matches backend Order.commissionAmount */
  commission: number;
  /** FCFA integer — matches backend Order.sellerAmount */
  net: number;
}

/**
 * Compute FUNDRAISER commission and net for a gross donation amount.
 *
 * Uses Math.floor (NOT Math.round) — favors the seller, matches backend helper.
 *
 * Invariant: commission + net === gross. Holds by construction.
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

/**
 * Build the commission label used on /participer and /paiement.
 * Example: formatCommissionLabel(10000, "festive") → "8% · 800 FCFA"
 * NEVER returns "Offerts" — see D-04 in .planning/banani/FRONTEND-DEVIATIONS.md.
 *
 * Intentionally does NOT import formatPrice from @/lib/format to keep this
 * file zero-dependency (Ring 0). Thousands separator is a regular space to
 * match formatPrice output.
 */
export function formatCommissionLabel(
  gross: number,
  subtype: FundraiserSubtype,
): string {
  const { rate, commission } = computeCommission(gross, subtype);
  const percent = (rate / 100).toFixed(0);
  const amountStr = commission
    .toLocaleString("fr-FR")
    .replace(/\u202F|\u00A0/g, " ");
  return `${percent}% · ${amountStr} FCFA`;
}
