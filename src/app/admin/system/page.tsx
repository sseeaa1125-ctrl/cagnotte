"use client";

import { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/lib/adminApi";
import DateRangePicker from "@/components/admin/DateRangePicker";
import Pagination from "@/components/admin/Pagination";
import {
  Settings,
  Activity,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

type Tab = "webhooks" | "adminlogs" | "admins" | "config";

interface WebhookLog {
  id: string;
  provider: string;
  eventType: string;
  externalId: string | null;
  payload: unknown;
  status: string;
  error: string | null;
  createdAt: string;
}

interface AdminLogEntry {
  id: string;
  action: string;
  target: string;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  admin: { name: string; email: string; role: string };
}

interface AdminEntry {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { logs: number };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminSystemPage() {
  const [tab, setTab] = useState<Tab>("webhooks");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("tab", tab);
      params.set("page", String(page));
      params.set("limit", "20");
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (tab === "webhooks" && statusFilter !== "all") params.set("status", statusFilter);

      const result = await adminApi<Record<string, unknown>>(`/api/admin/system?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [tab, page, dateFrom, dateTo, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const changeTab = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "webhooks", label: "Webhooks", icon: Activity },
    { key: "adminlogs", label: "Logs admin", icon: Shield },
    { key: "admins", label: "Admins", icon: Users },
    { key: "config", label: "Config", icon: Settings },
  ];

  const pagination = data?.pagination as { page: number; totalPages: number; total: number } | undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Système</h1>
          <p className="text-sm text-gray-400">Webhooks, logs, configuration</p>
        </div>
        {(tab === "webhooks" || tab === "adminlogs") && (
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "bg-teal-600/10 text-teal-400 border border-teal-500/30"
                  : "border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-gray-800 bg-gray-900/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Webhooks Tab */}
          {tab === "webhooks" && data && (
            <>
              {/* Webhook stats */}
              {data.stats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                    <p className="text-lg font-bold text-white">{(data.stats as { total: number }).total}</p>
                    <p className="text-xs text-gray-400">Total</p>
                  </div>
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                    <p className="text-lg font-bold text-green-400">{(data.stats as { processed: number }).processed}</p>
                    <p className="text-xs text-gray-400">Traités</p>
                  </div>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-lg font-bold text-red-400">{(data.stats as { failed: number }).failed}</p>
                    <p className="text-xs text-gray-400">En erreur</p>
                  </div>
                </div>
              )}

              <select
                aria-label="Filtrer par statut"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="processed">Traités</option>
                <option value="failed">Échoués</option>
                <option value="ignored">Ignorés</option>
              </select>

              <div className="space-y-2">
                {(data.webhooks as WebhookLog[])?.length === 0 ? (
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/50 py-12 text-center">
                    <Activity size={24} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-gray-500">Aucun webhook</p>
                  </div>
                ) : (
                  (data.webhooks as WebhookLog[])?.map((wh) => (
                    <div key={wh.id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {wh.status === "processed" ? (
                              <CheckCircle size={14} className="text-green-400 shrink-0" />
                            ) : (
                              <XCircle size={14} className="text-red-400 shrink-0" />
                            )}
                            <span className="font-mono text-xs text-teal-400">{wh.eventType}</span>
                            <span className="text-xs text-gray-500">{wh.provider}</span>
                          </div>
                          {wh.externalId && <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{wh.externalId}</p>}
                          {wh.error && <p className="text-xs text-red-400 mt-1 truncate">{wh.error}</p>}
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{formatDate(wh.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Admin Logs Tab */}
          {tab === "adminlogs" && data && (
            <div className="space-y-2">
              {(data.logs as AdminLogEntry[])?.length === 0 ? (
                <div className="rounded-2xl border border-gray-800 bg-gray-900/50 py-12 text-center">
                  <Shield size={24} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500">Aucun log admin</p>
                </div>
              ) : (
                (data.logs as AdminLogEntry[])?.map((log) => (
                  <div key={log.id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-teal-400 text-sm">{log.action}</span>
                          <span className="text-xs text-gray-500">par {log.admin.name} ({log.admin.role})</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{log.target}</p>
                        {log.details && <p className="text-xs text-gray-500 mt-0.5 truncate">{JSON.stringify(log.details)}</p>}
                        {log.ip && <p className="text-xs text-gray-600 mt-0.5">IP: {log.ip}</p>}
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Admins Tab */}
          {tab === "admins" && data && (
            <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Admin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rôle</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Statut</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Créé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {(data.admins as AdminEntry[])?.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{admin.name}</p>
                        <p className="text-xs text-gray-500">{admin.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          admin.role === "SUPER_ADMIN" ? "bg-amber-500/10 text-amber-400" :
                          admin.role === "ADMIN" ? "bg-teal-500/10 text-teal-400" :
                          "bg-gray-500/10 text-gray-400"
                        }`}>
                          {admin.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          admin.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {admin.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">{admin._count.logs} actions</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">{formatDate(admin.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Config Tab */}
          {tab === "config" && data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <Users size={14} className="text-gray-500 mb-1" />
                  <p className="text-lg font-bold text-white">{(data.counts as { sellers: number })?.sellers}</p>
                  <p className="text-xs text-gray-400">Vendeurs actifs</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <Shield size={14} className="text-gray-500 mb-1" />
                  <p className="text-lg font-bold text-white">{(data.counts as { admins: number })?.admins}</p>
                  <p className="text-xs text-gray-400">Admins actifs</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-300">Configuration plateforme</h3>
                </div>
                {(data.configs as { id: string; key: string; value: unknown }[])?.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-gray-500">Aucune configuration</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-800/50">
                      {(data.configs as { id: string; key: string; value: unknown }[])?.map((cfg) => (
                        <tr key={cfg.id} className="hover:bg-gray-800/30">
                          <td className="px-5 py-3 font-mono text-xs text-teal-400">{cfg.key}</td>
                          <td className="px-3 py-3 text-xs text-gray-300 truncate max-w-[300px]">{JSON.stringify(cfg.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Pagination for webhooks and adminlogs */}
          {pagination && (tab === "webhooks" || tab === "adminlogs") && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
