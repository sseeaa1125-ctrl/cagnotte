"use client";

import { useEffect, useState } from "react";
import { CampaignCard } from "@/components/cagnottes/CampaignCard";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

// Client island that wraps Phase 3 <CampaignCard /> and hydrates the
// progress (raised + donorCount) from GET /api/blocks/:id/progress after
// first paint. The card itself stays Ring-2 pure: it only receives props.
//
// GET /api/blocks/:id/progress is public but now returns REAL numbers to
// the owner (detected via izy-token cookie) and null for hideAmount /
// hideDonors to anonymous callers. Since this card renders inside the
// creator dashboard, `api()` forwards the cookie automatically and the
// owner always sees their real totals regardless of privacy flags.

interface ProgressPayload {
  goalAmount: number;
  collected: number | null;
  donorCount: number | null;
  percentage: number | null;
  endDate: string | null;
  hideAmount: boolean;
  hideDonors: boolean;
}

interface ClientCampaignCardProps {
  block: {
    id: string;
    slug: string | null;
    title: string;
    config: Record<string, unknown>;
  };
}

export function ClientCampaignCard({ block }: ClientCampaignCardProps) {
  const cfg = block.config || {};
  const subtype =
    (cfg.subtype as "festive" | "solidaire" | undefined) ?? "festive";
  const coverUrl = (cfg.coverUrl as string | null) ?? null;
  const goalAmount = (cfg.goalAmount as number | undefined) ?? 0;
  const endDate = (cfg.endDate as string | null | undefined) ?? null;

  const [progress, setProgress] = useState<ProgressPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<ProgressPayload>(
          `/api/blocks/${block.id}/progress`,
        );
        if (!cancelled) setProgress(data);
      } catch (err) {
        // Silent fail — the card still renders with zeros. A 404 means
        // the block just got deleted between list + progress, which is
        // fine.
        if (err instanceof ApiError) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [block.id]);

  // Owner always sees real numbers — the backend unmasks when the izy-token
  // cookie matches the block's sellerId. No client-side masking.
  const raised = progress?.collected ?? 0;
  const donorCount = progress?.donorCount ?? 0;
  const loading = progress === null;

  return (
    <div
      className={cn("h-full", loading && "animate-pulse")}
      aria-busy={loading || undefined}
    >
      <CampaignCard
        cagnotte={{
          slug: block.slug ?? block.id,
          title: block.title,
          coverUrl,
          subtype,
          raised,
          goal: goalAmount,
          donorCount,
          endDate,
        }}
        // Phase 7 plan 07-01 — dashboard cards route to the creator
        // detail page, NOT the donor-facing /c/[slug] page.
        linkVariant="creator"
      />
    </div>
  );
}
