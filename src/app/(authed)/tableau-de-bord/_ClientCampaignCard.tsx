"use client";

import { useEffect, useState } from "react";
import { CampaignCard } from "@/components/cagnottes/CampaignCard";
import { api, ApiError } from "@/lib/api";

// Client island that wraps Phase 3 <CampaignCard /> and hydrates the
// progress (raised + donorCount) from GET /api/blocks/:id/progress after
// first paint. The card itself stays Ring-2 pure: it only receives props.
//
// GET /api/blocks (authed) does NOT return raised/donorCount — those live
// on GET /api/blocks/:id/progress, which is public (no auth header needed).
// We intentionally parallelize by letting each card fetch itself; the
// browser handles the concurrency + any retries.

interface ProgressPayload {
  goalAmount: number;
  collected: number;
  donorCount: number;
  percentage: number;
  endDate: string | null;
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
  const hideAmount = (cfg.hideAmount as boolean | undefined) ?? false;
  const hideDonors = (cfg.hideDonors as boolean | undefined) ?? false;

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

  const raised = hideAmount ? 0 : (progress?.collected ?? 0);
  const donorCount = hideDonors ? 0 : (progress?.donorCount ?? 0);

  return (
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
  );
}
