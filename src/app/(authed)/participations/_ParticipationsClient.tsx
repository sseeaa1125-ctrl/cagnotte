"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { PARTICIPATIONS_LABELS } from "@/lib/constants";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ParticipationRow } from "./page";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — /participations client list.
//
// Desktop (md+): HTML <table> with cagnotte cell + date + amount + status
//   pill + view link. Mobile (<md): stacked card grid.
// Pagination: cursor-based "Charger plus" via GET /api/sellers/me/participations.
// Cover URLs are pulled from block.config.cover and always prefixed through
// /api/files/ (R2 proxy). Direct R2 URLs are rejected.
// ─────────────────────────────────────────────────────────────────────────

interface ParticipationsPayload {
  items: ParticipationRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

function coverUrl(
  block: ParticipationRow["block"],
  backendUrl: string,
): string | null {
  if (!block || !block.config) return null;
  const cfg = block.config as Record<string, unknown>;
  const rawCover = (cfg.cover ?? cfg.coverUrl ?? cfg.coverImageUrl) as
    | string
    | undefined;
  if (!rawCover) return null;
  // Already a proxy URL → pass through; otherwise wrap
  if (rawCover.startsWith("/api/files/")) return `${backendUrl}${rawCover}`;
  if (rawCover.includes("/api/files/")) return rawCover;
  // Refuse direct R2 — fall back to null so we render the placeholder.
  return null;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold text-white",
        active ? "bg-green-500" : "bg-gray-500",
      )}
    >
      {active
        ? PARTICIPATIONS_LABELS.statusActive
        : PARTICIPATIONS_LABELS.statusEnded}
    </span>
  );
}

function CoverThumb({
  src,
  title,
  className,
}: {
  src: string | null;
  title: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground",
          className,
        )}
        aria-hidden
      >
        {title.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn("flex-shrink-0 object-cover", className)}
    />
  );
}

export function ParticipationsClient({
  initial,
}: {
  initial: ParticipationsPayload;
}) {
  const [items, setItems] = React.useState<ParticipationRow[]>(initial.items);
  const [cursor, setCursor] = React.useState<string | null>(
    initial.nextCursor,
  );
  const [hasMore, setHasMore] = React.useState<boolean>(initial.hasMore);
  const [loading, setLoading] = React.useState(false);

  const backendUrl = React.useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || "",
    [],
  );

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const data = await api<ParticipationsPayload>(
        `/api/sellers/me/participations?cursor=${encodeURIComponent(cursor)}&limit=20`,
      );
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("[participations] load more failed", err);
      if (err instanceof ApiError) {
        // noop — button will still be available
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-3xl border border-border bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-4 font-semibold">
                  {PARTICIPATIONS_LABELS.colCagnotte}
                </th>
                <th className="px-6 py-4 font-semibold">
                  {PARTICIPATIONS_LABELS.colDate}
                </th>
                <th className="px-6 py-4 font-semibold">
                  {PARTICIPATIONS_LABELS.colAmount}
                </th>
                <th className="px-6 py-4 font-semibold">
                  {PARTICIPATIONS_LABELS.colStatus}
                </th>
                <th className="px-6 py-4 font-semibold">
                  {PARTICIPATIONS_LABELS.colActions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((row) => {
                const href = row.block?.slug
                  ? `/c/${row.block.slug}`
                  : "/cagnottes";
                return (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <CoverThumb
                          src={coverUrl(row.block, backendUrl)}
                          title={row.block?.title ?? "?"}
                          className="h-16 w-16 rounded-xl"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-primary">
                            {row.block?.title ?? "—"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.block?.seller.displayName ?? ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatRelativeTime(row.paidAt ?? row.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">
                      {formatPrice(row.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill active={row.block?.isActive ?? false} />
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={href}
                        className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        {PARTICIPATIONS_LABELS.viewCagnotte}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {items.map((row) => {
          const href = row.block?.slug
            ? `/c/${row.block.slug}`
            : "/cagnottes";
          return (
            <a
              key={row.id}
              href={href}
              className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-border bg-white p-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <CoverThumb
                src={coverUrl(row.block, backendUrl)}
                title={row.block?.title ?? "?"}
                className="h-14 w-14 rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary">
                  {row.block?.title ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(row.paidAt ?? row.createdAt)}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="font-bold text-primary">
                    {formatPrice(row.amount)}
                  </p>
                  <StatusPill active={row.block?.isActive ?? false} />
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={loadMore}
            loading={loading}
          >
            {loading
              ? PARTICIPATIONS_LABELS.loading
              : PARTICIPATIONS_LABELS.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
