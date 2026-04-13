import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressColor = "primary" | "gold";

export interface ProgressBarProps {
  value: number;
  label?: string;
  raisedLabel?: string;
  goalLabel?: string;
  color?: ProgressColor;
  className?: string;
}

const FILL_CLASSES: Record<ProgressColor, string> = {
  primary: "bg-primary",
  gold: "bg-gradient-to-r from-gold-start to-gold-end",
};

export function ProgressBar({
  value,
  label,
  raisedLabel,
  goalLabel,
  color = "primary",
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {label ? (
        <p className="text-sm font-medium text-primary">{label}</p>
      ) : null}

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            FILL_CLASSES[color],
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>

      {raisedLabel || goalLabel ? (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          {raisedLabel ? (
            <span className="font-semibold text-primary">{raisedLabel}</span>
          ) : (
            <span />
          )}
          {goalLabel ? (
            <span className="text-muted-foreground">{goalLabel}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
