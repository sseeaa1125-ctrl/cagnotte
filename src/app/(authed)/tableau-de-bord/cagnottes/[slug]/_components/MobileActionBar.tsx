"use client";

import * as React from "react";
import { Settings, Share2 } from "lucide-react";
import { CREATOR_DETAIL_LABELS } from "@/lib/constants";
import { ShareSheet } from "./ShareSheet";

interface MobileActionBarProps {
  slug: string;
  title: string;
  shareUrl: string;
}

export function MobileActionBar({ slug, title, shareUrl }: MobileActionBarProps) {
  const [shareOpen, setShareOpen] = React.useState(false);

  return (
    <>
      {/* Audit 024 HIGH-1: floats ABOVE the global BottomNav (h-16 = 4rem +
          iOS safe-area-inset-bottom). Previously this bar was bottom-0 z-30
          which put it underneath the new z-40 BottomNav, making the "Gérer"
          and "Partager" CTAs untappable on mobile. */}
      <div
        className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 pb-3 md:hidden"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="pointer-events-auto flex w-full max-w-md items-stretch gap-2 rounded-2xl border border-border/60 bg-white/95 p-2 shadow-[0_8px_32px_-12px_rgba(23,40,102,0.25)] backdrop-blur-md">
          <a
            href={`/tableau-de-bord/cagnottes/${slug}/modifier`}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-3 text-sm font-bold text-primary transition-colors hover:bg-muted active:scale-[0.98]"
          >
            <Settings size={16} aria-hidden />
            {CREATOR_DETAIL_LABELS.manageCta}
          </a>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <Share2 size={16} aria-hidden />
            {CREATOR_DETAIL_LABELS.shareCta}
          </button>
        </div>
      </div>
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={title}
      />
    </>
  );
}
