"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, MessageSquare, ChevronRight, Mail, X } from "lucide-react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getCache, setCache } from "@/lib/useApi";
import { EmptyState, PullToRefreshIndicator } from "@/components/ui";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { formatPrice, billingPeriodLabel } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface CommunityItem {
  id: string;
  title: string;
  description: string | null;
  priceAmount: number;
  billingPeriod: string;
  memberCount: number;
  activeMembers: number;
  isActive: boolean;
  telegramChatTitle: string | null;
  coverUrl: string | null;
}

const DISMISS_KEY = "dismiss-email-banner";

export default function CommunitiesPage() {
  const cached = getCache<{ communities: CommunityItem[] }>("/api/communities/seller/list");
  const [communities, setCommunities] = useState<CommunityItem[]>(cached?.communities || []);
  const [loading, setLoading] = useState(!cached);
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();

  // Email marketing integration status
  const [emailConnected, setEmailConnected] = useState<boolean | null>(null);
  const [emailDismissed, setEmailDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY)) {
      setEmailDismissed(true);
      return;
    }
    api<{ connected: boolean }>("/api/integrations/email/status")
      .then((res) => setEmailConnected(res.connected))
      .catch(() => setEmailConnected(null));
  }, []);

  function dismissEmailBanner() {
    setEmailDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  const load = useCallback(async () => {
    if (!communities.length) setLoading(true);
    setLoadError(null);
    try {
      const res = await api<{ communities: CommunityItem[] }>("/api/communities/seller/list");
      setCommunities(res.communities);
      setCache("/api/communities/seller/list", res);
    } catch (err) {
      console.error("[Communities] Erreur chargement:", err);
      if (err instanceof ApiError) {
        setLoadError(err.status === 401 ? "Session expirée. Reconnecte-toi." : err.message);
      } else {
        setLoadError("Vérifie ta connexion internet et réessaye.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Pull to refresh
  const { containerRef: pullRefreshRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: load,
  });

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-6 w-36 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-56 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="h-10 w-24 animate-pulse rounded-xl bg-gray-100" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-[100px] animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-900">{loadError}</p>
        <button
          onClick={load}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div ref={pullRefreshRef} className="space-y-5 min-h-screen">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Communautés</h1>
          <p className="text-xs text-gray-400">Tes groupes et canaux Telegram payants</p>
        </div>
        {communities.filter((c: CommunityItem) => c.isActive).length < 3 && (
          <button
            onClick={() => router.push("/dashboard/communities/new")}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            <Plus size={16} />
            Créer
          </button>
        )}
      </div>

      {/* Banner : suggérer connexion email marketing */}
      {emailConnected === false && !emailDismissed && (
        <div className="relative flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100">
            <Mail size={18} className="text-teal-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal-900">
              Synchronise tes contacts automatiquement
            </p>
            <p className="mt-0.5 text-xs text-teal-700">
              Connecte Brevo ou Systeme.io pour envoyer tes nouveaux membres dans ta liste email.
            </p>
            <Link
              href="/dashboard/settings/integrations"
              className="mt-2 inline-flex items-center gap-1 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Connecter
              <ChevronRight size={14} />
            </Link>
          </div>
          <button
            onClick={dismissEmailBanner}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-teal-400 transition-colors hover:bg-teal-100 hover:text-teal-600"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Empty state */}
      {communities.length === 0 && (
        <EmptyState
          icon={Users}
          title="Aucune communauté"
          description="Crée ta communauté Telegram payante pour monétiser ton audience."
          action={{ label: "Créer ma communauté", href: "/dashboard/communities/new" }}
        />
      )}

      {/* Community cards */}
      {communities.length > 0 && (
        <div className="space-y-3">
          {communities.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/communities/${c.id}`)}
              className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-sm active:scale-[0.99]"
            >
              {/* Icon */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                <Users size={22} className="text-teal-600" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-gray-900">{c.title}</p>
                  {!c.isActive && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      Inactif
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {c.telegramChatTitle && `${c.telegramChatTitle} · `}
                  {formatPrice(c.priceAmount)}{billingPeriodLabel(c.billingPeriod)}
                </p>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-teal-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    {c.activeMembers} actif{c.activeMembers !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {c.memberCount} total
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight size={18} className="shrink-0 text-gray-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
