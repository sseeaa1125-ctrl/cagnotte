"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";
import DateRangePicker from "@/components/admin/DateRangePicker";
import Pagination from "@/components/admin/Pagination";
import {
  Search,
  ShoppingCart,
  AlertTriangle,
  Filter,
  TrendingUp,
} from "lucide-react";

interface OrderRow {
  id: string;
  reference: string;
  orderType: string;
  amount: number;
  commissionAmount: number;
  sellerAmount: number;
  paymentStatus: string;
  paymentProvider: string;
  paymentOperator: string | null;
  customerEmail: string;
  customerName: string | null;
  paidAt: string | null;
  createdAt: string;
  seller: { id: string; displayName: string; slug: string; email: string };
}

interface OrdersResponse {
  orders: OrderRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { totalAmount: number; totalCommission: number; totalSellerAmount: number; paidCount: number };
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PAID: { label: "Payé", className: "text-green-400 bg-green-500/10" },
    PENDING: { label: "En attente", className: "text-amber-400 bg-amber-500/10" },
    FAILED: { label: "Échoué", className: "text-red-400 bg-red-500/10" },
    EXPIRED: { label: "Expiré", className: "text-gray-400 bg-gray-500/10" },
    REFUNDED: { label: "Remboursé", className: "text-blue-400 bg-blue-500/10" },
  };
  const c = config[status] || { label: status, className: "text-gray-400 bg-gray-500/10" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    SALE: { label: "Vente", className: "text-teal-400 bg-teal-500/10" },
    BOOKING: { label: "RDV", className: "text-blue-400 bg-blue-500/10" },
    PAYMENT: { label: "Paiement", className: "text-purple-400 bg-purple-500/10" },
    DONATION: { label: "Don", className: "text-pink-400 bg-pink-500/10" },
    COMMUNITY: { label: "Communauté", className: "text-amber-400 bg-amber-500/10" },
  };
  const c = config[type] || { label: type, className: "text-gray-400 bg-gray-500/10" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("orderType", typeFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const result = await adminApi<OrdersResponse>(`/api/admin/orders?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

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
          <h1 className="text-xl font-bold text-white">Paiements</h1>
          <p className="text-sm text-gray-400">
            {data ? `${data.pagination.total} transaction(s)` : "Chargement..."}
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
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <ShoppingCart size={14} className="text-gray-500 mb-1" />
            <p className="text-lg font-bold text-white">{data.summary.paidCount}</p>
            <p className="text-xs text-gray-400">Payées</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <TrendingUp size={14} className="text-gray-500 mb-1" />
            <p className="text-lg font-bold text-white">{formatPrice(data.summary.totalAmount)}</p>
            <p className="text-xs text-gray-400">Volume total</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <TrendingUp size={14} className="text-teal-500 mb-1" />
            <p className="text-lg font-bold text-teal-400">{formatPrice(data.summary.totalCommission)}</p>
            <p className="text-xs text-gray-400">Commission Izy</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <TrendingUp size={14} className="text-gray-500 mb-1" />
            <p className="text-lg font-bold text-white">{formatPrice(data.summary.totalSellerAmount)}</p>
            <p className="text-xs text-gray-400">Part vendeurs</p>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                aria-label="Rechercher une commande"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher par référence, email, vendeur, communauté..."
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
              <option value="PAID">Payé</option>
              <option value="PENDING">En attente</option>
              <option value="FAILED">Échoué</option>
              <option value="EXPIRED">Expiré</option>
              <option value="REFUNDED">Remboursé</option>
            </select>
            <select
              aria-label="Filtrer par type"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
            >
              <option value="">Tous les types</option>
              <option value="SALE">Vente</option>
              <option value="BOOKING">RDV</option>
              <option value="PAYMENT">Paiement</option>
              <option value="DONATION">Don</option>
              <option value="COMMUNITY">Communauté</option>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Référence</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Vendeur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Montant</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase hidden lg:table-cell">Commission</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Statut</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-5 w-3/4 rounded bg-gray-800 animate-pulse" /></td></tr>
              ))
            ) : data?.orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <ShoppingCart size={24} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500">Aucune transaction trouvée</p>
                </td>
              </tr>
            ) : (
              data?.orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/sellers/${order.seller.id}`)}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-teal-400">{order.reference}</p>
                    <p className="text-xs text-gray-500">{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-gray-300 truncate max-w-[150px]">{order.seller.displayName}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><TypeBadge type={order.orderType} /></td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatPrice(order.amount)}</td>
                  <td className="px-4 py-3 text-right text-teal-400 hidden lg:table-cell">{formatPrice(order.commissionAmount)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={order.paymentStatus} /></td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500 hidden md:table-cell">{formatDate(order.createdAt)}</td>
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
