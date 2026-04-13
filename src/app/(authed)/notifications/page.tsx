import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BellOff } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { NOTIF_FEED_LABELS } from "@/lib/constants";
import { NotificationsClient } from "./_NotificationsClient";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — /notifications (Banani screen 20).
//
// Server component. Two parallel fetches (cookie-forwarded):
//   - GET /api/notifications?limit=20 — first page
//   - GET /api/notifications/count    — { total, unread } for tab badges
//
// Tab filter is a client-side concern: the backend GET /api/notifications
// does NOT currently support a `?filter=unread` query param. We pass the
// activeFilter via URL search param (?filter=unread) for SSR-fresh
// navigation, and the client island filters items in memory by
// readAt === null when the unread tab is active. Documented in SUMMARY.
// ─────────────────────────────────────────────────────────────────────────

export interface NotificationRow {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  icon: string | null;
  blockId: string | null;
  orderId: string | null;
  withdrawalId: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsPayload {
  items: NotificationRow[];
  nextCursor: string | null;
  hasUnread?: boolean;
}

interface CountPayload {
  total: number;
  unread: number;
}

async function fetchWithCookie<T>(
  path: string,
  token: string,
): Promise<T | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}${path}`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect("/connexion?next=/notifications");

  const params = await searchParams;
  const activeFilter: "all" | "unread" =
    params.filter === "unread" ? "unread" : "all";

  const [feedPayload, countPayload] = await Promise.all([
    fetchWithCookie<NotificationsPayload>(
      "/api/notifications?limit=20",
      token,
    ),
    fetchWithCookie<CountPayload>("/api/notifications/count", token),
  ]);

  const items = feedPayload?.items ?? [];
  const nextCursor = feedPayload?.nextCursor ?? null;
  const counts = {
    all: countPayload?.total ?? items.length,
    unread: countPayload?.unread ?? 0,
  };

  return (
    <div className="mx-auto max-w-4xl">
      {items.length === 0 && counts.all === 0 ? (
        <>
          <header className="mb-6">
            <h1 className="font-headings text-2xl font-bold text-primary md:text-3xl">
              {NOTIF_FEED_LABELS.h1}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {NOTIF_FEED_LABELS.subtitle}
            </p>
          </header>
          <EmptyState
            icon={<BellOff size={28} aria-hidden />}
            title={NOTIF_FEED_LABELS.empty}
          />
        </>
      ) : (
        <NotificationsClient
          initial={{ items, nextCursor }}
          counts={counts}
          activeFilter={activeFilter}
        />
      )}
    </div>
  );
}
