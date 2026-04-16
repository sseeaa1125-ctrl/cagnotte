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

// Phase 10 polish — plain pink strip, text + inline underlined link CTA
// (no pill button). Decorative mark is a small navy circle badge holding
// the lowercase "c" from the cagnotte.sn wordmark — stays on-brand and
// avoids ornamental icons (see feedback memory: never use Sparkles).
export function TopBanner({
  message,
  ctaLabel,
  ctaHref,
  onClose,
  className,
}: TopBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "relative w-full bg-pink text-primary",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <span
          aria-hidden
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-headings text-sm font-black lowercase text-primary-foreground sm:flex"
        >
          c
        </span>

        <p className="flex-1 text-center text-sm font-medium leading-snug">
          {message}
          {ctaLabel && ctaHref ? (
            <>
              {" "}
              <a
                href={ctaHref}
                className="font-semibold underline underline-offset-2 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              >
                {ctaLabel}
              </a>
            </>
          ) : null}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Fermer la bannière"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
