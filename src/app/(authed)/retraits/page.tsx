import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Circle,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui";
import { WITHDRAWAL_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AmountStep } from "./_AmountStep";
import { RetraitsTabs } from "./_RetraitsTabs";

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

interface GateState {
  kycDone: boolean;
  pinDone: boolean;
  notBlocked: boolean;
}

function ProgressChecklist({ state }: { state: GateState }) {
  const items: Array<{ label: string; done: boolean; href: string }> = [
    {
      label: "Vérification d'identité (KYC)",
      done: state.kycDone,
      href: "/profil/kyc",
    },
    {
      label: "Code PIN de retrait",
      done: state.pinDone,
      href: "/profil/securite",
    },
    {
      label: "Compte en règle",
      done: state.notBlocked,
      href: "/profil",
    },
  ];
  const completed = items.filter((i) => i.done).length;
  return (
    <div className="mb-6 rounded-2xl border border-border bg-muted/60 p-5 text-left">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
        Progression — {completed}/{items.length} étapes complétées
      </p>
      <ol className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 text-sm font-medium"
          >
            <span
              aria-hidden
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                item.done
                  ? "bg-success-bg text-success"
                  : "bg-amber-50 text-amber-600",
              )}
            >
              {item.done ? <Check size={14} /> : <Circle size={10} />}
            </span>
            <span
              className={cn(
                item.done ? "text-gray-500 line-through" : "text-primary",
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BlockedState({
  icon,
  title,
  body,
  cta,
  href,
  state,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  href: string;
  state?: GateState;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-background p-5 shadow-sm sm:p-8 md:p-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 sm:h-16 sm:w-16">
          {icon}
        </div>
        <h2 className="mb-2 font-headings text-lg font-bold text-primary sm:text-xl md:text-2xl">
          {title}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">{body}</p>
      </div>
      {state ? <ProgressChecklist state={state} /> : null}
      <div className="flex justify-center">
        <Link href={href}>
          <Button variant="primary" size="lg">
            {cta}
          </Button>
        </Link>
      </div>
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

  const gateState: GateState = {
    kycDone: data.kycStatus === "APPROVED",
    pinDone: data.hasWithdrawalPin,
    notBlocked: !data.withdrawalBlocked,
  };

  // Gate 1 — KYC
  if (data.kycStatus !== "APPROVED") {
    return (
      <BlockedState
        icon={<ShieldQuestion size={24} aria-hidden />}
        title={WITHDRAWAL_LABELS.kycBlockedTitle}
        body={WITHDRAWAL_LABELS.kycBlockedBody}
        cta={WITHDRAWAL_LABELS.kycBlockedCta}
        href="/profil/kyc"
        state={gateState}
      />
    );
  }

  // Gate 2 — PIN
  if (!data.hasWithdrawalPin) {
    return (
      <BlockedState
        icon={<ShieldAlert size={24} aria-hidden />}
        title={WITHDRAWAL_LABELS.pinMissingTitle}
        body={WITHDRAWAL_LABELS.pinMissingBody}
        cta={WITHDRAWAL_LABELS.pinMissingCta}
        href="/profil/securite"
        state={gateState}
      />
    );
  }

  // Gate 3 — admin-blocked
  if (data.withdrawalBlocked) {
    return (
      <BlockedState
        icon={<AlertTriangle size={24} aria-hidden />}
        title={WITHDRAWAL_LABELS.blockedTitle}
        body={data.withdrawalBlockReason ?? WITHDRAWAL_LABELS.blockedBody}
        cta="Contacter le support"
        href="mailto:support@cagnotte.sn"
        state={gateState}
      />
    );
  }

  const initialProvider: "wave_money" | "orange_money" =
    data.payoutProvider === "orange_money" ? "orange_money" : "wave_money";

  return (
    <RetraitsTabs>
      <AmountStep
        balance={data.balance}
        initial={{
          provider: initialProvider,
          phone: data.payoutPhone ?? "",
          recipientName: data.payoutName ?? "",
        }}
      />
    </RetraitsTabs>
  );
}
