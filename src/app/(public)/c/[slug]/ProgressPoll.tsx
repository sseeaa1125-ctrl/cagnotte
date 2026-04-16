"use client";

import * as React from "react";
import { AnimatedProgressBar } from "@/components/ui";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { computeProgress } from "@/lib/progress";

interface ProgressPollProps {
  slug: string;
  initialTotalRaised: number;
  initialDonorCount: number;
  goalAmount: number;
  hideAmount: boolean;
  hideDonors: boolean;
}

interface CagnotteDetailResponse {
  totalRaised: number | null;
  donorCount: number | null;
}

const POLL_INTERVAL_MS = 20_000;

// Phase 10 v3 — Full progress card for the detail page sticky sidebar.
// Renders the amount + AnimatedProgressBar + percent/participations row,
// all wired to a 20s visibility-aware poll of /api/cagnottes/:slug so the
// sidebar stays live while the tab is focused. The underlying
// AnimatedProgressBar replays its mount animation the first time and
// then glides to each new target via a CSS width transition.
export function ProgressPoll({
  slug,
  initialTotalRaised,
  initialDonorCount,
  goalAmount,
  hideAmount,
  hideDonors,
}: ProgressPollProps) {
  const [totalRaised, setTotalRaised] = React.useState(initialTotalRaised);
  const [donorCount, setDonorCount] = React.useState(initialDonorCount);

  React.useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      try {
        const fresh = await api<CagnotteDetailResponse>(
          `/api/cagnottes/${slug}`,
        );
        if (cancelled || !fresh) return;
        if (typeof fresh.totalRaised === "number") {
          setTotalRaised(fresh.totalRaised);
        }
        if (typeof fresh.donorCount === "number") {
          setDonorCount(fresh.donorCount);
        }
      } catch {
        // silent — polling is best-effort
      }
    };

    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [slug]);

  const { percent, barWidth } = computeProgress(totalRaised, goalAmount);

  return (
    <div className="mb-8">
      {!hideAmount ? (
        // Stacked layout — prevents truncation at every width. The
        // amount uses clamp() so it scales smoothly between 24px (375px
        // mobile) and 36px (desktop sticky sidebar), and tabular-nums
        // keeps digit widths consistent while it animates via polling.
        <div className="mb-3 flex flex-col gap-1">
          <span className="break-words font-headings font-black leading-[1.1] text-primary tabular-nums text-[clamp(1.5rem,5vw,2.25rem)]">
            {formatPrice(totalRaised)}
          </span>
          {goalAmount > 0 ? (
            <span className="text-sm font-medium text-gray-500">
              sur {formatPrice(goalAmount)}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mb-3 text-sm italic text-gray-500">
          Montant masqué par le créateur
        </p>
      )}

      <AnimatedProgressBar percent={barWidth} />

      <div className="mt-3 flex items-center justify-between text-xs font-bold sm:text-sm">
        {goalAmount > 0 ? (
          <span className="text-primary">{percent}% de l&apos;objectif</span>
        ) : (
          <span />
        )}
        {!hideDonors ? (
          <span className="text-gray-500">
            {donorCount} participation{donorCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}
