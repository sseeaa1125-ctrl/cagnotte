"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 7 plan 07-03 — <Calendar> popover primitive.
//
// Ring 1 PURE: no imports from @/lib/api, @/lib/useApi, @/lib/constants,
// or @/contexts/*. The parent passes a Date value + onChange callback and
// optional min/max bounds; all strings (placeholder, label, weekday/month
// names) are hardcoded French literals OR passed in as props.
//
// Visual reference:
// .planning/banani/screens/phase-7/solidaire-step-2-date-field.md
//
// The trigger button matches the restyled <DatePicker> shell from 07-02.
// The popover is hand-rolled: month-grid arithmetic uses native Date only
// (no date-fns / dayjs / moment). Week starts on Monday (Senegalese
// convention). Click-outside + Escape close the popover.
// ─────────────────────────────────────────────────────────────────────────

const FRENCH_MONTHS = [
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

const WEEKDAYS_MON_FIRST = ["L", "M", "M", "J", "V", "S", "D"];

export interface CalendarProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  label?: string;
  error?: string;
  helper?: string;
  clearable?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  // Monday-first: Sunday (0) becomes 6, Monday (1) becomes 0, etc.
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length < 42) cells.push(null);
  return cells;
}

function formatFrenchDate(d: Date): string {
  return `${d.getDate()} ${FRENCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder,
  label,
  error,
  helper,
  clearable,
  id,
  className,
}: CalendarProps) {
  const reactId = React.useId();
  const fieldId = id ?? reactId;
  const [open, setOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Month currently displayed in the popover. Defaults to the selected
  // value's month or today.
  const initialView = value ?? new Date();
  const [viewYear, setViewYear] = React.useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initialView.getMonth());

  // Re-sync view when a value is set programmatically.
  React.useEffect(() => {
    if (value) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
  }, [value]);

  // Click-outside + Escape close.
  React.useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const cells = React.useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const minDay = minDate ? startOfDay(minDate) : null;
  const maxDay = maxDate ? startOfDay(maxDate) : null;
  const todayDay = startOfDay(new Date());

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDay(d: Date) {
    onChange(d);
    setOpen(false);
    // Return focus to the trigger for keyboard users.
    triggerRef.current?.focus();
  }

  const displayText = value
    ? formatFrenchDate(value)
    : (placeholder ?? "Sélectionnez une date...");

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={fieldId}
          className="text-sm font-bold text-primary"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <button
          id={fieldId}
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-describedby={error || helper ? `${fieldId}-desc` : undefined}
          data-invalid={error ? "true" : undefined}
          className={cn(
            "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3.5 text-left shadow-sm transition-colors",
            "hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            error ? "border-red-500" : "border-gray-300",
            className,
          )}
        >
          <span
            className={cn(
              "truncate text-base font-medium",
              value ? "text-primary" : "text-gray-400",
            )}
          >
            {displayText}
          </span>
          <CalendarIcon
            size={20}
            aria-hidden
            className="flex-shrink-0 text-gray-400"
          />
        </button>

        {clearable && value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-11 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Effacer la date"
          >
            <X size={16} />
          </button>
        ) : null}

        {open ? (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Sélecteur de date"
            className="absolute bottom-full left-0 z-50 mb-3 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
          >
            {/* Header: prev / month-year / next */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-12 w-12 items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Mois précédent"
              >
                <ChevronLeft size={20} aria-hidden />
              </button>
              <span className="font-headings font-bold capitalize text-primary">
                {FRENCH_MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-12 w-12 items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Mois suivant"
              >
                <ChevronRight size={20} aria-hidden />
              </button>
            </div>

            {/* Weekday row */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS_MON_FIRST.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className="py-2 text-center text-xs font-bold text-gray-400"
                  aria-hidden
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid — 48px touch targets per mobile accessibility rule */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="h-12 w-full" />;
                }
                const isSelected = !!value && sameDay(day, value);
                const isToday = sameDay(day, todayDay);
                const isBelowMin = minDay ? day < minDay : false;
                const isAboveMax = maxDay ? day > maxDay : false;
                const isDisabled = isBelowMin || isAboveMax;
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && selectDay(day)}
                    aria-label={day.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    aria-pressed={isSelected}
                    className={cn(
                      "mx-auto flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected && "bg-primary text-white font-bold",
                      !isSelected &&
                        isToday &&
                        "border-2 border-primary text-primary",
                      !isSelected &&
                        !isToday &&
                        !isDisabled &&
                        "text-primary hover:bg-gray-100",
                      isDisabled &&
                        "cursor-not-allowed text-gray-300 hover:bg-transparent",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p id={`${fieldId}-desc`} className="text-xs font-medium text-red-500">
          {error}
        </p>
      ) : helper ? (
        <p id={`${fieldId}-desc`} className="text-xs font-medium text-gray-500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
