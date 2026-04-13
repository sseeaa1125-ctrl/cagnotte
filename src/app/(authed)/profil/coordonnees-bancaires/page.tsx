import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileSidebar } from "@/components/layout/ProfileSidebar";
import { BANK_LABELS, PROFILE_LABELS } from "@/lib/constants";
import { BankForm } from "./_BankForm";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /profil/coordonnees-bancaires (Banani screen 18).
//
// Server component. Reads GET /api/auth/me with cookie forward (D-11) —
// the select was widened in 06-02 T0 to include payout*/kyc* fields.
//
// D-18: single payout account per seller (columns on Seller, no
// PayoutAccount model). D-22: wave_money + orange_money only, no Free
// Money. Writes go through PUT /api/sellers/profile (D-28).
// ─────────────────────────────────────────────────────────────────────────

interface SellerPayload {
  id: string;
  email: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  kycStatus?: string;
  payoutPhone?: string | null;
  payoutProvider?: string | null;
  payoutName?: string | null;
  payoutCountry?: string | null;
}

async function fetchSellerMe(token: string): Promise<SellerPayload | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { seller?: SellerPayload };
    return data.seller ?? null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function CoordonneesBancairesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect("/connexion?next=/profil/coordonnees-bancaires");

  const seller = await fetchSellerMe(token);
  if (!seller) redirect("/connexion?next=/profil/coordonnees-bancaires");

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="font-headings text-2xl font-bold text-primary md:text-3xl">
          {PROFILE_LABELS.h1}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PROFILE_LABELS.subtitle}
        </p>
      </header>

      <ProfileSidebar
        activeTab="bank"
        seller={{
          displayName: seller.displayName,
          avatarUrl: seller.avatarUrl,
          email: seller.email,
          kycStatus: seller.kycStatus ?? "NONE",
        }}
      >
        <h2 className="mb-1 font-headings text-xl font-bold text-primary">
          {BANK_LABELS.h1}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {BANK_LABELS.subtitle}
        </p>
        <BankForm
          initial={{
            payoutProvider: (seller.payoutProvider as
              | "wave_money"
              | "orange_money"
              | null) ?? null,
            payoutPhone: seller.payoutPhone ?? "",
            payoutName: seller.payoutName ?? seller.displayName ?? "",
          }}
        />
      </ProfileSidebar>
    </div>
  );
}
