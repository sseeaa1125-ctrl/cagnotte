import { getProfileSeller } from "@/lib/serverProfile";
import { BankForm } from "./_BankForm";

// ─────────────────────────────────────────────────────────────────────────
// /profil/coordonnees-bancaires — "Retrait" tab.
// No wrapper card, no display-then-form duplication, no bank-account
// empty state card. The ProfileShell content card IS the container, and
// BankForm renders directly inside it. Pre-filled with the seller's
// current payout info so there is nothing to display above the form.
// ─────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export default async function RetraitPage() {
  const seller = await getProfileSeller();

  return (
    <BankForm
      initial={{
        payoutProvider:
          (seller.payoutProvider as "wave_money" | "orange_money" | null) ??
          null,
        payoutPhone: seller.payoutPhone ?? "",
        payoutName: seller.payoutName ?? seller.displayName ?? "",
      }}
    />
  );
}
