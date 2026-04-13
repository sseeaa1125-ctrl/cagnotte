"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  className?: string;
  label?: string;
  error?: string;
  helper?: string;
}

export function Textarea({
  className,
  label,
  error,
  helper,
  maxLength,
  value,
  id,
  ...props
}: TextareaProps) {
  const reactId = React.useId();
  const textareaId = id ?? reactId;
  const currentLength =
    typeof value === "string"
      ? value.length
      : typeof value === "number"
        ? String(value).length
        : 0;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-primary"
        >
          {label}
        </label>
      ) : null}

      <textarea
        id={textareaId}
        value={value}
        maxLength={maxLength}
        className={cn(
          "min-h-28 w-full resize-y rounded-lg border bg-background px-4 py-3 text-base text-primary placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          error ? "border-red-500" : "border-border",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error || helper ? `${textareaId}-desc` : undefined
        }
        {...props}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-h-4 flex-1">
          {error ? (
            <p id={`${textareaId}-desc`} className="text-xs text-red-500">
              {error}
            </p>
          ) : helper ? (
            <p
              id={`${textareaId}-desc`}
              className="text-xs text-muted-foreground"
            >
              {helper}
            </p>
          ) : null}
        </div>
        {maxLength ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            {currentLength}/{maxLength}
          </p>
        ) : null}
      </div>
    </div>
  );
}
