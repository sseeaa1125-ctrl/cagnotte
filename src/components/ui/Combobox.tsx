"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 7 plan 07-03 — <Combobox> dropdown primitive.
//
// Ring 1 PURE: no imports from @/lib/api, @/lib/useApi, @/lib/constants or
// @/contexts/*. The parent supplies the options array (with optional
// icon + separatorBefore per item) and a controlled value.
//
// Visual reference:
// .planning/banani/screens/phase-7/festive-occasion-dropdown-open.md
//
// The trigger shell matches the restyled DatePicker / Calendar (rounded-xl
// border-gray-300 bg-white navy hover). The popover is hand-rolled: a
// plain absolutely-positioned <div> with role="listbox" and per-option
// buttons. Click-outside + Escape close; selected state shows a navy Check.
// ─────────────────────────────────────────────────────────────────────────

export interface ComboboxOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  separatorBefore?: boolean;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  helper?: string;
  name?: string;
  id?: string;
  className?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  label,
  error,
  helper,
  id,
  className,
}: ComboboxProps) {
  const reactId = React.useId();
  const fieldId = id ?? reactId;
  const [open, setOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const selected = React.useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  );

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
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function selectOption(opt: ComboboxOption) {
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

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
          aria-haspopup="listbox"
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
              "flex min-w-0 flex-1 items-center gap-3 truncate text-base font-medium",
              selected ? "text-primary" : "text-gray-500",
            )}
          >
            {selected?.icon}
            <span className="truncate">
              {selected?.label ??
                placeholder ??
                "Sélectionne une option…"}
            </span>
          </span>
          <ChevronDown
            size={20}
            aria-hidden
            className={cn(
              "flex-shrink-0 text-gray-500 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open ? (
          <div
            ref={popoverRef}
            role="listbox"
            className="absolute z-50 mt-2 max-h-[min(60vh,400px)] w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-gray-200 bg-white py-2 shadow-xl"
          >
            {options.map((opt) => (
              <React.Fragment key={opt.value}>
                {opt.separatorBefore ? (
                  <div
                    className="mx-4 my-1 h-px bg-gray-100"
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  onClick={() => selectOption(opt)}
                  className="group flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left font-bold text-primary transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  <Check
                    size={20}
                    aria-hidden
                    className={cn(
                      "flex-shrink-0 transition-opacity",
                      value === opt.value
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-30",
                    )}
                  />
                </button>
              </React.Fragment>
            ))}
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
