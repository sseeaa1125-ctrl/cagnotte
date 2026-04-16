"use client";

import * as React from "react";
import { ChevronDown, Power } from "lucide-react";
import { CREATOR_DETAIL_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CloseCagnotteButton } from "./CloseCagnotteButton";

interface DangerZoneCardProps {
  blockId: string;
  status: "active" | "closed";
}

// Creator-facing management card. Kept neutral (not a "danger zone") since
// closing / reopening a cagnotte is a reversible, routine action.
export function DangerZoneCard({ blockId, status }: DangerZoneCardProps) {
  const [open, setOpen] = React.useState(status === "closed");
  const helper =
    status === "closed"
      ? CREATOR_DETAIL_LABELS.dangerZoneHelperClosed
      : CREATOR_DETAIL_LABELS.dangerZoneHelper;

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-[0_1px_0_0_rgba(23,40,102,0.04),0_8px_24px_-16px_rgba(23,40,102,0.12)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-pink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex items-center gap-2.5 text-sm font-bold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink text-primary">
            <Power size={15} aria-hidden />
          </span>
          {CREATOR_DETAIL_LABELS.dangerZoneTitle}
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={cn(
            "text-primary/70 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 px-5 py-5">
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              {helper}
            </p>
            <CloseCagnotteButton blockId={blockId} status={status} />
          </div>
        </div>
      </div>
    </div>
  );
}
