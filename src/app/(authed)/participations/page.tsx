import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Gift, Info } from "lucide-react";
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
  totalCount: number;
  totalPages: number;
  currentPage: number;
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

async function fetchSellerEmail(token: string): Promise<string | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { seller?: { email?: string } };
    return data.seller?.email ?? null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function ParticipationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect("/connexion?next=/participations");

  const [payload, sellerEmail] = await Promise.all([
    fetchParticipations(token),
    fetchSellerEmail(token),
  ]);
  const items = payload?.items ?? [];
  const totalCount = payload?.totalCount ?? 0;
  const totalPages = payload?.totalPages ?? 1;

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

      {sellerEmail ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          <Info size={16} className="mt-0.5 flex-shrink-0" aria-hidden />
          <p>{PARTICIPATIONS_LABELS.emailMatchNotice(sellerEmail)}</p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<Gift size={24} aria-hidden />}
          title={PARTICIPATIONS_LABELS.empty}
          cta={
            <Button as="a" href="/cagnottes" variant="primary" size="lg">
              {PARTICIPATIONS_LABELS.emptyCta}
            </Button>
          }
        />
      ) : (
        <ParticipationsClient
          initial={{ items, totalCount, totalPages }}
        />
      )}
    </div>
  );
}
