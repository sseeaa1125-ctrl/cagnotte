import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
}

function getPageItems(page: number, pageCount: number): (number | "...")[] {
  const items: (number | "...")[] = [];
  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) items.push(i);
    return items;
  }
  items.push(1);
  if (page > 3) items.push("...");
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  for (let i = start; i <= end; i++) items.push(i);
  if (page < pageCount - 2) items.push("...");
  items.push(pageCount);
  return items;
}

export function Pagination({
  page,
  pageCount,
  onChange,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const items = getPageItems(page, pageCount);
  const canPrev = page > 1;
  const canNext = page < pageCount;

  return (
    <nav
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => canPrev && onChange(page - 1)}
        disabled={!canPrev}
        className="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-border text-primary hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Page précédente"
      >
        <ChevronLeft size={18} />
      </button>

      {items.map((item, idx) =>
        item === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex min-h-10 min-w-10 items-center justify-center text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "flex min-h-10 min-w-10 items-center justify-center rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              item === page
                ? "bg-primary text-primary-foreground"
                : "border border-border text-primary hover:bg-muted",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => canNext && onChange(page + 1)}
        disabled={!canNext}
        className="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-border text-primary hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Page suivante"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
