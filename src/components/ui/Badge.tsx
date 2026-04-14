import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "festive"
  | "solidaire"
  | "status-active"
  | "status-closed"
  | "status-ended"
  | "default";

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  festive:
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-gradient-to-r from-gold-start to-gold-end text-white",
  solidaire:
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-accent text-primary",
  "status-active":
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-green-100 text-green-700 w-fit",
  "status-closed":
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-600 w-fit",
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
