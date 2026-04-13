import * as React from "react";
import { ProgressBar } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MiniCagnotteCardProps {
  cagnotte: {
    title: string;
    coverUrl: string | null;
    raised: number;
    goal: number;
    subtype: "festive" | "solidaire";
  };
  className?: string;
}

export function MiniCagnotteCard({
  cagnotte,
  className,
}: MiniCagnotteCardProps) {
  const { title, coverUrl, raised, goal, subtype } = cagnotte;
  const percent = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-background p-3",
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-pink">
            <span
              className="font-headings text-lg font-bold text-primary/40"
              aria-hidden
            >
              {title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-sm font-semibold text-primary">{title}</p>
        <ProgressBar
          value={percent}
          color={subtype === "festive" ? "gold" : "primary"}
        />
        <p className="text-xs text-muted-foreground">
          {formatPrice(raised)} / {formatPrice(goal)}
        </p>
      </div>
    </div>
  );
}
