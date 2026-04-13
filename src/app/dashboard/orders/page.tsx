"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Card, Badge, Modal, OrdersSkeleton, EmptyState, PullToRefreshIndicator, DateRangePicker, Pagination } from "@/components/ui";
import type { DateRange } from "@/components/ui";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { api, ApiError } from "@/lib/api";
import { useNotifications } from "@/contexts/NotificationContext";
import { getCache, setCache } from "@/lib/useApi";
import { formatPrice } from "@/lib/utils";
import { exportToCsv } from "@/lib/exportCsv";
import {
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_VARIANTS,
  OPERATOR_LABELS,
} from "@/lib/constants";
import {
  Download,
  Search,
  X,
  User,
  Mail,
  Phone,
  ShoppingBag,
  CreditCard,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  Users,
  RotateCcw,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

interface OrderItem {
  id: string;
  reference: string;
  orderType: string;
  amount: number;
  currency: string;
  sellerAmount: number;
  paymentStatus: string;
  paymentOperator: string | null;
  paymentProvider: string | null;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  paymentNote: string | null;
  donorMessage: string | null;
  bookingDate: string | null;
  bookingDuration: number | null;
  bookingLocation: string | null;
  meetingUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  product: { title: string; fileName: string | null } | null;
  bookingService: { title: string } | null;
  bumpSelections?: { title: string; price: number }[];
}

const STATUS_FILTERS = [
  { value: "PAID", label: "Payées" },
  { value: "PENDING", label: "En attente" },
  { value: "FAILED", label: "Échouées" },
];

const TYPE_FILTERS = [
  { value: "all", label: "Tous types" },
  { value: "SALE", label: "Ventes" },
  { value: "BOOKING", label: "Réservations" },
  { value: "PAYMENT", label: "Paiements" },
  { value: "COMMUNITY", label: "Communautés" },
];


const STATUS_LEGEND = [
  { label: "Payé", color: "bg-green-500", desc: "Le paiement a été confirmé. L'argent est sur ton solde." },
  { label: "En attente", color: "bg-amber-500", desc: "Le client a initié le paiement mais il n'est pas encore confirmé." },
  { label: "Échoué", color: "bg-red-500", desc: "Le paiement n'a pas abouti (solde insuffisant, annulation, etc.)." },
  { label: "Expiré", color: "bg-gray-400", desc: "Le client n'a pas finalisé le paiement dans le délai imparti." },
  { label: "Remboursé", color: "bg-blue-500", desc: "Tu as remboursé le client. Le montant a été déduit de ton solde." },
];

const PAGE_SIZE = 15;

interface OrdersResponse {
  orders: OrderItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

function StatusLegendToggle() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center rounded-full p-1.5 transition-colors ${
          open ? "bg-teal-100 text-teal-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        }`}
        aria-label="Légende des statuts"
      >
        <HelpCircle size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-bold text-gray-900">Signification des statuts</p>
            <div className="space-y-2">
              {STATUS_LEGEND.map((s) => (
                <div key={s.label} className="flex items-start gap-2">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.color}`} />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                    <p className="text-[11px] leading-tight text-gray-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const { refreshCounts } = useNotifications();

  // Filters — server-side
  const [filterStatus, setFilterStatus] = useState("PAID");
  const [filterType, setFilterType] = useState("all");
  // Date filter
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [activePreset, setActivePreset] = useState("");
  // Search is still client-side for instant feedback
  const [searchQuery, setSearchQuery] = useState("");

  // Build date params
  const dateParams = dateRange && !activePreset
    ? `from=${dateRange.from.toISOString().split("T")[0]}&to=${dateRange.to.toISOString().split("T")[0]}`
    : activePreset ? `period=${activePreset === "month" ? "30" : activePreset}` : "";

  // Fetch orders with current filters and page
  const fetchOrders = useCallback(async (page: number, status: string, type: string, datePrms: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
      if (status !== "all") params.set("status", status);
      if (type !== "all") params.set("type", type);
      if (datePrms) {
        datePrms.split("&").forEach((p) => {
          const [k, v] = p.split("=");
          if (k && v) params.set(k, v);
        });
      }
      const res = await api<OrdersResponse>(`/api/orders?${params}`);
      setOrders(res.orders);
      setTotalPages(res.totalPages);
      setTotalCount(res.totalCount);
      setCurrentPage(res.currentPage);
      // Cache only the default view
      if (status === "PAID" && type === "all" && page === 0 && !datePrms) {
        setCache("/api/orders?limit=15&status=PAID", res);
      }
    } catch (err) {
      console.error("Erreur chargement commandes", err);
      setOrders([]);
      setTotalPages(0);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    await fetchOrders(currentPage, filterStatus, filterType, dateParams);
  }, [fetchOrders, currentPage, filterStatus, filterType, dateParams]);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: refreshOrders,
  });

  // Mark orders as seen on mount — resets the badge
  useEffect(() => {
    api("/api/inbox/mark-seen", { method: "POST", body: { target: "orders" } })
      .then(() => refreshCounts())
      .catch(() => {});
  }, [refreshCounts]);

  // Initial load + reload when filters/page change
  useEffect(() => {
    fetchOrders(currentPage, filterStatus, filterType, dateParams);
  }, [fetchOrders, currentPage, filterStatus, filterType, dateParams]);

  // Reset to page 0 when filters change
  const prevFilters = useRef({ filterStatus, filterType, dateParams });
  useEffect(() => {
    const prev = prevFilters.current;
    if (prev.filterStatus !== filterStatus || prev.filterType !== filterType || prev.dateParams !== dateParams) {
      prevFilters.current = { filterStatus, filterType, dateParams };
      setCurrentPage(0);
    }
  }, [filterStatus, filterType, dateParams]);

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage - 1); // Convert 1-indexed to 0-indexed
  }

  // Client-side search filter only (status/type are server-side)
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        (o.customerName?.toLowerCase().includes(q)) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.reference.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  function handleExportCsv(data: OrderItem[]) {
    const headers = ["Référence", "Type", "Client", "Email", "Montant (FCFA)", "Net vendeur (FCFA)", "Statut", "Date", "Extras"];
    const rows = data.map((o) => [
      o.reference,
      ORDER_TYPE_LABELS[o.orderType] || o.orderType,
      o.customerName || "",
      o.customerEmail.endsWith("@noemail.local") ? "" : o.customerEmail,
      String(o.amount),
      String(o.sellerAmount),
      PAYMENT_STATUS_LABELS[o.paymentStatus] || o.paymentStatus,
      new Date(o.createdAt).toLocaleDateString("fr-FR"),
      o.bumpSelections?.map((b) => `${b.title} (${b.price})`).join(", ") || "",
    ]);
    exportToCsv(`commandes-izy-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  if (loading) {
    return <OrdersSkeleton />;
  }

  return (
    <div ref={containerRef} className="space-y-5 min-h-screen">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ventes</h1>
          <p className="mt-1 text-sm text-gray-500">{totalCount ?? orders.length} transaction(s)</p>
        </div>
        {orders.length > 0 && (
          <button
            onClick={() => handleExportCsv(filteredOrders)}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Download size={14} />
            Exporter CSV
          </button>
        )}
      </div>

      {/* Search + Filters — always show if filters are active or there are orders */}
      {(orders.length > 0 || filterStatus !== "PAID" || filterType !== "all" || dateRange || searchQuery) && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters: status pills (wrap) + type dropdown + date picker */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status pills */}
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`rounded-full px-3.5 py-2 sm:py-1.5 text-xs font-semibold transition-colors ${
                  filterStatus === f.value
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
            <StatusLegendToggle />

            {/* Type dropdown — custom */}
            <TypeDropdown
              value={filterType}
              onChange={setFilterType}
              options={TYPE_FILTERS}
            />

            {/* Date filter */}
            <DateRangePicker
              value={dateRange}
              activePreset={activePreset}
              onChange={(range, presetValue) => {
                setDateRange(range);
                setActivePreset(presetValue || "");
              }}
            />
          </div>

          {/* Result count */}
          {(filterStatus !== "PAID" || filterType !== "all" || searchQuery || dateRange) && (
            <p className="text-xs text-gray-500">
              {totalCount} résultat(s)
              <button
                onClick={() => { setFilterStatus("PAID"); setFilterType("all"); setSearchQuery(""); setDateRange(null); setActivePreset(""); }}
                className="ml-2 font-semibold text-teal-600 hover:text-teal-700"
              >
                Réinitialiser
              </button>
            </p>
          )}
        </div>
      )}

      {/* Pagination top */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage + 1}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Orders list */}
      {!orders.length && filterStatus === "PAID" && filterType === "all" && !dateRange && !searchQuery ? (
        <EmptyState
          icon={ShoppingBag}
          title="Aucune commande"
          description="Tes commandes apparaîtront ici dès qu'un client achètera un de tes produits."
          action={{ label: "Créer un produit", href: "/dashboard/blocks/new" }}
          className="mt-2"
        />
      ) : !orders.length || filteredOrders.length === 0 ? (
        <Card className="mt-2">
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">
              Aucune commande ne correspond à tes filtres.
            </p>
            <button
              onClick={() => { setFilterStatus("PAID"); setFilterType("all"); setSearchQuery(""); setDateRange(null); setActivePreset(""); }}
              className="mt-3 rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer transition-all hover:border-teal-200 hover:shadow-sm active:scale-[0.99]"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {order.customerName || (order.customerEmail.endsWith("@noemail.local") ? (order.customerPhone || "Client anonyme") : order.customerEmail)}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-gray-400">
                    {order.reference}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {formatPrice(order.amount)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Net : {formatPrice(order.sellerAmount)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge>{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</Badge>
                  <Badge variant={STATUS_VARIANTS[order.paymentStatus] || "default"}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                  </Badge>
                  {["dev_simulation", "dev_credit"].includes(order.paymentProvider || "") && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Test
                    </span>
                  )}
                  {order.bumpSelections && order.bumpSelections.length > 0 && (
                    <span className="text-[10px] font-medium text-teal-600">
                      +{order.bumpSelections.length} extra{order.bumpSelections.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination bottom */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage + 1}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Order detail modal */}
      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Commande ${selectedOrder?.reference || ""}`}
      >
        {selectedOrder && <OrderDetail order={selectedOrder} onRefunded={(updated) => {
          setSelectedOrder(updated);
          setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
        }} />}
      </Modal>
    </div>
  );
}

// ── Custom dropdown for type filter ──
function TypeDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const prevOpen = useRef(open);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setFocusIndex(options.findIndex((o) => o.value === value)); // eslint-disable-line react-hooks/set-state-in-effect
    }
    prevOpen.current = open;
  }, [open, options, value]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusIndex((prev) => (prev + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIndex((prev) => (prev - 1 + options.length) % options.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < options.length) {
          onChange(options[focusIndex].value);
          setOpen(false);
        }
        break;
    }
  }

  const activeLabel = options.find((o) => o.value === value)?.label || options[0].label;

  return (
    <div className="relative ml-auto sm:ml-0" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full py-2 sm:py-1.5 pl-3.5 pr-2.5 text-xs font-semibold transition-colors ${
          value !== "all"
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {activeLabel}
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""} ${
            value !== "all" ? "text-white/70" : "text-gray-400"
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-20 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {options.map((o, i) => (
            <button
              key={o.value}
              role="option"
              aria-selected={value === o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-medium transition-colors ${
                value === o.value
                  ? "bg-teal-50 text-teal-700"
                  : i === focusIndex
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {value === o.value && (
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
              )}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Order type config for visual distinction ──
const ORDER_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  SALE: { icon: <ShoppingBag size={16} />, color: "text-teal-700", bg: "bg-teal-50", label: "Vente" },
  BOOKING: { icon: <Calendar size={16} />, color: "text-blue-700", bg: "bg-blue-50", label: "Réservation" },
  PAYMENT: { icon: <CreditCard size={16} />, color: "text-purple-700", bg: "bg-purple-50", label: "Paiement / Don" },
  COMMUNITY: { icon: <Users size={16} />, color: "text-amber-700", bg: "bg-amber-50", label: "Communauté" },
};

// ── Order detail component inside modal ──
function OrderDetail({ order, onRefunded }: { order: OrderItem; onRefunded?: (updatedOrder: OrderItem) => void }) {
  const { toast } = useToast();
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState("");

  const isSenegalPhone = order.customerPhone && (order.customerPhone.startsWith("+221") || order.customerPhone.startsWith("221"));
  const canRefund = order.orderType === "BOOKING" && order.paymentStatus === "PAID" && order.customerPhone && isSenegalPhone;

  async function handleRefund() {
    setRefundError("");
    setRefunding(true);
    try {
      await api("/api/orders/" + order.id + "/refund", { method: "POST" });
      toast("Remboursement effectué !");
      setShowRefundConfirm(false);
      if (onRefunded) {
        onRefunded({ ...order, paymentStatus: "REFUNDED" });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erreur lors du remboursement";
      setRefundError(message);
      toast(message, "error");
    } finally {
      setRefunding(false);
    }
  }
  const productTitle = order.product?.title || order.bookingService?.title || order.paymentNote || "—";
  const typeConfig = ORDER_TYPE_CONFIG[order.orderType] || ORDER_TYPE_CONFIG.SALE;

  return (
    <div className="space-y-5">
      {/* Type + Status header */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${typeConfig.bg}`}>
          <span className={typeConfig.color}>{typeConfig.icon}</span>
          <span className={`text-sm font-bold ${typeConfig.color}`}>{typeConfig.label}</span>
        </div>
        <Badge variant={STATUS_VARIANTS[order.paymentStatus] || "default"}>
          {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
        </Badge>
      </div>

      {/* Product / Service name */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <p className="text-xs font-medium text-gray-500">Produit / Service</p>
        <p className="mt-0.5 text-sm font-bold text-gray-900">{productTitle}</p>
        {order.product?.fileName && (
          <p className="mt-0.5 text-xs text-gray-500">Fichier : {order.product.fileName}</p>
        )}
      </div>

      {/* Client */}
      <div className="rounded-xl bg-gray-50 p-3 space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Client</p>
        <div className="space-y-1.5">
          {order.customerName && (
            <div className="flex items-center gap-2 text-sm text-gray-900">
              <User size={14} className="text-gray-400" />
              {order.customerName}
            </div>
          )}
          {!order.customerEmail.endsWith("@noemail.local") && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Mail size={14} className="text-gray-400" />
              {order.customerEmail}
            </div>
          )}
          {order.customerPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Phone size={14} className="text-gray-400" />
              {order.customerPhone}
            </div>
          )}
        </div>
      </div>


      {/* Booking info */}
      {order.orderType === "BOOKING" && order.bookingDate && (
        <div className="rounded-xl bg-blue-50 p-3 space-y-2">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Réservation</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-900">
              <Calendar size={14} className="text-blue-500" />
              {new Date(order.bookingDate).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Clock size={14} className="text-blue-500" />
              {new Date(order.bookingDate).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {order.bookingDuration && ` · ${order.bookingDuration} min`}
            </div>
            {order.bookingLocation && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin size={14} className="text-blue-500" />
                {order.bookingLocation}
              </div>
            )}
            {order.meetingUrl && (
              <a
                href={order.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-200"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
                Rejoindre le Google Meet
              </a>
            )}
          </div>
        </div>
      )}

      {/* Donor message (PAYMENT orders) */}
      {(order.orderType === "PAYMENT" || order.orderType === "DONATION") && order.donorMessage && (
        <div className="rounded-xl bg-amber-50 p-3 space-y-1">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Message du donateur</p>
          <p className="text-sm text-gray-900 italic">&ldquo;{order.donorMessage}&rdquo;</p>
        </div>
      )}

      {/* Order bumps */}
      {order.bumpSelections && order.bumpSelections.length > 0 && (
        <div className="rounded-xl bg-gray-50 p-3 space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Extras ajoutés</p>
          {order.bumpSelections.map((bump, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-700">
                <ShoppingBag size={14} className="text-gray-400" />
                {bump.title}
              </span>
              <span className="font-semibold text-gray-900">{formatPrice(bump.price)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Payment */}
      <div className="rounded-xl bg-gray-50 p-3 space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Paiement</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Montant total</span>
            <span className="font-bold text-gray-900">{formatPrice(order.amount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Net vendeur</span>
            <span className="font-semibold text-teal-600">{formatPrice(order.sellerAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Commission Izy</span>
            <span className="text-gray-700">{formatPrice(order.amount - order.sellerAmount)}</span>
          </div>
          {order.paymentOperator && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Opérateur</span>
              <span className="flex items-center gap-1.5 text-gray-700">
                <CreditCard size={12} className="text-gray-400" />
                {OPERATOR_LABELS[order.paymentOperator] || order.paymentOperator}
              </span>
            </div>
          )}
          {["dev_simulation", "dev_credit"].includes(order.paymentProvider || "") && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Mode</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Test / Simulation
              </span>
            </div>
          )}
          {order.paidAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Payé le</span>
              <span className="text-gray-700">
                {new Date(order.paidAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Refund button for BOOKING PAID */}
      {canRefund && (
        <button
          onClick={() => setShowRefundConfirm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 active:scale-[0.98]"
        >
          <RotateCcw size={16} />
          Rembourser le client
        </button>
      )}

      {/* Refund confirmation modal */}
      {showRefundConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Confirmer le remboursement</h3>
                <p className="text-xs text-gray-500">Cette action est irréversible</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-gray-50 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Montant payé par le client</span>
                <span className="text-gray-700">{formatPrice(order.amount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Remboursé au client</span>
                <span className="font-bold text-gray-900">{formatPrice(order.sellerAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Envoyé vers</span>
                <span className="text-gray-700">{order.customerPhone}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Commission Izy retenue</span>
                <span className="text-gray-500">{formatPrice(order.amount - order.sellerAmount)}</span>
              </div>
            </div>

            <p className="mb-4 text-xs text-amber-600">
              ⚠️ Le client sera remboursé de {formatPrice(order.sellerAmount)} (hors commission Izy). Ton solde sera débité du même montant.
            </p>

            {refundError && (
              <p className="mb-3 text-xs text-red-600">{refundError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowRefundConfirm(false); setRefundError(""); }}
                disabled={refunding}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {refunding ? "Remboursement..." : "Rembourser"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dates */}
      <p className="text-center text-[10px] text-gray-400">
        Créée le {new Date(order.createdAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
