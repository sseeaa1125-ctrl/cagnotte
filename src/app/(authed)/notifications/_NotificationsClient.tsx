"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Gift,
  MessageCircle,
  TrendingUp,
  Clock,
  Flag,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldOff,
  Info,
} from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { NOTIF_FEED_LABELS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import { renderNotificationContent } from "@/lib/notifications/renderContent";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "./page";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — /notifications client island.
//
// Tabs: Toutes / Non lues via URL `?filter=unread`. Client-side memory filter
// on readAt === null because backend GET /api/notifications doesn't accept
// a filter param today. Documented in SUMMARY.
//
// Per-row click → POST /api/notifications/mark-read { ids: [id] }.
// Header button "Tout marquer comme lu" → POST with { all: true } (matches
// backend schema — schema requires ids[] OR all=true).
//
// Rich content via renderNotificationContent. Does NOT reuse NotificationItem
// (which takes a string subtitle) — we need JSX segments.
// ─────────────────────────────────────────────────────────────────────────

interface NotificationsPayload {
  items: NotificationRow[];
  nextCursor: string | null;
}

interface NotificationsClientProps {
  initial: NotificationsPayload;
  counts: { all: number; unread: number };
  activeFilter: "all" | "unread";
}

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  DONATION_RECEIVED: Gift,
  DONATION_MESSAGE: MessageCircle,
  MILESTONE_REACHED: TrendingUp,
  CAGNOTTE_ENDING_SOON: Clock,
  CAGNOTTE_ENDED: Flag,
  PAYOUT_COMPLETED: CheckCircle2,
  PAYOUT_FAILED: AlertTriangle,
  KYC_APPROVED: ShieldCheck,
  KYC_REJECTED: ShieldOff,
  SYSTEM: Info,
};

function iconBubbleClass(type: string): string {
  switch (type) {
    case "DONATION_RECEIVED":
    case "PAYOUT_COMPLETED":
    case "KYC_APPROVED":
      return "bg-green-100 text-green-700";
    case "DONATION_MESSAGE":
      return "bg-pink-100 text-pink-600";
    case "MILESTONE_REACHED":
      return "bg-blue-100 text-blue-600";
    case "CAGNOTTE_ENDING_SOON":
      return "bg-orange-100 text-orange-600";
    case "CAGNOTTE_ENDED":
      return "bg-gray-100 text-gray-600";
    case "PAYOUT_FAILED":
    case "KYC_REJECTED":
      return "bg-red-100 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function NotificationsClient({
  initial,
  counts,
  activeFilter,
}: NotificationsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState<NotificationRow[]>(initial.items);
  const [cursor, setCursor] = React.useState<string | null>(
    initial.nextCursor,
  );
  const [loading, setLoading] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);

  const visible = React.useMemo(
    () =>
      activeFilter === "unread"
        ? items.filter((n) => n.readAt === null)
        : items,
    [items, activeFilter],
  );

  const handleMarkRead = async (id: string) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.readAt) return;
    const prev = items;
    // Optimistic
    setItems((p) =>
      p.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    try {
      await api("/api/notifications/mark-read", {
        method: "POST",
        body: { ids: [id] },
      });
    } catch (err) {
      setItems(prev);
      if (err instanceof ApiError) {
        toast(err.message, "error");
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await api("/api/notifications/mark-read", {
        method: "POST",
        body: { all: true },
      });
      const now = new Date().toISOString();
      setItems((p) =>
        p.map((n) => (n.readAt ? n : { ...n, readAt: now })),
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, "error");
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const data = await api<NotificationsPayload>(
        `/api/notifications?cursor=${encodeURIComponent(cursor)}&limit=20`,
      );
      setItems((p) => [...p, ...data.items]);
      setCursor(data.nextCursor);
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headings text-2xl font-bold text-primary md:text-3xl">
            {NOTIF_FEED_LABELS.h1}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {NOTIF_FEED_LABELS.subtitle}
          </p>
        </div>
        {counts.unread > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleMarkAllRead}
            loading={markingAll}
          >
            {NOTIF_FEED_LABELS.markAllRead}
          </Button>
        ) : null}
      </header>

      <div className="rounded-3xl border border-border bg-white shadow-sm">
        {/* Tabs */}
        <div
          role="tablist"
          className="flex gap-2 border-b border-border p-4"
          aria-label="Filtre des notifications"
        >
          <a
            href="/notifications?filter=all"
            role="tab"
            aria-selected={activeFilter === "all"}
            className={cn(
              "min-h-12 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              activeFilter === "all"
                ? "bg-muted text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {NOTIF_FEED_LABELS.tabAll} ({counts.all})
          </a>
          <a
            href="/notifications?filter=unread"
            role="tab"
            aria-selected={activeFilter === "unread"}
            className={cn(
              "min-h-12 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              activeFilter === "unread"
                ? "bg-muted text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {NOTIF_FEED_LABELS.tabUnread} ({counts.unread})
          </a>
        </div>

        {/* Feed */}
        <ul className="divide-y divide-border">
          {visible.length === 0 ? (
            <li className="px-6 py-12 text-center text-sm text-muted-foreground">
              {NOTIF_FEED_LABELS.empty}
            </li>
          ) : (
            visible.map((n) => {
              const Icon = ICON_MAP[n.type] ?? Info;
              const isUnread = n.readAt === null;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n.id)}
                    className={cn(
                      "flex w-full items-start gap-3 p-4 text-left transition-colors min-h-12 hover:bg-muted/30",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isUnread && "bg-blue-50/30",
                    )}
                    aria-label={isUnread ? "Marquer comme lue" : undefined}
                  >
                    <div
                      className={cn(
                        "relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full",
                        iconBubbleClass(n.type),
                      )}
                      aria-hidden
                    >
                      <Icon size={20} />
                      {isUnread ? (
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-muted-foreground">
                        {renderNotificationContent({
                          type: n.type,
                          data: n.data,
                        })}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {cursor ? (
          <div className="border-t border-border p-4 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className={cn(
                "min-h-12 rounded-lg px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "disabled:opacity-60",
              )}
            >
              {loading
                ? NOTIF_FEED_LABELS.loading
                : NOTIF_FEED_LABELS.loadMore}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
