import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className" | "size"> {
  className?: string;
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
  placeholder?: string;
  /** Compact size for admin/dense layouts */
  compact?: boolean;
}

export function Select({
  className,
  label,
  error,
  helper,
  options,
  placeholder,
  compact,
  id,
  ...props
}: SelectProps) {
  const reactId = React.useId();
  const selectId = id ?? reactId;

  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "w-auto" : "w-full")}>
      {label ? (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-primary"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "appearance-none rounded-lg border bg-background text-primary",
            compact ? "w-auto" : "w-full",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            compact
              ? "min-h-9 py-1.5 pl-3 pr-8 text-sm"
              : "min-h-12 py-3 pl-4 pr-10 text-base",
            error ? "border-red-500" : "border-border",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error || helper ? `${selectId}-desc` : undefined
          }
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={compact ? 14 : 18}
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
            compact ? "right-2" : "right-3",
          )}
        />
      </div>

      {error ? (
        <p id={`${selectId}-desc`} className="text-xs text-red-500">
          {error}
        </p>
      ) : helper ? (
        <p id={`${selectId}-desc`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
