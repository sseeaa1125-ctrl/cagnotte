import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopBannerProps {
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  onClose: () => void;
  className?: string;
}

export function TopBanner({
  message,
  ctaLabel,
  ctaHref,
  onClose,
  className,
}: TopBannerProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-3 bg-pink px-4 py-3 text-sm text-primary",
        className,
      )}
      role="status"
    >
      <p className="flex-1 text-center font-medium">
        {message}
        {ctaLabel && ctaHref ? (
          <>
            {" "}
            <a
              href={ctaHref}
              className="underline underline-offset-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            >
              {ctaLabel}
            </a>
          </>
        ) : null}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Fermer la bannière"
      >
        <X size={20} />
      </button>
    </div>
  );
}
