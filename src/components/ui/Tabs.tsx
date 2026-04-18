import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /**
   * Alignment of the tab list.
   * - "start" (default): left-aligned on all breakpoints
   * - "center": centered on all breakpoints
   * - "center-mobile": centered on mobile, left-aligned on sm+
   */
  align?: "start" | "center" | "center-mobile";
}

export function Tabs({ tabs, value, onChange, className, align = "start" }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-hide",
        align === "center" && "justify-center",
        align === "center-mobile" && "justify-center sm:justify-start",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex min-h-12 flex-shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors md:min-h-10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="ml-1 opacity-70">({tab.count})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
