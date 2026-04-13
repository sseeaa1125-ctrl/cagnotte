"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";
import DateRangePicker from "@/components/admin/DateRangePicker";
import Pagination from "@/components/admin/Pagination";
import {
  Search,
  Users,
  AlertTriangle,
  Filter,
  Crown,
  ShieldCheck,
  ShieldX,
  Clock,
  Ban,
} from "lucide-react";

interface SellerRow {
  id: string;
  email: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  plan: "FREE" | "PRO";
  kycStatus: string;
  onboardingCompleted: boolean;
  withdrawalBlocked: boolean;
  customCommissionRate: number | null;
  deletedAt: string | null;
  createdAt: string;
  orderCount: number;
  communityCount: number;
  totalRevenue: number;
}

interface SellersResponse {
  sellers: SellerRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function KycBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    NONE: { label: "Aucun", className: "text-gray-500 bg-gray-500/10", icon: ShieldX },
    PENDING: { label: "En attente", className: "text-amber-400 bg-amber-500/10", icon: Clock },
    APPROVED: { label: "Vérifié", className: "text-green-400 bg-green-500/10", icon: ShieldCheck },
    REJECTED: { label: "Rejeté", className: "text-red-400 bg-red-500/10", icon: ShieldX },
  };
  const c = config[status] || config.NONE;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      <Icon size={12} />
      {c.label}
    </span>
  );
}

export default function AdminSellersPage() {
  const router = useRouter();
  const [data, setData] = useState<SellersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("");
  const [kycFilter, setKycFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [hasSalesFilter, setHasSalesFilter] = useState<string>("");
  const [sortByField, setSortByField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (planFilter) params.set("plan", planFilter);
      if (kycFilter) params.set("kycStatus", kycFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (hasSalesFilter) params.set("hasSales", hasSalesFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("sortBy", sortByField);
      params.set("sortOrder", sortOrder);

      const result = await adminApi<SellersResponse>(`/api/admin/sellers?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter, kycFilter, statusFilter, hasSalesFilter, sortByField, sortOrder, dateFrom, dateTo]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

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
          <h1 className="text-xl font-bold text-white">Vendeurs</h1>
          <p className="text-sm text-gray-400">
            {data ? `${data.pagination.total} vendeur(s)` : "Chargement..."}
          </p>
        </div>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        />
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher par email, slug, nom..."
                className="w-full rounded-xl border border-gray-700 bg-gray-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              Chercher
            </button>
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              showFilters
                ? "border-teal-500 bg-teal-500/10 text-teal-400"
                : "border-gray-700 bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filtres</span>
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
            >
              <option value="">Tous les plans</option>
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
            </select>
            <select
              value={kycFilter}
              onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
            >
              <option value="">Tous les KYC</option>
              <option value="NONE">Aucun</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvé</option>
              <option value="REJECTED">Rejeté</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
            >
              <option value="active">Actifs</option>
              <option value="deleted">Supprimés</option>
              <option value="all">Tous</option>
            </select>
            <select
              value={hasSalesFilter}
              onChange={(e) => { setHasSalesFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
            >
              <option value="">Toutes les ventes</option>
              <option value="with">Avec ventes</option>
              <option value="without">Sans ventes</option>
            </select>
            <select
              value={`${sortByField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setSortByField(field);
                setSortOrder(order);
                setPage(1);
              }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
            >
              <option value="createdAt-desc">Plus récents</option>
              <option value="createdAt-asc">Plus anciens</option>
              <option value="displayName-asc">Nom A-Z</option>
              <option value="displayName-desc">Nom Z-A</option>
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Vendeur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">KYC</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase hidden lg:table-cell">Commandes</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase hidden lg:table-cell">Revenus</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Inscrit le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-5 w-3/4 rounded bg-gray-800 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : data?.sellers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Users size={24} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500">Aucun vendeur trouvé</p>
                </td>
              </tr>
            ) : (
              data?.sellers.map((seller) => (
                <tr
                  key={seller.id}
                  className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/sellers/${seller.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 overflow-hidden shrink-0">
                        {seller.avatarUrl ? (
                          <img src={seller.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium text-gray-400">
                            {seller.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-white truncate">{seller.displayName}</p>
                          {seller.withdrawalBlocked && (
                            <Ban size={12} className="text-red-400 shrink-0" />
                          )}
                          {seller.deletedAt && (
                            <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded shrink-0">Suspendu</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{seller.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      seller.plan === "PRO"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-gray-500/10 text-gray-400"
                    }`}>
                      {seller.plan === "PRO" && <Crown size={10} />}
                      {seller.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <KycBadge status={seller.kycStatus} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 hidden lg:table-cell">
                    {seller.orderCount}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 hidden lg:table-cell">
                    {formatPrice(seller.totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 hidden md:table-cell">
                    {formatDate(seller.createdAt)}
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
    </div>
  );
}
