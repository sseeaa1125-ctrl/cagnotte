/**
 * Admin dashboard skeleton loaders — reusable across all admin pages.
 * Skeleton shapes match the actual rendered components (KPI cards, tables, detail sections).
 */

import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-muted", className)}
      aria-hidden
    />
  );
}

// ── KPI grid skeleton (dashboard, orders, seller detail) ──
export function AdminKpiSkeleton({
  count = 6,
  cols = "lg:grid-cols-3",
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <Bone className="h-3 w-24" />
            <Bone className="h-9 w-9 rounded-full" />
          </div>
          <Bone className="h-7 w-32" />
        </div>
      ))}
    </div>
  );
}

// ── Table skeleton (all list pages) ──
export function AdminTableSkeleton({
  rows = 5,
  cols = 7,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Bone className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-border">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-4">
                  <Bone
                    className={cn(
                      "h-4",
                      c === 0 ? "w-32" : c === cols - 1 ? "w-16" : "w-24",
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Detail page skeleton (seller detail, cagnotte detail, order detail) ──
export function AdminDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Bone className="h-5 w-40" />
      <div className="flex items-center gap-6">
        <Bone className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background p-5 shadow-sm sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-8 w-8 rounded" />
            <div className="space-y-1">
              <Bone className="h-3 w-16" />
              <Bone className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
      <AdminKpiSkeleton count={3} cols="sm:grid-cols-3" />
    </div>
  );
}

// ── Chart skeleton (dashboard) ──
export function AdminChartSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <Bone className="mb-4 h-5 w-48" />
      <div className="flex items-end gap-px" style={{ height: 200 }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-muted"
            style={{
              height: Math.max(20, Math.random() * 160),
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Page header skeleton ──
export function AdminPageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Bone className="h-7 w-48" />
      <Bone className="h-4 w-32" />
    </div>
  );
}
