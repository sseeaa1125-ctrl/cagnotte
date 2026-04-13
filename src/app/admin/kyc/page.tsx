"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import DateRangePicker from "@/components/admin/DateRangePicker";
import Pagination from "@/components/admin/Pagination";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  AlertTriangle,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  User,
  ShoppingCart,
  Wallet,
  Phone,
  Mail,
  Calendar,
  Image,
} from "lucide-react";

interface KycSeller {
  id: string;
  email: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  plan: string;
  phone: string | null;
  kycStatus: string;
  kycFullName: string | null;
  kycIdUrl: string | null;
  kycSelfieUrl: string | null;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  createdAt: string;
  _count: { orders: number; withdrawals: number };
}

interface KycResponse {
  sellers: KycSeller[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: { pending: number; approved: number; rejected: number };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function KycBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    NONE: { label: "Aucun", className: "text-gray-500 bg-gray-500/10", icon: ShieldX },
    PENDING: { label: "En attente", className: "text-amber-400 bg-amber-500/10", icon: Clock },
    APPROVED: { label: "Approuvé", className: "text-green-400 bg-green-500/10", icon: ShieldCheck },
    REJECTED: { label: "Rejeté", className: "text-red-400 bg-red-500/10", icon: ShieldX },
  };
  const c = config[status] || config.NONE;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${c.className}`}>
      <Icon size={12} />{c.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      plan === "PRO" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"
    }`}>
      {plan}
    </span>
  );
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}j`;
  return `${Math.floor(days / 30)}mois`;
}

export default function AdminKycPage() {
  const [data, setData] = useState<KycResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal for reject reason
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);

  const fetchKyc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const result = await adminApi<KycResponse>(`/api/admin/kyc?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchKyc(); }, [fetchKyc]);

  const handleAction = async (sellerId: string, action: "APPROVED" | "REJECTED", reason?: string) => {
    setActionLoading(sellerId);
    setActionMsg(null);
    try {
      await adminApi(`/api/admin/kyc/${sellerId}`, {
        method: "PATCH",
        body: { action, reason },
      });
      setActionMsg({ type: "success", text: action === "APPROVED" ? "KYC approuvé" : "KYC rejeté" });
      await fetchKyc();
    } catch (err) {
      setActionMsg({ type: "error", text: err instanceof AdminApiError ? err.message : "Erreur" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Vérification KYC</h1>
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

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => { setStatusFilter("PENDING"); setPage(1); }}
            className={`rounded-xl border p-4 text-left transition-colors ${
              statusFilter === "PENDING" ? "border-amber-500/40 bg-amber-500/10" : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
            }`}
          >
            <Clock size={14} className="text-amber-400 mb-1" />
            <p className="text-2xl font-bold text-amber-400">{data.stats.pending}</p>
            <p className="text-xs text-gray-400">En attente</p>
          </button>
          <button
            onClick={() => { setStatusFilter("APPROVED"); setPage(1); }}
            className={`rounded-xl border p-4 text-left transition-colors ${
              statusFilter === "APPROVED" ? "border-green-500/40 bg-green-500/10" : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
            }`}
          >
            <ShieldCheck size={14} className="text-green-400 mb-1" />
            <p className="text-2xl font-bold text-green-400">{data.stats.approved}</p>
            <p className="text-xs text-gray-400">Approuvés</p>
          </button>
          <button
            onClick={() => { setStatusFilter("REJECTED"); setPage(1); }}
            className={`rounded-xl border p-4 text-left transition-colors ${
              statusFilter === "REJECTED" ? "border-red-500/40 bg-red-500/10" : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
            }`}
          >
            <ShieldX size={14} className="text-red-400 mb-1" />
            <p className="text-2xl font-bold text-red-400">{data.stats.rejected}</p>
            <p className="text-xs text-gray-400">Rejetés</p>
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-3 items-center">
        <select
          aria-label="Filtrer par statut"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
        >
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Approuvés</option>
          <option value="REJECTED">Rejetés</option>
          <option value="all">Tous</option>
        </select>
        {statusFilter === "PENDING" && data && data.stats.pending > 0 && (
          <p className="text-xs text-amber-400/70">Triés du plus récent au plus ancien</p>
        )}
      </div>

      {/* Feedback */}
      {actionMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
          actionMsg.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {actionMsg.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
          {actionMsg.text}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {/* KYC Cards */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-gray-800 bg-gray-900/50 animate-pulse" />
          ))
        ) : data?.sellers.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 py-16 text-center">
            <Shield size={36} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-500 font-medium">Aucune demande KYC</p>
            <p className="text-xs text-gray-600 mt-1">
              {statusFilter === "PENDING" ? "Aucune demande en attente de vérification" : `Aucun résultat pour le filtre "${statusFilter}"`}
            </p>
          </div>
        ) : (
          data?.sellers.map((seller) => {
            const isExpanded = expandedId === seller.id;
            return (
              <div
                key={seller.id}
                className={`rounded-2xl border bg-gray-900/50 overflow-hidden transition-colors ${
                  seller.kycStatus === "PENDING"
                    ? "border-amber-500/20 hover:border-amber-500/40"
                    : "border-gray-800 hover:border-gray-700"
                }`}
              >
                {/* Card header — always visible */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : seller.id)}
                  className="w-full px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 overflow-hidden shrink-0 border border-gray-700">
                      {seller.avatarUrl ? (
                        <img src={seller.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User size={18} className="text-gray-500" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white truncate">{seller.displayName}</p>
                        <KycBadge status={seller.kycStatus} />
                        <PlanBadge plan={seller.plan} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span>{seller.email}</span>
                        {seller.kycSubmittedAt && (
                          <span className="hidden sm:inline">il y a {timeSince(seller.kycSubmittedAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* Quick stats + expand */}
                    <div className="hidden sm:flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-500" title="Commandes">
                        <ShoppingCart size={12} />
                        <span>{seller._count.orders}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500" title="Retraits">
                        <Wallet size={12} />
                        <span>{seller._count.withdrawals}</span>
                      </div>
                    </div>

                    <ChevronDown
                      size={16}
                      className={`text-gray-500 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-gray-800 px-5 py-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Seller details */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Informations vendeur</h4>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <User size={11} />
                              <span className="text-xs">Nom complet KYC</span>
                            </div>
                            <p className="text-sm font-medium text-white">{seller.kycFullName || "—"}</p>
                          </div>
                          <div className="rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Mail size={11} />
                              <span className="text-xs">Email</span>
                            </div>
                            <p className="text-sm font-medium text-white truncate">{seller.email}</p>
                          </div>
                          <div className="rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Phone size={11} />
                              <span className="text-xs">Téléphone</span>
                            </div>
                            <p className="text-sm font-medium text-white">{seller.phone || "Non renseigné"}</p>
                          </div>
                          <div className="rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Calendar size={11} />
                              <span className="text-xs">Inscrit le</span>
                            </div>
                            <p className="text-sm font-medium text-white">{formatShortDate(seller.createdAt)}</p>
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chronologie</h4>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                              Inscription : {formatDate(seller.createdAt)}
                            </div>
                            {seller.kycSubmittedAt && (
                              <div className="flex items-center gap-2 text-amber-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                KYC soumis : {formatDate(seller.kycSubmittedAt)}
                              </div>
                            )}
                            {seller.kycReviewedAt && (
                              <div className={`flex items-center gap-2 ${seller.kycStatus === "APPROVED" ? "text-green-400" : "text-red-400"}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${seller.kycStatus === "APPROVED" ? "bg-green-500" : "bg-red-500"}`} />
                                KYC {seller.kycStatus === "APPROVED" ? "approuvé" : "rejeté"} : {formatDate(seller.kycReviewedAt)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Activity stats */}
                        <div className="flex gap-3">
                          <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2">
                            <ShoppingCart size={13} className="text-blue-400" />
                            <span className="text-sm text-white font-medium">{seller._count.orders}</span>
                            <span className="text-xs text-gray-500">commandes</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2">
                            <Wallet size={13} className="text-amber-400" />
                            <span className="text-sm text-white font-medium">{seller._count.withdrawals}</span>
                            <span className="text-xs text-gray-500">retraits</span>
                          </div>
                        </div>

                        <Link
                          href={`/admin/sellers/${seller.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs font-medium text-teal-400 hover:bg-gray-700 hover:text-teal-300 transition-colors"
                        >
                          <ExternalLink size={12} />
                          Voir le profil complet
                        </Link>
                      </div>

                      {/* Right: Documents + Actions */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents KYC</h4>

                        {/* Document previews */}
                        <div className="grid grid-cols-2 gap-3">
                          {seller.kycIdUrl ? (
                            <button
                              onClick={() => setPreviewImage({ url: seller.kycIdUrl!, label: "Pièce d'identité" })}
                              className="group rounded-xl border border-gray-700 bg-gray-800 overflow-hidden hover:border-teal-500/40 transition-colors text-left"
                            >
                              <div className="aspect-[4/3] bg-gray-800 relative overflow-hidden">
                                <img
                                  src={seller.kycIdUrl}
                                  alt="Pièce d'identité"
                                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Image size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="px-3 py-2">
                                <p className="text-xs font-medium text-gray-300">Pièce d&apos;identité</p>
                              </div>
                            </button>
                          ) : (
                            <div className="rounded-xl border border-gray-800 bg-gray-800/30 p-6 flex flex-col items-center justify-center">
                              <Image size={20} className="text-gray-600 mb-1" />
                              <p className="text-xs text-gray-600">ID non fourni</p>
                            </div>
                          )}

                          {seller.kycSelfieUrl ? (
                            <button
                              onClick={() => setPreviewImage({ url: seller.kycSelfieUrl!, label: "Selfie de vérification" })}
                              className="group rounded-xl border border-gray-700 bg-gray-800 overflow-hidden hover:border-teal-500/40 transition-colors text-left"
                            >
                              <div className="aspect-[4/3] bg-gray-800 relative overflow-hidden">
                                <img
                                  src={seller.kycSelfieUrl}
                                  alt="Selfie"
                                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Image size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="px-3 py-2">
                                <p className="text-xs font-medium text-gray-300">Selfie de vérification</p>
                              </div>
                            </button>
                          ) : (
                            <div className="rounded-xl border border-gray-800 bg-gray-800/30 p-6 flex flex-col items-center justify-center">
                              <Image size={20} className="text-gray-600 mb-1" />
                              <p className="text-xs text-gray-600">Selfie non fourni</p>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        {seller.kycStatus === "PENDING" && (
                          <div className="space-y-3 pt-2">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</h4>
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleAction(seller.id, "APPROVED")}
                                disabled={actionLoading === seller.id}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                <Check size={16} />Approuver le KYC
                              </button>
                              <button
                                onClick={() => { setRejectTarget(seller.id); setRejectReason(""); }}
                                disabled={actionLoading === seller.id}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600/10 border border-red-500/30 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-600/20 transition-colors disabled:opacity-50"
                              >
                                <X size={16} />Rejeter
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
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

      {/* Reject Modal */}
      {rejectTarget && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setRejectTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Rejeter le KYC</h3>
                <button onClick={() => setRejectTarget(null)} className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" aria-label="Fermer"><X size={18} /></button>
              </div>
              <p className="text-xs text-gray-500 mb-3">Le vendeur sera notifié du rejet. Indiquez la raison pour qu&apos;il puisse corriger sa demande.</p>
              <textarea
                aria-label="Raison du rejet"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Photo floue, document expiré, nom ne correspond pas..."
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500 min-h-[100px] resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setRejectTarget(null)} className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    const id = rejectTarget;
                    setRejectTarget(null);
                    await handleAction(id, "REJECTED", rejectReason);
                  }}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <>
          <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setPreviewImage(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-3xl max-h-[85vh] w-full">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">{previewImage.label}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={previewImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    Ouvrir dans un nouvel onglet
                  </a>
                  <button onClick={() => setPreviewImage(null)} className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" aria-label="Fermer">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-700 bg-gray-900 overflow-hidden">
                <img
                  src={previewImage.url}
                  alt={previewImage.label}
                  className="w-full h-auto max-h-[75vh] object-contain"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
