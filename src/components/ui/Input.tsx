"use client";

import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--theme-modal-text-muted, #374151)" }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          "w-full rounded-xl border px-4 py-3 text-sm placeholder:opacity-60",
          "focus:outline-none focus:ring-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        style={{
          backgroundColor: "var(--theme-input-bg, #FFFFFF)",
          borderColor: error ? undefined : "var(--theme-input-border, #D1D5DB)",
          color: "var(--theme-input-text, #111827)",
          ...(error ? {} : { "--tw-ring-color": "var(--theme-primary, #0D9488)" } as React.CSSProperties),
        }}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}
