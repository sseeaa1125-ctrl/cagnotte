"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  ArrowLeft,
  Crown,
  ShieldCheck,
  ShieldX,
  Ban,
  Mail,
  Globe,
  ShoppingCart,
  Users as UsersIcon,
  Eye,
  AlertTriangle,
  Check,
  X,
  Lock,
  Unlock,
  Percent,
  Flag,
  BarChart3,
  Calendar,
} from "lucide-react";

interface SellerDetail {
  id: string;
  email: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  plan: "FREE" | "PRO";
  kycStatus: string;
  kycFullName: string | null;
  kycIdUrl: string | null;
  kycSelfieUrl: string | null;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  onboardingCompleted: boolean;
  withdrawalBlocked: boolean;
  withdrawalBlockReason: string | null;
  isFlagged: boolean;
  flaggedAt: string | null;
  flagReason: string | null;
  customCommissionRate: number | null;
  payoutPhone: string | null;
  payoutProvider: string | null;
  deletedAt: string | null;
  hardDeletedAt: string | null;
  createdAt: string;
  _count: {
    orders: number;
    customers: number;
    blocks: number;
    communities: number;
    withdrawals: number;
    pageViews: number;
    reports: number;
  };
}

interface RevenueData {
  totalAmount: number;
  totalCommission: number;
  totalSellerAmount: number;
  paidOrderCount: number;
}

interface RecentOrder {
  id: string;
  reference: string;
  orderType: string;
  amount: number;
  paymentStatus: string;
  customerEmail: string;
  createdAt: string;
}

interface RecentWithdrawal {
  id: string;
  amount: number;
  status: string;
  phone: string;
  provider: string;
  createdAt: string;
}

interface AdminLogEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  admin: { name: string; email: string };
}

interface SalesChartData {
  chart: { date: string; count: number; amount: number; commission: number }[];
  totals: { count: number; amount: number; commission: number };
  dateFrom: string;
  dateTo: string;
}

interface SellerResponse {
  seller: SellerDetail;
  revenue: RevenueData;
  recentOrders: RecentOrder[];
  recentWithdrawals: RecentWithdrawal[];
  adminLogs: AdminLogEntry[];
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

function StatusBadge({ status, type }: { status: string; type: "payment" | "withdrawal" | "kyc" }) {
  const configs: Record<string, Record<string, { label: string; className: string }>> = {
    payment: {
      PAID: { label: "Payé", className: "text-green-400 bg-green-500/10" },
      PENDING: { label: "En attente", className: "text-amber-400 bg-amber-500/10" },
      FAILED: { label: "Échoué", className: "text-red-400 bg-red-500/10" },
      EXPIRED: { label: "Expiré", className: "text-gray-400 bg-gray-500/10" },
      REFUNDED: { label: "Remboursé", className: "text-blue-400 bg-blue-500/10" },
    },
    withdrawal: {
      PENDING: { label: "En attente", className: "text-amber-400 bg-amber-500/10" },
      PROCESSING: { label: "En cours", className: "text-blue-400 bg-blue-500/10" },
      COMPLETED: { label: "Complété", className: "text-green-400 bg-green-500/10" },
      REJECTED: { label: "Rejeté", className: "text-red-400 bg-red-500/10" },
    },
    kyc: {
      NONE: { label: "Aucun", className: "text-gray-400 bg-gray-500/10" },
      PENDING: { label: "En attente", className: "text-amber-400 bg-amber-500/10" },
      APPROVED: { label: "Approuvé", className: "text-green-400 bg-green-500/10" },
      DONE: { label: "Vérifié", className: "text-green-400 bg-green-500/10" },
      REJECTED: { label: "Rejeté", className: "text-red-400 bg-red-500/10" },
    },
  };
  const c = configs[type]?.[status] || { label: status, className: "text-gray-400 bg-gray-500/10" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

function ActionButton({
  onClick,
  loading,
  icon: Icon,
  label,
  variant = "default",
  disabled,
}: {
  onClick: () => void;
  loading?: boolean;
  icon: React.ElementType;
  label: string;
  variant?: "default" | "danger" | "success";
  disabled?: boolean;
}) {
  const variantClasses = {
    default: "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white",
    danger: "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
    success: "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      <Icon size={14} />
      {loading ? "..." : label}
    </button>
  );
}

export default function AdminSellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { admin } = useAdminAuth();
  const sellerId = params.id as string;

  const [data, setData] = useState<SellerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [kycRejectReason, setKycRejectReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [showKycModal, setShowKycModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionInput, setCommissionInput] = useState("");

  // Sales chart state
  const [salesChart, setSalesChart] = useState<SalesChartData | null>(null);
  const [salesChartLoading, setSalesChartLoading] = useState(false);
  const [salesChartDays, setSalesChartDays] = useState(30);

  const fetchSeller = useCallback(async () => {
    try {
      const result = await adminApi<SellerResponse>(`/api/admin/sellers/${sellerId}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchSeller();
  }, [fetchSeller]);

  // Fetch sales chart
  const fetchSalesChart = useCallback(async (days: number) => {
    setSalesChartLoading(true);
    try {
      const result = await adminApi<SalesChartData>(`/api/admin/sellers/${sellerId}/sales-chart?days=${days}`);
      setSalesChart(result);
    } catch {
      // Silently fail
    } finally {
      setSalesChartLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (data) {
      fetchSalesChart(salesChartDays);
    }
  }, [data, salesChartDays, fetchSalesChart]);

  const doAction = async (path: string, body: unknown, successMsg: string) => {
    setActionLoading(path);
    setActionError(null);
    setActionSuccess(null);
    try {
      await adminApi(path, { method: "PATCH", body });
      setActionSuccess(successMsg);
      await fetchSeller();
    } catch (err) {
      setActionError(err instanceof AdminApiError ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white" aria-label="Retour"><ArrowLeft size={20} /></button>
          <div className="h-6 w-48 rounded bg-gray-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl border border-gray-800 bg-gray-900/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-sm text-gray-400">{error}</p>
        <button onClick={() => router.back()} className="text-sm text-teal-400 hover:underline">Retour</button>
      </div>
    );
  }

  const { seller, revenue, recentOrders, recentWithdrawals, adminLogs } = data;
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors" aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 overflow-hidden shrink-0">
              {seller.avatarUrl ? (
                <img src={seller.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-medium text-gray-400">{seller.displayName.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{seller.displayName}</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  seller.plan === "PRO" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"
                }`}>
                  {seller.plan === "PRO" && <Crown size={10} />}
                  {seller.plan}
                </span>
                {seller.isFlagged && <span className="inline-flex items-center gap-1 text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full"><Flag size={10} />Suspect</span>}
                {seller.deletedAt && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Suspendu</span>}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Mail size={12} />{seller.email}</span>
                <span className="flex items-center gap-1"><Globe size={12} />/{seller.slug}</span>
              </div>
            </div>
          </div>
        </div>
        {/* View store button */}
        <a
          href={`/${seller.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-sm font-medium text-teal-400 transition-colors hover:bg-teal-500/20"
        >
          <Eye size={14} />
          Voir la boutique
        </a>
      </div>

      {/* Action feedback */}
      {actionError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={14} />{actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
          <Check size={14} />{actionSuccess}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Revenus", value: formatPrice(revenue.totalAmount), icon: ShoppingCart },
          { label: "Commission Izy", value: formatPrice(revenue.totalCommission), icon: Percent },
          { label: "Commandes", value: revenue.paidOrderCount, icon: ShoppingCart },
          { label: "Clients", value: seller._count.customers, icon: UsersIcon },
          { label: "Blocs", value: seller._count.blocks, icon: Eye },
          { label: "Vues", value: seller._count.pageViews, icon: Eye },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <Icon size={14} className="text-gray-500 mb-2" />
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Sales chart */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-teal-400" />
            <h3 className="text-sm font-semibold text-gray-300">Ventes par jour</h3>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-500" />
            <select
              value={salesChartDays}
              onChange={(e) => setSalesChartDays(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
              <option value={60}>60 jours</option>
              <option value={90}>90 jours</option>
            </select>
          </div>
        </div>
        <div className="p-5">
          {salesChartLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-teal-500" />
            </div>
          ) : salesChart && salesChart.chart.length > 0 ? (
            <>
              {/* Totals summary */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-gray-500">Ventes</p>
                  <p className="text-lg font-bold text-white">{salesChart.totals.count}</p>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-gray-500">Montant</p>
                  <p className="text-lg font-bold text-teal-400">{formatPrice(salesChart.totals.amount)}</p>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-3">
                  <p className="text-xs text-gray-500">Commission</p>
                  <p className="text-lg font-bold text-amber-400">{formatPrice(salesChart.totals.commission)}</p>
                </div>
              </div>
              {/* Simple bar chart */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {salesChart.chart.map((day) => {
                  const maxAmount = Math.max(...salesChart.chart.map((d) => d.amount));
                  const barWidth = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={day.date} className="flex items-center gap-3 text-xs">
                      <span className="w-20 text-gray-500 shrink-0">
                        {new Date(day.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </span>
                      <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-gray-300 shrink-0">{formatPrice(day.amount)}</span>
                      <span className="w-8 text-right text-gray-500 shrink-0">{day.count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-gray-500 py-8">Aucune vente sur cette période</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Actions */}
        <div className="lg:col-span-1 space-y-4">
          {/* Infos */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Informations</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Inscrit le</span><span className="text-gray-300">{formatDate(seller.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Onboarding</span><span className={seller.onboardingCompleted ? "text-green-400" : "text-amber-400"}>{seller.onboardingCompleted ? "Complété" : "En cours"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">KYC</span><StatusBadge status={seller.kycStatus} type="kyc" /></div>
              {seller.kycFullName && <div className="flex justify-between"><span className="text-gray-500">Nom KYC</span><span className="text-gray-300">{seller.kycFullName}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Payout</span><span className="text-gray-300">{seller.payoutProvider || "—"} {seller.payoutPhone || ""}</span></div>
              <div className="flex justify-between">
                <span className="text-gray-500">Commission</span>
                <span className="text-gray-300">{seller.customCommissionRate != null ? `${(seller.customCommissionRate / 100).toFixed(1)}% custom` : "Global"}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Signalements</span><span className={seller._count.reports > 0 ? "text-red-400 font-medium" : "text-gray-300"}>{seller._count.reports}</span></div>
              {seller.isFlagged && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
                  <span className="font-medium">⚠ Profil flagué comme suspect</span>
                  {seller.flagReason && <p className="mt-0.5 text-red-400/70">{seller.flagReason}</p>}
                </div>
              )}
              {seller.withdrawalBlocked && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
                  <span className="font-medium">Retraits bloqués</span>
                  {seller.withdrawalBlockReason && <p className="mt-0.5 text-red-400/70">{seller.withdrawalBlockReason}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Actions</h3>
            <div className="space-y-2">
              {/* Plan change */}
              <ActionButton
                onClick={() => doAction(`/api/admin/sellers/${sellerId}/plan`, { plan: seller.plan === "PRO" ? "FREE" : "PRO" }, `Plan changé en ${seller.plan === "PRO" ? "FREE" : "PRO"}`)}
                loading={actionLoading === `/api/admin/sellers/${sellerId}/plan`}
                icon={Crown}
                label={seller.plan === "PRO" ? "Passer en FREE" : "Passer en PRO"}
              />

              {/* KYC */}
              {seller.kycStatus !== "APPROVED" && (
                <div className="flex gap-2">
                  <ActionButton
                    onClick={() => doAction(`/api/admin/sellers/${sellerId}/kyc`, { action: "APPROVED" }, "KYC approuvé")}
                    loading={actionLoading === `/api/admin/sellers/${sellerId}/kyc`}
                    icon={ShieldCheck}
                    label="Vérifier KYC"
                    variant="success"
                  />
                  {seller.kycStatus === "PENDING" && (
                    <ActionButton
                      onClick={() => setShowKycModal(true)}
                      icon={ShieldX}
                      label="Rejeter"
                      variant="danger"
                    />
                  )}
                </div>
              )}

              {/* Suspend / Reactivate */}
              {seller.deletedAt ? (
                <ActionButton
                  onClick={() => doAction(`/api/admin/sellers/${sellerId}/suspend`, { action: "reactivate" }, "Vendeur réactivé")}
                  loading={actionLoading === `/api/admin/sellers/${sellerId}/suspend`}
                  icon={Check}
                  label="Réactiver"
                  variant="success"
                />
              ) : (
                <ActionButton
                  onClick={() => setShowSuspendModal(true)}
                  icon={Ban}
                  label="Suspendre"
                  variant="danger"
                />
              )}

              {/* Withdrawal block */}
              {seller.withdrawalBlocked ? (
                <ActionButton
                  onClick={() => doAction(`/api/admin/sellers/${sellerId}/withdrawal-block`, { blocked: false }, "Retraits débloqués")}
                  loading={actionLoading === `/api/admin/sellers/${sellerId}/withdrawal-block`}
                  icon={Unlock}
                  label="Débloquer retraits"
                  variant="success"
                />
              ) : (
                <ActionButton
                  onClick={() => setShowBlockModal(true)}
                  icon={Lock}
                  label="Bloquer retraits"
                  variant="danger"
                />
              )}

              {/* Flag / Unflag */}
              {seller.isFlagged ? (
                <ActionButton
                  onClick={() => doAction(`/api/admin/sellers/${sellerId}/flag`, { flagged: false }, "Profil déflagué")}
                  loading={actionLoading === `/api/admin/sellers/${sellerId}/flag`}
                  icon={Flag}
                  label="Retirer le flag suspect"
                  variant="success"
                />
              ) : (
                <ActionButton
                  onClick={() => setShowFlagModal(true)}
                  icon={Flag}
                  label="Flaguer comme suspect"
                  variant="danger"
                />
              )}

              {/* Commission */}
              {isSuperAdmin && (
                <ActionButton
                  onClick={() => {
                    setCommissionInput(seller.customCommissionRate != null ? String(seller.customCommissionRate / 100) : "");
                    setShowCommissionModal(true);
                  }}
                  icon={Percent}
                  label="Modifier commission"
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: Tables */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recent orders */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300">Commandes récentes ({seller._count.orders})</h3>
            </div>
            {recentOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">Aucune commande</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-800/50">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-800/30">
                      <td className="px-5 py-3">
                        <p className="font-mono text-xs text-teal-400">{o.reference}</p>
                        <p className="text-xs text-gray-500">{o.customerEmail}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">{{ SALE: "Vente", BOOKING: "RDV", PAYMENT: "Paiement", DONATION: "Don", COMMUNITY: "Communauté" }[o.orderType] || o.orderType}</td>
                      <td className="px-3 py-3 text-right text-gray-300">{formatPrice(o.amount)}</td>
                      <td className="px-3 py-3"><StatusBadge status={o.paymentStatus} type="payment" /></td>
                      <td className="px-3 py-3 text-right text-xs text-gray-500">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent withdrawals */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300">Retraits récents ({seller._count.withdrawals})</h3>
            </div>
            {recentWithdrawals.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">Aucun retrait</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-800/50">
                  {recentWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-800/30">
                      <td className="px-5 py-3 text-gray-300">{formatPrice(w.amount)}</td>
                      <td className="px-3 py-3 text-xs text-gray-400">{w.provider}</td>
                      <td className="px-3 py-3 text-xs text-gray-400">{w.phone}</td>
                      <td className="px-3 py-3"><StatusBadge status={w.status} type="withdrawal" /></td>
                      <td className="px-3 py-3 text-right text-xs text-gray-500">{formatDate(w.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Admin logs */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300">Historique admin</h3>
            </div>
            {adminLogs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">Aucune action</p>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {adminLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-300">
                        <span className="font-medium text-teal-400">{log.action}</span>
                        {" par "}
                        <span className="text-gray-400">{log.admin.name}</span>
                      </p>
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-0.5">{JSON.stringify(log.details)}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 ml-3">{formatDate(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KYC Reject Modal */}
      {showKycModal && (
        <Modal title="Rejeter le KYC" onClose={() => setShowKycModal(false)}>
          <textarea
            value={kycRejectReason}
            onChange={(e) => setKycRejectReason(e.target.value)}
            placeholder="Motif du rejet..."
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500 min-h-[80px]"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowKycModal(false)}
              className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700"
            >Annuler</button>
            <button
              onClick={async () => {
                setShowKycModal(false);
                await doAction(`/api/admin/sellers/${sellerId}/kyc`, { action: "REJECTED", reason: kycRejectReason }, "KYC rejeté");
                setKycRejectReason("");
              }}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            >Rejeter</button>
          </div>
        </Modal>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <Modal title="Suspendre le vendeur" onClose={() => setShowSuspendModal(false)}>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Motif de la suspension (optionnel)..."
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500 min-h-[80px]"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowSuspendModal(false)}
              className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700"
            >Annuler</button>
            <button
              onClick={async () => {
                setShowSuspendModal(false);
                await doAction(`/api/admin/sellers/${sellerId}/suspend`, { action: "suspend", reason: suspendReason || undefined }, "Vendeur suspendu");
                setSuspendReason("");
              }}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            >Suspendre</button>
          </div>
        </Modal>
      )}

      {/* Block Withdrawals Modal */}
      {showBlockModal && (
        <Modal title="Bloquer les retraits" onClose={() => setShowBlockModal(false)}>
          <textarea
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Motif du blocage (obligatoire)..."
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500 min-h-[80px]"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowBlockModal(false)}
              className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700"
            >Annuler</button>
            <button
              onClick={async () => {
                if (!blockReason.trim()) return;
                setShowBlockModal(false);
                await doAction(`/api/admin/sellers/${sellerId}/withdrawal-block`, { blocked: true, reason: blockReason }, "Retraits bloqués");
                setBlockReason("");
              }}
              disabled={!blockReason.trim()}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >Bloquer</button>
          </div>
        </Modal>
      )}

      {/* Flag Modal */}
      {showFlagModal && (
        <Modal title="Flaguer comme suspect" onClose={() => setShowFlagModal(false)}>
          <p className="text-sm text-gray-400 mb-3">
            Le profil sera marqué comme suspect sur sa page publique et ses retraits seront automatiquement bloqués.
          </p>
          <textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Motif du flag (obligatoire)..."
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500 min-h-[80px]"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowFlagModal(false)}
              className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700"
            >Annuler</button>
            <button
              onClick={async () => {
                if (!flagReason.trim()) return;
                setShowFlagModal(false);
                await doAction(`/api/admin/sellers/${sellerId}/flag`, { flagged: true, reason: flagReason }, "Profil flagué comme suspect");
                setFlagReason("");
              }}
              disabled={!flagReason.trim()}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >Flaguer</button>
          </div>
        </Modal>
      )}

      {/* Commission Modal */}
      {showCommissionModal && (
        <Modal title="Modifier la commission" onClose={() => setShowCommissionModal(false)}>
          <p className="text-sm text-gray-400 mb-3">
            Laisse vide pour utiliser le taux global. Sinon, entre le pourcentage (ex: 3 pour 3%).
          </p>
          <input
            type="number"
            step="0.1"
            min="0"
            max="50"
            value={commissionInput}
            onChange={(e) => setCommissionInput(e.target.value)}
            placeholder="Ex: 3 pour 3%"
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowCommissionModal(false)}
              className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700"
            >Annuler</button>
            <button
              onClick={async () => {
                setShowCommissionModal(false);
                const rate = commissionInput.trim() ? Math.round(parseFloat(commissionInput) * 100) : null;
                await doAction(`/api/admin/sellers/${sellerId}/commission`, { customCommissionRate: rate }, rate ? `Commission changée à ${commissionInput}%` : "Commission réinitialisée au taux global");
              }}
              className="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >Enregistrer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fermer"><X size={18} /></button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
