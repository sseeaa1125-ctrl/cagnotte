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

// Phase 8 fixpack — each variant now owns its own full class string so the
// "status-active" badge can deviate from the pill defaults (Banani
// creator-cagnotte-detail-v2 reference: tight green label, rounded-md,
// text-xs font-bold, px-2 py-1 — NOT a pill and NOT text-sm).
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  festive:
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-gradient-to-r from-gold-start to-gold-end text-white",
  solidaire:
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-accent text-primary",
  "status-active":
    "inline-block rounded-md px-2 py-1 text-xs font-bold bg-green-100 text-green-700",
  "status-ended":
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-muted text-muted-foreground",
  default:
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-muted text-primary",
};

export function Badge({
  variant = "default",
  icon,
  children,
  className,
}: BadgeProps) {
  return (
    <span className={cn(VARIANT_CLASSES[variant], className)}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}
