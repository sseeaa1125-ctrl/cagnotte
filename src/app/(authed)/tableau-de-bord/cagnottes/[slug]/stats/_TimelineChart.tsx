"use client";

import * as React from "react";
import { formatPrice } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — Pure CSS bar chart for the stats timeline (D-23).
//
// Buckets the raw paid-donation timestamps by calendar day (local tz),
// computes per-day totals, and renders a Tailwind flex-row of bars whose
// heights are inline-style percentages. Zero dependencies — explicitly
// rejected Recharts (~90KB gzipped for a single chart).
//
// Empty state is handled by the parent page.
// ─────────────────────────────────────────────────────────────────────────

export interface TimelineOrder {
  amount: number;
  createdAt: string; // ISO from /api/cagnottes/:slug/participants
}

interface Bucket {
  date: string; // YYYY-MM-DD key
  label: string; // short FR label like "12 avr."
  total: number;
  count: number;
}

function toBucketKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const shortFr = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

function bucketize(orders: TimelineOrder[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const o of orders) {
    const key = toBucketKey(o.createdAt);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.total += o.amount;
      existing.count += 1;
    } else {
      map.set(key, {
        date: key,
        label: shortFr.format(new Date(o.createdAt)),
        total: o.amount,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function TimelineChart({ orders }: { orders: TimelineOrder[] }) {
  const buckets = React.useMemo(() => bucketize(orders), [orders]);
  if (buckets.length === 0) return null;
  const maxTotal = buckets.reduce((m, b) => Math.max(m, b.total), 0);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-end gap-1 overflow-x-auto pb-2 md:gap-2"
        role="img"
        aria-label="Dons au fil du temps"
      >
        {buckets.map((b) => {
          const pct =
            maxTotal > 0
              ? Math.max(Math.round((b.total / maxTotal) * 100), 2)
              : 2;
          return (
            <div
              key={b.date}
              className="flex min-w-10 flex-1 flex-col items-center gap-1"
              title={`${b.label} · ${b.count} don${b.count > 1 ? "s" : ""} · ${formatPrice(b.total)}`}
            >
              <div className="flex h-40 w-full items-end">
                <div
                  className="w-full rounded-t bg-primary transition-all"
                  style={{ height: `${pct}%` }}
                  aria-hidden
                />
              </div>
              <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Total : {formatPrice(buckets.reduce((s, b) => s + b.total, 0))} ·{" "}
        {buckets.reduce((s, b) => s + b.count, 0)} don(s)
      </p>
    </div>
  );
}
