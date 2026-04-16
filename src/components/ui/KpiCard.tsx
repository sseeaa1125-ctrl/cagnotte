import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: { value: number; direction: "up" | "down" };
  className?: string;
}

export function KpiCard({
  icon,
  label,
  value,
  trend,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-pink text-primary"
          aria-hidden
        >
          {icon}
        </div>
      </div>

      <p className="break-words font-headings text-xl font-black text-primary sm:text-2xl">
        {value}
      </p>

      {trend ? (
        <div
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold",
            trend.direction === "up" ? "text-trustpilot" : "text-red-500",
          )}
        >
          {trend.direction === "up" ? (
            <TrendingUp size={14} />
          ) : (
            <TrendingDown size={14} />
          )}
          <span>
            {trend.direction === "up" ? "+" : "-"}
            {Math.abs(trend.value)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
