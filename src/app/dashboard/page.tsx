"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, DashboardSkeleton, PullToRefreshIndicator } from "@/components/ui";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useApi } from "@/lib/useApi";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { shareStoreLink, copyToClipboard, getWhatsAppShareUrl } from "@/lib/share";
import {
  ShoppingBag,
  DollarSign,
  Copy,
  Check,
  Share2,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import {
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_VARIANTS,
} from "@/lib/constants";

interface DashboardStats {
  revenue: number;
  revenueToday: number;
  salesCount: number;
  totalOrders: number;
  recentOrders: {
    id: string;
    reference: string;
    orderType: string;
    amount: number;
    paymentStatus: string;
    customerName: string | null;
    customerEmail: string;
    createdAt: string;
  }[];
  period: number;
  hasBlocks?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { seller } = useAuth();
  const [copied, setCopied] = useState(false);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (seller && !seller.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [seller, router]);

  const { data: stats, loading, refresh } = useApi<DashboardStats>("/api/sellers/dashboard/stats?period=30");

  // Pull to refresh
  const { containerRef: pullRefreshRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: refresh,
  });

  async function handleCopy() {
    if (!seller) return;
    await copyToClipboard(`${window.location.origin}/${seller.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!seller) return;
    const used = await shareStoreLink(seller.slug, seller.displayName);
    if (!used) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div ref={pullRefreshRef} className="space-y-6 min-h-screen">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* ── Header : Greeting + lien boutique ── */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Salut{seller ? `, ${seller.displayName.split(" ")[0]}` : ""} 👋
        </h1>

        {/* Lien boutique + actions partage */}
        {seller && (
          <div className="mt-3 flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-teal-600">
              izy.store/{seller.slug}
            </div>
            <button
              onClick={handleCopy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 active:scale-95"
              aria-label="Copier le lien"
            >
              {copied ? <Check size={16} className="text-teal-600" /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleShare}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white transition-colors hover:bg-teal-700 active:scale-95"
            >
              <Share2 size={14} />
              Partager
            </button>
          </div>
        )}
      </div>

      {/* ── 2 metric cards : Aujourd'hui + Ce mois ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
              <DollarSign size={16} className="text-teal-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">{"Aujourd'hui"}</p>
          </div>
          <p className="mt-2 text-xl font-extrabold text-gray-900">
            {formatPrice(stats?.revenueToday || 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <ShoppingBag size={16} className="text-amber-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">Ce mois</p>
          </div>
          <p className="mt-2 text-xl font-extrabold text-gray-900">
            {formatPrice(stats?.revenue || 0)}
          </p>
        </div>
      </div>

      {/* ── Activité récente ── */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Activité récente</h2>
          {stats?.recentOrders && stats.recentOrders.length > 0 && (
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              Voir tout
              <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {!stats?.recentOrders?.length ? (
          <div className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
            <ShoppingBag size={32} className="mx-auto text-gray-200" />
            <p className="mt-3 text-sm font-medium text-gray-500">
              Aucune activité pour le moment
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Partage ta page pour recevoir tes premières ventes
            </p>
            {seller && (
              <a
                href={getWhatsAppShareUrl(seller.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 active:scale-95"
              >
                <MessageCircle size={16} />
                Partager sur WhatsApp
              </a>
            )}
          </div>
        ) : (
          <div className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {stats.recentOrders.map((order) => (
              <Link
                key={order.id}
                href="/dashboard/orders"
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50 active:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {order.customerName || (order.customerEmail.endsWith("@noemail.local") ? "Client anonyme" : order.customerEmail)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Badge variant={STATUS_VARIANTS[order.paymentStatus] || "default"}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                    </Badge>
                    <span>{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</span>
                    <span>·</span>
                    <span>{new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {formatPrice(order.amount)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
