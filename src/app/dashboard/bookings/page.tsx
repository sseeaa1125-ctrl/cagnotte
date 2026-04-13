"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { OPERATOR_LABELS } from "@/lib/constants";
import { Badge, Modal, BookingsSkeleton, EmptyState, PullToRefreshIndicator } from "@/components/ui";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  List,
  CreditCard,
  ExternalLink,
  Video,
  X,
} from "lucide-react";

interface Booking {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  sellerAmount: number;
  paymentStatus: string;
  paymentOperator: string | null;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  bookingDate: string | null;
  bookingDuration: number | null;
  bookingLocation: string | null;
  bookingCancelled: boolean;
  bookingCancelledAt: string | null;
  meetingUrl: string | null;
  googleEventId: string | null;
  bookingService: { title: string; price: number; duration: number } | null;
  paidAt: string | null;
  createdAt: string;
}

const JOURS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const JOURS_FR_LONG = [
  "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi",
];
const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const PAGE_SIZE = 10;
const GCAL_DISMISS_KEY = "dismiss-gcal-banner";

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${JOURS_FR_LONG[d.getDay()]} ${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MOIS_FR[d.getMonth()].slice(0, 3)}. ${d.getFullYear()}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const days: (Date | null)[] = [];

  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

type ViewMode = "calendar" | "list";
type FilterStatus = "all" | "upcoming" | "past" | "cancelled";

export default function BookingsPage() {
  const { seller } = useAuth();
  const { toast } = useToast();
  const { data, loading, refresh } = useApi<{ bookings: Booking[] }>("/api/orders/bookings");
  const bookings = data?.bookings || [];

  // Pull to refresh
  const { containerRef: pullRefreshRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: refresh,
  });

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [listPage, setListPage] = useState(0);

  // Refund state
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState("");

  // Google Calendar integration status
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null);
  const [gcalDismissed, setGcalDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(GCAL_DISMISS_KEY)) {
      setGcalDismissed(true);
      return;
    }
    api<{ connected: boolean }>("/api/integrations/google/status")
      .then((res) => setGcalConnected(res.connected))
      .catch(() => setGcalConnected(null));
  }, []);

  function dismissGcalBanner() {
    setGcalDismissed(true);
    localStorage.setItem(GCAL_DISMISS_KEY, "1");
  }

  const handleRefund = useCallback(async () => {
    if (!selectedBooking) return;
    setRefundError("");
    setRefunding(true);
    try {
      await api("/api/orders/" + selectedBooking.id + "/refund", { method: "POST" });
      toast("Remboursement effectué — réservation annulée !");
      setShowRefundConfirm(false);
      setSelectedBooking({ ...selectedBooking, paymentStatus: "REFUNDED", bookingCancelled: true });
      refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erreur lors du remboursement";
      setRefundError(message);
      toast(message, "error");
    } finally {
      setRefunding(false);
    }
  }, [selectedBooking, toast, refresh]);

  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Group bookings by date key
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (!b.bookingDate) continue;
      const d = new Date(b.bookingDate);
      const key = formatDateKey(d);
      const list = map.get(key) || [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [bookings]);

  // Filtered bookings for list view
  const filteredBookings = useMemo(() => {
    const now = new Date();
    let filtered = [...bookings];

    if (filterStatus === "upcoming") {
      filtered = filtered.filter(
        (b) => b.bookingDate && new Date(b.bookingDate) >= now && !b.bookingCancelled
      );
    } else if (filterStatus === "past") {
      filtered = filtered.filter(
        (b) => b.bookingDate && new Date(b.bookingDate) < now && !b.bookingCancelled
      );
    } else if (filterStatus === "cancelled") {
      filtered = filtered.filter((b) => b.bookingCancelled);
    }

    if (filterStatus === "past") {
      filtered.sort((a, b) =>
        new Date(b.bookingDate || 0).getTime() - new Date(a.bookingDate || 0).getTime()
      );
    } else {
      filtered.sort((a, b) =>
        new Date(a.bookingDate || 0).getTime() - new Date(b.bookingDate || 0).getTime()
      );
    }

    return filtered;
  }, [bookings, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);
  const paginatedBookings = useMemo(
    () => filteredBookings.slice(listPage * PAGE_SIZE, (listPage + 1) * PAGE_SIZE),
    [filteredBookings, listPage]
  );

  // Bookings for selected date in calendar
  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    return bookingsByDate.get(selectedDate) || [];
  }, [selectedDate, bookingsByDate]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function getStatusBadge(booking: Booking) {
    if (booking.bookingCancelled) {
      return <Badge variant="error">Annulé</Badge>;
    }
    if (booking.paymentStatus === "PAID") {
      return <Badge variant="success">Confirmé</Badge>;
    }
    if (booking.paymentStatus === "PENDING") {
      return <Badge variant="warning">En attente</Badge>;
    }
    return <Badge variant="error">Échoué</Badge>;
  }

  function getStatusColor(booking: Booking): string {
    if (booking.bookingCancelled) return "bg-red-500";
    if (booking.paymentStatus === "PAID") return "bg-green-500";
    return "bg-amber-400";
  }

  function getStatusIcon(booking: Booking) {
    if (booking.bookingCancelled) return <XCircle size={16} className="text-red-500" />;
    if (booking.paymentStatus === "PAID") return <CheckCircle2 size={16} className="text-green-500" />;
    return <AlertCircle size={16} className="text-amber-500" />;
  }

  if (loading && !data) {
    return <BookingsSkeleton />;
  }

  if (!seller) return null;

  const displayName = seller.displayName || seller.slug;

  // Stats
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.paymentStatus === "PAID" && !b.bookingCancelled).length;
  const upcomingBookings = bookings.filter(
    (b) => b.bookingDate && new Date(b.bookingDate) >= new Date() && b.paymentStatus === "PAID" && !b.bookingCancelled
  ).length;
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "PAID")
    .reduce((sum, b) => sum + b.sellerAmount, 0);

  return (
    <div ref={pullRefreshRef} className="space-y-5 min-h-screen">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Réservations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Suivi de toutes tes réservations, {displayName}
        </p>
      </div>

      {/* Banner : suggérer connexion Google Calendar */}
      {gcalConnected === false && !gcalDismissed && (
        <div className="relative flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-900">
              Automatise tes réunions
            </p>
            <p className="mt-0.5 text-xs text-blue-700">
              Connecte Google Calendar pour créer automatiquement les événements et liens Google Meet.
            </p>
            <Link
              href="/dashboard/settings/integrations"
              className="mt-2 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Connecter
              <ChevronRight size={14} />
            </Link>
          </div>
          <button
            onClick={dismissGcalBanner}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
              <Calendar size={14} className="text-gray-500" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400">Total</p>
              <p className="text-lg font-bold text-gray-900">{totalBookings}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 size={14} className="text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400">Confirmées</p>
              <p className="text-lg font-bold text-green-600">{confirmedBookings}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50">
              <Clock size={14} className="text-teal-600" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400">À venir</p>
              <p className="text-lg font-bold text-teal-600">{upcomingBookings}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
              <CreditCard size={14} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-400">Revenus</p>
              <p className="text-lg font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            viewMode === "calendar"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Calendar size={13} />
          Calendrier
        </button>
        <button
          onClick={() => { setViewMode("list"); setListPage(0); }}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            viewMode === "list"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <List size={13} />
          Liste
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        </div>
      ) : viewMode === "calendar" ? (
        /* ─── Calendar View ─── */
        <div className="rounded-2xl border border-gray-200 bg-white">
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
            <button
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
              aria-label="Mois précédent"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">
                {MOIS_FR[viewMonth]} {viewYear}
              </h2>
              {(viewMonth !== today.getMonth() || viewYear !== today.getFullYear()) && (
                <button
                  onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); setSelectedDate(formatDateKey(today)); }}
                  className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold text-teal-600 transition-colors hover:bg-teal-100"
                >
                  Aujourd&apos;hui
                </button>
              )}
            </div>
            <button
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
              aria-label="Mois suivant"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="p-3 sm:p-5">
            {/* Day names */}
            <div className="mb-1 grid grid-cols-7 text-center">
              {JOURS_FR.map((j) => (
                <div key={j} className="py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {j}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`pad-${idx}`} className="aspect-square sm:aspect-auto sm:h-16" />;

                const dateKey = formatDateKey(day);
                const dayBookings = bookingsByDate.get(dateKey) || [];
                const hasBookings = dayBookings.length > 0;
                const isSelected = selectedDate === dateKey;
                const isToday = formatDateKey(day) === formatDateKey(today);
                const confirmedCount = dayBookings.filter(
                  (b) => b.paymentStatus === "PAID" && !b.bookingCancelled
                ).length;

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                    className={`relative flex aspect-square sm:aspect-auto sm:h-16 w-full flex-col items-center justify-center rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                        : isToday
                          ? "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200"
                          : hasBookings
                            ? "bg-gray-50 text-gray-900 hover:bg-gray-100"
                            : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`text-[13px] sm:text-sm font-semibold ${isToday && !isSelected ? "text-teal-600" : ""}`}>
                      {day.getDate()}
                    </span>
                    {hasBookings && (
                      <div className="mt-0.5 flex items-center gap-0.5">
                        {confirmedCount > 0 && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-green-500"}`}
                          />
                        )}
                        {dayBookings.length > confirmedCount && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/60" : "bg-amber-400"}`}
                          />
                        )}
                        {dayBookings.length > 1 && (
                          <span className={`ml-0.5 text-[8px] font-bold leading-none ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                            {dayBookings.length}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected date bookings */}
          {selectedDate && (
            <div className="border-t border-gray-100 px-4 py-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900">
                  {formatFullDate(selectedDate + "T12:00:00")}
                </h3>
                <span className="text-[10px] font-medium text-gray-400">
                  {selectedDateBookings.length} réservation{selectedDateBookings.length > 1 ? "s" : ""}
                </span>
              </div>

              {selectedDateBookings.length === 0 ? (
                <div className="rounded-xl bg-gray-50 py-6 text-center">
                  <Calendar size={24} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-xs font-medium text-gray-400">
                    Aucune réservation ce jour
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateBookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 text-left transition-all hover:bg-gray-100 hover:shadow-sm active:scale-[0.99]"
                    >
                      <div className={`h-9 w-1 shrink-0 rounded-full ${getStatusColor(booking)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {booking.bookingService?.title || "Réservation"}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {booking.bookingDate ? formatTime(booking.bookingDate) : "—"}
                            {booking.bookingDuration && ` · ${booking.bookingDuration} min`}
                          </span>
                          <span className="truncate">{booking.customerName || booking.customerEmail}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {formatPrice(booking.amount)}
                        </span>
                        <div className="mt-0.5">{getStatusBadge(booking)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ─── List View ─── */
        <div>
          {/* Filters */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-0.5">
            {([
              { key: "all", label: "Toutes", count: bookings.length },
              { key: "upcoming", label: "À venir" },
              { key: "past", label: "Passées" },
              { key: "cancelled", label: "Annulées" },
            ] as { key: FilterStatus; label: string; count?: number }[]).map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilterStatus(f.key); setListPage(0); }}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  filterStatus === f.key
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Aucune réservation"
              description="Les réservations de tes clients apparaîtront ici dès qu'ils prendront rendez-vous."
              action={{ label: "Créer un service", href: "/dashboard/blocks/new" }}
            />
          ) : (
            <>
              <div className="space-y-2">
                {paginatedBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-sm active:scale-[0.99]"
                  >
                    <div className={`h-10 w-1 shrink-0 rounded-full ${getStatusColor(booking)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {booking.bookingService?.title || "Réservation"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        {booking.bookingDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} className="text-gray-400" />
                            {formatShortDate(booking.bookingDate)}
                          </span>
                        )}
                        {booking.bookingDate && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-gray-400" />
                            {formatTime(booking.bookingDate)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User size={11} className="text-gray-400" />
                          <span className="truncate max-w-[120px]">{booking.customerName || booking.customerEmail}</span>
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatPrice(booking.amount)}
                      </p>
                      <div className="mt-1">{getStatusBadge(booking)}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {listPage * PAGE_SIZE + 1}–{Math.min((listPage + 1) * PAGE_SIZE, filteredBookings.length)} sur {filteredBookings.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setListPage(Math.max(0, listPage - 1))}
                      disabled={listPage === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-semibold text-gray-600">
                      {listPage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setListPage(Math.min(totalPages - 1, listPage + 1))}
                      disabled={listPage >= totalPages - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Booking detail modal (bottom sheet on mobile) */}
      <Modal
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking?.bookingService?.title || "Détails réservation"}
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-400">Réf : {selectedBooking.reference}</p>
              {getStatusBadge(selectedBooking)}
            </div>

            {/* Date & time */}
            {selectedBooking.bookingDate && (
              <div className="rounded-2xl bg-teal-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-teal-800">
                  <Calendar size={15} />
                  {formatFullDate(selectedBooking.bookingDate)}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs font-medium text-teal-600">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatTime(selectedBooking.bookingDate)}
                    {selectedBooking.bookingDuration && ` — ${selectedBooking.bookingDuration} min`}
                  </span>
                  {selectedBooking.bookingLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {selectedBooking.bookingLocation}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Google Meet + Calendar actions */}
            {(selectedBooking.meetingUrl || selectedBooking.googleEventId) && !selectedBooking.bookingCancelled && (
              <div className="flex gap-2">
                {selectedBooking.meetingUrl && (
                  <a
                    href={selectedBooking.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:scale-[0.98]"
                  >
                    <Video size={16} />
                    Rejoindre le Meet
                  </a>
                )}
                {selectedBooking.googleEventId && (
                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.98]"
                  >
                    <ExternalLink size={14} />
                    Google Calendar
                  </a>
                )}
              </div>
            )}

            {/* Client info */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Client</p>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                {selectedBooking.customerName && (
                  <p className="flex items-center gap-2.5 text-sm text-gray-700">
                    <User size={14} className="text-gray-400" />
                    {selectedBooking.customerName}
                  </p>
                )}
                <p className="flex items-center gap-2.5 text-sm text-gray-700">
                  <Mail size={14} className="text-gray-400" />
                  {selectedBooking.customerEmail}
                </p>
                {selectedBooking.customerPhone && (
                  <p className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Phone size={14} className="text-gray-400" />
                    {selectedBooking.customerPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Payment */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Paiement</p>
              <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Montant total</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatPrice(selectedBooking.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Tes revenus</span>
                  <span className="text-sm font-bold text-teal-600">
                    {formatPrice(selectedBooking.sellerAmount)}
                  </span>
                </div>
                {selectedBooking.paymentOperator && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Mode de paiement</span>
                    <span className="text-xs font-medium text-gray-700">
                      {OPERATOR_LABELS[selectedBooking.paymentOperator] || selectedBooking.paymentOperator}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Refund / Cancel button */}
            {selectedBooking.paymentStatus === "PAID" && !selectedBooking.bookingCancelled && selectedBooking.customerPhone &&
              (selectedBooking.customerPhone.startsWith("+221") || selectedBooking.customerPhone.startsWith("221")) && (
              <button
                onClick={() => { setRefundError(""); setShowRefundConfirm(true); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 active:scale-[0.98]"
              >
                <RotateCcw size={16} />
                Annuler et rembourser
              </button>
            )}

            {/* Refund confirmation */}
            {showRefundConfirm && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <AlertTriangle size={20} className="text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Annuler cette réservation ?</h3>
                      <p className="text-xs text-gray-500">Le client sera remboursé sur son mobile money</p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl bg-gray-50 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Montant payé par le client</span>
                      <span className="text-gray-700">{formatPrice(selectedBooking.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Remboursé au client</span>
                      <span className="font-bold text-gray-900">{formatPrice(selectedBooking.sellerAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Envoyé vers</span>
                      <span className="text-gray-700">{selectedBooking.customerPhone}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Commission Izy retenue</span>
                      <span className="text-gray-500">{formatPrice(selectedBooking.amount - selectedBooking.sellerAmount)}</span>
                    </div>
                  </div>

                  <p className="mb-4 text-xs text-amber-600">
                    ⚠️ Le client sera remboursé de {formatPrice(selectedBooking.sellerAmount)} (hors commission Izy). Ton solde sera débité du même montant.
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
                      Retour
                    </button>
                    <button
                      onClick={handleRefund}
                      disabled={refunding}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                      {refunding ? "Remboursement..." : "Annuler et rembourser"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
