"use client";

import * as React from "react";
import Link from "next/link";
import {
  Flag,
  ShieldAlert,
  Users,
  ChevronRight,
} from "lucide-react";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/contexts/ToastContext";
import { useAdminSelection } from "@/hooks/useAdminSelection";

// ── Types ──
interface SellerRow {
  id: string;
  slug: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  plan: "FREE" | "PRO";
  kycStatus: string;
  isFlagged: boolean;
  withdrawalBlocked: boolean;
  createdAt: string;
  deletedAt: string | null;
}

interface SellersResponse {
  sellers: SellerRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ── KYC badge helper ──
const KYC_BADGE: Record<string, { label: string; className: string }> = {
  NONE: { label: "Aucun", className: "bg-gray-100 text-gray-600" },
  PENDING: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Approuve", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Refuse", className: "bg-red-100 text-red-700" },
};

function KycBadge({ status }: { status: string }) {
  const badge = KYC_BADGE[status] ?? KYC_BADGE.NONE;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Filter options ──
const KYC_OPTIONS = [
  { value: "", label: "Tous les KYC" },
  { value: "NONE", label: "Aucun" },
  { value: "PENDING", label: "En attente" },
  { value: "APPROVED", label: "Approuve" },
  { value: "REJECTED", label: "Refuse" },
];

const PLAN_OPTIONS = [
  { value: "", label: "Tous les plans" },
  { value: "FREE", label: "Free" },
  { value: "PRO", label: "Pro" },
];

const FLAG_OPTIONS = [
  { value: "", label: "Signalement" },
  { value: "true", label: "Signales" },
  { value: "false", label: "Non signales" },
];

export default function AdminSellersPage() {
  const { toast } = useToast();
  const [data, setData] = React.useState<SellersResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [kycStatus, setKycStatus] = React.useState("");
  const [plan, setPlan] = React.useState("");
  const [isFlagged, setIsFlagged] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Bulk flag/unflag
  const selection = useAdminSelection(`${page}|${search}|${kycStatus}|${plan}|${isFlagged}|${dateFrom}|${dateTo}`);
  const [bulkAction, setBulkAction] = React.useState<"FLAG" | "UNFLAG" | null>(null);
  const [bulkReason, setBulkReason] = React.useState("");
  const [bulkError, setBulkError] = React.useState<string | null>(null);

  // Fetch data
  const fetchSellers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (kycStatus) params.set("kycStatus", kycStatus);
      if (plan) params.set("plan", plan);
      if (isFlagged) params.set("isFlagged", isFlagged);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await adminApi<SellersResponse>(
        `/api/admin/sellers?${params.toString()}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, search, kycStatus, plan, isFlagged, dateFrom, dateTo]);

  React.useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [kycStatus, plan, isFlagged, dateFrom, dateTo]);

  async function handleBulkFlag() {
    if (selection.selectedCount === 0 || bulkAction === null) return;
    const flagged = bulkAction === "FLAG";
    if (flagged && !bulkReason.trim()) {
      setBulkError("Raison obligatoire pour signaler.");
      throw new Error("Raison obligatoire");
    }
    setBulkError(null);
    try {
      const res = await adminApi<{
        ok: boolean;
        updated: number;
        succeededIds: string[];
        failedIds: string[];
      }>(`/api/admin/sellers/bulk/flag`, {
        method: "POST",
        body: {
          sellerIds: selection.selectedIds,
          flagged,
          reason: flagged ? bulkReason.trim() : undefined,
        },
      });
      toast(
        `${res.updated} vendeur(s) ${flagged ? "signalé(s)" : "dé-signalé(s)"}${
          res.failedIds.length ? `, ${res.failedIds.length} ignoré(s)` : ""
        }.`,
        "success",
      );
      setBulkAction(null);
      setBulkReason("");
      selection.clear();
      fetchSellers();
    } catch (err) {
      setBulkError(err instanceof AdminApiError ? err.message : "Erreur");
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headings text-2xl font-black text-primary">
          Vendeurs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.totalCount} vendeur${data.totalCount > 1 ? "s" : ""}` : "Chargement..."}
        </p>
      </div>

      {/* Search */}
      <AdminSearch
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Rechercher par nom, email ou slug..."
        className="w-full"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <Select
          compact
          options={KYC_OPTIONS}
          value={kycStatus}
          onChange={(e) => setKycStatus(e.target.value)}
        />
        <Select
          compact
          options={PLAN_OPTIONS}
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        />
        <Select
          compact
          options={FLAG_OPTIONS}
          value={isFlagged}
          onChange={(e) => setIsFlagged(e.target.value)}
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
      {!loading && data && data.sellers.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="Aucun vendeur trouve"
          description="Ajustez vos filtres ou votre recherche."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-4 py-3">
                  {(() => {
                    const ids = (data?.sellers ?? [])
                      .filter((s) => !s.deletedAt)
                      .map((s) => s.id);
                    const allSelected = ids.length > 0 && ids.every((id) => selection.isSelected(id));
                    const someSelected = ids.some((id) => selection.isSelected(id));
                    return (
                      <input
                        type="checkbox"
                        aria-label="Tout sélectionner"
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-40"
                        disabled={ids.length === 0}
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={() => selection.toggleAll(ids)}
                      />
                    );
                  })()}
                </th>
                <th className="px-4 py-3 font-semibold text-primary">Nom</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Email</th>
                <th className="hidden px-4 py-3 font-semibold text-primary lg:table-cell">Plan</th>
                <th className="px-4 py-3 font-semibold text-primary">KYC</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Flags</th>
                <th className="hidden px-4 py-3 font-semibold text-primary md:table-cell">Cree le</th>
                <th className="px-4 py-3 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                : data?.sellers.map((seller) => (
                    <tr
                      key={seller.id}
                      className={`border-b border-border transition-colors hover:bg-muted/30 ${
                        seller.deletedAt ? "opacity-50" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner ${seller.displayName}`}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-40"
                          disabled={!!seller.deletedAt}
                          checked={selection.isSelected(seller.id)}
                          onChange={() => !seller.deletedAt && selection.toggleOne(seller.id)}
                        />
                      </td>
                      {/* Avatar + Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={seller.avatarUrl}
                            name={seller.displayName}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary">
                              {seller.displayName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{seller.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {seller.email}
                      </td>

                      {/* Plan */}
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <Badge
                          className={
                            seller.plan === "PRO"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {seller.plan}
                        </Badge>
                      </td>

                      {/* KYC */}
                      <td className="px-4 py-3">
                        <KycBadge status={seller.kycStatus} />
                      </td>

                      {/* Flags */}
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          {seller.isFlagged ? (
                            <Flag size={16} className="text-red-500" aria-label="Signale" />
                          ) : null}
                          {seller.withdrawalBlocked ? (
                            <ShieldAlert
                              size={16}
                              className="text-orange-500"
                              aria-label="Retraits bloques"
                            />
                          ) : null}
                          {!seller.isFlagged && !seller.withdrawalBlocked ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {formatDate(seller.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/sellers/${seller.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          Voir
                          <ChevronRight size={14} />
                        </Link>
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

      {/* Bulk action bar */}
      <BulkActionBar
        count={selection.selectedCount}
        onClear={selection.clear}
      >
        <Button
          variant="danger"
          iconLeft={<Flag size={14} />}
          onClick={() => { setBulkAction("FLAG"); setBulkReason(""); setBulkError(null); }}
          className="!min-h-9 !px-3 !py-1.5 !text-xs"
        >
          Signaler
        </Button>
        <Button
          variant="outline"
          iconLeft={<Flag size={14} />}
          onClick={() => { setBulkAction("UNFLAG"); setBulkError(null); }}
          className="!min-h-9 !px-3 !py-1.5 !text-xs"
        >
          Dé-signaler
        </Button>
      </BulkActionBar>

      {/* Bulk confirm dialog */}
      <ConfirmDialog
        open={bulkAction !== null}
        onClose={() => { setBulkAction(null); setBulkError(null); }}
        title={
          bulkAction === "FLAG"
            ? "Signaler les vendeurs sélectionnés"
            : "Dé-signaler les vendeurs sélectionnés"
        }
        message={
          <div className="space-y-3">
            <p>
              Vous êtes sur le point de{" "}
              <span className="font-bold">
                {bulkAction === "FLAG" ? "signaler" : "dé-signaler"}{" "}
                {selection.selectedCount} vendeur{selection.selectedCount > 1 ? "s" : ""}
              </span>.
            </p>
            {bulkAction === "FLAG" && (
              <Textarea
                label="Raison du signalement (obligatoire)"
                placeholder="Ex: Activité suspecte, contenu inapproprié..."
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                maxLength={500}
              />
            )}
          </div>
        }
        confirmLabel={bulkAction === "FLAG" ? "Signaler" : "Dé-signaler"}
        tone={bulkAction === "FLAG" ? "danger" : "primary"}
        onConfirm={handleBulkFlag}
        errorMessage={bulkError}
      />
    </div>
  );
}
