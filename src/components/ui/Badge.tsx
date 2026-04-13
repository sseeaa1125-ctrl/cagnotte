import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "festive"
  | "solidaire"
  | "status-active"
  | "status-ended"
  | "default";

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  festive: "bg-gradient-to-r from-gold-start to-gold-end text-white",
  solidaire: "bg-accent text-primary",
  "status-active": "bg-trustpilot/20 text-trustpilot",
  "status-ended": "bg-muted text-muted-foreground",
  default: "bg-muted text-primary",
};

export function Badge({
  variant = "default",
  icon,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}
