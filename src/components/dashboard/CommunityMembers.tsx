"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, Users, Pencil, DollarSign, AlertTriangle, Clock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatPrice, billingPeriodLabel } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import { CommunityPreview } from "@/components/dashboard/CommunityPreview";
import { useAuth } from "@/contexts/AuthContext";
import type { Community, CommunitySubscription } from "@/types";
import { useRouter } from "next/navigation";

interface MembersResponse {
  members: CommunitySubscription[];
  community: Community;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Actif", color: "#059669", bg: "#ECFDF5" },
  GRACE_PERIOD: { label: "Impayé", color: "#D97706", bg: "#FFFBEB" },
  CANCELED: { label: "Annulé", color: "#6B7280", bg: "#F3F4F6" },
  EXPIRED: { label: "Expiré", color: "#DC2626", bg: "#FEF2F2" },
  PENDING: { label: "En attente", color: "#6B7280", bg: "#F3F4F6" },
};

export function CommunityMembers({ communityId, embedded }: { communityId: string; embedded?: boolean }) {
  const [data, setData] = useState<MembersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "grace_period" | "expired">("all");
  const router = useRouter();
  const { seller } = useAuth();
  const themeConfig = seller ? { themeId: seller.themeId, themeFont: seller.themeFont, themeColors: seller.themeColors } : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api<MembersResponse>(`/api/communities/${communityId}/members`);
      setData(res);
    } catch (err) {
      console.error("[CommunityMembers] Erreur chargement:", err);
      if (err instanceof ApiError) {
        setLoadError(err.status === 401 ? "Session expirée. Reconnecte-toi." : err.message);
      } else {
        setLoadError("Vérifie ta connexion internet et réessaye.");
      }
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-gray-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-gray-100 h-16" />
            ))}
          </div>
          <div className="hidden lg:block w-[360px] shrink-0">
            <div className="animate-pulse rounded-2xl bg-gray-100 h-[350px]" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl">
        {!embedded && (
          <button
            onClick={() => router.push("/dashboard/communities")}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft size={16} />
            Communautés
          </button>
        )}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <Users size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-900">{loadError}</p>
          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { members, community } = data;
  const activeCount = members.filter((m) => m.status === "ACTIVE" || m.status === "GRACE_PERIOD").length;
  const graceCount = members.filter((m) => m.status === "GRACE_PERIOD").length;
  const expiredCount = members.filter((m) => m.status === "EXPIRED" || m.status === "CANCELED").length;
  // Calculer le revenu par période (pas toujours mensuel)
  const periodicRevenue = activeCount * community.priceAmount;

  const filteredMembers = filter === "all"
    ? members
    : members.filter((m) => {
        if (filter === "active") return m.status === "ACTIVE";
        if (filter === "grace_period") return m.status === "GRACE_PERIOD";
        if (filter === "expired") return m.status === "EXPIRED" || m.status === "CANCELED";
        return true;
      });

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      {!embedded && (
        <button
          onClick={() => router.push("/dashboard/communities")}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          <ChevronLeft size={16} />
          Communautés
        </button>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {community.coverUrl ? (
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100">
              <Image src={community.coverUrl} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
              <Users size={22} className="text-teal-600" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold text-gray-900">{community.title}</h1>
            <p className="text-xs text-gray-500">
              {community.telegramChatTitle && `${community.telegramChatTitle} · `}{formatPrice(community.priceAmount)}{billingPeriodLabel(community.billingPeriod)}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/dashboard/communities/${communityId}/edit`)}
          className="ml-3 flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          <Pencil size={14} />
          <span className="hidden sm:inline">Modifier</span>
        </button>
      </div>

      {/* Split layout: content left + preview right */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Main content column */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-teal-50 px-3 py-3 text-center">
              <p className="text-xl font-bold text-teal-700">{activeCount}</p>
              <p className="text-[10px] font-medium text-teal-600">Actifs</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
              <p className="text-xl font-bold text-amber-700">{graceCount}</p>
              <p className="text-[10px] font-medium text-amber-600">Impayés</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-3 text-center">
              <p className="text-lg font-bold text-gray-700">{formatPrice(periodicRevenue)}</p>
              <p className="text-[10px] font-medium text-gray-500">Rev.{billingPeriodLabel(community.billingPeriod)}</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {([
              { key: "all", label: "Tous", count: members.length },
              { key: "active", label: "Actifs", count: members.filter((m) => m.status === "ACTIVE").length },
              { key: "grace_period", label: "Impayés", count: graceCount },
              { key: "expired", label: "Expirés", count: expiredCount },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === tab.key
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Members list */}
          {filteredMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={filter === "all" ? "Aucun membre" : "Aucun résultat"}
              description={filter === "all"
                ? "Les membres apparaîtront ici quand ils s'abonneront à ta communauté."
                : "Aucun membre dans cette catégorie."}
            />
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((m) => {
                const status = STATUS_LABELS[m.status] || STATUS_LABELS.PENDING;
                const nextPayment = m.status === "ACTIVE"
                  ? new Date(m.currentPeriodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                  : m.status === "GRACE_PERIOD"
                    ? "En retard"
                    : "—";
                const joinDate = new Date(m.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
                        {(m.memberName || (m.memberEmail.endsWith("@noemail.local") ? (m.telegramUsername || "?") : m.memberEmail)).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {m.memberName || (m.memberEmail.endsWith("@noemail.local") ? (m.telegramUsername ? `@${m.telegramUsername}` : "Membre") : m.memberEmail)}
                          </p>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ color: status.color, backgroundColor: status.bg }}
                          >
                            {status.label}
                          </span>
                        </div>
                        {!m.memberEmail.endsWith("@noemail.local") && (
                          <p className="mt-0.5 truncate text-xs text-gray-400">{m.memberEmail}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[52px] text-[11px] text-gray-400">
                      {m.telegramUsername && (
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          @{m.telegramUsername}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Depuis {joinDate}
                      </span>
                      {m.status === "ACTIVE" && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={11} />
                          Prochain: {nextPayment}
                        </span>
                      )}
                      {m.status === "GRACE_PERIOD" && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertTriangle size={11} />
                          Paiement en retard
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop preview panel */}
        <div className="hidden lg:block w-[360px] shrink-0 sticky top-[calc(64px+1.5rem)] max-h-[calc(100vh-64px-3rem)] overflow-y-auto pb-6 scrollbar-hide">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 shadow-sm overflow-hidden p-2.5">
            <CommunityPreview
              title={community.title}
              description={community.description || ""}
              coverUrl={community.coverUrl || ""}
              priceAmount={community.priceAmount}
              billingPeriod={community.billingPeriod}
              subscribeFields={(community.subscribeFields as import("@/types").LeadField[]) || []}
              themeConfig={themeConfig}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
