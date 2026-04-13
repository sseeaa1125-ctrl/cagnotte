import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Info, Landmark, Plus } from "lucide-react";
import { ProfileSidebar } from "@/components/layout/ProfileSidebar";
import {
  BANK_ACCOUNTS_LABELS,
  PROFILE_LABELS,
} from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import { BankForm } from "./_BankForm";

// ─────────────────────────────────────────────────────────────────────────
// Phase 7 plan 07-02 — /profil/coordonnees-bancaires (Banani
// UserPaymentMethods.jsx rewrite).
//
// Server component. Reads GET /api/auth/me with cookie forward (D-11).
// Keeps the D-18 single payout record model (no PayoutAccount table) and
// D-22 Wave + Orange Money only (NO Free Money).
//
// Layout: two cards. Card 1 — Mobile Money — renders the currently
// configured account as a Wave/Orange tile row with Actif badge + delete
// affordance, then exposes the existing BankForm inline for edit/add.
// Card 2 — Bank Accounts — dashed empty-state (v1 does not support bank
// accounts; full flow ships in a later phase). Footer: blue-50 security
// notice.
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

  const provider = seller.payoutProvider === "orange_money" ? "orange_money" : "wave_money";
  const phoneDisplay = seller.payoutPhone ? formatPhone(seller.payoutPhone) : "";
  const hasAccount = Boolean(seller.payoutPhone && seller.payoutName);

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
        <div className="flex flex-col gap-6">
          {/* Card 1 — Mobile Money */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-headings text-xl font-bold text-primary md:text-2xl">
                  {BANK_ACCOUNTS_LABELS.mobileMoneyTitle}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {BANK_ACCOUNTS_LABELS.mobileMoneyHelper}
                </p>
              </div>
            </div>

            {hasAccount ? (
              <div className="mt-4 flex items-center gap-3 border-t border-gray-100 py-4">
                <span
                  className={
                    provider === "wave_money"
                      ? "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#3374FF] font-headings text-xl font-black text-white shadow-sm"
                      : "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#FF6600] font-headings text-xl font-black text-white shadow-sm"
                  }
                >
                  {provider === "wave_money" ? "W" : "O"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-headings text-lg font-bold text-primary">
                    {provider === "wave_money" ? "Wave Sénégal" : "Orange Money"}
                  </p>
                  <p className="truncate text-sm font-medium text-gray-500">
                    {phoneDisplay}
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  {BANK_ACCOUNTS_LABELS.activeBadge}
                </span>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-gray-50 p-5 text-center">
                <p className="text-sm font-semibold text-primary">
                  {BANK_ACCOUNTS_LABELS.mobileEmptyTitle}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {BANK_ACCOUNTS_LABELS.mobileEmptyBody}
                </p>
              </div>
            )}

            {/* Inline add / edit form — keeps existing Phase 6 mutation flow */}
            <div className="mt-6 border-t border-gray-100 pt-6">
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
            </div>
          </section>

          {/* Card 2 — Comptes Bancaires (empty state) */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
            <h2 className="font-headings text-xl font-bold text-primary md:text-2xl">
              {BANK_ACCOUNTS_LABELS.bankAccountsTitle}
            </h2>
            <p className="mb-4 mt-1 text-sm text-gray-500">
              {BANK_ACCOUNTS_LABELS.bankAccountsHelper}
            </p>
            {/* TODO PHASE-8: bank account add flow (RIB/IBAN capture + Bictorys
                payout routing). v1 only supports Mobile Money payouts. */}
            <button
              type="button"
              disabled
              aria-disabled
              className="flex min-h-[120px] w-full cursor-not-allowed flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-400 transition-colors"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
                <Landmark size={24} aria-hidden />
              </span>
              <span className="font-headings text-lg font-bold text-primary">
                {BANK_ACCOUNTS_LABELS.bankEmptyTitle}
              </span>
              <span className="max-w-sm text-sm font-medium text-gray-500">
                {BANK_ACCOUNTS_LABELS.bankEmptyBody}
              </span>
              <span className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-primary shadow-sm">
                <Plus size={18} aria-hidden />
                {BANK_ACCOUNTS_LABELS.addBankCta}
              </span>
            </button>
          </section>

          {/* Footer security notice */}
          <aside className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
            <Info
              size={20}
              className="mt-0.5 flex-shrink-0 text-primary"
              aria-hidden
            />
            <div>
              <p className="font-headings text-sm font-bold text-primary">
                {BANK_ACCOUNTS_LABELS.securityNoticeTitle}
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-gray-600">
                {BANK_ACCOUNTS_LABELS.securityNoticeBody}
              </p>
            </div>
          </aside>
        </div>
      </ProfileSidebar>
    </div>
  );
}
