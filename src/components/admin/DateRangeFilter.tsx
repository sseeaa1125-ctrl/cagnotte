"use client";

/**
 * Admin DateRangeFilter — compact date range picker for admin list pages.
 *
 * Single calendar grid with quick-preset buttons.
 * Returns ISO date strings (YYYY-MM-DD) via onChange callback.
 */

import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── French calendar constants ──
const MONTHS_FR = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

// ── Quick presets ──
interface Preset {
  label: string;
  from: () => string;
  to: () => string;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const PRESETS: Preset[] = [
  {
    label: "Aujourd'hui",
    from: () => toISO(new Date()),
    to: () => toISO(new Date()),
  },
  {
    label: "7j",
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return toISO(d);
    },
    to: () => toISO(new Date()),
  },
  {
    label: "30j",
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return toISO(d);
    },
    to: () => toISO(new Date()),
  },
  {
    label: "Ce mois",
    from: () => {
      const d = new Date();
      return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
    },
    to: () => toISO(new Date()),
  },
  {
    label: "Mois dernier",
    from: () => {
      const d = new Date();
      return toISO(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    },
    to: () => {
      const d = new Date();
      return toISO(new Date(d.getFullYear(), d.getMonth(), 0));
    },
  },
];

// ── Calendar grid helpers ──
function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function inRange(day: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false;
  const d = day.getTime();
  return d >= from.getTime() && d <= to.getTime();
}

function parseISO(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

// ── Props ──
export interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
  className?: string;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onChange,
  className,
}: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Selection state — picking "from" first, then "to"
  const [picking, setPicking] = React.useState<"from" | "to">("from");
  const [tempFrom, setTempFrom] = React.useState<Date | null>(parseISO(dateFrom));
  const [tempTo, setTempTo] = React.useState<Date | null>(parseISO(dateTo));

  // Single calendar month
  const now = new Date();
  const [viewYear, setViewYear] = React.useState(now.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(now.getMonth());

  // Sync temp state when props change externally
  React.useEffect(() => {
    setTempFrom(parseISO(dateFrom));
    setTempTo(parseISO(dateTo));
  }, [dateFrom, dateTo]);

  // Click-outside + Escape
  React.useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
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

  function handleDayClick(day: Date) {
    if (picking === "from") {
      setTempFrom(day);
      setTempTo(null);
      setPicking("to");
    } else {
      // Ensure from <= to
      if (tempFrom && day < tempFrom) {
        setTempFrom(day);
        setTempTo(tempFrom);
      } else {
        setTempTo(day);
      }
      setPicking("from");
    }
  }

  function handleApply() {
    if (tempFrom && tempTo) {
      onChange(toISO(tempFrom), toISO(tempTo));
    } else if (tempFrom) {
      onChange(toISO(tempFrom), toISO(tempFrom));
    }
    setOpen(false);
  }

  function handlePreset(preset: Preset) {
    const f = preset.from();
    const t = preset.to();
    setTempFrom(parseISO(f));
    setTempTo(parseISO(t));
    onChange(f, t);
    setOpen(false);
  }

  function handleClear() {
    setTempFrom(null);
    setTempTo(null);
    onChange("", "");
    setOpen(false);
  }

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

  // Display text for the trigger
  const hasRange = dateFrom || dateTo;
  const displayText = hasRange
    ? `${dateFrom ? formatShort(dateFrom) : "..."} → ${dateTo ? formatShort(dateTo) : "..."}`
    : "Filtrer par date";

  const cells = React.useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setPicking("from");
        }}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          hasRange
            ? "border-primary bg-primary/5 text-primary"
            : "border-border text-muted-foreground hover:border-primary hover:text-primary",
        )}
      >
        <CalendarIcon size={16} />
        <span className="whitespace-nowrap">{displayText}</span>
        {hasRange ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-1 rounded p-0.5 hover:bg-primary/10"
            aria-label="Effacer les dates"
          >
            <X size={14} />
          </button>
        ) : null}
      </button>

      {open ? (
        <div
          ref={popoverRef}
          className="fixed inset-x-3 top-1/2 z-50 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:translate-y-0 sm:mt-2 sm:w-[320px]"
        >
          {/* Presets row */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p)}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Selection hint */}
          <p className="mb-2 text-xs text-muted-foreground">
            {picking === "from"
              ? "Selectionnez la date de debut"
              : "Selectionnez la date de fin"}
          </p>

          {/* Single calendar */}
          <div>
            {/* Month header */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-gray-100"
                aria-label="Mois precedent"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold capitalize text-primary">
                {MONTHS_FR[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-gray-100"
                aria-label="Mois suivant"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Weekday row */}
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className="py-1 text-center text-[10px] font-bold text-gray-400"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="h-8" />;

                const isFrom = tempFrom && sameDay(day, tempFrom);
                const isTo = tempTo && sameDay(day, tempTo);
                const isInRange = inRange(day, tempFrom, tempTo);
                const isToday = sameDay(day, today);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded text-xs font-medium transition-colors",
                      (isFrom || isTo) && "bg-primary text-white font-bold",
                      isInRange && !isFrom && !isTo && "bg-primary/10 text-primary",
                      !isFrom && !isTo && !isInRange && isToday && "border border-primary text-primary",
                      !isFrom && !isTo && !isInRange && !isToday && "text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action row */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-muted-foreground hover:text-primary"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!tempFrom}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Format helper ──
function formatShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
