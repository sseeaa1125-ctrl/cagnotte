// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — Client-side withdrawal request schema + PIN guards.
//
// Mirrors backend/src/routes/withdrawals.ts::createWithdrawalSchema:
//   - amount:  integer, FCFA, must be ≤ backend balance
//   - provider: "wave_money" | "orange_money" (NO Free Money — Bictorys
//                payouts do not support it per D-22)
//   - phone:   +221 prefixed or 9-digit national
//   - recipientName: free text
//   - pin:     EXACTLY 4 digits (backend contract: sellers.ts:993, withdrawals.ts:44)
//
// Zero npm deps — pure TypeScript + regex. See D-18..D-24 in FRONTEND-DEVIATIONS.md.
// ─────────────────────────────────────────────────────────────────────────

export type PayoutProvider = "wave_money" | "orange_money";

export interface WithdrawalDraft {
  amount: number; // FCFA integer
  provider: PayoutProvider;
  phone: string; // stored as national 9-digit or with +221 prefix
  recipientName: string;
  pin: string; // 4 digits, entered in step 2
}

// Backend minimum from withdrawals.ts::PAYOUT_LIMITS.minAmount
export const WITHDRAWAL_MIN_AMOUNT = 1000;
// Backend maximum from withdrawals.ts::PAYOUT_LIMITS.maxAmount
export const WITHDRAWAL_MAX_AMOUNT = 500_000;

export const PIN_LENGTH = 4;
export const PIN_REGEX = /^\d{4}$/;

export function validateWithdrawalDraft(
  draft: Partial<WithdrawalDraft>,
  balance: number,
): string | null {
  if (!draft.amount || draft.amount <= 0) return "Montant invalide";
  if (!Number.isInteger(draft.amount)) return "Le montant doit être un entier";
  if (draft.amount < WITHDRAWAL_MIN_AMOUNT) {
    return `Montant minimum : ${WITHDRAWAL_MIN_AMOUNT.toLocaleString("fr-FR")} FCFA`;
  }
  if (draft.amount > WITHDRAWAL_MAX_AMOUNT) {
    return `Montant maximum : ${WITHDRAWAL_MAX_AMOUNT.toLocaleString("fr-FR")} FCFA`;
  }
  if (draft.amount > balance) return "Montant supérieur au solde disponible";
  if (!draft.provider) return "Choisissez un moyen de paiement";
  if (draft.provider !== "wave_money" && draft.provider !== "orange_money") {
    return "Moyen de paiement non supporté";
  }
  if (!draft.phone || !draft.phone.trim()) return "Numéro manquant";
  if (!draft.recipientName || !draft.recipientName.trim()) {
    return "Nom du bénéficiaire manquant";
  }
  return null;
}

export function validatePin(pin: string): boolean {
  return pin.length === PIN_LENGTH && PIN_REGEX.test(pin);
}

/**
 * True only when every field required for POST /api/withdrawals is present
 * and valid. Used by the PIN and confirmation steps to guard against direct
 * navigation to /retraits/pin or /retraits/confirmation.
 */
export function isCompleteDraft(
  draft: Partial<WithdrawalDraft>,
): draft is WithdrawalDraft {
  return (
    typeof draft.amount === "number" &&
    draft.amount > 0 &&
    (draft.provider === "wave_money" || draft.provider === "orange_money") &&
    typeof draft.phone === "string" &&
    draft.phone.trim().length > 0 &&
    typeof draft.recipientName === "string" &&
    draft.recipientName.trim().length > 0
  );
}
