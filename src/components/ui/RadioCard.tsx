"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon,
  disabled,
  className,
}: RadioCardProps) {
  return (
    <label
      className={cn(
        "relative flex min-h-20 cursor-pointer items-center gap-4 rounded-xl border bg-background p-4 transition-colors",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        checked
          ? "border-primary bg-pink/20 ring-2 ring-primary/30"
          : "border-border hover:border-primary/50",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="sr-only"
      />

      {icon ? (
        <span
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
            checked
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
      ) : null}

      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-primary">{title}</span>
        {description ? (
          <span className="text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>

      <span
        className={cn(
          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked ? "border-primary" : "border-border",
        )}
        aria-hidden
      >
        {checked ? (
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        ) : null}
      </span>
    </label>
  );
}
