import Link from "next/link";
import { CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui";
import { WITHDRAWAL_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { DraftClearer } from "./_DraftClearer";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /retraits/succes (Banani screen withdrawal-success).
//
// Server component. Reads ?amount= and ?provider= from search params (the
// confirmation step packs them into router.replace). Renders a pulsing
// success icon (pure CSS animate-ping halo per D-15 precedent), a
// transaction summary, an info notice, and two CTAs. A client-side
// <DraftClearer /> island also wipes the sessionStorage draft on mount
// as a belt-and-suspenders guard (the confirmation step already clears
// on successful submit).
// ─────────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    amount?: string;
    provider?: string;
  }>;
}

function providerLabel(p: string | undefined): string {
  if (p === "wave_money") return "Wave Sénégal";
  if (p === "orange_money") return "Orange Money";
  return "Mobile Money";
}

export const dynamic = "force-dynamic";

export default async function RetraitsSuccesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawAmount = sp.amount;
  const provider = sp.provider;
  const amount = rawAmount ? Number.parseInt(rawAmount, 10) : 0;
  const amountLabel =
    Number.isFinite(amount) && amount > 0 ? formatPrice(amount) : "";

  return (
    <div className="mx-auto max-w-2xl">
      <DraftClearer />

      <div className="rounded-[2.5rem] bg-white p-6 shadow-sm md:p-10">
        {/* Pulsing success icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <span className="relative flex h-24 w-24 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400/30" />
            <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 size={44} aria-hidden />
            </span>
          </span>
        </div>

        <h1 className="mb-3 text-center font-headings text-2xl font-bold text-primary md:text-3xl">
          {WITHDRAWAL_LABELS.successH1}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground md:text-base">
          {WITHDRAWAL_LABELS.successBodyPrefix}
          <strong className="font-semibold text-primary">{amountLabel}</strong>
          {WITHDRAWAL_LABELS.successBodySuffix}
        </p>

        {/* Summary */}
        <div className="flex flex-col gap-4 rounded-3xl bg-gray-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {WITHDRAWAL_LABELS.successToLabel}
            </span>
            <span className="text-sm font-semibold text-primary">
              {providerLabel(provider)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {WITHDRAWAL_LABELS.successDelayLabel}
            </span>
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              {WITHDRAWAL_LABELS.successDelayInstant}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {WITHDRAWAL_LABELS.successStatusLabel}
            </span>
            <span className="text-sm text-primary">
              {WITHDRAWAL_LABELS.successStatusPending}
            </span>
          </div>
        </div>

        {/* Info notice */}
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-blue-50/60 p-4">
          <Info
            size={18}
            className="mt-0.5 flex-shrink-0 text-blue-700"
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold text-blue-900">
              {WITHDRAWAL_LABELS.successInfoTitle}
            </p>
            <p className="mt-1 text-xs text-blue-900/80">
              {WITHDRAWAL_LABELS.successInfo}
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/tableau-de-bord">
            <Button type="button" variant="primary" size="lg">
              {WITHDRAWAL_LABELS.successBackToDashboard}
            </Button>
          </Link>
          <Link href="/toutes-les-cagnottes">
            <Button type="button" variant="outline" size="lg">
              {WITHDRAWAL_LABELS.successBackToCagnottes}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
