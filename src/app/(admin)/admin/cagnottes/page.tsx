"use client";

import * as React from "react";
import Link from "next/link";
import {
  Heart,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";

// ── Types ──
interface CagnotteSeller {
  id: string;
  slug: string;
  displayName: string;
}

interface CagnotteRow {
  id: string;
  slug: string | null;
  title: string;
  subtype: "festive" | "solidaire" | null;
  status: "active" | "closed";
  visibility: "public" | "private";
  goalAmount: number | null;
  totalRaised: number;
  donorCount: number;
  isActive: boolean;
  seller: CagnotteSeller;
  createdAt: string;
}

interface CagnottesResponse {
  cagnottes: CagnotteRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ── Helpers ──
function formatPrice(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Filters ──
const SUBTYPE_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "solidaire", label: "Solidaire" },
  { value: "festive", label: "Festive" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Cloturee" },
];

export default function AdminCagnottesPage() {
  const [data, setData] = React.useState<CagnottesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [subtype, setSubtype] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Fetch data
  const fetchCagnottes = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (subtype) params.set("subtype", subtype);
      if (status) params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await adminApi<CagnottesResponse>(
        `/api/admin/cagnottes?${params.toString()}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, search, subtype, status, dateFrom, dateTo]);

  React.useEffect(() => {
    fetchCagnottes();
  }, [fetchCagnottes]);

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [subtype, status, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headings text-2xl font-black text-primary">
          Cagnottes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data
            ? `${data.totalCount} cagnotte${data.totalCount > 1 ? "s" : ""}`
            : "Chargement..."}
        </p>
      </div>

      {/* Search */}
      <AdminSearch
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Rechercher par titre ou slug..."
        className="w-full"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <Select
          compact
          options={SUBTYPE_OPTIONS}
          value={subtype}
          onChange={(e) => setSubtype(e.target.value)}
        />
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
      {!loading && data && data.cagnottes.length === 0 ? (
        <EmptyState
          icon={<Heart size={28} />}
          title="Aucune cagnotte trouvee"
          description="Ajustez vos filtres ou votre recherche."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-semibold text-primary">Titre</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Vendeur</th>
                <th className="hidden px-4 py-3 font-semibold text-primary md:table-cell">Type</th>
                <th className="px-4 py-3 font-semibold text-primary">Statut</th>
                <th className="px-4 py-3 font-semibold text-primary">Progression</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Dons</th>
                <th className="hidden px-4 py-3 font-semibold text-primary lg:table-cell">Cree le</th>
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
                : data?.cagnottes.map((c) => {
                    const progress =
                      c.goalAmount && c.goalAmount > 0
                        ? Math.round((c.totalRaised / c.goalAmount) * 100)
                        : 0;
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-border transition-colors hover:bg-muted/30 ${
                          !c.isActive ? "opacity-50" : ""
                        }`}
                      >
                        {/* Title + slug */}
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary">
                              {c.title}
                            </p>
                            {c.slug ? (
                              <p className="truncate text-xs text-muted-foreground">
                                /{c.slug}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        {/* Seller */}
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <Link
                            href={`/admin/sellers/${c.seller.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {c.seller.displayName}
                          </Link>
                        </td>

                        {/* Subtype */}
                        <td className="hidden px-4 py-3 md:table-cell">
                          <Badge
                            className={
                              c.subtype === "solidaire"
                                ? "bg-blue-100 text-blue-700"
                                : c.subtype === "festive"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-100 text-gray-600"
                            }
                          >
                            {c.subtype ?? "-"}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={
                                c.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {c.status === "active" ? "Active" : "Cloturee"}
                            </Badge>
                            {c.visibility === "private" ? (
                              <EyeOff
                                size={14}
                                className="text-muted-foreground"
                                aria-label="Privee"
                              />
                            ) : (
                              <Eye
                                size={14}
                                className="text-muted-foreground"
                                aria-label="Publique"
                              />
                            )}
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="px-4 py-3">
                          <div className="w-24 sm:w-32">
                            <ProgressBar
                              value={progress}
                              raisedLabel={formatPrice(c.totalRaised)}
                              goalLabel={
                                c.goalAmount
                                  ? formatPrice(c.goalAmount)
                                  : undefined
                              }
                            />
                          </div>
                        </td>

                        {/* Donor count */}
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {c.donorCount}
                        </td>

                        {/* Created */}
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {formatDate(c.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/cagnottes/${c.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            Voir
                            <ChevronRight size={14} />
                          </Link>
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
    </div>
  );
}
