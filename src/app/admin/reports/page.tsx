"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import {
  Flag,
  AlertTriangle,
  Check,
  X,
  Eye,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Mail,
  ExternalLink,
  Shield,
} from "lucide-react";

interface ReportSeller {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  slug: string;
  isFlagged: boolean;
  plan: string;
  _count: { reports: number };
}

interface ReportItem {
  id: string;
  storeSlug: string;
  reason: string;
  description: string | null;
  email: string | null;
  status: string;
  sellerId: string | null;
  createdAt: string;
  seller: ReportSeller | null;
}

interface ReportsResponse {
  reports: ReportItem[];
  pendingCount: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  SPAM: { label: "Spam", color: "text-amber-400 bg-amber-500/10" },
  SCAM: { label: "Arnaque", color: "text-red-400 bg-red-500/10" },
  INAPPROPRIATE: { label: "Inapproprié", color: "text-orange-400 bg-orange-500/10" },
  IMPERSONATION: { label: "Usurpation", color: "text-purple-400 bg-purple-500/10" },
  OTHER: { label: "Autre", color: "text-gray-400 bg-gray-500/10" },
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "En attente", color: "text-amber-400 bg-amber-500/10", icon: Clock },
  REVIEWED: { label: "Traité", color: "text-green-400 bg-green-500/10", icon: Check },
  DISMISSED: { label: "Rejeté", color: "text-gray-400 bg-gray-500/10", icon: X },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const result = await adminApi<ReportsResponse>(`/api/admin/reports?${params}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function updateReportStatus(reportId: string, status: "REVIEWED" | "DISMISSED") {
    setActionLoading(reportId);
    try {
      await adminApi(`/api/admin/reports/${reportId}/status`, { method: "PATCH", body: { status } });
      await fetchReports();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <Flag size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Signalements</h1>
            {data && (
              <p className="text-sm text-gray-400">
                {data.pendingCount} en attente · {data.pagination.total} au total
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Chercher par slug, motif ou email..."
            className="w-full rounded-xl border border-gray-700 bg-gray-800 pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { value: "", label: "Tous" },
            { value: "PENDING", label: "En attente" },
            { value: "REVIEWED", label: "Traités" },
            { value: "DISMISSED", label: "Rejetés" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-teal-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={14} />{error}
        </div>
      )}

      {/* Reports list */}
      <div className="space-y-3">
        {loading && !data ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl border border-gray-800 bg-gray-900/50 animate-pulse" />
          ))
        ) : data?.reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Shield size={32} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">Aucun signalement {statusFilter === "PENDING" ? "en attente" : ""}</p>
          </div>
        ) : (
          data?.reports.map((report) => {
            const reasonConfig = REASON_LABELS[report.reason] || REASON_LABELS.OTHER;
            const statusConfig = STATUS_LABELS[report.status] || STATUS_LABELS.PENDING;
            const StatusIcon = statusConfig.icon;
            const isLoading = actionLoading === report.id;

            return (
              <div key={report.id} className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: report info */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${reasonConfig.color}`}>
                        {reasonConfig.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon size={10} />
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(report.createdAt)}</span>
                    </div>

                    {/* Seller info */}
                    {report.seller ? (
                      <Link href={`/admin/sellers/${report.seller.id}`} className="flex items-center gap-2 group">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 overflow-hidden shrink-0">
                          {report.seller.avatarUrl ? (
                            <img src={report.seller.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-gray-400">{report.seller.displayName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-white group-hover:text-teal-400 transition-colors truncate">
                              {report.seller.displayName}
                            </span>
                            {report.seller.isFlagged && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                                <Flag size={8} />Suspect
                              </span>
                            )}
                            <ExternalLink size={10} className="text-gray-500 group-hover:text-teal-400 transition-colors shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>/{report.seller.slug}</span>
                            <span>·</span>
                            <span>{report.seller._count.reports} signalement{report.seller._count.reports > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <p className="text-sm text-gray-400">/{report.storeSlug} <span className="text-gray-600">(vendeur supprimé)</span></p>
                    )}

                    {/* Description */}
                    {report.description && (
                      <div className="flex items-start gap-1.5 text-sm text-gray-400">
                        <MessageSquare size={12} className="mt-0.5 shrink-0 text-gray-500" />
                        <p className="line-clamp-2">{report.description}</p>
                      </div>
                    )}

                    {/* Reporter email */}
                    {report.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail size={10} />
                        <span>{report.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: actions */}
                  {report.status === "PENDING" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateReportStatus(report.id, "REVIEWED")}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        title="Marquer comme traité"
                      >
                        <Eye size={12} />
                        <span className="hidden sm:inline">Traité</span>
                      </button>
                      <button
                        onClick={() => updateReportStatus(report.id, "DISMISSED")}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                        title="Rejeter"
                      >
                        <X size={12} />
                        <span className="hidden sm:inline">Rejeter</span>
                      </button>
                      {report.seller && !report.seller.isFlagged && (
                        <Link
                          href={`/admin/sellers/${report.seller.id}`}
                          className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Voir le profil pour flag"
                        >
                          <Flag size={12} />
                          <span className="hidden sm:inline">Flag</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Page {data.pagination.page} / {data.pagination.totalPages} ({data.pagination.total} résultats)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronLeft size={12} />Préc.
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page >= data.pagination.totalPages}
              className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-700 disabled:opacity-50"
            >
              Suiv.<ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
