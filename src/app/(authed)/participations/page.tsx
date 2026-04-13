import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { PARTICIPATIONS_LABELS } from "@/lib/constants";
import { ParticipationsClient } from "./_ParticipationsClient";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — /participations (Banani screen 16).
//
// Server component. Raw-fetches GET /api/sellers/me/participations (T0).
// Uses DashboardNavbar top nav only (no ProfileSidebar — this surface is
// a dashboard-scoped page, not a profile sub-route).
// ─────────────────────────────────────────────────────────────────────────

export interface ParticipationRow {
  id: string;
  reference: string;
  amount: number;
  customerName: string | null;
  isAnonymous: boolean;
  createdAt: string;
  paidAt: string | null;
  block: {
    id: string;
    slug: string | null;
    title: string;
    isActive: boolean;
    config: Record<string, unknown> | null;
    seller: { displayName: string; slug: string };
  } | null;
}

interface ParticipationsPayload {
  items: ParticipationRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

async function fetchParticipations(
  token: string,
): Promise<ParticipationsPayload | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(
      `${backendUrl}/api/sellers/me/participations?limit=20`,
      {
        headers: { cookie: `izy-token=${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as ParticipationsPayload;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function ParticipationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect("/connexion?next=/participations");

  const payload = await fetchParticipations(token);
  const items = payload?.items ?? [];
  const nextCursor = payload?.nextCursor ?? null;
  const hasMore = payload?.hasMore ?? false;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="font-headings text-2xl font-bold text-primary md:text-3xl">
          {PARTICIPATIONS_LABELS.h1}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PARTICIPATIONS_LABELS.subtitle}
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={<Gift size={28} aria-hidden />}
          title={PARTICIPATIONS_LABELS.empty}
          cta={
            <Button
              as="a"
              href="/toutes-les-cagnottes"
              variant="primary"
              size="lg"
            >
              {PARTICIPATIONS_LABELS.emptyCta}
            </Button>
          }
        />
      ) : (
        <ParticipationsClient
          initial={{ items, nextCursor, hasMore }}
        />
      )}
    </div>
  );
}
