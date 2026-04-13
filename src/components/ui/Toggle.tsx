"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
  id,
}: ToggleProps) {
  const reactId = React.useId();
  const toggleId = id ?? reactId;

  return (
    <div
      className={cn(
        "flex min-h-12 w-full items-center justify-between gap-4",
        disabled && "opacity-60",
        className,
      )}
    >
      {label || description ? (
        <label htmlFor={toggleId} className="flex flex-1 cursor-pointer flex-col gap-0.5">
          {label ? (
            <span className="text-sm font-medium text-primary">{label}</span>
          ) : null}
          {description ? (
            <span className="text-xs text-muted-foreground">{description}</span>
          ) : null}
        </label>
      ) : null}

      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}
