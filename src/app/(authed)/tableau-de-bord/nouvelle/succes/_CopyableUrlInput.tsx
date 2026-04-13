"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui";
import { SUCCESS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Read-only URL pill + Copier button. Success-page helper — lives inline
// instead of bloating the ShareSheet primitive.

export function CopyableUrlInput({ url }: { url: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast(SUCCESS_LABELS.copiedToast, "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may be unavailable in some in-app browsers
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-muted/40 py-2 pl-4 pr-2",
      )}
    >
      <input
        type="text"
        readOnly
        value={url}
        aria-label={SUCCESS_LABELS.shareableUrlLabel}
        className="min-h-11 flex-1 truncate bg-transparent text-sm text-primary focus-visible:outline-none"
      />
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          copied
            ? "bg-trustpilot/10 text-trustpilot"
            : "bg-primary text-primary-foreground hover:bg-primary-hover",
        )}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? SUCCESS_LABELS.copiedToast : SUCCESS_LABELS.copyCta}
      </button>
    </div>
  );
}
