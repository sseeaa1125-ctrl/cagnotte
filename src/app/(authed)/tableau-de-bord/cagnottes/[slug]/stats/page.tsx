import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button, KpiCard } from "@/components/ui";
import { STATS_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { TimelineChart } from "./_TimelineChart";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /tableau-de-bord/cagnottes/[slug]/stats.
//
// Server component. Parallel-fetches GET /api/auth/me +
// GET /api/cagnottes/:slug + GET /api/blocks/:id/progress +
// GET /api/cagnottes/:slug/participants?limit=50.
//
// OWNER CHECK: if me.seller.id !== cagnotte.seller.id → notFound() so we
// never leak stats for a cagnotte the authed seller does not own.
//
// KPIs from /progress. Top messages filtered client-side (isAnonymous=false
// + non-private message). Timeline is a pure CSS bar chart — no Recharts
// (D-23).
// ─────────────────────────────────────────────────────────────────────────

interface MePayload {
  seller?: { id: string };
}

interface CagnottePayload {
  id: string;
  slug: string;
  title: string;
  seller: { id: string; displayName: string };
}

interface ProgressPayload {
  collected: number;
  donorCount: number;
  goalAmount: number;
  percentage: number;
}

interface ParticipantItem {
  id: string;
  name: string;
  amount: number | null;
  message: string | null;
  createdAt: string;
}

interface ParticipantsPayload {
  participants: ParticipantItem[];
  nextCursor: string | null;
}

async function fetchJson<T>(
  url: string,
  token: string | undefined,
): Promise<T | null> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers.cookie = `izy-token=${token}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect(`/connexion?next=/tableau-de-bord/cagnottes/${slug}/stats`);

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [me, cagnotte] = await Promise.all([
    fetchJson<MePayload>(`${backendUrl}/api/auth/me`, token),
    fetchJson<CagnottePayload>(
      `${backendUrl}/api/cagnottes/${encodeURIComponent(slug)}`,
      token,
    ),
  ]);

  if (!me?.seller) {
    redirect(`/connexion?next=/tableau-de-bord/cagnottes/${slug}/stats`);
  }
  if (!cagnotte) notFound();

  // Owner check — fail closed, before any further fetches render.
  if (cagnotte.seller.id !== me.seller.id) {
    notFound();
  }

  const [progress, participants] = await Promise.all([
    fetchJson<ProgressPayload>(
      `${backendUrl}/api/blocks/${cagnotte.id}/progress`,
      token,
    ),
    fetchJson<ParticipantsPayload>(
      `${backendUrl}/api/cagnottes/${encodeURIComponent(slug)}/participants?limit=50`,
      token,
    ),
  ]);

  const totalRaised = progress?.collected ?? 0;
  const donorCount = progress?.donorCount ?? 0;
  const average = donorCount > 0 ? Math.round(totalRaised / donorCount) : 0;

  const allItems: ParticipantItem[] = participants?.participants ?? [];
  const topMessages = allItems
    .filter(
      (p) =>
        p.message !== null &&
        p.message.trim().length > 0 &&
        p.name !== "Anonyme",
    )
    .slice(0, 3);

  const chartItems = allItems
    .filter((p) => p.amount !== null)
    .map((p) => ({ amount: p.amount ?? 0, createdAt: p.createdAt }));

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/tableau-de-bord"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} aria-hidden />
        {STATS_LABELS.backToDashboard}
      </Link>

      <header className="mb-6">
        <h1 className="font-headings text-2xl font-bold text-primary md:text-3xl">
          {STATS_LABELS.h1}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cagnotte.title}
        </p>
      </header>

      {/* KPIs */}
      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          icon={<Wallet size={18} aria-hidden />}
          label={STATS_LABELS.kpiRaised}
          value={formatPrice(totalRaised)}
        />
        <KpiCard
          icon={<Users size={18} aria-hidden />}
          label={STATS_LABELS.kpiDonors}
          value={String(donorCount)}
        />
        <KpiCard
          icon={<TrendingUp size={18} aria-hidden />}
          label={STATS_LABELS.kpiAverage}
          value={formatPrice(average)}
        />
      </section>

      {/* Timeline */}
      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-headings text-lg font-semibold text-primary">
          {STATS_LABELS.timeline}
        </h2>
        {chartItems.length > 0 ? (
          <TimelineChart orders={chartItems} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {STATS_LABELS.timelineEmpty}
          </p>
        )}
      </section>

      {/* Top messages */}
      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-headings text-lg font-semibold text-primary">
          <MessageCircle size={18} aria-hidden />
          {STATS_LABELS.topMessages}
        </h2>
        {topMessages.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {topMessages.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-border bg-gray-50/60 p-4"
              >
                <p className="text-sm text-primary">&ldquo;{m.message}&rdquo;</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  — {m.name}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {STATS_LABELS.topMessagesEmpty}
          </p>
        )}
      </section>

      <div className="flex justify-end">
        <Link href={`/c/${slug}`}>
          <Button type="button" variant="outline" size="md">
            {STATS_LABELS.viewCagnotte}
          </Button>
        </Link>
      </div>
    </div>
  );
}
