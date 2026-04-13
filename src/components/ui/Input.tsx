"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  className?: string;
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export function Input({
  className,
  label,
  error,
  helper,
  icon,
  showPasswordToggle,
  type = "text",
  id,
  ...props
}: InputProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;
  const isPassword = type === "password";
  const canToggle = showPasswordToggle ?? isPassword;
  const [revealed, setRevealed] = React.useState(false);
  const effectiveType = canToggle && revealed ? "text" : type;

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
        {icon ? (
          <span className="pointer-events-none absolute left-3 flex h-5 w-5 items-center justify-center text-muted-foreground">
            {icon}
          </span>
        ) : null}

        <input
          id={inputId}
          type={effectiveType}
          className={cn(
            "min-h-12 w-full rounded-lg border bg-background px-4 py-3 text-base text-primary placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            icon && "pl-10",
            canToggle && "pr-12",
            error ? "border-red-500" : "border-border",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helper ? `${inputId}-desc` : undefined}
          {...props}
        />

        {canToggle ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="absolute right-1 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={
              revealed
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
          >
            {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
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
