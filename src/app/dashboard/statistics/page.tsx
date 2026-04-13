"use client";

import { useState, useMemo } from "react";
import { DashboardSkeleton, DateRangePicker } from "@/components/ui";
import type { DateRange } from "@/components/ui";
import { useApi } from "@/lib/useApi";
import {
  Eye,
  Users,
  TrendingUp,
  ShoppingBag,
  MousePointerClick,
  Link2,
  Calendar,
  CreditCard,
  Target,
  Heart,
  Download,
  Globe,
  Share2,
} from "lucide-react";
import dynamic from "next/dynamic";

const StatsChart = dynamic(() => import("@/components/dashboard/StatsChart"), { ssr: false });

interface AnalyticsStats {
  viewsPeriod: number;
  viewsTotal: number;
  uniqueVisitors: number;
  ordersPeriod: number;
  conversionRate: number;
  dailyData: { date: string; count: number }[];
  period: number;
}

interface BlockStat {
  blockId: string;
  type: string;
  title: string;
  position: number;
  clicks: number;
  orders: number;
  conversionRate: number;
}

interface BlockStatsResponse {
  blockStats: BlockStat[];
  totalClicks: number;
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  SALE: "Vente",
  BOOKING: "Réservation",
  LINK: "Lien",
  PAYMENT: "Paiement",
  DONATION: "Don",
  FUNDRAISER: "Cagnotte",
  FORMATION: "Formation",
  LEAD_MAGNET: "Lead Magnet",
};

const BLOCK_TYPE_ICONS: Record<string, React.ElementType> = {
  SALE: ShoppingBag,
  BOOKING: Calendar,
  LINK: Link2,
  PAYMENT: CreditCard,
  DONATION: Heart,
  FUNDRAISER: Target,
  FORMATION: ShoppingBag,
  LEAD_MAGNET: Download,
};

const BLOCK_TYPE_COLORS: Record<string, string> = {
  SALE: "bg-teal-50 text-teal-600",
  BOOKING: "bg-blue-50 text-blue-600",
  LINK: "bg-gray-100 text-gray-600",
  PAYMENT: "bg-amber-50 text-amber-600",
  DONATION: "bg-rose-50 text-rose-600",
  FUNDRAISER: "bg-red-50 text-red-600",
  FORMATION: "bg-violet-50 text-violet-600",
  LEAD_MAGNET: "bg-purple-50 text-purple-600",
};

// ── Smart label formatting based on period length ──
function formatChartLabel(dateStr: string, totalDays: number): string {
  const d = new Date(dateStr + "T12:00:00");
  if (totalDays <= 1) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (totalDays <= 14) {
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
  if (totalDays <= 60) {
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}



// ── Aggregate daily data into larger buckets for long periods ──
function aggregateData(
  dailyData: { date: string; count: number }[],
  totalDays: number
): { date: string; label: string; count: number }[] {
  if (totalDays <= 31) {
    // Show every day, but only label some ticks
    return dailyData.map((d) => ({
      ...d,
      label: formatChartLabel(d.date, totalDays),
    }));
  }

  // For > 31 days, bucket by week
  const buckets = new Map<string, { date: string; count: number }>();
  for (const d of dailyData) {
    const dt = new Date(d.date + "T12:00:00");
    // Week start (Monday)
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(dt.getFullYear(), dt.getMonth(), diff);
    const key = weekStart.toISOString().slice(0, 10);
    const existing = buckets.get(key);
    if (existing) {
      existing.count += d.count;
    } else {
      buckets.set(key, { date: key, count: d.count });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      label: formatChartLabel(d.date, totalDays),
    }));
}

// Removed: ChartTooltip (Recharts) — now using Chart.js native tooltip

export default function StatisticsPage() {
  const [period, setPeriod] = useState("30");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [activePreset, setActivePreset] = useState("30");

  const dateParams = dateRange && !activePreset
    ? `from=${dateRange.from.toISOString().split("T")[0]}&to=${dateRange.to.toISOString().split("T")[0]}`
    : `period=${period}`;

  const statsUrl = `/api/analytics/stats?${dateParams}`;

  const { data: stats, loading } = useApi<AnalyticsStats>(statsUrl);

  const chartData = useMemo(() => {
    if (!stats?.dailyData.length) return [];
    return aggregateData(stats.dailyData, stats.period);
  }, [stats]);

  const totalViews = useMemo(
    () => stats?.dailyData.reduce((s, d) => s + d.count, 0) || 0,
    [stats]
  );

  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  const periodLabel =
    period === "7" ? "7 jours" : period === "14" ? "14 jours" : "30 jours";

  return (
    <div className="space-y-5">
      {/* Header + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900">Statistiques</h1>
        <DateRangePicker
          value={dateRange}
          activePreset={activePreset}
          onChange={(range, presetValue) => {
            setDateRange(range);
            if (presetValue) {
              setActivePreset(presetValue);
              const map: Record<string, string> = { "7": "7", "14": "14", "30": "30", "month": "30" };
              setPeriod(map[presetValue] || "30");
            } else {
              setActivePreset("");
            }
          }}
        />
      </div>

      {/* ── Hero metric card ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">
              Visites totales
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-gray-900">
              {totalViews}
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              {activePreset ? periodLabel : "période personnalisée"} · {stats?.viewsTotal || 0} au total
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <Eye size={22} className="text-blue-500" />
          </div>
        </div>
      </div>

      {/* ── 3 metric cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          icon={Users}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          label="Uniques"
          value={String(stats?.uniqueVisitors || 0)}
        />
        <MetricCard
          icon={ShoppingBag}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          label="Commandes"
          value={String(stats?.ordersPeriod || 0)}
        />
        <MetricCard
          icon={TrendingUp}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          label="Conversion"
          value={`${stats?.conversionRate || 0}%`}
        />
      </div>

      {/* ── Smart chart ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Visites</h2>
          <p className="text-xs text-gray-400">
            {stats?.viewsTotal || 0} au total
          </p>
        </div>

        <StatsChart chartData={chartData} />
      </div>

      {/* ── Block Performance ── */}
      <BlockPerformanceSection dateParams={dateParams} />

      {/* ── Sources + Pays — side by side on desktop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SourceStatsSection dateParams={dateParams} />
        <CountryStatsSection dateParams={dateParams} />
      </div>

      {/* Info */}
      <div className="rounded-xl bg-gray-50 px-4 py-3">
        <p className="text-[11px] text-gray-500">
          Les statistiques se mettent à jour en temps réel. Le taux de conversion mesure le ratio commandes / visites. Les pays sont détectés automatiquement via les en-têtes réseau.
        </p>
      </div>
    </div>
  );
}

/* ── Reusable Metric Card ── */
function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={15} className={iconColor} />
      </div>
      <p className="mt-3 text-lg font-extrabold text-gray-900 sm:text-xl">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-gray-400">{label}</p>
    </div>
  );
}

/* ── Block Performance Section ── */
function BlockPerformanceSection({ dateParams }: { dateParams: string }) {
  const { data, loading } = useApi<BlockStatsResponse>(`/api/analytics/block-stats?${dateParams}`);

  const sortedBlocks = useMemo(() => {
    if (!data?.blockStats) return [];
    return [...data.blockStats].sort((a, b) => b.clicks - a.clicks);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="h-5 w-40 animate-pulse rounded-lg bg-gray-100" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  if (!sortedBlocks.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <MousePointerClick size={28} className="mx-auto mb-2 text-gray-200" />
        <p className="text-sm font-semibold text-gray-500">Pas encore de clics sur tes blocs</p>
        <p className="mt-1 text-xs text-gray-400">Les stats apparaîtront quand des visiteurs interagiront avec ta page</p>
      </div>
    );
  }

  const maxClicks = sortedBlocks[0]?.clicks || 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MousePointerClick size={15} className="text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Performance des blocs</h2>
        </div>
        <span className="text-xs font-medium text-gray-400">
          {data?.totalClicks || 0} clic{(data?.totalClicks || 0) > 1 ? "s" : ""} total
        </span>
      </div>

      {/* Block rows */}
      <div className="divide-y divide-gray-50">
        {sortedBlocks.map((block, i) => {
          const Icon = BLOCK_TYPE_ICONS[block.type] || Link2;
          const colorClasses = BLOCK_TYPE_COLORS[block.type] || "bg-gray-100 text-gray-600";
          const barWidth = maxClicks > 0 ? Math.max(3, (block.clicks / maxClicks) * 100) : 0;
          const isTransactional = block.type === "SALE" || block.type === "BOOKING" || block.type === "PAYMENT" || block.type === "DONATION" || block.type === "FUNDRAISER" || block.type === "FORMATION";

          return (
            <div key={block.blockId} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/50">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClasses}`}>
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{block.title}</p>
                  <span className="hidden sm:inline shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                    {BLOCK_TYPE_LABELS[block.type] || block.type}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <div className="h-1 flex-1 rounded-full bg-gray-100">
                    <div
                      className={`h-1 rounded-full transition-all ${i === 0 ? "bg-teal-500" : "bg-teal-400/70"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  {isTransactional && block.orders > 0 && (
                    <span className="shrink-0 text-[10px] font-medium text-teal-600">
                      {block.orders} vente{block.orders > 1 ? "s" : ""}
                    </span>
                  )}
                  {isTransactional && block.conversionRate > 0 && (
                    <span className="hidden sm:inline shrink-0 text-[10px] font-semibold text-green-600">
                      {block.conversionRate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right min-w-[40px]">
                <p className="text-sm font-bold text-gray-900">{block.clicks}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Source colors for known social networks ── */
const SOURCE_COLORS: Record<string, string> = {
  Instagram: "bg-pink-500",
  TikTok: "bg-gray-900",
  WhatsApp: "bg-green-500",
  Facebook: "bg-blue-600",
  "X (Twitter)": "bg-gray-800",
  YouTube: "bg-red-500",
  LinkedIn: "bg-blue-700",
  Snapchat: "bg-yellow-400",
  Threads: "bg-gray-700",
  Pinterest: "bg-red-600",
  Telegram: "bg-sky-500",
  Google: "bg-blue-500",
  Direct: "bg-teal-500",
};

/* ── Source Stats Section ── */
interface SourceData {
  name: string;
  views: number;
  orders: number;
  percentage: number;
  conversionRate: number;
}

function SourceStatsSection({ dateParams }: { dateParams: string }) {
  const { data, loading } = useApi<{ sources: SourceData[]; total: number }>(
    `/api/analytics/stats/sources?${dateParams}`
  );

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-gray-100" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.sources?.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <Share2 size={24} className="mx-auto mb-2 text-gray-200" />
        <p className="text-sm font-semibold text-gray-500">Pas encore de sources</p>
        <p className="mt-1 text-xs text-gray-400">Les réseaux de tes visiteurs apparaîtront ici</p>
      </div>
    );
  }

  const maxViews = data.sources[0]?.views || 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Share2 size={15} className="text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Sources de trafic</h2>
        </div>
        <span className="text-xs font-medium text-gray-400">{data.total} visite{data.total > 1 ? "s" : ""}</span>
      </div>

      <div className="divide-y divide-gray-50">
        {data.sources.map((source, i) => {
          const barWidth = maxViews > 0 ? Math.max(3, (source.views / maxViews) * 100) : 0;
          const colorClass = SOURCE_COLORS[source.name] || "bg-gray-400";

          return (
            <div key={`${source.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorClass}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="truncate text-sm font-semibold text-gray-900">{source.name}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {source.orders > 0 && (
                      <span className="text-[10px] font-semibold text-teal-600">{source.orders} achat{source.orders > 1 ? "s" : ""}</span>
                    )}
                    <span className="text-xs font-bold text-gray-900 min-w-[24px] text-right">{source.views}</span>
                  </div>
                </div>
                <div className="h-1 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-1 rounded-full ${colorClass} transition-all`}
                    style={{ width: `${barWidth}%`, opacity: 0.65 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Country Stats Section ── */
interface CountryData {
  code: string;
  name: string;
  views: number;
  orders: number;
}

function CountryStatsSection({ dateParams }: { dateParams: string }) {
  const { data, loading } = useApi<{ countries: CountryData[]; total: number }>(
    `/api/analytics/stats/countries?${dateParams}`
  );

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-gray-100" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.countries?.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <Globe size={24} className="mx-auto mb-2 text-gray-200" />
        <p className="text-sm font-semibold text-gray-500">Pas encore de données géographiques</p>
        <p className="mt-1 text-xs text-gray-400">Les pays de tes visiteurs apparaîtront ici</p>
      </div>
    );
  }

  const maxViews = data.countries[0]?.views || 1;
  const total = data.total;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Pays des visiteurs</h2>
        </div>
        <span className="text-xs font-medium text-gray-400">{data.countries.length} pays</span>
      </div>

      <div className="divide-y divide-gray-50">
        {data.countries.map((c, i) => {
          const barWidth = maxViews > 0 ? Math.max(3, (c.views / maxViews) * 100) : 0;
          const pct = total > 0 ? Math.round((c.views / total) * 1000) / 10 : 0;

          return (
            <div key={c.code} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-base leading-none shrink-0">{getFlagEmoji(c.code)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`truncate text-sm ${i === 0 ? "font-bold" : "font-semibold"} text-gray-900`}>{c.name}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {c.orders > 0 && (
                      <span className="text-[10px] font-semibold text-teal-600">{c.orders} achat{c.orders > 1 ? "s" : ""}</span>
                    )}
                    <span className="text-xs font-bold text-gray-900 min-w-[24px] text-right">{c.views}</span>
                    <span className="text-[10px] font-medium text-gray-400 min-w-[32px] text-right">{pct}%</span>
                  </div>
                </div>
                <div className="h-1 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-1 rounded-full transition-all ${i === 0 ? "bg-teal-500" : "bg-teal-400/60"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode: string): string {
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "\uD83C\uDF10";
  }
}
