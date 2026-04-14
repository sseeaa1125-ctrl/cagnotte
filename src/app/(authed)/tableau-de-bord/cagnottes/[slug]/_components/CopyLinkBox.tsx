"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { CREATOR_DETAIL_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 7 plan 07-01 — small client island used by the creator cagnotte
// detail page sidebar. Renders a readonly input pre-filled with the
// shareable public URL + a copy-to-clipboard button.
//
// Kept tiny so the bulk of the detail page can stay a server component.
// ─────────────────────────────────────────────────────────────────────────

interface CopyLinkBoxProps {
  url: string;
}

export function CopyLinkBox({ url }: CopyLinkBoxProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API blocked (incognito, old browser). Fall back to
      // selecting the input so the user can Ctrl/Cmd+C.
      const input = document.getElementById(
        "creator-detail-share-url",
      ) as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        id="creator-detail-share-url"
        type="text"
        value={url}
        readOnly
        className="min-h-12 w-full truncate rounded-xl border border-border bg-gray-50 px-3 py-3 font-mono text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-primary transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          copied && "border-green-500 text-green-700",
        )}
        aria-live="polite"
      >
        {copied ? (
          <>
            <Check size={16} aria-hidden />
            {CREATOR_DETAIL_LABELS.copyLinkSuccess}
          </>
        ) : (
          <>
            <Copy size={16} aria-hidden />
            {CREATOR_DETAIL_LABELS.copyLinkCta}
          </>
        )}
      </button>
    </div>
  );
}
