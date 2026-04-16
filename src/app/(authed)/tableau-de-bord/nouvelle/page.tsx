"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { CREATE_PICKER_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 plan 05-02 — /tableau-de-bord/nouvelle (Banani screen 8).
//
// Two-card picker: Festive (pink) + Solidaire (cream). Each card is a
// native <button> with large click target (≥ 48px). No API calls. No draft
// persistence — that starts in step-1 of each wizard branch.
//
// Phase 11 polish — each card now surfaces the commission rate (8%
// festive / 6% solidaire) so the creator sees how much will be deducted
// before they commit to a wizard branch. Plus a trust strip with the
// 48h payout promise.
// ─────────────────────────────────────────────────────────────────────────

interface PickerCardProps {
  title: string;
  description: string;
  emoji: string;
  feeAmount: string;
  cta: string;
  accentClass: string; // pink for festive, cream for solidaire
  onClick: () => void;
  ariaLabel: string;
}

function PickerCard({
  title,
  description,
  emoji,
  feeAmount,
  cta,
  accentClass,
  onClick,
  ariaLabel,
}: PickerCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "group flex w-full flex-col gap-3 rounded-3xl p-5 text-left transition-all sm:p-6",
        "hover:-translate-y-0.5 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        accentClass,
      )}
    >
      {/* Header — emoji + (title + commission chip stacked) */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm"
          aria-hidden
        >
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-headings text-xl font-black leading-tight text-primary sm:text-2xl">
            {title}
          </h2>
          <p className="mt-0.5 text-xs font-bold text-primary/70">
            <span className="text-primary">{feeAmount}</span> de commission
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-primary/70">
        {description}
      </p>

      {/* CTA arrow */}
      <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-transform group-hover:translate-x-1">
        {cta}
        <ArrowRight size={16} aria-hidden />
      </span>
    </button>
  );
}

export default function CreatePickerPage() {
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-4 sm:gap-8 md:py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-headings text-2xl font-black text-primary sm:text-3xl md:text-4xl">
          {CREATE_PICKER_LABELS.title}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {CREATE_PICKER_LABELS.subtitle}
        </p>
      </header>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {/* Solidaire FIRST — per product direction (more important
            value prop than the festive variant). */}
        <PickerCard
          emoji="❤️"
          title={CREATE_PICKER_LABELS.solidaireTitle}
          description={CREATE_PICKER_LABELS.solidaireDescription}
          feeAmount={CREATE_PICKER_LABELS.solidaireFeeAmount}
          cta={CREATE_PICKER_LABELS.solidaireCta}
          accentClass="bg-[#FEF4E3] hover:bg-[#faeed6]"
          ariaLabel={`${CREATE_PICKER_LABELS.solidaireTitle} — ${CREATE_PICKER_LABELS.solidaireFeeAmount} ${CREATE_PICKER_LABELS.solidaireFeeLabel}. ${CREATE_PICKER_LABELS.solidaireDescription}`}
          onClick={() =>
            router.push("/tableau-de-bord/nouvelle/solidaire/etape-1")
          }
        />
        <PickerCard
          emoji="🪩"
          title={CREATE_PICKER_LABELS.festiveTitle}
          description={CREATE_PICKER_LABELS.festiveDescription}
          feeAmount={CREATE_PICKER_LABELS.festiveFeeAmount}
          cta={CREATE_PICKER_LABELS.festiveCta}
          accentClass="bg-[#F4D3DE] hover:bg-[#efc7d5]"
          ariaLabel={`${CREATE_PICKER_LABELS.festiveTitle} — ${CREATE_PICKER_LABELS.festiveFeeAmount} ${CREATE_PICKER_LABELS.festiveFeeLabel}. ${CREATE_PICKER_LABELS.festiveDescription}`}
          onClick={() =>
            router.push("/tableau-de-bord/nouvelle/festive/etape-1")
          }
        />
      </div>

      {/* Helper line under the cards explaining the no-hidden-fees model */}
      <p className="-mt-2 max-w-xl text-center text-xs leading-relaxed text-muted-foreground md:text-sm">
        {CREATE_PICKER_LABELS.feeHelper}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-border bg-background px-6 py-3 text-xs font-medium text-primary">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-primary" aria-hidden />
          {CREATE_PICKER_LABELS.trustBadgeSecure}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wallet size={14} className="text-primary" aria-hidden />
          {CREATE_PICKER_LABELS.trustBadgePayout}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-primary" aria-hidden />
          {CREATE_PICKER_LABELS.trustBadgeEasy}
        </span>
      </div>

      <Link
        href="/tableau-de-bord"
        className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-bold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {CREATE_PICKER_LABELS.cancelCta}
      </Link>
    </div>
  );
}
