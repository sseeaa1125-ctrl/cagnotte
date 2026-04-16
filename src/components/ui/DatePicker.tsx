"use client";

import * as React from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 7 plan 07-02 — DatePicker primitive wrapper restyle.
//
// Visual reference:
// .planning/banani/screens/phase-7/solidaire-step-2-date-field.md
//
// The underlying <input type="date"> stays functional (native picker on
// mobile, better a11y, no new deps). We wrap it in a styled "button shell"
// (border-gray-300 rounded-xl px-4 py-3.5 + calendar icon) that matches
// Banani pixel-for-pixel; the real input is absolutely positioned over
// the shell with opacity-0 so a click anywhere on the visual triggers
// the native picker.
//
// Ring 1 PURE: NO imports from @/lib/api, @/lib/useApi, @/lib/constants
// or @/contexts. The placeholder is a prop with a hardcoded French
// fallback (the matching constant lives at DATE_PICKER_LABELS.placeholder
// and is passed in by the consumer when relevant).
//
// Plan 07-03 will supersede this wrapper in wizard etape-2 by introducing
// a proper <Calendar> popover primitive. This restyle is the baseline
// visual polish in the meantime.
// ─────────────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  helper?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
}

const DEFAULT_PLACEHOLDER = "Sélectionne une date…";

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatDateDisplay(iso: string): string {
  // iso: YYYY-MM-DD (native input format). Renders "15 avril 2026".
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const year = Number.parseInt(match[1]!, 10);
  const month = Number.parseInt(match[2]!, 10);
  const day = Number.parseInt(match[3]!, 10);
  if (month < 1 || month > 12) return iso;
  return `${day} ${MONTHS_FR[month - 1]} ${year}`;
}

export function DatePicker({
  value,
  onChange,
  label,
  error,
  helper,
  min,
  max,
  clearable,
  disabled,
  name,
  id,
  placeholder,
  className,
}: DatePickerProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;
  const hasValue = Boolean(value);
  const displayText = hasValue
    ? formatDateDisplay(value!)
    : (placeholder ?? DEFAULT_PLACEHOLDER);

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-bold text-primary"
        >
          {label}
        </label>
      ) : null}

      {/* Button-shell wrapper — Banani visual. The native <input> is
          absolutely positioned over it with opacity-0 so a tap anywhere
          in the shell opens the native date picker. */}
      <div className="relative">
        <div
          className={cn(
            "flex min-h-12 items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-sm transition-colors",
            "hover:border-primary",
            disabled && "cursor-not-allowed opacity-60 hover:border-gray-300",
            error
              ? "border-red-500"
              : "border-gray-300",
            className,
          )}
        >
          <span
            className={cn(
              "truncate text-base font-medium",
              hasValue ? "text-primary" : "text-gray-400",
            )}
          >
            {displayText}
          </span>
          <Calendar
            size={20}
            aria-hidden
            className="flex-shrink-0 text-gray-400"
          />
        </div>
        <input
          id={inputId}
          name={name}
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error || helper ? `${inputId}-desc` : undefined
          }
          className={cn(
            "absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-xl bg-transparent opacity-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            disabled && "cursor-not-allowed",
            clearable && value ? "pr-12" : "",
          )}
        />
        {clearable && value && !disabled ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-10 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Effacer la date"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={`${inputId}-desc`} className="text-xs font-medium text-red-500">
          {error}
        </p>
      ) : helper ? (
        <p id={`${inputId}-desc`} className="text-xs font-medium text-gray-500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
