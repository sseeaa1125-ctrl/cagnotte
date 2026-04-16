import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  cta?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  cta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:py-12",
        className,
      )}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground sm:h-16 sm:w-16"
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="font-headings text-lg font-semibold text-primary">
        {title}
      </h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {cta ? <div className="mt-2">{cta}</div> : null}
    </div>
  );
}
