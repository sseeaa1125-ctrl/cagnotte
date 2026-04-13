import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrustpilotBadgeProps {
  rating?: number;
  reviewCount?: number;
  className?: string;
}

export function TrustpilotBadge({
  rating = 4.8,
  reviewCount = 127,
  className,
}: TrustpilotBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2",
        className,
      )}
      aria-label={`Trustpilot ${rating.toFixed(1)} sur 5 — ${reviewCount} avis`}
    >
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            className="fill-trustpilot text-trustpilot"
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-trustpilot">
        {rating.toFixed(1)} / 5
      </span>
      <span className="text-xs text-muted-foreground">
        {"("}
        {reviewCount}
        {" avis)"}
      </span>
    </div>
  );
}
