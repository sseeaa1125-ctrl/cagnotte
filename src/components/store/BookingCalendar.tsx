"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";

interface BookingSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  specificDate?: string | null;
}

interface BookingCalendarProps {
  slots: BookingSlot[];
  sellerTimezone: string;
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}

const MAX_FUTURE_DAYS = 90;

// UI6: Semaine commence le lundi (Afrique francophone)
const JOURS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // UI6: Monday-first → getDay() returns 0=Sun, convert to 0=Mon
  const startPad = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = [];

  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Africa/Dakar";
  }
}

function getGMTOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart?.value || "GMT";
  } catch {
    return "GMT";
  }
}

export function BookingCalendar({
  slots,
  sellerTimezone,
  onSelectDate,
  selectedDate,
}: BookingCalendarProps) {
  const [today] = useState(() => new Date());
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + MAX_FUTURE_DAYS);
    return d;
  }, [today]);
  // Initialize view to the selected date's month if available, otherwise today
  const initialDate = selectedDate ? new Date(selectedDate + "T12:00:00") : today;
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());

  const userTz = useMemo(() => detectUserTimezone(), []);
  const sellerGMT = useMemo(() => getGMTOffset(sellerTimezone), [sellerTimezone]);
  const userGMT = useMemo(() => getGMTOffset(userTz), [userTz]);
  const showTzDiff = sellerTimezone !== userTz;

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // UX4: Support both recurring (dayOfWeek) and specificDate slots
  const { recurringDays, specificDates } = useMemo(() => {
    const recurring = new Set<number>();
    const specific = new Set<string>();
    slots.forEach((s) => {
      if (s.specificDate) {
        specific.add(formatDateKey(new Date(s.specificDate)));
      } else {
        recurring.add(s.dayOfWeek);
      }
    });
    return { recurringDays: recurring, specificDates: specific };
  }, [slots]);

  function isDayAvailable(d: Date): boolean {
    if (d < today && formatDateKey(d) !== formatDateKey(today)) return false;
    if (d > maxDate) return false;
    const dateKey = formatDateKey(d);
    return recurringDays.has(d.getDay()) || specificDates.has(dateKey);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  return (
    <div className="space-y-3">
      {/* GMT indicator — only shown when user timezone differs from seller */}
      {showTzDiff && (
        <div
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px]"
          style={{
            backgroundColor: "var(--theme-input-bg, #F9FAFB)",
            color: "var(--theme-modal-text-muted, #6B7280)",
            border: "1px solid var(--theme-modal-border, #E5E7EB)",
          }}
        >
          <Globe size={10} />
          <span>
            Heure du vendeur : {sellerGMT} · Toi : {userGMT}
          </span>
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="rounded-lg p-1.5 transition-colors disabled:opacity-30"
          style={{ color: "var(--theme-modal-text, #111827)" }}
          aria-label="Mois précédent"
        >
          <ChevronLeft size={16} />
        </button>
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--theme-modal-text, #111827)" }}
        >
          {MOIS_FR[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="rounded-lg p-1.5 transition-colors disabled:opacity-30"
          style={{ color: "var(--theme-modal-text, #111827)" }}
          aria-label="Mois suivant"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {JOURS_FR.map((j) => (
          <div
            key={j}
            className="text-[10px] font-medium"
            style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}
          >
            {j}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} />;

          const dateKey = formatDateKey(day);
          const available = isDayAvailable(day);
          const isSelected = selectedDate === dateKey;
          const isToday = formatDateKey(day) === formatDateKey(today);

          return (
            <button
              key={dateKey}
              disabled={!available}
              onClick={() => onSelectDate(dateKey)}
              className="flex h-10 w-full items-center justify-center rounded-lg text-xs font-medium transition-all active:scale-95"
              style={{
                backgroundColor: isSelected
                  ? "var(--theme-primary, #0D9488)"
                  : "transparent",
                color: isSelected
                  ? "var(--theme-primary-contrast, #FFFFFF)"
                  : available
                    ? "var(--theme-modal-text, #111827)"
                    : "var(--theme-modal-text-muted, #D1D5DB)",
                border: isToday && !isSelected
                  ? "1.5px solid var(--theme-primary, #0D9488)"
                  : "1.5px solid transparent",
                opacity: available ? 1 : 0.35,
                cursor: available ? "pointer" : "default",
              }}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
