import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

export interface SidebarNavProps {
  items: SidebarNavItem[];
  className?: string;
}

export function SidebarNav({ items, className }: SidebarNavProps) {
  return (
    <nav
      className={cn("flex flex-col gap-1", className)}
      aria-label="Navigation secondaire"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            item.active
              ? "bg-pink font-semibold text-primary"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center",
              item.active ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden
          >
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
