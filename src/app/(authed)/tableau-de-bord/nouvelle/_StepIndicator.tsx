"use client";

import { ArrowLeft } from "lucide-react";
import { WIZARD_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Shared wizard shell header — "Retour ← → 3-pill step indicator".
// Private to the /nouvelle route group. 30 LOC, no new primitive.
// ─────────────────────────────────────────────────────────────────────────

export function StepIndicator({
  current,
  onBack,
}: {
  current: 1 | 2 | 3;
  onBack?: () => void;
}) {
  const stepLabel =
    current === 1
      ? WIZARD_LABELS.step1Of3
      : current === 2
        ? WIZARD_LABELS.step2Of3
        : WIZARD_LABELS.step3Of3;

  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-12 min-w-12 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft size={18} />
          {WIZARD_LABELS.backCta}
        </button>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-2" aria-label={stepLabel}>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2 w-8 rounded-full transition-colors",
              i <= current ? "bg-primary" : "bg-muted",
            )}
            aria-hidden
          />
        ))}
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          {stepLabel}
        </span>
      </div>
    </div>
  );
}

export function SubtypeBadge({
  variant,
}: {
  variant: "festive" | "solidaire";
}) {
  const isFestive = variant === "festive";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-primary",
        isFestive
          ? "bg-[#F4D3DE]"
          : "bg-[#FEF4E3] ring-1 ring-inset ring-[#f5ead5]",
      )}
    >
      {isFestive
        ? WIZARD_LABELS.festiveBadge
        : WIZARD_LABELS.solidaireBadge}
    </span>
  );
}

export function WizardHeader({
  variant,
  title,
  subtitle,
}: {
  variant: "festive" | "solidaire";
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3">
      <SubtypeBadge variant={variant} />
      <h1 className="font-headings text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
        {title}
      </h1>
      <p className="text-sm text-gray-600">{subtitle}</p>
    </div>
  );
}
