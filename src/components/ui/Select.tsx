import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  className?: string;
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  className,
  label,
  error,
  helper,
  options,
  placeholder,
  id,
  ...props
}: SelectProps) {
  const reactId = React.useId();
  const selectId = id ?? reactId;

  return (
    <div className="flex w-full flex-col gap-1.5">
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
            "min-h-12 w-full appearance-none rounded-lg border bg-background py-3 pl-4 pr-10 text-base text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
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
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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
