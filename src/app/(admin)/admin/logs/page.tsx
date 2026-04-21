"use client";

import * as React from "react";
import { ScrollText } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";

// ── Types ──
interface LogAdmin {
  id: string;
  name: string;
  email: string;
}

interface LogRow {
  id: string;
  adminId: string;
  admin: LogAdmin;
  action: string;
  target: string;
  details: unknown;
  ip: string | null;
  createdAt: string;
}

interface LogsResponse {
  logs: LogRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  admins: LogAdmin[];
  actions: string[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AdminLogsPage() {
  const [data, setData] = React.useState<LogsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [adminId, setAdminId] = React.useState("");
  const [action, setAction] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (adminId) params.set("adminId", adminId);
      if (action) params.set("action", action);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await adminApi<LogsResponse>(
        `/api/admin/logs?${params.toString()}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, search, adminId, action, dateFrom, dateTo]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  React.useEffect(() => {
    setPage(1);
  }, [search, adminId, action, dateFrom, dateTo]);

  // Build filter options from response
  const adminOptions = [
    { value: "", label: "Tous les admins" },
    ...(data?.admins.map((a) => ({ value: a.id, label: `${a.name} (${a.email})` })) ?? []),
  ];

  const actionOptions = [
    { value: "", label: "Toutes les actions" },
    ...(data?.actions.map((a) => ({ value: a, label: a })) ?? []),
  ];

  const exportQuery = React.useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (adminId) p.set("adminId", adminId);
    if (action) p.set("action", action);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    return p.toString();
  }, [search, adminId, action, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-headings text-2xl font-black text-primary">
            Journal d&apos;activite
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.totalCount} entree${data.totalCount > 1 ? "s" : ""}` : "Chargement..."}
          </p>
        </div>
        <AdminExportButton
          path={`/api/admin/logs/export.csv${exportQuery ? "?" + exportQuery : ""}`}
          filename={`admin-logs-${new Date().toISOString().slice(0, 10)}.csv`}
          disabled={!data || data.totalCount === 0}
        />
      </div>

      {/* Search */}
      <AdminSearch
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Rechercher par action, cible, admin..."
        className="w-full"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <Select
          compact
          options={adminOptions}
          value={adminId}
          onChange={(e) => setAdminId(e.target.value)}
        />
        <Select
          compact
          options={actionOptions}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Du"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Au"
          />
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      {!loading && data && data.logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={28} />}
          title="Aucun log trouve"
          description="Ajustez vos filtres."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-semibold text-primary">Admin</th>
                <th className="px-4 py-3 font-semibold text-primary">Action</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Cible</th>
                <th className="hidden px-4 py-3 font-semibold text-primary lg:table-cell">Details</th>
                <th className="hidden px-4 py-3 font-semibold text-primary xl:table-cell">IP</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                : data?.logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-primary">
                            {log.admin.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {log.admin.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-primary">
                          {log.action}
                        </code>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        <code className="text-xs font-mono">{log.target}</code>
                      </td>
                      <td className="hidden max-w-xs px-4 py-3 text-muted-foreground lg:table-cell">
                        {log.details ? (
                          <pre className="truncate text-xs font-mono">
                            {JSON.stringify(log.details).slice(0, 80)}
                          </pre>
                        ) : (
                          <span className="text-xs">-</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground font-mono xl:table-cell">
                        {log.ip || "-"}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground whitespace-nowrap sm:table-cell">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
