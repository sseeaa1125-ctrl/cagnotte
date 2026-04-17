"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Globe,
  Hash,
  MessageSquare,
  Heart,
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { Badge } from "@/components/ui/Badge";

// ── Types ──
interface OrderDetail {
  id: string;
  reference: string;
  orderType: string;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  sellerAmount: number;
  currency: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentOperator: string | null;
  paymentExternalId: string | null;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  donorMessage: string | null;
  isAnonymous: boolean;
  messageIsPrivate: boolean;
  source: string | null;
  country: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  seller: {
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  block: {
    id: string;
    slug: string | null;
    title: string;
    type: string;
    config: unknown;
  } | null;
}

interface OrderResponse {
  order: OrderDetail;
}

// ── Helpers ──
function formatPrice(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-SN", {
    day: "2-digit",
    month: "long",
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

// ── Order type labels ──
const ORDER_TYPE_LABELS: Record<string, string> = {
  DONATION: "Donation",
  SALE: "Vente",
  BOOKING: "Reservation",
  PAYMENT: "Paiement",
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = React.useState<OrderResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi<OrderResponse>(`/api/admin/orders/${id}`);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  // ── Loading / Error ──
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-60 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          Retour aux commandes
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { order } = data;
  const statusBadge = STATUS_BADGE[order.paymentStatus] ?? {
    label: order.paymentStatus,
    className: "bg-gray-100 text-gray-600",
  };
  const commissionPercent =
    order.commissionRate > 0
      ? (order.commissionRate / 100).toFixed(1) + "%"
      : "-";

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft size={16} />
        Retour aux commandes
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-headings text-2xl font-black text-primary">
          Commande {order.reference}
        </h1>
        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
        <Badge className="bg-gray-100 text-gray-600">
          {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
        </Badge>
      </div>

      {/* Financial details */}
      <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
        <h2 className="mb-4 font-headings text-lg font-bold text-primary">
          Details financiers
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center gap-3">
            <Banknote size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Montant total</p>
              <p className="text-sm font-bold text-primary">
                {formatPrice(order.amount)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Hash size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                Commission ({commissionPercent})
              </p>
              <p className="text-sm font-bold text-primary">
                {formatPrice(order.commissionAmount)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Banknote size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                Reversement vendeur
              </p>
              <p className="text-sm font-bold text-primary">
                {formatPrice(order.sellerAmount)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Operateur</p>
              <p className="text-sm font-medium text-primary">
                {order.paymentOperator ?? "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer info */}
      <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
        <h2 className="mb-4 font-headings text-lg font-bold text-primary">
          Client
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex items-center gap-3">
            <User size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nom</p>
              <p className="text-sm font-medium text-primary">
                {order.isAnonymous
                  ? `${order.customerName || "-"} (anonyme)`
                  : order.customerName || "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-primary">
                {order.customerEmail}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Telephone</p>
              <p className="text-sm font-medium text-primary">
                {order.customerPhone ?? "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Pays</p>
              <p className="text-sm font-medium text-primary">
                {order.country ?? "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="text-sm font-medium text-primary">
                {order.source ?? "-"}
              </p>
            </div>
          </div>
        </div>
        {order.donorMessage ? (
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-muted/30 p-3">
            <MessageSquare size={16} className="mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                Message du donateur{" "}
                {order.messageIsPrivate ? "(prive)" : "(public)"}
              </p>
              <p className="mt-1 text-sm text-primary">{order.donorMessage}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Seller & Block links */}
      <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
        <h2 className="mb-4 font-headings text-lg font-bold text-primary">
          Liens
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Seller */}
          <div className="flex items-center gap-3">
            <User size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Vendeur</p>
              {order.seller ? (
                <Link
                  href={`/admin/sellers/${order.seller.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {order.seller.displayName} (@{order.seller.slug})
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>

          {/* Block */}
          <div className="flex items-center gap-3">
            <Heart size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Cagnotte</p>
              {order.block ? (
                <Link
                  href={`/admin/cagnottes/${order.block.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {order.block.title}
                  {order.block.slug ? ` (/${order.block.slug})` : ""}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Technical details */}
      <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
        <h2 className="mb-4 font-headings text-lg font-bold text-primary">
          Details techniques
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3">
            <Hash size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">ID interne</p>
              <p className="break-all font-mono text-xs text-primary">
                {order.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Hash size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                ID externe Bictorys
              </p>
              <p className="break-all font-mono text-xs text-primary">
                {order.paymentExternalId ?? "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Provider</p>
              <p className="text-sm font-medium text-primary">
                {order.paymentProvider}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Cree le</p>
              <p className="text-sm font-medium text-primary">
                {formatDateTime(order.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Paye le</p>
              <p className="text-sm font-medium text-primary">
                {formatDateTime(order.paidAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Mis a jour</p>
              <p className="text-sm font-medium text-primary">
                {formatDateTime(order.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
