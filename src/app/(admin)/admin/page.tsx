"use client";

import * as React from "react";
import Link from "next/link";
import {
  DollarSign,
  Users,
  Heart,
  ShieldCheck,
  Wallet,
  Activity,
  Gift,
} from "lucide-react";
import { KpiCard } from "@/components/ui";
import { adminApi } from "@/lib/adminApi";
import { ADMIN_DATE_PRESETS } from "@/lib/adminDatePresets";
import { formatPrice, formatRelativeTime } from "@/lib/format";

// ── Types ──
interface KpiData {
  totalRevenue: number;
  totalCommission: number;
  totalVoluntary: number;
  totalSellerAmount: number;
  sellerCount: number;
  cagnotteCount: number;
  pendingKyc: number;
  pendingWithdrawals: number;
  orderCount: number;
}

interface ChartEntry {
  date: string;
  revenue: number;
  commission: number;
  count: number;
}

interface ActivityEntry {
  type: "admin_log" | "order";
  id: string;
  date: string;
  description: string;
  details: Record<string, unknown> | null;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = React.useState<KpiData | null>(null);
  const [chart, setChart] = React.useState<ChartEntry[]>([]);
  const [activity, setActivity] = React.useState<ActivityEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activePreset, setActivePreset] = React.useState<number | null>(null);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  // Fetch KPIs (with optional date filter)
  const fetchData = React.useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      const qs = params.toString();

      const [kpiData, chartData, activityData] = await Promise.all([
        adminApi<KpiData>(`/api/admin/dashboard/kpis${qs ? `?${qs}` : ""}`),
        adminApi<{ chart: ChartEntry[] }>("/api/admin/dashboard/revenue-chart?days=30"),
        adminApi<{ activity: ActivityEntry[] }>("/api/admin/dashboard/activity"),
      ]);

      setKpis(kpiData);
      setChart(chartData?.chart ?? []);
      setActivity(activityData?.activity ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handlePreset(index: number) {
    const preset = ADMIN_DATE_PRESETS[index];
    const from = preset.from();
    const to = preset.to();
    setActivePreset(index);
    setDateFrom(from);
    setDateTo(to);
    fetchData(from, to);
  }

  function handleClearFilter() {
    setActivePreset(null);
    setDateFrom("");
    setDateTo("");
    fetchData();
  }

  const maxRevenue = Math.max(...chart.map((d) => d.revenue), 1);
  const hasFilter = dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-headings text-2xl font-bold text-primary">
          Tableau de bord
        </h1>
        {hasFilter ? (
          <button
            type="button"
            onClick={handleClearFilter}
            className="text-xs font-medium text-primary hover:underline"
          >
            Effacer le filtre
          </button>
        ) : null}
      </div>

      {/* Date preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {ADMIN_DATE_PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePreset(i)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activePreset === i
                ? "border-primary bg-primary text-white"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            <span className="hidden sm:inline">{preset.label}</span>
            <span className="sm:hidden">{preset.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      {loading && !kpis ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            icon={<DollarSign size={18} />}
            label="Revenu total"
            value={formatPrice(kpis?.totalRevenue ?? 0)}
          />
          <KpiCard
            icon={<DollarSign size={18} />}
            label="Commission plateforme"
            value={formatPrice(kpis?.totalCommission ?? 0)}
          />
          <KpiCard
            icon={<Gift size={18} />}
            label="Soutien cagnotte.sn"
            value={formatPrice(kpis?.totalVoluntary ?? 0)}
          />
          <KpiCard
            icon={<Users size={18} />}
            label="Vendeurs actifs"
            value={String(kpis?.sellerCount ?? 0)}
          />
          <KpiCard
            icon={<Heart size={18} />}
            label="Cagnottes actives"
            value={String(kpis?.cagnotteCount ?? 0)}
          />
          {(kpis?.pendingKyc ?? 0) > 0 ? (
            <Link href="/admin/kyc" className="block">
              <KpiCard
                icon={<ShieldCheck size={18} />}
                label="KYC en attente"
                value={String(kpis?.pendingKyc ?? 0)}
                className="ring-2 ring-amber-400"
              />
            </Link>
          ) : (
            <KpiCard
              icon={<ShieldCheck size={18} />}
              label="KYC en attente"
              value="0"
            />
          )}
        </div>
      )}

      {/* Revenue Chart */}
      <section className="rounded-xl border border-border bg-background p-3 sm:p-4 shadow-sm">
        <h2 className="mb-4 font-headings text-lg font-semibold text-primary">
          Revenus des 30 derniers jours
        </h2>

        {chart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune donnee pour cette periode.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="flex items-end gap-px"
              style={{ minWidth: chart.length * 16, height: 200 }}
            >
              {chart.map((day) => {
                const revenueH = Math.round((day.revenue / maxRevenue) * 180);
                const commissionH = Math.round(
                  (day.commission / maxRevenue) * 180,
                );
                const dateLabel = new Date(day.date).toLocaleDateString(
                  "fr-FR",
                  { day: "2-digit", month: "2-digit" },
                );

                return (
                  <div
                    key={day.date}
                    className="group relative flex flex-1 flex-col items-center justify-end"
                    style={{ minWidth: 12 }}
                  >
                    <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 rounded-md bg-primary px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                      <p className="whitespace-nowrap font-semibold">
                        {dateLabel}
                      </p>
                      <p className="whitespace-nowrap">
                        {formatPrice(day.revenue)}
                      </p>
                      <p className="whitespace-nowrap text-pink-200">
                        Com: {formatPrice(day.commission)}
                      </p>
                    </div>

                    <div
                      className="w-full rounded-t bg-primary transition-all duration-200"
                      style={{ height: Math.max(revenueH, 2) }}
                    />
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-pink opacity-70"
                      style={{ height: Math.max(commissionH, 0) }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-1 flex gap-px">
              {chart.map((day, i) => (
                <div
                  key={day.date}
                  className="flex-1 text-center text-[9px] text-muted-foreground"
                  style={{ minWidth: 12 }}
                >
                  {i % 5 === 0
                    ? new Date(day.date).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : ""}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
                Revenu
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-pink opacity-70" />
                Commission
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Activity Feed */}
      <section className="rounded-xl border border-border bg-background p-3 sm:p-4 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-headings text-lg font-semibold text-primary">
          <Activity size={18} />
          Activite recente
        </h2>

        {activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune activite recente.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <div
                  className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                    item.type === "order"
                      ? "bg-green-100 text-green-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {item.type === "order" ? (
                    <DollarSign size={14} />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(item.date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
