"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles } from "lucide-react";
import { CREATE_PICKER_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 plan 05-02 — /tableau-de-bord/nouvelle (Banani screen 8).
//
// Two-card picker: Festive (pink) + Solidaire (cream). Each card is a
// native <button> with large click target (≥ 48px). No API calls. No draft
// persistence — that starts in step-1 of each wizard branch.
// ─────────────────────────────────────────────────────────────────────────

interface PickerCardProps {
  title: string;
  description: string;
  emoji: string;
  accentClass: string; // pink for festive, cream for solidaire
  onClick: () => void;
  ariaLabel: string;
}

function PickerCard({
  title,
  description,
  emoji,
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
        "group flex min-h-[160px] w-full flex-col items-start gap-3 rounded-3xl border border-transparent p-6 text-left transition-all",
        "hover:scale-[1.01] hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        accentClass,
      )}
    >
      <span
        className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-background text-3xl"
        aria-hidden
      >
        {emoji}
      </span>
      <span className="font-headings text-2xl font-bold text-primary">
        {title}
      </span>
      <span className="text-sm text-primary/70">{description}</span>
    </button>
  );
}

export default function CreatePickerPage() {
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 py-4 md:py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-headings text-3xl font-bold text-primary md:text-4xl">
          {CREATE_PICKER_LABELS.title}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {CREATE_PICKER_LABELS.subtitle}
        </p>
      </header>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <PickerCard
          emoji="🪩"
          title={CREATE_PICKER_LABELS.festiveTitle}
          description={CREATE_PICKER_LABELS.festiveDescription}
          accentClass="bg-[#F4D3DE] hover:bg-[#efc7d5]"
          ariaLabel={`${CREATE_PICKER_LABELS.festiveTitle} — ${CREATE_PICKER_LABELS.festiveDescription}`}
          onClick={() =>
            router.push("/tableau-de-bord/nouvelle/festive/etape-1")
          }
        />
        <PickerCard
          emoji="❤️"
          title={CREATE_PICKER_LABELS.solidaireTitle}
          description={CREATE_PICKER_LABELS.solidaireDescription}
          accentClass="bg-[#FEF4E3] hover:bg-[#faeed6]"
          ariaLabel={`${CREATE_PICKER_LABELS.solidaireTitle} — ${CREATE_PICKER_LABELS.solidaireDescription}`}
          onClick={() =>
            router.push("/tableau-de-bord/nouvelle/solidaire/etape-1")
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-border bg-background px-6 py-3 text-xs font-medium text-primary">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-trustpilot" />
          {CREATE_PICKER_LABELS.trustBadgeSecure}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={14} className="text-primary" />
          {CREATE_PICKER_LABELS.trustBadgeEasy}
        </span>
      </div>

      <a
        href="/tableau-de-bord"
        className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {CREATE_PICKER_LABELS.cancelCta}
      </a>
    </div>
  );
}
