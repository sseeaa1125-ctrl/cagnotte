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
//
// Inactive cagnottes (isActive=false) : le backend renvoie 404 sur les
// endpoints publics filtrés. Plutôt que laisser la carte clignoter
// indéfiniment (pulse infini sur progress=null), on skip le fetch et
// on affiche un état dédié "Désactivée" — non cliquable, grisé.

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
    isActive: boolean;
  };
}

export function ClientCampaignCard({ block }: ClientCampaignCardProps) {
  const cfg = block.config || {};
  const subtype =
    (cfg.subtype as "festive" | "solidaire" | undefined) ?? "festive";
  const coverUrl = (cfg.coverUrl as string | null) ?? null;
  const goalAmount = (cfg.goalAmount as number | undefined) ?? 0;
  const endDate = (cfg.endDate as string | null | undefined) ?? null;
  const isActive = block.isActive;

  // null = pending, "errored" = fetch failed (404), "disabled" = skipped (inactive)
  const [progress, setProgress] = useState<
    ProgressPayload | "errored" | "disabled" | null
  >(isActive ? null : "disabled");

  useEffect(() => {
    if (!isActive) return; // skip fetch entirely for inactive cagnottes
    let cancelled = false;
    (async () => {
      try {
        const data = await api<ProgressPayload>(
          `/api/blocks/${block.id}/progress`,
        );
        if (!cancelled) setProgress(data);
      } catch (err) {
        // Silent fail — set sentinel so the pulse stops (audit-039 follow-up
        // bug : si le block est désactivé / supprimé, le 404 laissait progress
        // à null indéfiniment → pulse infini).
        if (!cancelled && err instanceof ApiError) {
          setProgress("errored");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [block.id, isActive]);

  const isPending = progress === null;
  const progressData =
    progress && progress !== "errored" && progress !== "disabled"
      ? progress
      : null;
  const raised = progressData?.collected ?? 0;
  const donorCount = progressData?.donorCount ?? 0;

  // Inactive state — visual cue + non-clickable. Pas de fetch, pas de pulse.
  if (!isActive) {
    return (
      <div className="relative h-full" aria-disabled="true">
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600 shadow-sm">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400"
          />
          Désactivée
        </span>
        <div className="pointer-events-none opacity-60 grayscale">
          <CampaignCard
            cagnotte={{
              slug: block.slug ?? block.id,
              title: block.title,
              coverUrl,
              subtype,
              raised: 0,
              goal: goalAmount,
              donorCount: 0,
              endDate,
            }}
            linkVariant="creator"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("h-full", isPending && "animate-pulse")}
      aria-busy={isPending || undefined}
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
