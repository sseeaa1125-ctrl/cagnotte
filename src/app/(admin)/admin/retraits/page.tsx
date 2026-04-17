"use client";

import * as React from "react";
import Link from "next/link";
import { Wallet, RefreshCw, XCircle, Zap } from "lucide-react";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/contexts/ToastContext";

// ── Types ──
interface WithdrawalSeller {
  id: string;
  displayName: string;
  slug: string;
  email: string;
}

interface WithdrawalRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  phone: string;
  provider: string;
  recipientName: string | null;
  reference: string;
  bictorysTransactionId: string | null;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
  seller: WithdrawalSeller;
}

interface WithdrawalsResponse {
  withdrawals: WithdrawalRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ── Status badge config ──
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "En cours", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Complete", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejete", className: "bg-red-100 text-red-700" },
};

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "PROCESSING", label: "En cours" },
  { value: "COMPLETED", label: "Complete" },
  { value: "REJECTED", label: "Rejete" },
];

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-SN").format(amount) + " FCFA";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminWithdrawalsPage() {
  const { toast } = useToast();
  const [data, setData] = React.useState<WithdrawalsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [retrying, setRetrying] = React.useState<string | null>(null);

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = React.useState<WithdrawalRow | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  // Execute dialog state
  const [executeTarget, setExecuteTarget] = React.useState<WithdrawalRow | null>(null);
  const [executeError, setExecuteError] = React.useState<string | null>(null);

  const fetchWithdrawals = React.useCallback(async () => {
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

      const res = await adminApi<WithdrawalsResponse>(
        `/api/admin/withdrawals?${params.toString()}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, dateFrom, dateTo]);

  React.useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  React.useEffect(() => {
    setPage(1);
  }, [search, status, dateFrom, dateTo]);

  async function handleRetry(id: string) {
    setRetrying(id);
    try {
      const res = await adminApi<{ status: string; message: string }>(
        `/api/admin/withdrawals/${id}/retry`,
        { method: "POST" },
      );
      toast(res.message, "success");
      fetchWithdrawals();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setRetrying(null);
    }
  }

  async function handleExecute() {
    if (!executeTarget) return;
    setExecuteError(null);
    try {
      const res = await adminApi<{ success: boolean; message: string }>(
        `/api/admin/withdrawals/${executeTarget.id}/execute`,
        { method: "POST" },
      );
      toast(res.message, "success");
      setExecuteTarget(null);
      fetchWithdrawals();
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : "Erreur";
      setExecuteError(msg);
      throw err; // keep dialog open
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelError(null);
    try {
      await adminApi(`/api/admin/withdrawals/${cancelTarget.id}/cancel`, {
        method: "POST",
        body: { reason: cancelReason },
      });
      toast(
        `Retrait de ${formatPrice(cancelTarget.amount)} annule`,
        "success",
      );
      setCancelTarget(null);
      setCancelReason("");
      fetchWithdrawals();
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : "Erreur";
      setCancelError(msg);
      throw err; // keep dialog open
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headings text-2xl font-black text-primary">
          Retraits
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.totalCount} retrait${data.totalCount > 1 ? "s" : ""}` : "Chargement..."}
        </p>
      </div>

      {/* Search */}
      <AdminSearch
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Rechercher par reference, vendeur..."
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
      {!loading && data && data.withdrawals.length === 0 ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title="Aucun retrait trouve"
          description="Ajustez vos filtres."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-semibold text-primary">Vendeur</th>
                <th className="px-4 py-3 font-semibold text-primary">Montant</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Operateur</th>
                <th className="hidden px-4 py-3 font-semibold text-primary md:table-cell">Telephone</th>
                <th className="px-4 py-3 font-semibold text-primary">Statut</th>
                <th className="px-4 py-3 font-semibold text-primary">Date</th>
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
                : data?.withdrawals.map((w) => {
                    const badge = STATUS_BADGE[w.status] ?? STATUS_BADGE.PENDING;
                    const canCancel = w.status === "PENDING" && !w.bictorysTransactionId;
                    const canRetry =
                      (w.status === "PENDING" || w.status === "PROCESSING") &&
                      !!w.bictorysTransactionId;
                    return (
                      <tr
                        key={w.id}
                        className="border-b border-border transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <Link
                              href={`/admin/sellers/${w.seller.id}`}
                              className="truncate font-medium text-primary hover:underline"
                            >
                              {w.seller.displayName}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              @{w.seller.slug}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {formatPrice(w.amount)}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {w.provider}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {w.phone}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={badge.className}>
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(w.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                            {canCancel ? (
                              <>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setExecuteTarget(w);
                                    setExecuteError(null);
                                  }}
                                  iconLeft={<Zap size={14} />}
                                  className="text-xs text-green-600"
                                >
                                  Executer
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setCancelTarget(w);
                                    setCancelReason("");
                                    setCancelError(null);
                                  }}
                                  iconLeft={<XCircle size={14} />}
                                  className="text-xs text-red-600"
                                >
                                  Rejeter
                                </Button>
                              </>
                            ) : null}
                            {canRetry ? (
                              <Button
                                variant="ghost"
                                onClick={() => handleRetry(w.id)}
                                loading={retrying === w.id}
                                disabled={retrying === w.id}
                                iconLeft={<RefreshCw size={14} />}
                                className="text-xs"
                              >
                                Verifier
                              </Button>
                            ) : null}
                            {w.failureReason ? (
                              <span
                                className="max-w-[120px] truncate text-xs text-red-500 cursor-help sm:max-w-[200px]"
                                title={w.failureReason}
                              >
                                {w.failureReason}
                              </span>
                            ) : null}
                            {!canCancel && !canRetry && !w.failureReason ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : null}
                          </div>
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

      {/* Cancel confirmation dialog */}
      <ConfirmDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Annuler le retrait"
        message={
          <div className="space-y-3">
            <p>
              Vous etes sur le point d&apos;annuler le retrait de{" "}
              <span className="font-bold">
                {cancelTarget ? formatPrice(cancelTarget.amount) : ""}
              </span>{" "}
              pour{" "}
              <span className="font-bold">
                {cancelTarget?.seller.displayName}
              </span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Le vendeur sera notifie par email avec la raison de l&apos;annulation.
              Son solde sera retabli.
            </p>
            <Textarea
              label="Raison de l'annulation"
              placeholder="Ex: Document supplementaire requis, activite suspecte..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={500}
            />
          </div>
        }
        confirmLabel="Annuler le retrait"
        tone="danger"
        onConfirm={handleCancel}
        errorMessage={cancelError}
      />

      {/* Execute confirmation dialog */}
      <ConfirmDialog
        open={executeTarget !== null}
        onClose={() => setExecuteTarget(null)}
        title="Executer le retrait immediatement"
        message={
          <div className="space-y-3">
            <p>
              Vous etes sur le point d&apos;executer immediatement le retrait de{" "}
              <span className="font-bold">
                {executeTarget ? formatPrice(executeTarget.amount) : ""}
              </span>{" "}
              pour{" "}
              <span className="font-bold">
                {executeTarget?.seller.displayName}
              </span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Le retrait sera soumis au provider de paiement sans attendre le delai de 48h.
              Cette action est irreversible.
            </p>
          </div>
        }
        confirmLabel="Executer maintenant"
        tone="primary"
        onConfirm={handleExecute}
        errorMessage={executeError}
      />
    </div>
  );
}
