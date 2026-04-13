"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight, X, SlidersHorizontal } from "lucide-react";

const JOURS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface DateRange {
  from: Date;
  to: Date;
}

interface Preset {
  label: string;
  value: string;
  getRange: () => DateRange;
}

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange, presetValue?: string) => void;
  presets?: Preset[];
  activePreset?: string;
  className?: string;
  placeholder?: string;
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(d: Date, from: Date, to: Date): boolean {
  const t = startOfDay(d).getTime();
  return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime();
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startPad = firstDay.getDay() - 1;
  if (startPad < 0) startPad = 6;
  const days: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

const DEFAULT_PRESETS: Preset[] = [
  {
    label: "7 jours",
    value: "7",
    getRange: () => {
      const to = startOfDay(new Date());
      const from = new Date(to);
      from.setDate(from.getDate() - 6);
      return { from, to };
    },
  },
  {
    label: "14 jours",
    value: "14",
    getRange: () => {
      const to = startOfDay(new Date());
      const from = new Date(to);
      from.setDate(from.getDate() - 13);
      return { from, to };
    },
  },
  {
    label: "30 jours",
    value: "30",
    getRange: () => {
      const to = startOfDay(new Date());
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      return { from, to };
    },
  },
  {
    label: "Ce mois",
    value: "month",
    getRange: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = startOfDay(now);
      return { from, to };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  activePreset,
  className,
  placeholder = "Sélectionner une période",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // ── Draft state (internal, not committed until "Filtrer") ──
  const [draftRange, setDraftRange] = useState<DateRange | null>(null);
  const [draftPreset, setDraftPreset] = useState<string>("");
  const [selecting, setSelecting] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);

  // Sync draft from committed value when opening
  const handleOpen = useCallback(() => {
    setDraftRange(value);
    setDraftPreset(activePreset || "");
    setSelecting(null);
    setHovered(null);
    setOpen(true);
  }, [value, activePreset]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    setSelecting(null);
    setHovered(null);
  }, []);

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (open) {
      const isMobile = window.innerWidth < 640;
      if (isMobile) document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => { document.body.classList.remove("overflow-hidden"); };
  }, [open]);

  // Click outside to dismiss
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        handleDismiss();
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleDismiss]);

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  // Preset click → update draft only
  function handlePresetClick(preset: Preset) {
    const range = preset.getRange();
    setDraftRange(range);
    setDraftPreset(preset.value);
    setSelecting(null);
  }

  // Day click → update draft only
  function handleDayClick(day: Date) {
    if (!selecting) {
      setSelecting(day);
      setDraftPreset("");
    } else {
      const from = day < selecting ? day : selecting;
      const to = day < selecting ? selecting : day;
      setDraftRange({ from: startOfDay(from), to: startOfDay(to) });
      setDraftPreset("");
      setSelecting(null);
    }
  }

  // ── "Filtrer" button → commit draft + close ──
  function handleApply() {
    if (draftRange) {
      onChange(draftRange, draftPreset || undefined);
    }
    setOpen(false);
    setSelecting(null);
  }

  // Display range for calendar highlighting (from draft)
  const displayFrom = selecting
    ? (hovered && hovered < selecting ? hovered : selecting)
    : draftRange?.from || null;
  const displayTo = selecting
    ? (hovered && hovered > selecting ? hovered : selecting)
    : draftRange?.to || null;

  // Trigger label shows committed value
  const displayLabel = value
    ? `${formatShortDate(value.from)} — ${formatShortDate(value.to)}`
    : placeholder;

  // Can apply? Draft must differ from committed value or be non-null
  const hasDraft = draftRange !== null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => open ? handleDismiss() : handleOpen()}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
          open
            ? "border-teal-300 bg-white text-teal-700 ring-1 ring-teal-300"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        )}
      >
        <Calendar size={14} className={open ? "text-teal-600" : "text-gray-400"} />
        <span className="whitespace-nowrap">{displayLabel}</span>
      </button>

      {/* Bottom sheet (mobile) / Dropdown (desktop) */}
      {open && (
        <>
          {/* Backdrop — mobile only */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={handleDismiss}
          />

          <div
            ref={panelRef}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-xl",
              "animate-[slideUp_0.2s_ease-out] sm:animate-[scaleIn_0.15s_ease-out]",
              "max-h-[85vh] flex flex-col",
              "sm:absolute sm:inset-auto sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-[320px] sm:rounded-2xl sm:border sm:border-gray-200 sm:max-h-[70vh]"
            )}
          >
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-4">

            {/* Handle bar — mobile only */}
            <div className="mb-3 flex justify-center sm:hidden">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {/* Title — mobile only */}
            <div className="mb-4 flex items-center justify-between sm:hidden">
              <h3 className="text-base font-bold text-gray-900">Sélectionner une période</h3>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Presets */}
            {presets.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePresetClick(p)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:px-2.5 sm:py-1",
                      draftPreset === p.value
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="mb-3 border-t border-gray-100" />

            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 sm:p-1.5"
              >
                <ChevronLeft size={18} className="sm:h-4 sm:w-4" />
              </button>
              <span className="text-sm font-bold text-gray-900">
                {MOIS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 sm:p-1.5"
              >
                <ChevronRight size={18} className="sm:h-4 sm:w-4" />
              </button>
            </div>

            {/* Day names */}
            <div className="mb-1 grid grid-cols-7 text-center">
              {JOURS.map((j) => (
                <div key={j} className="py-1 text-xs font-medium text-gray-400 sm:text-[10px]">
                  {j}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`pad-${idx}`} />;

                const isToday = isSameDay(day, today);
                const isFuture = day > today;
                const isStart = displayFrom && isSameDay(day, displayFrom);
                const isEnd = displayTo && isSameDay(day, displayTo);
                const inRange = displayFrom && displayTo && isInRange(day, displayFrom, displayTo);
                const isSelectingStart = selecting && isSameDay(day, selecting);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isFuture}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => selecting && setHovered(day)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "relative flex h-11 w-full items-center justify-center text-sm font-medium transition-all sm:h-9 sm:text-xs",
                      isFuture && "cursor-not-allowed text-gray-300",
                      !isFuture && !isStart && !isEnd && !inRange && "text-gray-700 hover:bg-gray-100",
                      inRange && !isStart && !isEnd && "bg-teal-50 text-teal-700",
                      (isStart || isEnd) && "bg-teal-600 text-white",
                      isStart && "rounded-l-lg",
                      isEnd && "rounded-r-lg",
                      isStart && isEnd && "rounded-lg",
                      isSelectingStart && !isEnd && "bg-teal-600 text-white rounded-lg",
                      isToday && !isStart && !isEnd && !inRange && "font-bold text-teal-600"
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Hint text */}
            <div className="mt-3 text-center text-xs text-gray-400 sm:text-[10px]">
              {selecting
                ? "Sélectionne la date de fin"
                : draftRange
                  ? `${formatShortDate(draftRange.from)} — ${formatShortDate(draftRange.to)}`
                  : "Choisis un raccourci ou une plage de dates"}
            </div>

            {/* Desktop only: Filtrer inside scroll area */}
            <button
              type="button"
              disabled={!hasDraft || !!selecting}
              onClick={handleApply}
              className={cn(
                "mt-3 hidden w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-colors sm:flex",
                hasDraft && !selecting
                  ? "bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <SlidersHorizontal size={14} />
              Filtrer
            </button>

            </div>{/* end scrollable content */}

            {/* Mobile: sticky Filtrer button at bottom */}
            <div className="shrink-0 border-t border-gray-100 px-5 pb-5 pt-3 sm:hidden">
              <button
                type="button"
                disabled={!hasDraft || !!selecting}
                onClick={handleApply}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors",
                  hasDraft && !selecting
                    ? "bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                <SlidersHorizontal size={14} />
                Filtrer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export type { DateRange, Preset };
