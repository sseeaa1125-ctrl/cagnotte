import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AlertTriangle, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui";
import { WITHDRAWAL_LABELS } from "@/lib/constants";
import { AmountStep } from "./_AmountStep";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /retraits (step 1: amount + recipient picker).
//
// Seller-level withdrawal flow (D-20). Three gates, evaluated server-side
// from GET /api/withdrawals/balance before any UI renders:
//   1. kycStatus !== "APPROVED" → block with CTA to /profil/kyc
//   2. hasWithdrawalPin === false → block with CTA to /profil/securite
//   3. withdrawalBlocked === true → generic blocked state
// Else → render the _AmountStep client island with pre-filled seller
// payout fields.
// ─────────────────────────────────────────────────────────────────────────

interface BalancePayload {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  payoutPhone: string | null;
  payoutProvider: "wave_money" | "orange_money" | null | string;
  payoutName: string | null;
  payoutCountry: string | null;
  kycStatus: string;
  hasWithdrawalPin: boolean;
  withdrawalBlocked: boolean;
  withdrawalBlockReason: string | null;
}

async function fetchBalance(token: string): Promise<BalancePayload | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}/api/withdrawals/balance`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as BalancePayload;
  } catch {
    return null;
  }
}

function BlockedState({
  icon,
  title,
  body,
  cta,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-sm md:p-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
        {icon}
      </div>
      <h2 className="mb-2 font-headings text-xl font-bold text-primary md:text-2xl">
        {title}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">{body}</p>
      <Link href={href}>
        <Button variant="primary" size="lg">
          {cta}
        </Button>
      </Link>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function RetraitsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect("/connexion?next=/retraits");

  const data = await fetchBalance(token);
  if (!data) redirect("/connexion?next=/retraits");

  // Gate 1 — KYC
  if (data.kycStatus !== "APPROVED") {
    return (
      <BlockedState
        icon={<ShieldQuestion size={28} aria-hidden />}
        title={WITHDRAWAL_LABELS.kycBlockedTitle}
        body={WITHDRAWAL_LABELS.kycBlockedBody}
        cta={WITHDRAWAL_LABELS.kycBlockedCta}
        href="/profil/kyc"
      />
    );
  }

  // Gate 2 — PIN
  if (!data.hasWithdrawalPin) {
    return (
      <BlockedState
        icon={<ShieldAlert size={28} aria-hidden />}
        title={WITHDRAWAL_LABELS.pinMissingTitle}
        body={WITHDRAWAL_LABELS.pinMissingBody}
        cta={WITHDRAWAL_LABELS.pinMissingCta}
        href="/profil/securite"
      />
    );
  }

  // Gate 3 — admin-blocked
  if (data.withdrawalBlocked) {
    return (
      <BlockedState
        icon={<AlertTriangle size={28} aria-hidden />}
        title={WITHDRAWAL_LABELS.blockedTitle}
        body={data.withdrawalBlockReason ?? WITHDRAWAL_LABELS.blockedBody}
        cta="Contacter le support"
        href="/"
      />
    );
  }

  const initialProvider: "wave_money" | "orange_money" =
    data.payoutProvider === "orange_money" ? "orange_money" : "wave_money";

  return (
    <AmountStep
      balance={data.balance}
      initial={{
        provider: initialProvider,
        phone: data.payoutPhone ?? "",
        recipientName: data.payoutName ?? "",
      }}
    />
  );
}
