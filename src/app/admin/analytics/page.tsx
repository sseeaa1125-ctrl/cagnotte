"use client";

import { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/lib/adminApi";
import DateRangePicker from "@/components/admin/DateRangePicker";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Wallet,
  Eye,
  MessageSquare,
  AlertTriangle,
  Crown,
} from "lucide-react";

interface AnalyticsData {
  period: { from: string; to: string };
  overview: {
    newSellers: number;
    paidOrders: number;
    totalRevenue: number;
    platformCommission: number;
    ordersCommission: number;
    communityRevenue: number;
    communityCommission: number;
    communityPayments: number;
    withdrawalsCompleted: number;
    withdrawalsAmount: number;
    pageViews: number;
  };
  topSellers: {
    seller: { id: string; displayName: string; slug: string; email: string };
    totalRevenue: number;
    commission: number;
    orderCount: number;
  }[];
  ordersByType: { type: string; count: number; amount: number }[];
  charts: {
    dailyOrders: { date: string; count: number }[];
    dailyRevenue: { date: string; revenue: number; commission: number }[];
  };
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function TypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = { SALE: "Ventes", BOOKING: "RDV", PAYMENT: "Paiements" };
  return <>{labels[type] || type}</>;
}

export default function AdminAnalyticsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(toDateStr(thirtyDaysAgo));
  const [dateTo, setDateTo] = useState(toDateStr(now));

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const result = await adminApi<AnalyticsData>(`/api/admin/analytics?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Analytics</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-gray-800 bg-gray-900/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-sm text-gray-400">{error || "Impossible de charger les analytics"}</p>
      </div>
    );
  }

  const { overview, topSellers, ordersByType, charts } = data;

  // Simple bar chart with CSS
  const maxDailyRevenue = Math.max(...charts.dailyRevenue.map((d) => d.revenue), 1);
  const maxDailyOrders = Math.max(...charts.dailyOrders.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-gray-400">
            {new Date(data.period.from).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} — {new Date(data.period.to).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
        />
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Revenus total", value: formatPrice(overview.totalRevenue), icon: TrendingUp, color: "text-teal-400" },
          { label: "Commission plateforme", value: formatPrice(overview.platformCommission), icon: TrendingUp, color: "text-teal-400" },
          { label: "Commandes payées", value: overview.paidOrders, icon: ShoppingCart, color: "text-blue-400" },
          { label: "Nouveaux vendeurs", value: overview.newSellers, icon: Users, color: "text-blue-400" },
          { label: "Commission orders", value: formatPrice(overview.ordersCommission), icon: ShoppingCart, color: "text-gray-400" },
          { label: "Revenus communautés", value: formatPrice(overview.communityRevenue), icon: MessageSquare, color: "text-purple-400" },
          { label: "Retraits complétés", value: formatPrice(overview.withdrawalsAmount), icon: Wallet, color: "text-amber-400" },
          { label: "Pages vues", value: new Intl.NumberFormat("fr-FR").format(overview.pageViews), icon: Eye, color: "text-gray-400" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <Icon size={14} className={`${stat.color} mb-1`} />
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Revenus quotidiens</h3>
          {charts.dailyRevenue.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Aucune donnée</p>
          ) : (
            <div className="flex items-end gap-[2px] h-40">
              {charts.dailyRevenue.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-white whitespace-nowrap">
                    {new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}: {formatPrice(d.revenue)}
                  </div>
                  <div
                    className="w-full bg-teal-500/60 rounded-t-sm transition-all hover:bg-teal-400/80"
                    style={{ height: `${Math.max(2, (d.revenue / maxDailyRevenue) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders Chart */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Commandes quotidiennes</h3>
          {charts.dailyOrders.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Aucune donnée</p>
          ) : (
            <div className="flex items-end gap-[2px] h-40">
              {charts.dailyOrders.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-white whitespace-nowrap">
                    {new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}: {d.count}
                  </div>
                  <div
                    className="w-full bg-blue-500/60 rounded-t-sm transition-all hover:bg-blue-400/80"
                    style={{ height: `${Math.max(2, (d.count / maxDailyOrders) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sellers */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300">Top 10 vendeurs</h3>
          </div>
          {topSellers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">Aucune donnée</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-800/50">
                {topSellers.map((s, i) => (
                  <tr key={s.seller.id} className="hover:bg-gray-800/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500 w-5">{i + 1}</span>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-white truncate max-w-[140px]">{s.seller.displayName}</p>
                            {i < 3 && <Crown size={10} className="text-amber-400" />}
                          </div>
                          <p className="text-xs text-gray-500">/{s.seller.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-300">{formatPrice(s.totalRevenue)}</td>
                    <td className="px-3 py-3 text-right text-teal-400 text-xs">{formatPrice(s.commission)}</td>
                    <td className="px-3 py-3 text-right text-xs text-gray-500">{s.orderCount} cmd</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Orders by Type */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Répartition par type</h3>
          {ordersByType.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Aucune donnée</p>
          ) : (
            <div className="space-y-4">
              {ordersByType.map((t) => {
                const totalCount = ordersByType.reduce((acc, x) => acc + x.count, 0);
                const pct = totalCount > 0 ? Math.round((t.count / totalCount) * 100) : 0;
                const colors: Record<string, string> = { SALE: "bg-teal-500", BOOKING: "bg-blue-500", PAYMENT: "bg-purple-500" };
                return (
                  <div key={t.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300"><TypeLabel type={t.type} /></span>
                      <span className="text-xs text-gray-500">{t.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div className={`h-full rounded-full ${colors[t.type] || "bg-gray-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{formatPrice(t.amount)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
