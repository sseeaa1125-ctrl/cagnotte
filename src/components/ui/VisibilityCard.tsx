"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 7 plan 07-02 — VisibilityCard primitive (lifted from inline copies
// that used to live in festive/etape-3 and solidaire/etape-3).
//
// Ring 1 PURE: no imports from @/lib/api, @/lib/useApi, @/lib/constants or
// @/contexts/*. The parent passes title, description, icon and the value
// identifier; the component is a controlled radio-card button.
//
// Visual reference: .planning/banani/screens/phase-7/visibility-card.md
// Selected state uses `border-primary bg-[#f8f9fc]` (Banani signature),
// idle uses gray-200 with a hover flip to primary.
// ─────────────────────────────────────────────────────────────────────────

export interface VisibilityCardProps {
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  name?: string;
  className?: string;
}

export function VisibilityCard({
  value,
  checked,
  onChange,
  icon,
  title,
  description,
  name = "visibility",
  className,
}: VisibilityCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-name={name}
      data-value={value}
      onClick={() => onChange(value)}
      className={cn(
        "flex min-h-[64px] w-full items-start gap-4 rounded-xl border-2 p-5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        checked
          ? "border-primary bg-[#f8f9fc]"
          : "border-gray-200 bg-white hover:border-primary",
        className,
      )}
    >
      <span
        className={cn(
          "mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked ? "border-primary" : "border-gray-300",
        )}
        aria-hidden
      >
        {checked ? (
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2 font-headings text-lg font-bold text-primary">
          {icon}
          {title}
        </span>
        <span className="text-sm font-medium text-gray-500">
          {description}
        </span>
      </span>
    </button>
  );
}
