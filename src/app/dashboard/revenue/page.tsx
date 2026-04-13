"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, Button, Modal, Input, Badge, DashboardSkeleton, DateRangePicker, EmptyState, PhoneInput, PinInput, PullToRefreshIndicator, Pagination } from "@/components/ui";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import type { DateRange } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, ArrowDownToLine, Clock, CheckCircle2, XCircle, Wallet, BarChart3, Heart, MessageSquare, Shield, AlertTriangle, Check, Download, Copy, ChevronRight, Fingerprint } from "lucide-react";
import { OPERATOR_LABELS } from "@/lib/constants";
import { OPERATORS } from "@/types";

// Only payout-eligible operators (no card)
const PAYOUT_OPERATORS = OPERATORS.filter((op) => op.id === "wave_money" || op.id === "orange_money");

interface RevenueStats {
  revenue: number;
  salesCount: number;
  totalOrders: number;
  period: number;
}

interface BalanceData {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  payoutPhone: string | null;
  payoutProvider: string | null;
  payoutName: string | null;
  payoutCountry: string | null;
  kycStatus: string;
  hasWithdrawalPin: boolean;
  withdrawalBlocked: boolean;
  withdrawalBlockReason: string | null;
}

interface WithdrawalItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  phone: string;
  provider: string;
  recipientName: string | null;
  reference: string | null;
  bictorysTransactionId: string | null;
  note: string | null;
  merchantFee: number | null;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface DailyRevenue {
  date: string;
  amount: number;
  count: number;
}

interface PaymentOrder {
  id: string;
  reference: string;
  amount: number;
  sellerAmount: number;
  paymentStatus: string;
  customerEmail: string;
  customerName: string | null;
  donorMessage: string | null;
  paymentNote: string | null;
  paidAt: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PROCESSING: "En cours",
  COMPLETED: "Terminé",
  REJECTED: "Refusé",
};

const STATUS_BADGE: Record<string, "warning" | "default" | "success" | "error"> = {
  PENDING: "warning",
  PROCESSING: "default",
  COMPLETED: "success",
  REJECTED: "error",
};


export default function RevenuePage() {
  const { toast } = useToast();
  const { seller } = useAuth();
  const commissionRate = seller?.plan === "PRO" ? "4%" : "8%";
  const [revenueTab, setRevenueTab] = useState<"retraits" | "paiements">("retraits");
  const [chartOpen, setChartOpen] = useState(false);
  const [period, setPeriod] = useState("14");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [activePreset, setActivePreset] = useState("14");

  // Build API URLs — custom range uses from/to, presets use period
  const dateParams = dateRange && !activePreset
    ? `from=${dateRange.from.toISOString().split("T")[0]}&to=${dateRange.to.toISOString().split("T")[0]}`
    : `period=${period}`;

  const { data: stats, loading: loadingStats } = useApi<RevenueStats>(
    `/api/sellers/dashboard/stats?${dateParams}`
  );
  const { data: balance, loading: loadingBalance, refresh: refreshBalance } = useApi<BalanceData>(
    "/api/withdrawals/balance"
  );
  const { data: withdrawalsData, loading: loadingWithdrawals, refresh: refreshWithdrawals } = useApi<{ withdrawals: WithdrawalItem[]; nextCursor: string | null; hasMore: boolean }>(
    "/api/withdrawals?limit=15"
  );

  // Pull to refresh
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshBalance(), refreshWithdrawals()]);
  }, [refreshBalance, refreshWithdrawals]);

  const { containerRef: pullRefreshRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: refreshAll,
  });
  const { data: chartRes, loading: loadingChart } = useApi<{ dailyRevenue: DailyRevenue[] }>(
    `/api/sellers/dashboard/revenue-chart?${dateParams}`
  );
  // Payments pagination state
  const PAGE_SIZE = 10;
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [payments, setPayments] = useState<PaymentOrder[]>([]);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(0);
  const [paymentsTotalCount, setPaymentsTotalCount] = useState(0);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Payments date filter (separate from global dateRange)
  const [paymentsDateRange, setPaymentsDateRange] = useState<DateRange | null>(null);
  const [paymentsActivePreset, setPaymentsActivePreset] = useState("");

  // Build payments API URL with page-based pagination
  const paymentsDateParams = paymentsDateRange && !paymentsActivePreset
    ? `from=${paymentsDateRange.from.toISOString().split("T")[0]}&to=${paymentsDateRange.to.toISOString().split("T")[0]}`
    : paymentsActivePreset ? `period=${paymentsActivePreset === "month" ? "30" : paymentsActivePreset}` : "";

  const fetchPayments = useCallback(async (page: number, dateParams: string) => {
    setLoadingPayments(true);
    try {
      const params = new URLSearchParams({
        type: "PAYMENT",
        status: "PAID",
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (dateParams) {
        dateParams.split("&").forEach((p) => {
          const [k, v] = p.split("=");
          if (k && v) params.set(k, v);
        });
      }
      const res = await api<{ orders: PaymentOrder[]; totalPages: number; totalCount: number; currentPage: number }>(
        `/api/orders?${params}`
      );
      setPayments(res.orders);
      setPaymentsTotalPages(res.totalPages);
      setPaymentsTotalCount(res.totalCount);
      setPaymentsPage(res.currentPage);
    } catch (err) {
      console.error("Erreur chargement paiements", err);
      setPayments([]);
      setPaymentsTotalPages(0);
      setPaymentsTotalCount(0);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  // Fetch payments on mount and when page/filters change
  useEffect(() => {
    fetchPayments(paymentsPage, paymentsDateParams);
  }, [fetchPayments, paymentsPage, paymentsDateParams]);

  // Reset to page 0 when date filter changes
  const prevDateParams = useRef(paymentsDateParams);
  useEffect(() => {
    if (prevDateParams.current !== paymentsDateParams) {
      prevDateParams.current = paymentsDateParams;
      setPaymentsPage(0);
    }
  }, [paymentsDateParams]);

  function handlePaymentsPageChange(newPage: number) {
    setPaymentsPage(newPage - 1); // Convert 1-indexed to 0-indexed
  }

  const [extraWithdrawals, setExtraWithdrawals] = useState<WithdrawalItem[]>([]);
  const [wCursor, setWCursor] = useState<string | null>(null);
  const [wHasMore, setWHasMore] = useState(false);
  const [wLoadingMore, setWLoadingMore] = useState(false);

  useEffect(() => {
    if (withdrawalsData) {
      setWCursor(withdrawalsData.nextCursor);
      setWHasMore(withdrawalsData.hasMore);
      setExtraWithdrawals([]);
    }
  }, [withdrawalsData]);

  const withdrawals = [...(withdrawalsData?.withdrawals || []), ...extraWithdrawals];
  const chartData = chartRes?.dailyRevenue || [];
  const loading = loadingStats || loadingBalance || loadingWithdrawals || loadingChart;

  function loadMoreWithdrawals() {
    if (!wCursor || wLoadingMore) return;
    setWLoadingMore(true);
    api<{ withdrawals: WithdrawalItem[]; nextCursor: string | null; hasMore: boolean }>(
      `/api/withdrawals?limit=15&cursor=${wCursor}`
    )
      .then((res) => {
        setExtraWithdrawals((prev) => [...prev, ...res.withdrawals]);
        setWCursor(res.nextCursor);
        setWHasMore(res.hasMore);
      })
      .finally(() => setWLoadingMore(false));
  }

  // Withdrawal form
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [wStep, setWStep] = useState<"form" | "pin" | "confirm" | "processing" | "success">("form");
  const [wAmount, setWAmount] = useState("");
  const [wPhone, setWPhone] = useState(""); // Full number: "+221 77 123 45 67"
  const [wPhoneRaw, setWPhoneRaw] = useState(""); // Raw digits: "771234567"
  const [wPhoneCountry, setWPhoneCountry] = useState("SN");
  const [wName, setWName] = useState("");
  const [wProvider, setWProvider] = useState("wave_money");
  const [wPin, setWPin] = useState("");
  const [wSaving, setWSaving] = useState(false);
  const [wError, setWError] = useState("");
  const [wResult, setWResult] = useState<{ message: string; amount: number; fee: number; phone: string; provider: string; reference: string } | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalItem | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentOrder | null>(null);
  const submittingRef = useRef(false); // Anti double-click lock

  const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];
  const MIN_AMOUNT = 5000;
  const MAX_AMOUNT = 500000;

  const handlePhoneChange = useCallback((fullNumber: string, rawDigits: string, countryCode: string) => {
    setWPhone(fullNumber);
    setWPhoneRaw(rawDigits);
    setWPhoneCountry(countryCode);
  }, []);

  // Pre-fill from seller profile when balance data loads
  const prefilled = useRef(false);
  useEffect(() => {
    if (balance && !prefilled.current) {
      prefilled.current = true;
      if (balance.payoutProvider) setWProvider(balance.payoutProvider);
      if (balance.payoutName) setWName(balance.payoutName);
      if (balance.payoutPhone) {
        setWPhone(balance.payoutPhone);
        // Extract raw digits so validation and button state work
        const raw = balance.payoutPhone.replace(/\D/g, "");
        const dialMap: Record<string, string> = { SN: "221", CI: "225" };
        const dialPrefix = dialMap[balance.payoutCountry || "SN"] || "";
        setWPhoneRaw(raw.startsWith(dialPrefix) ? raw.slice(dialPrefix.length) : raw);
      }
      if (balance.payoutCountry) setWPhoneCountry(balance.payoutCountry);
    }
  }, [balance]);

  const [showKycGate, setShowKycGate] = useState(false);

  function openWithdrawModal() {
    // KYC gate: if not approved, show KYC prompt instead
    if (balance && balance.kycStatus !== "APPROVED") {
      setShowKycGate(true);
      return;
    }
    setWAmount("");
    setWPin("");
    setWStep("form");
    setWError("");
    setWResult(null);
    if (balance?.payoutProvider && !wProvider) setWProvider(balance.payoutProvider);
    if (balance?.payoutName && !wName) setWName(balance.payoutName);
    setShowWithdraw(true);
  }

  function validateForm(): string | null {
    const amount = parseInt(wAmount);
    if (!wAmount || isNaN(amount) || amount < MIN_AMOUNT) {
      return `Le montant minimum est de ${MIN_AMOUNT.toLocaleString("fr-FR")} FCFA`;
    }
    if (amount > MAX_AMOUNT) {
      return `Le montant maximum est de ${MAX_AMOUNT.toLocaleString("fr-FR")} FCFA`;
    }
    if (balance && (balance.balance <= 0 || amount > balance.balance)) {
      return "Solde insuffisant";
    }
    if (!wPhoneRaw || wPhoneRaw.length < 7) {
      return "Num\u00e9ro de t\u00e9l\u00e9phone invalide";
    }
    if (!wName || wName.trim().length < 2) {
      return "Le nom du titulaire est requis";
    }
    return null;
  }

  function handleGoToConfirm() {
    const err = validateForm();
    if (err) {
      setWError(err);
      return;
    }
    setWError("");
    // Si le vendeur a un code de retrait, passer par l'étape PIN d'abord
    if (balance?.hasWithdrawalPin) {
      setWPin("");
      setWStep("pin");
    } else {
      setWStep("confirm");
    }
  }

  async function handleWithdraw() {
    // Anti double-click: useRef lock (survives re-renders)
    if (submittingRef.current || wSaving) return;
    submittingRef.current = true;
    setWSaving(true);
    setWError("");
    setWStep("processing");

    try {
      const amount = parseInt(wAmount);
      const res = await api<{
        success: boolean;
        message: string;
        withdrawal?: { amount: number; fee: number; phone: string; provider: string; reference: string };
      }>("/api/withdrawals", {
        method: "POST",
        body: {
          amount,
          phone: wPhone,
          phoneCountry: wPhoneCountry,
          provider: wProvider,
          recipientName: wName.trim(),
          ...(balance?.hasWithdrawalPin && wPin ? { withdrawalPin: wPin } : {}),
        },
      });
      setWResult({
        message: res.message || "Retrait effectué !",
        amount: res.withdrawal?.amount || amount,
        fee: res.withdrawal?.fee || 0,
        phone: res.withdrawal?.phone || wPhone,
        provider: res.withdrawal?.provider || wProvider,
        reference: res.withdrawal?.reference || "",
      });
      setWStep("success");
      refreshBalance();
      refreshWithdrawals();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur réseau. Vérifie ta connexion et réessaie.";
      setWError(msg);
      // Si le code PIN est incorrect, revenir à l'étape PIN
      if (err instanceof ApiError && (msg.includes("Code de retrait") || msg.includes("code de retrait"))) {
        setWPin("");
        setWStep("pin");
      } else {
        setWStep("confirm");
      }
    } finally {
      setWSaving(false);
      submittingRef.current = false;
    }
  }

  function generateReceipt(data: { amount: number; fee: number; phone: string; provider: string; reference: string; name: string; date: string }) {
    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Reçu de retrait — Izy</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,system-ui,sans-serif;background:#f9fafb;padding:40px 20px;color:#111827}
.receipt{max-width:400px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden}
.header{background:#0d9488;color:#fff;padding:24px;text-align:center}
.header h1{font-size:18px;font-weight:700}
.header p{font-size:12px;opacity:0.85;margin-top:4px}
.body{padding:24px}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
.row:last-child{border-bottom:none}
.row .label{color:#6b7280}
.row .value{font-weight:600;color:#111827;text-align:right}
.total{background:#f0fdfa;padding:16px;margin:16px 0;border-radius:12px;text-align:center}
.total .amount{font-size:24px;font-weight:800;color:#0d9488}
.footer{padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af}
@media print{body{background:#fff;padding:0}.receipt{border:none;box-shadow:none}}
</style></head><body>
<div class="receipt">
<div class="header"><h1>Reçu de retrait</h1><p>izy.store</p></div>
<div class="body">
<div class="total"><div class="amount">${data.amount.toLocaleString("fr-FR")} FCFA</div></div>
<div class="row"><span class="label">Référence</span><span class="value">${data.reference}</span></div>
<div class="row"><span class="label">Date</span><span class="value">${data.date}</span></div>
<div class="row"><span class="label">Opérateur</span><span class="value">${OPERATOR_LABELS[data.provider] || data.provider}</span></div>
<div class="row"><span class="label">Numéro</span><span class="value">${data.phone}</span></div>
<div class="row"><span class="label">Titulaire</span><span class="value">${data.name}</span></div>
${data.fee > 0 ? `<div class="row"><span class="label">Frais</span><span class="value">${data.fee.toLocaleString("fr-FR")} FCFA</span></div>` : ""}
</div>
<div class="footer">Document généré automatiquement — izy.store</div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast("Référence copiée !");
    });
  }

  if (loading && !stats && !balance) {
    return <DashboardSkeleton />;
  }

  return (
    <div ref={pullRefreshRef} className="space-y-5 min-h-screen">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <h1 className="text-xl font-bold text-gray-900">Revenus</h1>

      {/* Solde disponible — gros chiffre */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
              <Wallet size={24} className="text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">Solde disponible</p>
              <p className={`text-2xl font-extrabold sm:text-3xl ${(balance?.balance ?? 0) < 0 ? "text-red-600" : "text-gray-900"}`}>
                {formatPrice(balance?.balance || 0)}
              </p>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={openWithdrawModal}
            disabled={!balance || balance.balance < 5000 || balance.withdrawalBlocked}
          >
            <ArrowDownToLine size={16} className="mr-2" />
            Retirer
          </Button>
        </div>
      </Card>

      {/* Admin withdrawal block warning */}
      {balance?.withdrawalBlocked && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <Shield size={14} className="shrink-0 text-red-500" />
          <p className="text-xs text-red-700">
            Tes retraits sont temporairement bloqués. Contacte le support pour plus d'informations.
          </p>
        </div>
      )}

      {/* Negative balance warning */}
      {balance && balance.balance < 0 && !balance.withdrawalBlocked && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={14} className="shrink-0 text-red-500" />
          <p className="text-xs text-red-700">
            Ton solde est négatif. Les retraits sont bloqués tant que tes revenus n'ont pas compensé le solde.
          </p>
        </div>
      )}

      {/* Minimum withdrawal hint */}
      {balance && balance.balance >= 0 && balance.balance < 5000 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={14} className="shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">
            Minimum <span className="font-semibold">5 000 FCFA</span> de solde disponible pour effectuer un retrait.
          </p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total gagné</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{formatPrice(balance?.totalEarned || 0)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Retiré</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{formatPrice(balance?.totalWithdrawn || 0)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">En attente</p>
          <p className="mt-1 text-lg font-bold text-amber-600">{formatPrice(balance?.pendingWithdrawals || 0)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Commission</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{commissionRate}</p>
        </div>
      </div>

      {/* Period stats */}
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-gray-400" />
            <h2 className="text-sm font-bold text-gray-900">Ventes par période</h2>
          </div>
          <DateRangePicker
            value={dateRange}
            activePreset={activePreset}
            onChange={(range, presetValue) => {
              setDateRange(range);
              if (presetValue) {
                setActivePreset(presetValue);
                const map: Record<string, string> = { "7": "7", "14": "14", "30": "30", "month": "30" };
                setPeriod(map[presetValue] || "14");
              } else {
                setActivePreset("");
              }
            }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-2.5 sm:p-3">
            <p className="text-[10px] text-gray-500">Revenus</p>
            <p className="text-sm font-bold text-gray-900 sm:text-base">{formatPrice(stats?.revenue || 0)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-2.5 sm:p-3">
            <p className="text-[10px] text-gray-500">Ventes</p>
            <p className="text-sm font-bold text-gray-900 sm:text-base">{stats?.salesCount || 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-2.5 sm:p-3">
            <p className="text-[10px] text-gray-500">Commandes</p>
            <p className="text-sm font-bold text-gray-900 sm:text-base">{stats?.totalOrders || 0}</p>
          </div>
        </div>
      </div>

      {/* Revenue chart — collapsible */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white">
          <button
            onClick={() => setChartOpen(!chartOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-gray-400" />
              <span className="text-sm font-bold text-gray-900">Graphique des revenus</span>
            </div>
            <ChevronRight size={14} className={`text-gray-400 transition-transform ${chartOpen ? "rotate-90" : ""}`} />
          </button>
          {chartOpen && (
            <div className="border-t border-gray-100 p-4">
              <RevenueChart data={chartData} />
            </div>
          )}
        </div>
      )}

      {/* Onglets Retraits / Paiements */}
      <div className="flex gap-2">
        <button
          onClick={() => setRevenueTab("retraits")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            revenueTab === "retraits"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <ArrowDownToLine size={13} />
          Retraits
        </button>
        <button
          onClick={() => setRevenueTab("paiements")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            revenueTab === "paiements"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Heart size={13} />
          Paiements et dons
        </button>
      </div>

      {/* Paiements libres et dons */}
      {revenueTab === "paiements" && (
      <div className="space-y-4">
        {/* Header with title + date filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-pink-500" />
            <h2 className="text-sm font-bold text-gray-900">
              Paiements libres et dons
              {paymentsTotalCount > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">({paymentsTotalCount})</span>
              )}
            </h2>
          </div>
          <DateRangePicker
            value={paymentsDateRange}
            activePreset={paymentsActivePreset}
            onChange={(range, presetValue) => {
              setPaymentsDateRange(range);
              setPaymentsActivePreset(presetValue || "");
            }}
          />
        </div>

        {/* Pagination top */}
        {paymentsTotalPages > 1 && (
          <Pagination
            currentPage={paymentsPage + 1}
            totalPages={paymentsTotalPages}
            onPageChange={handlePaymentsPageChange}
          />
        )}

        {loadingPayments ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Aucun paiement ou don"
            description="Les paiements libres et dons de tes supporters apparaîtront ici."
          />
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <button key={p.id} className="w-full text-left" onClick={() => setSelectedPayment(p)}>
                <Card>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-50">
                      <Heart size={16} className="text-pink-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice(p.sellerAmount)}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {p.customerName || (p.customerEmail.endsWith("@noemail.local") ? "Client anonyme" : p.customerEmail)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <p className="shrink-0 text-[10px] text-gray-400">
                            {p.paidAt
                              ? new Date(p.paidAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                              : new Date(p.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </p>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </div>
                      {p.donorMessage && (
                        <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2">
                          <MessageSquare size={12} className="mt-0.5 shrink-0 text-amber-500" />
                          <p className="text-xs text-gray-700 italic">&ldquo;{p.donorMessage}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}

        {/* Pagination bottom */}
        {paymentsTotalPages > 1 && (
          <Pagination
            currentPage={paymentsPage + 1}
            totalPages={paymentsTotalPages}
            onPageChange={handlePaymentsPageChange}
          />
        )}
      </div>
      )}

      {/* Historique des retraits */}
      {revenueTab === "retraits" && (
      <div>
        <h2 className="text-sm font-bold text-gray-900">Historique des retraits</h2>
        {withdrawals.length === 0 ? (
          <EmptyState
            icon={ArrowDownToLine}
            title="Aucun retrait"
            description="Tes retraits apparaîtront ici quand tu demanderas un virement."
            className="mt-3"
          />
        ) : (
          <div className="mt-3 space-y-2">
            {withdrawals.map((w) => (
              <button key={w.id} className="w-full text-left" onClick={() => setSelectedWithdrawal(w)}>
                <Card>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      {w.status === "COMPLETED" ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : w.status === "REJECTED" ? (
                        <XCircle size={16} className="text-red-500" />
                      ) : (
                        <Clock size={16} className="text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatPrice(w.amount)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={STATUS_BADGE[w.status] || "default"}>
                            {STATUS_LABELS[w.status] || w.status}
                          </Badge>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </div>
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        {OPERATOR_LABELS[w.provider] || w.provider} · {w.phone}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(w.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
        {wHasMore && (
          <div className="flex justify-center pt-2">
            <button
              onClick={loadMoreWithdrawals}
              disabled={wLoadingMore}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {wLoadingMore ? "Chargement..." : "Charger plus de retraits"}
            </button>
          </div>
        )}
      </div>
      )}

      {/* Withdrawal modal — 5 steps: form → pin → confirm → processing → success */}
      <Modal
        open={showWithdraw}
        onClose={() => !wSaving && wStep !== "processing" && setShowWithdraw(false)}
        title={
          wStep === "success" ? "" :
          wStep === "processing" ? "" :
          wStep === "pin" ? "Code de retrait" :
          wStep === "confirm" ? "Confirmer le retrait" :
          "Retirer tes gains"
        }
      >
        <div>
          {/* ── Step: SUCCESS ── */}
          {wStep === "success" && wResult && (
            <div className="space-y-5 py-2">
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{"Retrait envoy\u00e9"}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {"Tu vas recevoir l\u2019argent sur ton "}{OPERATOR_LABELS[wResult.provider] || wResult.provider}{"."}
                  </p>
                </div>
              </div>

              {/* Receipt card */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{"Montant envoy\u00e9"}</span>
                  <span className="font-bold text-gray-900">{formatPrice(wResult.amount)}</span>
                </div>
                {wResult.fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Frais</span>
                    <span className="text-gray-600">{formatPrice(wResult.fee)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
                  <span className="text-gray-500">Via</span>
                  <span className="font-semibold text-gray-900">{OPERATOR_LABELS[wResult.provider] || wResult.provider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{"Num\u00e9ro"}</span>
                  <span className="font-semibold text-gray-900">{wResult.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Titulaire</span>
                  <span className="font-semibold text-gray-900">{wName}</span>
                </div>
                {wResult.reference && (
                  <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm">
                    <span className="text-gray-500">{"R\u00e9f\u00e9rence"}</span>
                    <button
                      onClick={() => copyToClipboard(wResult!.reference)}
                      className="flex items-center gap-1.5 font-mono text-xs font-semibold text-gray-900 hover:text-teal-600 transition-colors"
                    >
                      {wResult.reference}
                      <Copy size={12} className="text-gray-400" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => generateReceipt({
                    amount: wResult!.amount,
                    fee: wResult!.fee,
                    phone: wResult!.phone,
                    provider: wResult!.provider,
                    reference: wResult!.reference,
                    name: wName,
                    date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                  })}
                >
                  <Download size={16} className="mr-2" />
                  {"Re\u00e7u"}
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setShowWithdraw(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: PROCESSING (animated) ── */}
          {wStep === "processing" && (
            <div className="flex flex-col items-center justify-center py-10 space-y-5">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-gray-900">Retrait en cours...</p>
                <p className="text-xs text-gray-500">{"Envoi vers "}{OPERATOR_LABELS[wProvider] || wProvider}</p>
              </div>
            </div>
          )}

          {/* ── Step: PIN (enter withdrawal PIN before confirm) ── */}
          {wStep === "pin" && (
            <div className="space-y-5 py-2">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                  <Fingerprint size={28} className="text-teal-600" />
                </div>
                <p className="text-sm text-gray-500">
                  Entre ton code de retrait à 4 chiffres
                </p>
              </div>

              <PinInput
                value={wPin}
                onChange={(v) => { setWPin(v); setWError(""); }}
                error={!!wError}
                autoFocus
              />

              {wError && (
                <p className="text-center text-xs text-red-500">{wError}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setWStep("form"); setWError(""); setWPin(""); }}
                >
                  Retour
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => { setWError(""); setWStep("confirm"); }}
                  disabled={wPin.length !== 4}
                >
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: CONFIRM (recap before sending) ── */}
          {wStep === "confirm" && (
            <div className="space-y-4">
              {/* Amount highlight */}
              <div className="rounded-2xl bg-teal-50 p-5 text-center">
                <p className="text-3xl font-extrabold text-teal-700">
                  {formatPrice(parseInt(wAmount) || 0)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{"Opérateur"}</span>
                  <span className="font-semibold text-gray-900">{OPERATOR_LABELS[wProvider] || wProvider}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{"Numéro"}</span>
                  <span className="font-semibold text-gray-900">{wPhone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Titulaire</span>
                  <span className="font-semibold text-gray-900">{wName}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700">
                  {"L\u2019argent sera envoyé immédiatement. Cette action est irréversible."}
                </p>
              </div>

              {wError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{wError}</div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setWStep("form"); setWError(""); }}
                >
                  Modifier
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleWithdraw}
                  disabled={wSaving}
                >
                  Confirmer
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: FORM ── */}
          {wStep === "form" && (
            <div className="space-y-4">
              {/* Solde */}
              <div className="rounded-2xl bg-teal-50 p-4 text-center">
                <p className="text-xs font-medium text-teal-600">Solde disponible</p>
                <p className="text-2xl font-extrabold text-teal-700">
                  {formatPrice(balance?.balance || 0)}
                </p>
              </div>

              {/* Montant */}
              <div>
                <Input
                  label="Montant (FCFA)"
                  type="number"
                  inputMode="numeric"
                  value={wAmount}
                  onChange={(e) => { setWAmount(e.target.value); setWError(""); }}
                  placeholder="0"
                  required
                />
                <p className="mt-0.5 text-[10px] text-gray-400">
                  {"Min " + MIN_AMOUNT.toLocaleString("fr-FR") + " \u00b7 Max " + MAX_AMOUNT.toLocaleString("fr-FR") + " FCFA"}
                </p>
              </div>

              {/* Montants rapides */}
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.filter((a) => !balance || a <= balance.balance).map((a) => (
                  <button
                    key={a}
                    onClick={() => { setWAmount(String(a)); setWError(""); }}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      wAmount === String(a)
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {a.toLocaleString("fr-FR")}
                  </button>
                ))}
                {balance && balance.balance >= MIN_AMOUNT && (
                  <button
                    onClick={() => { setWAmount(String(Math.min(balance.balance, MAX_AMOUNT))); setWError(""); }}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      balance && wAmount === String(Math.min(balance.balance, MAX_AMOUNT))
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    Tout
                  </button>
                )}
              </div>

              {/* Op\u00e9rateur — avec logos comme la modal de paiement */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Envoyer vers
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYOUT_OPERATORS.map((op) => {
                    const isSelected = wProvider === op.id;
                    return (
                      <button
                        key={op.id}
                        onClick={() => setWProvider(op.id)}
                        className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-3.5 text-center transition-all ${
                          isSelected
                            ? "border-teal-600 bg-teal-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                        <img
                          src={op.logoUrl}
                          alt={op.name}
                          className="h-8 w-auto object-contain"
                          loading="lazy"
                        />
                        <span className={`text-xs font-semibold ${isSelected ? "text-teal-700" : "text-gray-600"}`}>
                          {op.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Num\u00e9ro mobile money — avec s\u00e9lecteur de pays */}
              <PhoneInput
                label={"Numéro mobile money"}
                value={wPhone}
                onChange={handlePhoneChange}
                defaultCountry={wPhoneCountry}
                allowedCountries={["SN"]}
              />

              {/* Nom du titulaire */}
              <Input
                label="Nom du titulaire du compte"
                type="text"
                value={wName}
                onChange={(e) => setWName(e.target.value)}
                placeholder={"Pr\u00e9nom Nom"}
                required
              />

              {/* Solde insuffisant */}
              {wAmount && balance && parseInt(wAmount) > balance.balance && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3">
                  <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-600">
                    {"Solde insuffisant. Tu as " + formatPrice(balance.balance) + " disponible."}
                  </p>
                </div>
              )}

              {wError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{wError}</div>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleGoToConfirm}
                disabled={!wAmount || !wPhoneRaw || !wName}
              >
                <ArrowDownToLine size={16} className="mr-2" />
                Continuer
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                <Shield size={12} />
                {"Transfert s\u00e9curis\u00e9"}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Withdrawal detail modal */}
      <Modal
        open={!!selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
        title={"D\u00e9tail du retrait"}
      >
        {selectedWithdrawal && (
          <div className="space-y-4">
            {/* Status + amount */}
            <div className="text-center space-y-2">
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                selectedWithdrawal.status === "COMPLETED" ? "bg-green-100" :
                selectedWithdrawal.status === "REJECTED" ? "bg-red-100" : "bg-amber-100"
              }`}>
                {selectedWithdrawal.status === "COMPLETED" ? (
                  <CheckCircle2 size={28} className="text-green-600" />
                ) : selectedWithdrawal.status === "REJECTED" ? (
                  <XCircle size={28} className="text-red-500" />
                ) : (
                  <Clock size={28} className="text-amber-500" />
                )}
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{formatPrice(selectedWithdrawal.amount)}</p>
              <Badge variant={STATUS_BADGE[selectedWithdrawal.status] || "default"}>
                {STATUS_LABELS[selectedWithdrawal.status] || selectedWithdrawal.status}
              </Badge>
            </div>

            {/* Details */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
              {selectedWithdrawal.reference && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{"R\u00e9f\u00e9rence"}</span>
                  <button
                    onClick={() => copyToClipboard(selectedWithdrawal!.reference!)}
                    className="flex items-center gap-1.5 font-mono text-xs font-semibold text-gray-900 hover:text-teal-600 transition-colors"
                  >
                    {selectedWithdrawal.reference}
                    <Copy size={12} className="text-gray-400" />
                  </button>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-semibold text-gray-900">
                  {new Date(selectedWithdrawal.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{"Op\u00e9rateur"}</span>
                <span className="font-semibold text-gray-900">{OPERATOR_LABELS[selectedWithdrawal.provider] || selectedWithdrawal.provider}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{"Num\u00e9ro"}</span>
                <span className="font-semibold text-gray-900">{selectedWithdrawal.phone}</span>
              </div>
              {selectedWithdrawal.recipientName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Titulaire</span>
                  <span className="font-semibold text-gray-900">{selectedWithdrawal.recipientName}</span>
                </div>
              )}
              {selectedWithdrawal.merchantFee != null && selectedWithdrawal.merchantFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frais</span>
                  <span className="text-gray-600">{formatPrice(selectedWithdrawal.merchantFee)}</span>
                </div>
              )}
              {selectedWithdrawal.failureReason && (
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs text-red-600">{selectedWithdrawal.failureReason}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {selectedWithdrawal.status === "COMPLETED" && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => generateReceipt({
                    amount: selectedWithdrawal!.amount,
                    fee: selectedWithdrawal!.merchantFee || 0,
                    phone: selectedWithdrawal!.phone,
                    provider: selectedWithdrawal!.provider,
                    reference: selectedWithdrawal!.reference || selectedWithdrawal!.id,
                    name: selectedWithdrawal!.recipientName || "",
                    date: new Date(selectedWithdrawal!.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                  })}
                >
                  <Download size={16} className="mr-2" />
                  {"T\u00e9l\u00e9charger le re\u00e7u"}
                </Button>
              )}
              <Button className="flex-1" onClick={() => setSelectedWithdrawal(null)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment detail modal */}
      <Modal
        open={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title={"D\u00e9tail du paiement"}
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink-100">
                <Heart size={28} className="text-pink-500" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{formatPrice(selectedPayment.sellerAmount)}</p>
              <Badge variant="success">{"Pay\u00e9"}</Badge>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{"R\u00e9f\u00e9rence"}</span>
                <button
                  onClick={() => copyToClipboard(selectedPayment!.reference)}
                  className="flex items-center gap-1.5 font-mono text-xs font-semibold text-gray-900 hover:text-teal-600 transition-colors"
                >
                  {selectedPayment.reference}
                  <Copy size={12} className="text-gray-400" />
                </button>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-semibold text-gray-900">
                  {new Date(selectedPayment.paidAt || selectedPayment.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Montant brut</span>
                <span className="font-semibold text-gray-900">{formatPrice(selectedPayment.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{"Montant re\u00e7u"}</span>
                <span className="font-bold text-teal-600">{formatPrice(selectedPayment.sellerAmount)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
                <span className="text-gray-500">Client</span>
                <span className="font-semibold text-gray-900">{selectedPayment.customerName || (selectedPayment.customerEmail.endsWith("@noemail.local") ? "Client anonyme" : selectedPayment.customerEmail)}</span>
              </div>
              {selectedPayment.customerName && !selectedPayment.customerEmail.endsWith("@noemail.local") && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-600 text-xs">{selectedPayment.customerEmail}</span>
                </div>
              )}
              {selectedPayment.donorMessage && (
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2">
                    <MessageSquare size={12} className="mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-xs text-gray-700 italic">&ldquo;{selectedPayment.donorMessage}&rdquo;</p>
                  </div>
                </div>
              )}
            </div>

            <Button className="w-full" onClick={() => setSelectedPayment(null)}>
              Fermer
            </Button>
          </div>
        )}
      </Modal>

      {/* KYC gate modal — shown when user tries to withdraw without approved KYC */}
      <Modal
        open={showKycGate}
        onClose={() => setShowKycGate(false)}
        title="Vérification requise"
      >
        <div className="space-y-4">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Fingerprint size={32} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Vérifie ton identité pour retirer</p>
              <p className="mt-1 text-xs text-gray-500">
                Pour la sécurité de tes fonds, tu dois compléter la vérification d&apos;identité (KYC) avant de pouvoir effectuer un retrait.
              </p>
            </div>
          </div>

          {balance?.kycStatus === "PENDING" && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <Clock size={14} className="mt-0.5 shrink-0 text-blue-500" />
                <p className="text-xs text-blue-700">
                  Ta vérification est en cours de traitement. Tu seras notifié dès qu&apos;elle est approuvée.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowKycGate(false)}
            >
              Plus tard
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowKycGate(false);
                window.location.href = "/dashboard/settings/kyc";
              }}
            >
              {balance?.kycStatus === "PENDING" ? "Voir le statut" : "Vérifier mon identité"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Revenue bar chart (CSS only, no dependencies) ──
function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const totalPeriod = data.reduce((sum, d) => sum + d.amount, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Revenus quotidiens</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{totalOrders} vente(s)</p>
          <p className="text-sm font-bold text-teal-600">{formatPrice(totalPeriod)}</p>
        </div>
      </div>

      {/* Bars */}
      <div className="mt-4 flex items-end gap-[3px]" style={{ height: 120 }}>
        {data.map((d) => {
          const pct = maxAmount > 0 ? (d.amount / maxAmount) * 100 : 0;
          const barHeight = Math.max(pct, d.amount > 0 ? 4 : 1);
          return (
            <div
              key={d.date}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className={`absolute bottom-0 w-full rounded-t transition-all ${
                  d.amount > 0
                    ? "bg-teal-500 group-hover:bg-teal-600"
                    : "bg-gray-100"
                }`}
                style={{ height: `${barHeight}%`, minHeight: d.amount > 0 ? 4 : 2 }}
              />
              {/* Tooltip on hover */}
              {d.amount > 0 && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {formatPrice(d.amount)}
                  <br />
                  {d.count} vente(s)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Date labels */}
      <div className="mt-1.5 flex justify-between text-[9px] text-gray-400">
        <span>
          {new Date(data[0]?.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </span>
        {data.length > 7 && (
          <span>
            {new Date(data[Math.floor(data.length / 2)]?.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        )}
        <span>
          {new Date(data[data.length - 1]?.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </span>
      </div>
    </div>
  );
}
