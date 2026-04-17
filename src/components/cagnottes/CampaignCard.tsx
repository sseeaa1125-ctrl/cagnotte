import * as React from "react";
import Image from "next/image";
import { Badge, ProgressBar } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { SUBTYPE_LABELS } from "@/lib/constants";
import { computeProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export interface CampaignCardProps {
  cagnotte: {
    slug: string;
    title: string;
    coverUrl: string | null;
    subtype: "festive" | "solidaire";
    raised: number;
    goal: number;
    donorCount: number;
    endDate?: string | null;
  };
  /**
   * Phase 7 plan 07-01 — destination variant.
   * - "public"  → /c/[slug]                      (donor-facing page, DEFAULT)
   * - "creator" → /tableau-de-bord/cagnottes/[slug] (owner detail page)
   * Default stays "public" so every existing call-site is unchanged.
   */
  linkVariant?: "public" | "creator";
  className?: string;
}

export function CampaignCard({
  cagnotte,
  linkVariant = "public",
  className,
}: CampaignCardProps) {
  const {
    slug,
    title,
    coverUrl,
    subtype,
    raised,
    goal,
    donorCount,
    endDate,
  } = cagnotte;

  const { percent, barWidth } = computeProgress(raised, goal);
  const isFestive = subtype === "festive";
  const donorLabel =
    donorCount === 1 ? "contributeur" : "contributeurs";

  const endDateLabel = endDate
    ? ` · Fin le ${new Date(endDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    : "";

  const href =
    linkVariant === "creator"
      ? `/tableau-de-bord/cagnottes/${slug}`
      : `/c/${slug}`;

  return (
    <a
      href={href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
    >
      {/* Cover */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            width={640}
            height={360}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-pink">
            <span
              className="font-headings text-3xl font-bold text-primary/40"
              aria-hidden
            >
              {title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge variant={isFestive ? "festive" : "solidaire"}>
            {SUBTYPE_LABELS[subtype]}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-headings text-lg font-semibold text-primary">
          {title}
        </h3>

        <ProgressBar
          value={barWidth}
          raisedLabel={`${formatPrice(raised)} collectés`}
          goalLabel={`sur ${formatPrice(goal)}`}
          color={isFestive ? "gold" : "primary"}
        />

        <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">
            {donorCount} {donorLabel}
            {endDateLabel}
          </span>
          {goal > 0 ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                percent >= 100
                  ? "bg-success-bg text-success"
                  : "bg-pink/60 text-primary",
              )}
            >
              {percent}%
            </span>
          ) : null}
        </p>
      </div>
    </a>
  );
}
