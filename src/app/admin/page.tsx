"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminApi } from "@/lib/adminApi";
import {
  Users,
  ShoppingCart,
  Wallet,
  Shield,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  ArrowUpRight,
  Receipt,
  Repeat,
  ArrowDownToLine,
  Trophy,
  Clock,
  Banknote,
  Scale,
} from "lucide-react";

// ── Types alignés sur le backend ──
interface OrderTypeBreakdown {
  count: number;
  volume: number;
  commission: number;
}

interface KPIs {
  periodSummary: {
    totalVolume: number;
    totalCommission: number;
    totalSellerAmount: number;
    totalWithdrawn: number;
    netSeller: number;
    avgOrderValue: number;
    orderCount: number;
    withdrawalCount: number;
  };
  orders: {
    total: number;
    communityPayments: number;
    byType: Record<string, OrderTypeBreakdown>;
  };
  sellers: {
    total: number;
    active: number;
    withSales: number;
    newInPeriod?: number;
  };
  communities: {
    totalActive: number;
    activeSubscriptions: number;
    mrr: number;
  };
  operations: {
    pendingWithdrawals: number;
    pendingWithdrawalAmount: number;
    pendingKyc: number;
    pendingReports: number;
    failedWebhooks24h: number;
  };
  topSellers: {
    sellerId: string;
    displayName: string;
    slug: string;
    email: string;
    totalRevenue: number;
    orderCount: number;
  }[];
  recentWithdrawals: {
    id: string;
    amount: number;
    provider: string;
    phone: string;
    recipientName: string;
    processedAt: string | null;
    seller: { displayName: string; slug: string };
  }[];
}

// ── Quick filter presets ──
type FilterPreset = "today" | "yesterday" | "7d" | "30d" | "all";

const FILTER_LABELS: Record<FilterPreset, string> = {
  today: "Aujourd'hui",
  yesterday: "Hier",
  "7d": "7 jours",
  "30d": "30 jours",
  all: "Tout",
};

function getFilterDates(preset: FilterPreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today": {
      const today = fmt(now);
      return { dateFrom: today, dateTo: today };
    }
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yd = fmt(y);
      return { dateFrom: yd, dateTo: yd };
    }
    case "7d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { dateFrom: fmt(from), dateTo: fmt(now) };
    }
    case "30d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { dateFrom: fmt(from), dateTo: fmt(now) };
    }
    case "all":
    default:
      return { dateFrom: "", dateTo: "" };
  }
}

interface ChartPoint {
  date: string;
  ordersCommission: number;
  communityCommission: number;
  orderCount: number;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function formatShort(amount: number): string {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (amount >= 1_000) return (amount / 1_000).toFixed(1).replace(".0", "") + "K";
  return String(amount);
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  SALE: "Ventes",
  BOOKING: "Réservations",
  DONATION: "Dons",
  PAYMENT: "Paiements",
  COMMUNITY: "Communautés",
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "teal",
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: "teal" | "blue" | "amber" | "red" | "purple" | "green";
  href?: string;
}) {
  const colorMap = {
    teal: "bg-teal-500/10 text-teal-400",
    blue: "bg-blue-500/10 text-blue-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
    purple: "bg-purple-500/10 text-purple-400",
    green: "bg-emerald-500/10 text-emerald-400",
  };

  const card = (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        {href && <ArrowUpRight size={14} className="text-gray-600" />}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="mt-0.5 text-sm text-gray-400">{label}</p>
        {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

// ── Mini bar chart pour les revenus quotidiens ──
function RevenueChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/50">
        <p className="text-sm text-gray-500">Aucune donnée</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.ordersCommission + d.communityCommission), 1);
  // Show last 30 data points max
  const sliced = data.slice(-30);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Commission quotidienne (30j)</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-500" /> Commandes</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> Communautés</span>
        </div>
      </div>
      <div className="flex h-36 items-end gap-[2px]">
        {sliced.map((point) => {
          const orderH = (point.ordersCommission / maxValue) * 100;
          const commH = (point.communityCommission / maxValue) * 100;
          const total = point.ordersCommission + point.communityCommission;
          return (
            <div
              key={point.date}
              className="group relative flex flex-1 flex-col justify-end"
              style={{ minWidth: 0 }}
            >
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs shadow-lg group-hover:block whitespace-nowrap">
                <p className="font-medium text-white">{formatPrice(total)}</p>
                <p className="text-gray-400">{new Date(point.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
                <p className="text-gray-500">{point.orderCount} cmd</p>
              </div>
              <div
                className="w-full rounded-t-sm bg-purple-500/80 transition-opacity hover:opacity-80"
                style={{ height: `${Math.max(commH, commH > 0 ? 2 : 0)}%` }}
              />
              <div
                className="w-full bg-teal-500/80 transition-opacity hover:opacity-80"
                style={{ height: `${Math.max(orderH, orderH > 0 ? 2 : 0)}%`, borderRadius: commH > 0 ? 0 : "2px 2px 0 0" }}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="mt-2 flex justify-between text-[10px] text-gray-600">
        {sliced.length > 0 && <span>{new Date(sliced[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
        {sliced.length > 1 && <span>{new Date(sliced[sliced.length - 1].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
      </div>
    </div>
  );
}

// ── Tableau de répartition par type ──
function OrderTypeTable({ byType }: { byType: Record<string, OrderTypeBreakdown> }) {
  const types = Object.entries(byType).filter(([, v]) => v.count > 0);
  if (types.length === 0) return null;

  const totalCount = types.reduce((s, [, v]) => s + v.count, 0);
  const totalVolume = types.reduce((s, [, v]) => s + v.volume, 0);
  const totalComm = types.reduce((s, [, v]) => s + v.commission, 0);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-300">Répartition par type</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500">
            <th className="pb-2 text-left font-medium">Type</th>
            <th className="pb-2 text-right font-medium">Nb</th>
            <th className="pb-2 text-right font-medium">Volume</th>
            <th className="pb-2 text-right font-medium">Commission</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          {types.map(([type, data]) => (
            <tr key={type} className="border-t border-gray-800/50">
              <td className="py-2">{ORDER_TYPE_LABELS[type] || type}</td>
              <td className="py-2 text-right tabular-nums">{data.count}</td>
              <td className="py-2 text-right tabular-nums">{formatShort(data.volume)}</td>
              <td className="py-2 text-right tabular-nums text-teal-400">{formatShort(data.commission)}</td>
            </tr>
          ))}
          <tr className="border-t border-gray-700 font-semibold text-white">
            <td className="py-2">Total</td>
            <td className="py-2 text-right tabular-nums">{totalCount}</td>
            <td className="py-2 text-right tabular-nums">{formatShort(totalVolume)}</td>
            <td className="py-2 text-right tabular-nums text-teal-400">{formatShort(totalComm)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterPreset>("today");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = getFilterDates(activeFilter);
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const qs = params.toString();

      const [kpiData, chartData] = await Promise.all([
        adminApi<KPIs>(`/api/admin/dashboard/kpis${qs ? `?${qs}` : ""}`),
        adminApi<{ chart: ChartPoint[] }>("/api/admin/dashboard/revenue-chart?days=30"),
      ]);
      setKpis(kpiData);
      setChart(chartData.chart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[140px] rounded-2xl border border-gray-800 bg-gray-900/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-sm text-gray-400">{error || "Impossible de charger les KPIs"}</p>
      </div>
    );
  }

  const ps = kpis.periodSummary;
  const commissionRate = ps.totalVolume > 0 ? ((ps.totalCommission / ps.totalVolume) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* ── Header + Quick Filters ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              Bonjour, {admin?.name}
            </h1>
            <p className="text-sm text-gray-400">Vue d&apos;ensemble de la plateforme</p>
          </div>
        </div>
        {/* Quick filter buttons */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as FilterPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setActiveFilter(preset)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeFilter === preset
                  ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                  : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800 hover:text-gray-300"
              }`}
            >
              {FILTER_LABELS[preset]}
            </button>
          ))}
        </div>
      </div>

      {/* Alertes */}
      {(kpis.operations.failedWebhooks24h > 0 || kpis.operations.pendingReports > 0 || kpis.operations.pendingWithdrawals > 0 || kpis.operations.pendingKyc > 0) && (
        <div className="flex flex-wrap gap-3">
          {kpis.operations.failedWebhooks24h > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
              <AlertTriangle size={14} />
              <span>{kpis.operations.failedWebhooks24h} webhook(s) en erreur (24h)</span>
            </div>
          )}
          {kpis.operations.pendingReports > 0 && (
            <Link href="/admin/reports" className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/15 transition-colors">
              <AlertTriangle size={14} />
              <span>{kpis.operations.pendingReports} signalement(s) en attente</span>
            </Link>
          )}
          {kpis.operations.pendingWithdrawals > 0 && (
            <Link href="/admin/withdrawals" className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/15 transition-colors">
              <Wallet size={14} />
              <span>{kpis.operations.pendingWithdrawals} retrait(s) en attente · {formatPrice(kpis.operations.pendingWithdrawalAmount)}</span>
            </Link>
          )}
          {kpis.operations.pendingKyc > 0 && (
            <Link href="/admin/kyc" className="flex items-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 px-4 py-2.5 text-sm text-purple-400 hover:bg-purple-500/15 transition-colors">
              <Shield size={14} />
              <span>{kpis.operations.pendingKyc} KYC en attente</span>
            </Link>
          )}
        </div>
      )}

      {/* ── Résumé période (HERO) ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Résumé — {FILTER_LABELS[activeFilter]}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Volume encaissé" value={formatPrice(ps.totalVolume)} sub={`${ps.orderCount} transaction(s)`} icon={Banknote} color="teal" />
          <StatCard label="Commission Fari" value={formatPrice(ps.totalCommission)} sub={`${commissionRate}% du volume`} icon={TrendingUp} color="teal" />
          <StatCard label="Part vendeurs" value={formatPrice(ps.totalSellerAmount)} sub={`${kpis.sellers.withSales} vendeur(s) actif(s)`} icon={Users} color="blue" />
          <StatCard label="Retiré" value={formatPrice(ps.totalWithdrawn)} sub={`${ps.withdrawalCount} retrait(s)`} icon={ArrowDownToLine} color="amber" />
          <StatCard label="Net vendeurs" value={formatPrice(ps.netSeller)} sub="Encaissé − retiré" icon={Scale} color={ps.netSeller >= 0 ? "green" : "red"} />
          <StatCard label="Panier moyen" value={formatPrice(ps.avgOrderValue)} sub={`${kpis.orders.total} commandes`} icon={Receipt} color="blue" />
        </div>
      </section>

      {/* ── Graphique revenus + répartition par type ── */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueChart data={chart} />
          <OrderTypeTable byType={kpis.orders.byType} />
        </div>
      </section>

      {/* ── Top vendeurs + Derniers retraits ── */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top vendeurs */}
          {kpis.topSellers && kpis.topSellers.length > 0 && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-gray-300">Top vendeurs — {FILTER_LABELS[activeFilter]}</h3>
              </div>
              <div className="space-y-0">
                <div className="flex items-center text-xs text-gray-500 pb-2">
                  <span className="w-8">#</span>
                  <span className="flex-1">Vendeur</span>
                  <span className="w-20 text-right">Revenu</span>
                  <span className="w-14 text-right">Ventes</span>
                </div>
                {kpis.topSellers.map((seller, i) => (
                  <Link
                    key={seller.sellerId}
                    href={`/admin/sellers/${seller.sellerId}`}
                    className="flex items-center py-2.5 border-t border-gray-800/50 hover:bg-gray-800/30 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <span className={`w-8 text-sm font-bold ${i < 3 ? "text-amber-400" : "text-gray-500"}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{seller.displayName}</p>
                      <p className="text-xs text-gray-500 truncate">@{seller.slug}</p>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-teal-400 tabular-nums">{formatShort(seller.totalRevenue)}</span>
                    <span className="w-14 text-right text-sm text-gray-400 tabular-nums">{seller.orderCount}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Derniers retraits */}
          {kpis.recentWithdrawals && kpis.recentWithdrawals.length > 0 && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-300">Retraits — {FILTER_LABELS[activeFilter]}</h3>
              </div>
              <div className="space-y-0">
                <div className="flex items-center text-xs text-gray-500 pb-2">
                  <span className="flex-1">Vendeur</span>
                  <span className="w-24 text-right">Montant</span>
                  <span className="w-24 text-right">Opérateur</span>
                  <span className="w-28 text-right">Date</span>
                </div>
                {kpis.recentWithdrawals.map((w) => (
                  <div key={w.id} className="flex items-center py-2.5 border-t border-gray-800/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{w.seller.displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{w.recipientName} · {w.phone}</p>
                    </div>
                    <span className="w-24 text-right text-sm font-semibold text-amber-400 tabular-nums">{formatShort(w.amount)}</span>
                    <span className="w-24 text-right text-xs text-gray-400">
                      {w.provider === "wave_money" ? "Wave" : w.provider === "orange_money" ? "Orange" : w.provider}
                    </span>
                    <span className="w-28 text-right text-xs text-gray-500">
                      {w.processedAt ? new Date(w.processedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Vendeurs + MRR ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Plateforme</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Vendeurs actifs"
            value={kpis.sellers.active}
            sub={`${kpis.sellers.total} total · ${kpis.sellers.withSales} avec ventes`}
            icon={Users}
            color="teal"
            href="/admin/sellers"
          />
          {kpis.sellers.newInPeriod !== undefined && (
            <StatCard
              label={`Nouveaux — ${FILTER_LABELS[activeFilter]}`}
              value={kpis.sellers.newInPeriod}
              icon={Users}
              color="green"
            />
          )}
          <StatCard
            label="MRR Communautés"
            value={formatPrice(kpis.communities.mrr)}
            sub={`${kpis.communities.activeSubscriptions} abonnés · ${kpis.communities.totalActive} communautés`}
            icon={Repeat}
            color="purple"
          />
          <StatCard
            label="Commandes"
            value={kpis.orders.total + kpis.orders.communityPayments}
            sub={`${kpis.orders.total} cmd + ${kpis.orders.communityPayments} abo`}
            icon={ShoppingCart}
            color="blue"
            href="/admin/orders"
          />
        </div>
      </section>

      {/* ── Opérations ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Opérations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Retraits en attente"
            value={kpis.operations.pendingWithdrawals}
            sub={kpis.operations.pendingWithdrawalAmount > 0 ? formatPrice(kpis.operations.pendingWithdrawalAmount) : undefined}
            icon={Wallet}
            color="amber"
            href="/admin/withdrawals"
          />
          <StatCard
            label="KYC en attente"
            value={kpis.operations.pendingKyc}
            icon={Shield}
            color="purple"
            href="/admin/kyc"
          />
          <StatCard
            label="Communautés actives"
            value={kpis.communities.totalActive}
            sub={`${kpis.communities.activeSubscriptions} abonnés`}
            icon={MessageSquare}
            color="purple"
          />
          <StatCard
            label="Webhooks en erreur (24h)"
            value={kpis.operations.failedWebhooks24h}
            icon={AlertTriangle}
            color={kpis.operations.failedWebhooks24h > 0 ? "red" : "teal"}
          />
        </div>
      </section>
    </div>
  );
}
