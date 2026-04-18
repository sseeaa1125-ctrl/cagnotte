"use client";

import * as React from "react";
import {
  ArrowUpDown,
  Check,
  Clock,
  Flame,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CagnotteSortMode } from "@/lib/cagnotteSort";

export type SortMode = CagnotteSortMode;

interface SortOption {
  value: SortMode;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: "recent",
    label: "Les plus récentes",
    icon: Flame,
    description: "Ajoutées en dernier",
  },
  {
    value: "oldest",
    label: "Les plus anciennes",
    icon: Clock,
    description: "Lancées en premier",
  },
  {
    value: "raised_desc",
    label: "Ont levé le plus",
    icon: TrendingUp,
    description: "Montant récolté du plus haut",
  },
  {
    value: "raised_asc",
    label: "Ont levé le moins",
    icon: TrendingDown,
    description: "Montant récolté du plus bas",
  },
];

interface SortSelectProps {
  value: SortMode;
  onChange: (value: SortMode) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const firstOptionRef = React.useRef<HTMLButtonElement>(null);

  const selected = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];
  const SelectedIcon = selected.icon;

  // Close on outside click (desktop dropdown) + Esc for both modes.
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!triggerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // Lock body scroll when bottom sheet is open (mobile only — detected by
  // viewport width at the time of opening to avoid affecting desktop users
  // who never see the sheet).
  React.useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 640) return; // sm breakpoint
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first option for keyboard users
    firstOptionRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleSelect(next: SortMode) {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <div ref={triggerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Trier par : ${selected.label}`}
          className={cn(
            "group inline-flex h-10 items-center gap-1.5 rounded-full border bg-white px-3 text-sm font-semibold text-primary shadow-sm transition-all sm:h-11 sm:gap-2 sm:border-2 sm:px-4",
            "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-pink-100",
            open
              ? "border-primary ring-[3px] ring-pink-100"
              : "border-primary/30 hover:border-primary/60",
          )}
        >
          <ArrowUpDown
            size={14}
            strokeWidth={2.5}
            className="text-primary/70 transition-colors group-hover:text-primary sm:text-primary/60"
            aria-hidden
          />
          {/* Mobile: only a short "Trier" label to fit next to the chips.
              Desktop: "Trier par" label + the active option name. */}
          <span className="text-[13px] font-semibold text-primary sm:hidden">
            Trier
          </span>
          <span className="hidden text-xs font-medium text-gray-500 sm:inline">
            Trier par
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <SelectedIcon size={14} className="text-primary" aria-hidden />
            {selected.label}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className={cn(
              "ml-0.5 h-4 w-4 text-primary/60 transition-transform",
              open && "rotate-180",
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8l4 4 4-4" />
          </svg>
        </button>

        {/* Desktop dropdown — anchored to the trigger (sm: and up) */}
        {open ? (
          <ul
            role="listbox"
            aria-label="Trier les cagnottes"
            className="absolute right-0 z-20 mt-2 hidden min-w-[300px] origin-top-right animate-[sort-dropdown-in_160ms_ease-out] overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_12px_32px_rgba(23,40,102,0.12)] sm:block"
          >
            {SORT_OPTIONS.map((option, idx) => (
              <SortOptionRow
                key={option.value}
                ref={idx === 0 ? firstOptionRef : undefined}
                option={option}
                active={option.value === value}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        ) : null}
      </div>

      {/* Mobile bottom sheet — fixed, full-width, slide-up */}
      {open ? (
        <div className="sm:hidden" role="dialog" aria-modal="true" aria-label="Trier les cagnottes">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 animate-[fadeIn_180ms_ease-out] bg-primary/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* Sheet */}
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 animate-[sort-sheet-up_240ms_cubic-bezier(0.2,0.8,0.2,1)]",
              "rounded-t-[28px] bg-white shadow-[0_-12px_40px_rgba(23,40,102,0.18)]",
              "pb-[max(env(safe-area-inset-bottom),16px)]",
            )}
          >
            {/* Drag handle */}
            <div className="flex justify-center pb-1 pt-3" aria-hidden>
              <div className="h-1.5 w-12 rounded-full bg-gray-200" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2 pt-2">
              <h2 className="font-headings text-lg font-black text-primary">
                Trier par
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <X size={18} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            {/* Options */}
            <ul
              role="listbox"
              aria-label="Options de tri"
              className="flex flex-col gap-1 px-3 pb-4"
            >
              {SORT_OPTIONS.map((option, idx) => (
                <SortOptionRow
                  key={option.value}
                  ref={idx === 0 ? firstOptionRef : undefined}
                  option={option}
                  active={option.value === value}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          </div>
        </div>
      ) : null}

    </>
  );
}

interface SortOptionRowProps {
  option: SortOption;
  active: boolean;
  onSelect: (value: SortMode) => void;
}

const SortOptionRow = React.forwardRef<HTMLButtonElement, SortOptionRowProps>(
  function SortOptionRow({ option, active, onSelect }, ref) {
    const Icon = option.icon;
    return (
      <li>
        <button
          ref={ref}
          type="button"
          role="option"
          aria-selected={active}
          onClick={() => onSelect(option.value)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
            active ? "bg-pink" : "hover:bg-gray-50 active:bg-gray-100",
          )}
        >
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
              active ? "bg-white text-primary" : "bg-gray-100 text-primary/70",
            )}
          >
            <Icon size={17} aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-primary">
              {option.label}
            </span>
            <span className="block text-xs text-gray-500">
              {option.description}
            </span>
          </span>
          {active ? (
            <Check size={18} strokeWidth={3} className="text-primary" aria-hidden />
          ) : null}
        </button>
      </li>
    );
  },
);
