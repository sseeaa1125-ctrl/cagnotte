"use client";

import * as React from "react";
import { ProgressBar } from "@/components/ui";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";

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

  const percent =
    goalAmount > 0
      ? Math.min(100, Math.round((totalRaised / goalAmount) * 100))
      : 0;

  return (
    <div className="space-y-3">
      {!hideAmount && (
        <div>
          <p className="font-headings text-2xl font-bold text-primary">
            {formatPrice(totalRaised)}
          </p>
          <p className="text-sm text-muted-foreground">
            collectés sur {formatPrice(goalAmount)}
          </p>
        </div>
      )}
      <ProgressBar value={percent} />
      {!hideDonors && (
        <p className="text-sm text-muted-foreground">
          {donorCount} {donorCount === 1 ? "participant" : "participants"}
        </p>
      )}
    </div>
  );
}
