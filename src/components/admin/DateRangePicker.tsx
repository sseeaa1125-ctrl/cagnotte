"use client";

import { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
}

const PRESETS = [
  { label: "7j", days: 7 },
  { label: "30j", days: 30 },
  { label: "90j", days: 90 },
  { label: "1an", days: 365 },
] as const;

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function DateRangePicker({ dateFrom, dateTo, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  // Local state — changes only propagate on "Appliquer" or preset click
  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);

  // Sync local state when parent changes (e.g. reset from outside)
  useEffect(() => { setLocalFrom(dateFrom); }, [dateFrom]);
  useEffect(() => { setLocalTo(dateTo); }, [dateTo]);

  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    const f = toDateStr(from);
    const t = toDateStr(to);
    setLocalFrom(f);
    setLocalTo(t);
    onChange(f, t);
    setOpen(false);
  };

  const handleApply = () => {
    onChange(localFrom, localTo);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalFrom("");
    setLocalTo("");
    onChange("", "");
    setOpen(false);
  };

  const hasFilter = dateFrom && dateTo;

  const label =
    dateFrom && dateTo
      ? `${new Date(dateFrom).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} — ${new Date(dateTo).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`
      : "Filtrer par date";

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
            hasFilter
              ? "border-teal-500/40 bg-teal-500/10 text-teal-400 hover:bg-teal-500/15"
              : "border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:border-gray-600"
          }`}
        >
          <Calendar size={14} />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">Dates</span>
        </button>
        {hasFilter && (
          <button
            onClick={handleReset}
            className="rounded-lg p-2 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            title="Réinitialiser"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-2xl">
            <p className="text-xs font-medium text-gray-400 mb-3">Période rapide</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => applyPreset(p.days)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-xs font-medium text-gray-300 hover:bg-teal-600/20 hover:text-teal-400 hover:border-teal-500/30 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="h-px bg-gray-800 mb-4" />

            <p className="text-xs font-medium text-gray-400 mb-3">Période personnalisée</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Du</label>
                <input
                  type="date"
                  value={localFrom}
                  max={localTo || undefined}
                  onChange={(e) => setLocalFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Au</label>
                <input
                  type="date"
                  value={localTo}
                  min={localFrom || undefined}
                  onChange={(e) => setLocalTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={handleApply}
                disabled={!localFrom || !localTo}
                className="flex-1 rounded-xl bg-teal-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Appliquer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
