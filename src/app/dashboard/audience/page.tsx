"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, Badge, Modal, Avatar, EmptyState, PullToRefreshIndicator } from "@/components/ui";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { api } from "@/lib/api";
import { getCache, setCache } from "@/lib/useApi";
import { formatPrice } from "@/lib/utils";
import { exportToCsv } from "@/lib/exportCsv";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";
import {
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_VARIANTS,
} from "@/lib/constants";
import {
  Phone,
  Users,
  Download,
  Search,
  X,
  ArrowUpDown,
  Mail,
  ShoppingBag,
  Calendar,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ContactRound,
  Handshake,
  Clock,
  Check,
  MessageSquare,
  Building2,
  FileText,
  Wallet,
} from "lucide-react";

// ── Types ──

interface CustomerItem {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  totalSpent: number;
  orderCount: number;
  createdAt: string;
}

interface CustomerOrder {
  id: string;
  reference: string;
  orderType: string;
  amount: number;
  sellerAmount: number;
  paymentStatus: string;
  paymentOperator: string | null;
  paidAt: string | null;
  createdAt: string;
  paymentNote: string | null;
  product: { title: string } | null;
  bookingService: { title: string } | null;
}

interface CustomerDetail {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  totalSpent: number;
  orderCount: number;
  createdAt: string;
  orders: CustomerOrder[];
}

type CampaignType = "LEAD_MAGNET" | "WAITING_LIST" | "PARTNERSHIP" | "COMMUNITY";

interface Campaign {
  id: string;
  type: CampaignType;
  title: string;
  coverUrl: string | null;
  isActive: boolean;
  subscriberCount: number;
  maxSubscribers: number | null;
  createdAt: string;
}

interface Lead {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  budget?: string | null;
  status?: "PENDING" | "ACCEPTED" | "REJECTED";
  customFields?: Record<string, string> | null;
  createdAt: string;
}

interface CampaignDetail {
  type: string;
  leads: Lead[];
}

// ── Constants ──

type AudienceTab = "clients" | "leads";
type SortKey = "recent" | "spent" | "orders";

const ORDER_TYPE_ICONS: Record<string, React.ReactNode> = {
  SALE: <ShoppingBag size={12} />,
  BOOKING: <Calendar size={12} />,
  PAYMENT: <CreditCard size={12} />,
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof ContactRound; color: string; bgColor: string }> = {
  LEAD_MAGNET: { label: "Lead Magnet", icon: Mail, color: "#EC4899", bgColor: "#FDF2F8" },
  WAITING_LIST: { label: "Liste d'attente", icon: Users, color: "#8B5CF6", bgColor: "#F5F3FF" },
  PARTNERSHIP: { label: "Partenariat", icon: Handshake, color: "#059669", bgColor: "#ECFDF5" },
  COMMUNITY: { label: "Communauté", icon: MessageSquare, color: "#0D9488", bgColor: "#F0FDFA" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: "En attente", color: "#D97706", bgColor: "#FFFBEB" },
  ACCEPTED: { label: "Acceptée", color: "#059669", bgColor: "#ECFDF5" },
  REJECTED: { label: "Refusée", color: "#DC2626", bgColor: "#FEF2F2" },
};

const CUSTOMERS_LIMIT = 15;

// ── Page ──

export default function AudiencePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AudienceTab>("clients");

  // ── Clients state ──
  const cachedCustomers = getCache<{ customers: CustomerItem[]; nextCursor: string | null; hasMore: boolean }>("/api/customers?limit=15");
  const [customers, setCustomers] = useState<CustomerItem[]>(cachedCustomers?.customers || []);
  const [customersLoading, setCustomersLoading] = useState(!cachedCustomers);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // ── Leads state ──
  const cachedCampaigns = getCache<Campaign[]>("/api/leads");
  const [campaigns, setCampaigns] = useState<Campaign[]>(cachedCampaigns || []);
  const [campaignsLoading, setCampaignsLoading] = useState(!cachedCampaigns);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Lead detail state ──
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  // ── Email marketing integration status ──
  const [emailConnected, setEmailConnected] = useState(true); // default true to hide banner until loaded

  // ── Load customers + email status ──
  useEffect(() => {
    api<{ customers: CustomerItem[]; nextCursor: string | null; hasMore: boolean }>(
      `/api/customers?limit=${CUSTOMERS_LIMIT}`
    )
      .then((res) => {
        setCustomers(res.customers);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
        setCache("/api/customers?limit=15", res);
      })
      .finally(() => setCustomersLoading(false));

    api<{ connected: boolean }>("/api/integrations/email/status")
      .then((res) => setEmailConnected(res.connected))
      .catch(() => setEmailConnected(false));
  }, []);

  // ── Load campaigns ──
  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const data = await api("/api/leads");
      setCampaigns(data as Campaign[]);
      setCache("/api/leads", data);
    } catch {
      // silent
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  // ── Load customers ──
  const loadCustomers = useCallback(async () => {
    const res = await api<{ customers: CustomerItem[]; nextCursor: string | null; hasMore: boolean }>(
      `/api/customers?limit=${CUSTOMERS_LIMIT}`
    );
    setCustomers(res.customers);
    setNextCursor(res.nextCursor);
    setHasMore(res.hasMore);
    setCache("/api/customers?limit=15", res);
  }, []);

  // Pull to refresh
  const refreshAll = useCallback(async () => {
    await Promise.all([loadCustomers(), loadCampaigns()]);
  }, [loadCustomers, loadCampaigns]);

  const { containerRef: pullRefreshRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: refreshAll,
  });

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // ── Computed ──
  const totalContacts = customers.length + campaigns.reduce((s, c) => s + c.subscriberCount, 0);

  function loadMoreCustomers() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    api<{ customers: CustomerItem[]; nextCursor: string | null; hasMore: boolean }>(
      `/api/customers?limit=${CUSTOMERS_LIMIT}&cursor=${nextCursor}`
    )
      .then((res) => {
        setCustomers((prev) => [...prev, ...res.customers]);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      })
      .finally(() => setLoadingMore(false));
  }

  async function openCustomerDetail(customerId: string) {
    setDetailModalOpen(true);
    setSelectedCustomer(null);
    setLoadingDetail(true);
    try {
      const res = await api<{ customer: CustomerDetail }>(`/api/customers/${customerId}`);
      setSelectedCustomer(res.customer);
    } catch {
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name?.toLowerCase().includes(q)) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone?.includes(q))
      );
    }
    if (sortBy === "spent") {
      result = [...result].sort((a, b) => b.totalSpent - a.totalSpent);
    } else if (sortBy === "orders") {
      result = [...result].sort((a, b) => b.orderCount - a.orderCount);
    }
    return result;
  }, [customers, searchQuery, sortBy]);

  function handleExportCustomers() {
    const headers = ["Nom", "Email", "Téléphone", "Total dépensé (FCFA)", "Nombre d'achats", "Client depuis"];
    const rows = filteredCustomers.map((c) => [
      c.name || "",
      c.email,
      c.phone || "",
      String(c.totalSpent),
      String(c.orderCount),
      new Date(c.createdAt).toLocaleDateString("fr-FR"),
    ]);
    exportToCsv(`audience-izy-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  async function openCampaign(campaign: Campaign) {
    if (campaign.type === "COMMUNITY") {
      router.push(`/dashboard/communities/${campaign.id}`);
      return;
    }
    setSelectedCampaign(campaign);
    setDetailLoading(true);
    try {
      const data = await api(`/api/leads/${campaign.id}`);
      setDetail(data as CampaignDetail);
    } catch {
      toast("Erreur lors du chargement", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  function handleExportLeads() {
    if (!detail || !selectedCampaign) return;
    const isPartnership = detail.type === "PARTNERSHIP";

    // Collect all unique custom field keys across all leads
    const customKeys: string[] = [];
    if (!isPartnership) {
      const keySet = new Set<string>();
      for (const l of detail.leads) {
        if (l.customFields) {
          for (const k of Object.keys(l.customFields)) keySet.add(k);
        }
      }
      customKeys.push(...Array.from(keySet));
    }

    const headers = isPartnership
      ? ["Nom", "Email", "Téléphone", "Entreprise", "Message", "Budget", "Statut", "Date"]
      : ["Nom", "Email", "Téléphone", ...customKeys, "Date"];
    const rows = detail.leads.map((l) => {
      const date = new Date(l.createdAt).toLocaleDateString("fr-FR");
      if (isPartnership) {
        return [l.name || "", l.email, l.phone || "", l.company || "", l.message || "", l.budget || "", l.status || "", date];
      }
      const cfValues = customKeys.map((k) => (l.customFields as Record<string, string>)?.[k] || "");
      return [l.name || "", l.email, l.phone || "", ...cfValues, date];
    });
    const slug = selectedCampaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    exportToCsv(`leads-${slug}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  async function updatePartnershipStatus(leadId: string, status: "ACCEPTED" | "REJECTED") {
    try {
      await api(`/api/partnerships/${leadId}/status`, {
        method: "PUT",
        body: { status },
      });
      if (detail) {
        setDetail({
          ...detail,
          leads: detail.leads.map((l) => (l.id === leadId ? { ...l, status } : l)),
        });
      }
      toast(status === "ACCEPTED" ? "Demande acceptée" : "Demande refusée");
    } catch {
      toast("Erreur lors de la mise à jour", "error");
    }
  }

  const isLoading = activeTab === "clients" ? customersLoading : campaignsLoading;
  const leadsCount = campaigns.reduce((s, c) => s + c.subscriberCount, 0);

  // ── Campaign detail view ──
  if (selectedCampaign) {
    const typeConf = TYPE_CONFIG[selectedCampaign.type] || TYPE_CONFIG.LEAD_MAGNET;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedCampaign(null); setDetail(null); setExpandedLeadId(null); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-gray-900">{selectedCampaign.title}</h1>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ color: typeConf.color, backgroundColor: typeConf.bgColor }}
              >
                <typeConf.icon size={10} />
                {typeConf.label}
              </span>
              <span className="text-xs text-gray-400">
                {selectedCampaign.subscriberCount} lead{selectedCampaign.subscriberCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {detail && detail.leads.length > 0 && (
            <button
              onClick={handleExportLeads}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          )}
        </div>

        {detailLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-gray-100 h-20" />
            ))}
          </div>
        ) : !detail || detail.leads.length === 0 ? (
          <EmptyState
            icon={ContactRound}
            title="Aucun lead"
            description="Les leads apparaîtront ici quand des visiteurs s'inscriront à tes lead magnets ou listes d'attente."
          />
        ) : (
          <div className="space-y-2">
            {detail.leads.map((lead) => {
              const date = new Date(lead.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric", month: "short", year: "numeric",
              });
              const isExpanded = expandedLeadId === lead.id;
              const hasExtra = lead.phone || lead.company || lead.message || lead.budget || (lead.customFields && Object.keys(lead.customFields).length > 0);
              return (
                <div key={lead.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                    className="flex w-full items-center gap-3 p-3 sm:p-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                      {(lead.name || lead.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{lead.name || lead.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="truncate text-xs text-gray-400">{lead.email}</span>
                        {detail.type === "PARTNERSHIP" && lead.status && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              color: STATUS_CONFIG[lead.status]?.color,
                              backgroundColor: STATUS_CONFIG[lead.status]?.bgColor,
                            }}
                          >
                            {STATUS_CONFIG[lead.status]?.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock size={11} />
                        {date}
                      </span>
                      <ChevronDown size={14} className={`text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-3 pb-3 sm:px-4 sm:pb-4 pt-3 space-y-2.5">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Mail size={13} className="shrink-0 text-gray-400" />
                        <a href={`mailto:${lead.email}`} className="truncate text-teal-600 hover:underline">{lead.email}</a>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Phone size={13} className="shrink-0 text-gray-400" />
                          <a href={`tel:${lead.phone}`} className="text-teal-600 hover:underline">{lead.phone}</a>
                        </div>
                      )}
                      {lead.company && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Building2 size={13} className="shrink-0 text-gray-400" />
                          {lead.company}
                        </div>
                      )}
                      {lead.budget && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Wallet size={13} className="shrink-0 text-gray-400" />
                          {lead.budget}
                        </div>
                      )}
                      {lead.message && (
                        <div className="flex items-start gap-2 text-sm text-gray-700">
                          <FileText size={13} className="mt-0.5 shrink-0 text-gray-400" />
                          <p className="whitespace-pre-wrap text-xs text-gray-600">{lead.message}</p>
                        </div>
                      )}
                      {lead.customFields && Object.keys(lead.customFields).length > 0 && (
                        <div className="mt-1 space-y-1.5">
                          {Object.entries(lead.customFields).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2 text-sm">
                              <span className="shrink-0 text-xs font-medium text-gray-400">{key} :</span>
                              <span className="text-xs text-gray-700">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 pt-1">
                        <Clock size={11} />
                        Inscrit le {date}
                      </div>
                      {!hasExtra && (
                        <p className="text-xs text-gray-400 italic">Aucune information supplémentaire</p>
                      )}

                      {detail.type === "PARTNERSHIP" && lead.status === "PENDING" && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); updatePartnershipStatus(lead.id, "ACCEPTED"); }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                          >
                            <Check size={14} />
                            Accepter
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); updatePartnershipStatus(lead.id, "REJECTED"); }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                          >
                            <X size={14} />
                            Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Main view ──
  return (
    <div ref={pullRefreshRef} className="space-y-5 min-h-screen">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audience</h1>
          <p className="mt-1 text-xs text-gray-400">
            {activeTab === "clients"
              ? `${customers.length} client(s) — achats, réservations, dons, communautés`
              : `${leadsCount} lead(s) — lead magnets, listes d'attente, partenariats`}
          </p>
        </div>
        {activeTab === "clients" && customers.length > 0 && (
          <button
            onClick={handleExportCustomers}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Download size={14} />
            Exporter
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("clients")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "clients"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <ShoppingBag size={13} />
          Clients
          <span className="opacity-70">{customers.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "leads"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <ContactRound size={13} />
          Leads
          <span className="opacity-70">{leadsCount}</span>
        </button>
      </div>

      {/* Email marketing CTA */}
      {!emailConnected && totalContacts > 0 && !isLoading && (
        <button
          onClick={() => router.push("/dashboard/settings/integrations")}
          className="flex w-full items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-left transition-colors hover:bg-teal-50"
        >
          <Mail size={16} className="shrink-0 text-teal-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-teal-800">Connecte ton outil email marketing</p>
            <p className="text-[10px] text-teal-600">Exporte tes contacts vers Mailchimp, Brevo ou Systeme.io automatiquement</p>
          </div>
          <ChevronRight size={14} className="shrink-0 text-teal-400" />
        </button>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-gray-100 h-20" />
          ))}
        </div>
      )}

      {/* ── Clients tab ── */}
      {activeTab === "clients" && !customersLoading && (
        <>
          {customers.length > 0 && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email ou téléphone..."
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

              <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <ArrowUpDown size={12} className="shrink-0 text-gray-400" />
                {([
                  { key: "recent" as SortKey, label: "Récents" },
                  { key: "spent" as SortKey, label: "Dépensé" },
                  { key: "orders" as SortKey, label: "Achats" },
                ]).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSortBy(s.key)}
                    className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold transition-colors ${
                      sortBy === s.key
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!customers.length ? (
            <EmptyState
              icon={Users}
              title="Aucun client"
              description="Tes clients apparaîtront ici dès qu'ils passeront leur première commande."
              action={{ label: "Voir mon store", href: "/dashboard/blocks" }}
            />
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">Aucun client ne correspond à ta recherche.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openCustomerDetail(c.id)}
                  className="w-full text-left"
                >
                  <Card className="transition-colors hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <Avatar alt={c.name || c.email} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {c.name || c.email}
                          </p>
                          <ChevronRight size={14} className="shrink-0 text-gray-300" />
                        </div>
                        {c.name && (
                          <p className="mt-0.5 truncate text-[11px] text-gray-400">{c.email}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-[10px] text-gray-400">
                            Depuis le {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{formatPrice(c.totalSpent)}</span>
                            <span className="text-[10px] text-gray-400">{c.orderCount} achat(s)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMoreCustomers}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? "Chargement..." : "Charger plus"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Leads tab ── */}
      {activeTab === "leads" && !campaignsLoading && (
        <>
          {campaigns.length === 0 ? (
            <EmptyState
              icon={ContactRound}
              title="Aucune campagne"
              description="Crée un bloc Lead Magnet, Liste d'attente ou Partenariat pour commencer."
              action={{ label: "Créer un bloc", href: "/dashboard/blocks/new" }}
            />
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => {
                const typeConf = TYPE_CONFIG[campaign.type] || TYPE_CONFIG.LEAD_MAGNET;
                return (
                  <button
                    key={campaign.id}
                    onClick={() => openCampaign(campaign)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 text-left transition-colors hover:border-gray-300 active:bg-gray-50"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: typeConf.bgColor }}
                    >
                      <typeConf.icon size={18} style={{ color: typeConf.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{campaign.title}</p>
                        {!campaign.isActive && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-400">
                            Inactif
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ color: typeConf.color, backgroundColor: typeConf.bgColor }}
                        >
                          {typeConf.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {campaign.subscriberCount} {campaign.type === "COMMUNITY" ? "membre" : "inscrit"}{campaign.subscriberCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-gray-300" />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Customer detail modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setSelectedCustomer(null); }}
        title={selectedCustomer?.name || selectedCustomer?.email || "Client"}
      >
        {loadingDetail && !selectedCustomer ? (
          <div className="space-y-4 py-4">
            <div className="mx-auto h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="mx-auto h-4 w-32 rounded-xl bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-12 w-full rounded-xl bg-gray-200 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-gray-200 animate-pulse" />
            </div>
          </div>
        ) : selectedCustomer && (
          <div className="space-y-5">
            <div className="rounded-xl bg-gray-50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Mail size={14} className="text-gray-400" />
                {selectedCustomer.email}
              </div>
              {selectedCustomer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone size={14} className="text-gray-400" />
                  {selectedCustomer.phone}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{formatPrice(selectedCustomer.totalSpent)}</p>
                <p className="text-[10px] text-gray-500">Total dépensé</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{selectedCustomer.orderCount}</p>
                <p className="text-[10px] text-gray-500">Commande(s)</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide">Historique</p>
              {selectedCustomer.orders.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Aucune commande</p>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.orders.map((order) => {
                    const orderTitle = order.product?.title || order.bookingService?.title || order.paymentNote || "—";
                    return (
                      <div
                        key={order.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500">
                          {ORDER_TYPE_ICONS[order.orderType] || <ShoppingBag size={12} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-gray-900">{orderTitle}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
                            <span>{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</span>
                            <span>
                              {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold text-gray-900">{formatPrice(order.amount)}</p>
                          <Badge variant={STATUS_VARIANTS[order.paymentStatus] || "default"}>
                            {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
