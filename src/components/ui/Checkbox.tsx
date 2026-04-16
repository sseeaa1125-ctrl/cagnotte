"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  error,
  disabled,
  className,
  id,
  name,
}: CheckboxProps) {
  const reactId = React.useId();
  const checkboxId = id ?? reactId;

  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      <label
        htmlFor={checkboxId}
        className={cn(
          "flex min-h-12 cursor-pointer items-center gap-3 py-2",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
          <input
            id={checkboxId}
            name={name}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
            aria-invalid={error ? true : undefined}
          />
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2",
              checked
                ? "border-primary bg-primary text-primary-foreground"
                : error
                  ? "border-red-500 bg-background"
                  : "border-border bg-background",
            )}
            aria-hidden
          >
            {checked ? <Check size={16} strokeWidth={3} /> : null}
          </span>
        </span>

        {label ? (
          <span className="text-sm text-primary">{label}</span>
        ) : null}
      </label>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
