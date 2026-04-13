"use client";

import { useState, useEffect, useCallback } from "react";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import DateRangePicker from "@/components/admin/DateRangePicker";
import Pagination from "@/components/admin/Pagination";
import {
  Search,
  Wallet,
  AlertTriangle,
  Filter,
  Check,
  X,
  Clock,
} from "lucide-react";

interface WithdrawalRow {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  phone: string;
  provider: string;
  recipientName: string | null;
  note: string | null;
  failureReason: string | null;
  merchantFee: number | null;
  processedAt: string | null;
  createdAt: string;
  seller: { id: string; displayName: string; slug: string; email: string };
}

interface WithdrawalsResponse {
  withdrawals: WithdrawalRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { pendingAmount: number; pendingCount: number; completedAmount: number; completedCount: number };
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: { label: "En attente", className: "text-amber-400 bg-amber-500/10" },
    PROCESSING: { label: "En cours", className: "text-blue-400 bg-blue-500/10" },
    COMPLETED: { label: "Complété", className: "text-green-400 bg-green-500/10" },
    REJECTED: { label: "Rejeté", className: "text-red-400 bg-red-500/10" },
  };
  const c = config[status] || { label: status, className: "text-gray-400 bg-gray-500/10" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

export default function AdminWithdrawalsPage() {
  const [data, setData] = useState<WithdrawalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approve" | "reject"; seller: string; amount: number } | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const result = await adminApi<WithdrawalsResponse>(`/api/admin/withdrawals?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setConfirmAction(null);
    setActionLoading(id);
    setActionMsg(null);
    try {
      await adminApi(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        body: { action },
      });
      setActionMsg({ type: "success", text: action === "approve" ? "Retrait approuvé" : "Retrait rejeté" });
      await fetchWithdrawals();
    } catch (err) {
      setActionMsg({ type: "error", text: err instanceof AdminApiError ? err.message : "Erreur" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Retraits</h1>
          <p className="text-sm text-gray-400">
            {data ? `${data.pagination.total} retrait(s)` : "Chargement..."}
          </p>
        </div>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        />
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <Clock size={14} className="text-amber-400 mb-1" />
            <p className="text-lg font-bold text-amber-400">{data.summary.pendingCount}</p>
            <p className="text-xs text-gray-400">En attente</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <Wallet size={14} className="text-amber-400 mb-1" />
            <p className="text-lg font-bold text-amber-400">{formatPrice(data.summary.pendingAmount)}</p>
            <p className="text-xs text-gray-400">Montant en attente</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <Check size={14} className="text-green-400 mb-1" />
            <p className="text-lg font-bold text-white">{data.summary.completedCount}</p>
            <p className="text-xs text-gray-400">Complétés</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <Wallet size={14} className="text-green-400 mb-1" />
            <p className="text-lg font-bold text-white">{formatPrice(data.summary.completedAmount)}</p>
            <p className="text-xs text-gray-400">Montant complété</p>
          </div>
        </div>
      )}

      {/* Action feedback */}
      {actionMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
          actionMsg.type === "success"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {actionMsg.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
          {actionMsg.text}
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                aria-label="Rechercher un retrait"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher par référence, téléphone, vendeur..."
                className="w-full rounded-xl border border-gray-700 bg-gray-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors">
              Chercher
            </button>
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              showFilters ? "border-teal-500 bg-teal-500/10 text-teal-400" : "border-gray-700 bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filtres</span>
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <select
              aria-label="Filtrer par statut"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
            >
              <option value="">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="PROCESSING">En cours</option>
              <option value="COMPLETED">Complété</option>
              <option value="REJECTED">Rejeté</option>
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Vendeur</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Montant</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Téléphone</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Statut</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Date</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-5 w-3/4 rounded bg-gray-800 animate-pulse" /></td></tr>
              ))
            ) : data?.withdrawals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Wallet size={24} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500">Aucun retrait trouvé</p>
                </td>
              </tr>
            ) : (
              data?.withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white truncate max-w-[150px]">{w.seller.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{w.seller.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white">{formatPrice(w.amount)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-xs text-gray-400">{w.provider}</p>
                    <p className="text-xs text-gray-300">{w.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={w.status} /></td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500 hidden md:table-cell">{formatDate(w.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    {w.status === "PENDING" ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: w.id, action: "approve", seller: w.seller.displayName, amount: w.amount }); }}
                          disabled={actionLoading === w.id}
                          className="rounded-lg bg-green-500/10 p-2 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          title="Approuver"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: w.id, action: "reject", seller: w.seller.displayName, amount: w.amount }); }}
                          disabled={actionLoading === w.id}
                          className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          title="Rejeter"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : w.status === "REJECTED" && w.failureReason ? (
                      <span className="text-xs text-red-400/70 truncate max-w-[100px] inline-block" title={w.failureReason}>{w.failureReason}</span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPageChange={setPage}
        />
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setConfirmAction(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">
                  {confirmAction.action === "approve" ? "Approuver le retrait" : "Rejeter le retrait"}
                </h3>
                <button onClick={() => setConfirmAction(null)} className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4 mb-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Vendeur</span>
                  <span className="text-sm font-medium text-white">{confirmAction.seller}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Montant</span>
                  <span className="text-sm font-bold text-white">{formatPrice(confirmAction.amount)}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                {confirmAction.action === "approve"
                  ? "Le retrait sera marqué comme en cours de traitement. Confirmez que le paiement mobile money a bien été effectué."
                  : "Le retrait sera rejeté et le vendeur en sera informé."}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleAction(confirmAction.id, confirmAction.action)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors ${
                    confirmAction.action === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {confirmAction.action === "approve" ? "Confirmer l'approbation" : "Confirmer le rejet"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
