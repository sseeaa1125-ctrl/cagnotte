"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  className?: string;
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
  className,
}: DatePickerProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-primary"
        >
          {label}
        </label>
      ) : null}

      <div className="relative flex items-center">
        <input
          id={inputId}
          name={name}
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          disabled={disabled}
          className={cn(
            "min-h-12 w-full rounded-lg border bg-background px-4 py-3 text-base text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            clearable && value ? "pr-12" : "",
            error ? "border-red-500" : "border-border",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error || helper ? `${inputId}-desc` : undefined
          }
        />
        {clearable && value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Effacer la date"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={`${inputId}-desc`} className="text-xs text-red-500">
          {error}
        </p>
      ) : helper ? (
        <p id={`${inputId}-desc`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
