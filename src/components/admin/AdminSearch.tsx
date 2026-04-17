"use client";

/**
 * AdminSearch — reusable server-side search input for admin list pages.
 *
 * Features:
 * - 300ms debounce (no request on every keystroke)
 * - Search icon with subtle animation on focus
 * - Clear button (X) when text is present
 * - Responsive: full-width on mobile, flex-1 on desktop
 * - Returns debounced value via onChange callback
 */

import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

export function AdminSearch({
  value,
  onChange,
  placeholder = "Rechercher...",
  loading = false,
  className,
}: AdminSearchProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync external value changes (e.g. from URL params)
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // 300ms debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  function handleClear() {
    setLocalValue("");
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-xl border bg-white transition-all",
        focused
          ? "border-primary ring-2 ring-primary/10 shadow-sm"
          : "border-gray-200 hover:border-gray-300",
        className,
      )}
    >
      {/* Search icon */}
      <div className="pointer-events-none flex h-full items-center pl-3.5">
        {loading ? (
          <Loader2
            size={18}
            className="animate-spin text-primary"
          />
        ) : (
          <Search
            size={18}
            className={cn(
              "transition-colors",
              focused ? "text-primary" : "text-gray-400",
            )}
          />
        )}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="min-h-[42px] w-full bg-transparent px-3 py-2.5 text-sm text-primary placeholder:text-gray-400 outline-none"
        autoComplete="off"
        spellCheck={false}
      />

      {/* Clear button */}
      {localValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="flex h-full items-center pr-3 text-gray-400 transition-colors hover:text-primary"
          aria-label="Effacer la recherche"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
