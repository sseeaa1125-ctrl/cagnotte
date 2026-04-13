import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Plus, PiggyBank, Heart, Gift } from "lucide-react";
import { Button, EmptyState, KpiCard } from "@/components/ui";
import { DASHBOARD_LABELS, MISC } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { ClientCampaignCard } from "./_ClientCampaignCard";

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 plan 05-02 — /tableau-de-bord (Banani screens 6 + 7).
//
// Server component. All data fetched with the izy-token cookie forwarded.
// Empty-state branch renders the Phase 3 <EmptyState> primitive. Populated
// branch renders KPIs + a grid of <ClientCampaignCard> client islands that
// each hydrate their progress via GET /api/blocks/:id/progress.
//
// KPI mapping (per 05-RESEARCH.md backend contract):
//   totalRaised  = stats.revenue
//   donorCount   = stats.totalOrders
//   campaignCount = blocks.length
// ─────────────────────────────────────────────────────────────────────────

interface SellerPayload {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
}

interface StatsPayload {
  revenue?: number;
  totalOrders?: number;
}

interface BlockPayload {
  id: string;
  type: string;
  title: string;
  slug: string | null;
  config: Record<string, unknown>;
  createdAt: string;
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

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  // Belt-and-braces: layout already redirects on missing token, but in
  // case the server runs a stale cached layout, guard again here.
  if (!token) redirect("/connexion?next=/tableau-de-bord");

  const [me, stats, blocksPayload] = await Promise.all([
    fetchWithCookie<{ seller: SellerPayload }>("/api/auth/me", token),
    fetchWithCookie<StatsPayload>("/api/sellers/dashboard/stats", token),
    fetchWithCookie<{ blocks: BlockPayload[] }>("/api/blocks", token),
  ]);

  if (!me?.seller) redirect("/connexion?next=/tableau-de-bord");

  const seller = me.seller;
  const allBlocks = blocksPayload?.blocks ?? [];
  // Only FUNDRAISER blocks (other types are legacy and no wizard ships
  // them in the cagnottes.sn fork).
  const cagnottes = allBlocks.filter((b) => b.type === "FUNDRAISER");
  const recentCagnottes = cagnottes
    .slice()
    .sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const totalRaised = stats?.revenue ?? 0;
  const donorCount = stats?.totalOrders ?? 0;
  const campaignCount = cagnottes.length;
  const sellerUrl = `${MISC.siteName.toLowerCase()}/${seller.slug}`;

  // ─── Empty state branch ───────────────────────────────────────────
  if (cagnottes.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Gift size={28} aria-hidden />}
          title={DASHBOARD_LABELS.emptyTitle}
          description={DASHBOARD_LABELS.emptyBody}
          cta={
            <Button
              as="a"
              href="/tableau-de-bord/nouvelle"
              variant="primary"
              size="lg"
              iconLeft={<Plus size={18} />}
            >
              {DASHBOARD_LABELS.emptyCta}
            </Button>
          }
        />
      </div>
    );
  }

  // ─── Populated branch ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-headings text-3xl font-bold text-primary md:text-4xl">
            {DASHBOARD_LABELS.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {DASHBOARD_LABELS.welcomeBack.replace(
              "{name}",
              seller.displayName,
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {DASHBOARD_LABELS.sellerUrlLabel}
            {": "}
            <span className="font-mono text-primary">{sellerUrl}</span>
          </p>
        </div>
        <Button
          as="a"
          href="/tableau-de-bord/nouvelle"
          variant="primary"
          size="lg"
          iconLeft={<Plus size={18} />}
        >
          {DASHBOARD_LABELS.createCta}
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          icon={<PiggyBank size={18} />}
          label={DASHBOARD_LABELS.kpiTotalRaised}
          value={formatPrice(totalRaised)}
        />
        <KpiCard
          icon={<Heart size={18} />}
          label={DASHBOARD_LABELS.kpiDonorCount}
          value={String(donorCount)}
        />
        <KpiCard
          icon={<Gift size={18} />}
          label={DASHBOARD_LABELS.kpiCampaignCount}
          value={String(campaignCount)}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headings text-xl font-semibold text-primary">
            {DASHBOARD_LABELS.recentCagnottes}
          </h2>
          <a
            href="#"
            className="text-sm font-medium text-primary hover:underline"
          >
            {DASHBOARD_LABELS.seeAllLink}
          </a>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recentCagnottes.map((block) => (
            <ClientCampaignCard key={block.id} block={block} />
          ))}
        </div>
      </section>
    </div>
  );
}
