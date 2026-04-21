"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Banknote,
  Percent,
  ChevronRight,
  Hash,
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { KpiCard } from "@/components/ui/KpiCard";
import { EmptyState } from "@/components/ui/EmptyState";

// ── Types ──
interface OrderSeller {
  id: string;
  slug: string;
  displayName: string;
}

interface OrderBlock {
  id: string;
  slug: string | null;
  title: string;
}

interface OrderRow {
  id: string;
  reference: string;
  orderType: string;
  amount: number;
  commissionAmount: number;
  sellerAmount: number;
  paymentStatus: string;
  paymentOperator: string | null;
  customerName: string | null;
  customerEmail: string;
  isAnonymous: boolean;
  paidAt: string | null;
  createdAt: string;
  seller: OrderSeller | null;
  block: OrderBlock | null;
}

interface OrdersResponse {
  orders: OrderRow[];
  totalRevenue: number;
  totalCommission: number;
  totalSellerAmount: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ── Helpers ──
function formatPrice(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Status badge ──
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Paye", className: "bg-green-100 text-green-700" },
  FAILED: { label: "Echoue", className: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expire", className: "bg-gray-100 text-gray-600" },
  REFUNDED: { label: "Rembourse", className: "bg-blue-100 text-blue-700" },
};

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGE[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return <Badge className={badge.className}>{badge.label}</Badge>;
}

// ── Filters ──
const ORDER_TYPE_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "DONATION", label: "Donation" },
  { value: "SALE", label: "Vente" },
  { value: "BOOKING", label: "Reservation" },
  { value: "PAYMENT", label: "Paiement" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "PAID", label: "Paye" },
  { value: "PENDING", label: "En attente" },
  { value: "FAILED", label: "Echoue" },
  { value: "EXPIRED", label: "Expire" },
  { value: "REFUNDED", label: "Rembourse" },
];

export default function AdminOrdersPage() {
  const [data, setData] = React.useState<OrdersResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [orderType, setOrderType] = React.useState("");
  const [paymentStatus, setPaymentStatus] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Fetch data
  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (orderType) params.set("orderType", orderType);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await adminApi<OrdersResponse>(
        `/api/admin/orders?${params.toString()}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, search, orderType, paymentStatus, dateFrom, dateTo]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [orderType, paymentStatus, dateFrom, dateTo]);

  // Export query — mirror les mêmes filtres que la liste (sans page/limit)
  const exportQuery = React.useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (orderType) p.set("orderType", orderType);
    if (paymentStatus) p.set("paymentStatus", paymentStatus);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    return p.toString();
  }, [search, orderType, paymentStatus, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-headings text-2xl font-black text-primary">
            Commandes & Revenus
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data
              ? `${data.totalCount} commande${data.totalCount > 1 ? "s" : ""}`
              : "Chargement..."}
          </p>
        </div>
        <AdminExportButton
          path={`/api/admin/orders/export.csv${exportQuery ? "?" + exportQuery : ""}`}
          filename={`orders-${new Date().toISOString().slice(0, 10)}.csv`}
          disabled={!data || data.totalCount === 0}
        />
      </div>

      {/* KPI summary */}
      {data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Banknote size={18} />}
            label="Revenu total"
            value={formatPrice(data.totalRevenue)}
          />
          <KpiCard
            icon={<Percent size={18} />}
            label="Commission totale"
            value={formatPrice(data.totalCommission)}
          />
          <KpiCard
            icon={<Banknote size={18} />}
            label="Reversement vendeurs"
            value={formatPrice(data.totalSellerAmount)}
          />
          <KpiCard
            icon={<Hash size={18} />}
            label="Nombre de commandes"
            value={String(data.totalCount)}
          />
        </div>
      ) : null}

      {/* Search */}
      <AdminSearch
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Rechercher par reference, email ou nom..."
        className="w-full"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <Select
          compact
          options={ORDER_TYPE_OPTIONS}
          value={orderType}
          onChange={(e) => setOrderType(e.target.value)}
        />
        <Select
          compact
          options={PAYMENT_STATUS_OPTIONS}
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
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
      {!loading && data && data.orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={28} />}
          title="Aucune commande trouvee"
          description="Ajustez vos filtres ou votre recherche."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Ref</th>
                <th className="px-4 py-3 font-semibold text-primary">Client</th>
                <th className="hidden px-4 py-3 font-semibold text-primary md:table-cell">
                  Cagnotte
                </th>
                <th className="px-4 py-3 font-semibold text-primary">
                  Montant
                </th>
                <th className="hidden px-4 py-3 font-semibold text-primary lg:table-cell">
                  Commission
                </th>
                <th className="px-4 py-3 font-semibold text-primary">Statut</th>
                <th className="hidden px-4 py-3 font-semibold text-primary xl:table-cell">
                  Operateur
                </th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Date</th>
                <th className="px-4 py-3 font-semibold text-primary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                : data?.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      {/* Reference */}
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <p className="font-mono text-xs text-primary">
                          {order.reference}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-primary">
                          {order.isAnonymous
                            ? "Anonyme"
                            : order.customerName || "Anonyme"}
                        </p>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {formatPrice(order.amount)}
                        </p>
                        <p className="hidden text-xs text-muted-foreground sm:block">
                          {order.customerEmail}
                        </p>
                      </td>

                      {/* Block */}
                      <td className="hidden px-4 py-3 md:table-cell">
                        {order.block ? (
                          <Link
                            href={`/admin/cagnottes/${order.block.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {order.block.title}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="hidden px-4 py-3 font-medium text-primary sm:table-cell">
                        {formatPrice(order.amount)}
                      </td>

                      {/* Commission */}
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {formatPrice(order.commissionAmount)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={order.paymentStatus} />
                      </td>

                      {/* Operator */}
                      <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">
                        {order.paymentOperator ?? "-"}
                      </td>

                      {/* Date */}
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatDateTime(order.paidAt || order.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
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
    </div>
  );
}
