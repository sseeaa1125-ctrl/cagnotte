"use client";

import * as React from "react";
import { Flag, Check, X } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";

// ── Types ──
interface ReportSeller {
  id: string;
  displayName: string;
  slug: string;
  email: string;
}

interface ReportRow {
  id: string;
  storeSlug: string;
  reason: string;
  description: string | null;
  email: string | null;
  status: string;
  sellerId: string | null;
  seller: ReportSeller | null;
  createdAt: string;
}

interface ReportsResponse {
  reports: ReportRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ── Status badge config ──
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
  REVIEWED: { label: "Examine", className: "bg-green-100 text-green-700" },
  DISMISSED: { label: "Rejete", className: "bg-gray-100 text-gray-600" },
};

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "REVIEWED", label: "Examine" },
  { value: "DISMISSED", label: "Rejete" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [data, setData] = React.useState<ReportsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [acting, setActing] = React.useState<string | null>(null);

  // Dismiss confirmation
  const [dismissTarget, setDismissTarget] = React.useState<ReportRow | null>(null);

  const fetchReports = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await adminApi<ReportsResponse>(
        `/api/admin/reports?${params.toString()}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, dateFrom, dateTo]);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  React.useEffect(() => {
    setPage(1);
  }, [search, status, dateFrom, dateTo]);

  async function handleAction(id: string, newStatus: "REVIEWED" | "DISMISSED") {
    setActing(id);
    try {
      await adminApi(`/api/admin/reports/${id}`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      toast(
        newStatus === "REVIEWED" ? "Signalement examine" : "Signalement rejete",
        "success",
      );
      fetchReports();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleDismissConfirm() {
    if (!dismissTarget) return;
    setDismissTarget(null);
    await handleAction(dismissTarget.id, "DISMISSED");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headings text-2xl font-black text-primary">
          Signalements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.totalCount} signalement${data.totalCount > 1 ? "s" : ""}` : "Chargement..."}
        </p>
      </div>

      {/* Search */}
      <AdminSearch
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Rechercher par page, raison, email..."
        className="w-full"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <Select
          compact
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
        />
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      {!loading && data && data.reports.length === 0 ? (
        <EmptyState
          icon={<Flag size={28} />}
          title="Aucun signalement trouve"
          description="Ajustez vos filtres."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-semibold text-primary">Page</th>
                <th className="px-4 py-3 font-semibold text-primary">Raison</th>
                <th className="hidden px-4 py-3 font-semibold text-primary md:table-cell">Description</th>
                <th className="hidden px-4 py-3 font-semibold text-primary lg:table-cell">Email</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Statut</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Date</th>
                <th className="px-4 py-3 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                : data?.reports.map((r) => {
                    const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.PENDING;
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-border transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-primary">{r.storeSlug}</p>
                          {r.seller ? (
                            <a
                              href={`/admin/sellers/${r.seller.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              {r.seller.displayName}
                            </a>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-orange-100 text-orange-700">
                            {r.reason}
                          </Badge>
                        </td>
                        <td className="hidden max-w-xs px-4 py-3 text-muted-foreground md:table-cell">
                          <p className="truncate">{r.description || "-"}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {r.email || "-"}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <Badge className={badge.className}>
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "PENDING" ? (
                            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                              <Button
                                variant="ghost"
                                onClick={() => handleAction(r.id, "REVIEWED")}
                                loading={acting === r.id}
                                disabled={acting !== null}
                                iconLeft={<Check size={14} />}
                                className="text-xs text-green-600"
                              >
                                Examiner
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => setDismissTarget(r)}
                                disabled={acting !== null}
                                iconLeft={<X size={14} />}
                                className="text-xs text-red-600"
                              >
                                Rejeter
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 ? (
        <Pagination
          page={data.currentPage}
          pageCount={data.totalPages}
          onChange={setPage}
        />
      ) : null}

      {/* Dismiss confirmation dialog */}
      <ConfirmDialog
        open={dismissTarget !== null}
        onClose={() => setDismissTarget(null)}
        title="Rejeter le signalement"
        message={`Etes-vous sur de vouloir rejeter ce signalement pour "${dismissTarget?.storeSlug}" ? Cette action est irreversible.`}
        confirmLabel="Rejeter"
        tone="danger"
        onConfirm={handleDismissConfirm}
      />
    </div>
  );
}
