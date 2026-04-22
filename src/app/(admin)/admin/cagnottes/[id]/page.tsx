"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Users,
  Banknote,
  Percent,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Calendar,
  User,
  Pencil,
} from "lucide-react";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ── Types ──
interface CagnotteDetail {
  id: string;
  slug: string | null;
  title: string;
  subtype: "festive" | "solidaire" | null;
  status: "active" | "closed";
  visibility: "public" | "private";
  goalAmount: number | null;
  endDate: string | null;
  description: string | null;
  coverUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CagnotteSeller {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
}

interface CagnotteStats {
  totalRaised: number;
  totalCommission: number;
  totalSellerAmount: number;
  donorCount: number;
}

interface OrderRow {
  id: string;
  reference: string;
  amount: number;
  commissionAmount: number;
  sellerAmount: number;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  donorMessage: string | null;
  isAnonymous: boolean;
  paymentOperator: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface CagnotteResponse {
  cagnotte: CagnotteDetail;
  seller: CagnotteSeller;
  stats: CagnotteStats;
  recentOrders: OrderRow[];
}

// ── Helpers ──
function formatPrice(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function AdminCagnotteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [data, setData] = React.useState<CagnotteResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [activeDialog, setActiveDialog] = React.useState(false);
  const [visibilityDialog, setVisibilityDialog] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  // Fetch
  const fetchCagnotte = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi<CagnotteResponse>(
        `/api/admin/cagnottes/${id}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchCagnotte();
  }, [fetchCagnotte]);

  // ── Handlers ──
  async function handleToggleActive() {
    setDialogError(null);
    try {
      await adminApi(`/api/admin/cagnottes/${id}/toggle-active`, {
        method: "PATCH",
      });
      toast(
        data?.cagnotte.isActive ? "Cagnotte desactivee" : "Cagnotte activee",
        "success",
      );
      setActiveDialog(false);
      await fetchCagnotte();
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : "Erreur";
      setDialogError(msg);
      throw err;
    }
  }

  async function handleToggleVisibility() {
    setDialogError(null);
    try {
      await adminApi(`/api/admin/cagnottes/${id}/toggle-visibility`, {
        method: "PATCH",
      });
      toast(
        data?.cagnotte.visibility === "public"
          ? "Cagnotte passee en privee"
          : "Cagnotte passee en publique",
        "success",
      );
      setVisibilityDialog(false);
      await fetchCagnotte();
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : "Erreur";
      setDialogError(msg);
      throw err;
    }
  }

  // ── Loading / Error ──
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/cagnottes"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          Retour aux cagnottes
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { cagnotte, seller, stats, recentOrders } = data;
  const progress =
    cagnotte.goalAmount && cagnotte.goalAmount > 0
      ? Math.round((stats.totalRaised / cagnotte.goalAmount) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/admin/cagnottes"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft size={16} />
        Retour aux cagnottes
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headings text-2xl font-black text-primary">
              {cagnotte.title}
            </h1>
            <Badge
              className={
                cagnotte.subtype === "solidaire"
                  ? "bg-blue-100 text-blue-700"
                  : cagnotte.subtype === "festive"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600"
              }
            >
              {cagnotte.subtype ?? "-"}
            </Badge>
            <Badge
              className={
                cagnotte.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }
            >
              {cagnotte.status === "active" ? "Active" : "Cloturee"}
            </Badge>
            {!cagnotte.isActive ? (
              <Badge className="bg-red-100 text-red-700">Desactivee</Badge>
            ) : null}
            <Badge
              className={
                cagnotte.visibility === "public"
                  ? "bg-cyan-100 text-cyan-700"
                  : "bg-orange-100 text-orange-700"
              }
            >
              {cagnotte.visibility === "public" ? "Publique" : "Privee"}
            </Badge>
          </div>
          {cagnotte.slug ? (
            <p className="mt-1 text-sm text-muted-foreground">
              /{cagnotte.slug}
            </p>
          ) : null}
          {cagnotte.description ? (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
              {cagnotte.description}
            </p>
          ) : null}
        </div>
        {/* Right : edit CTA (SUPER_ADMIN only côté backend) */}
        <Link
          href={`/admin/cagnottes/${id}/modifier`}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white"
        >
          <Pencil size={16} />
          Modifier
        </Link>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
        <ProgressBar
          value={progress}
          label={`${progress}% atteint`}
          raisedLabel={formatPrice(stats.totalRaised)}
          goalLabel={
            cagnotte.goalAmount ? formatPrice(cagnotte.goalAmount) : "Pas d'objectif"
          }
        />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Banknote size={18} />}
          label="Total collecte"
          value={formatPrice(stats.totalRaised)}
        />
        <KpiCard
          icon={<Percent size={18} />}
          label="Commission"
          value={formatPrice(stats.totalCommission)}
        />
        <KpiCard
          icon={<Heart size={18} />}
          label="Reversement vendeur"
          value={formatPrice(stats.totalSellerAmount)}
        />
        <KpiCard
          icon={<Users size={18} />}
          label="Donateurs"
          value={String(stats.donorCount)}
        />
      </div>

      {/* Info section */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-3">
          <User size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Vendeur</p>
            <Link
              href={`/admin/sellers/${seller.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {seller.displayName}
            </Link>
            <p className="text-xs text-muted-foreground">{seller.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Creee le</p>
            <p className="text-sm font-medium text-primary">
              {formatDate(cagnotte.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Date de fin</p>
            <p className="text-sm font-medium text-primary">
              {cagnotte.endDate ? formatDate(cagnotte.endDate) : "Pas de date de fin"}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-6 rounded-xl border border-border bg-background p-5 shadow-sm">
        <h2 className="font-headings text-lg font-bold text-primary">
          Actions
        </h2>

        {/* Toggle active */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              {cagnotte.isActive ? "Desactiver la cagnotte" : "Reactiver la cagnotte"}
            </p>
            <p className="text-xs text-muted-foreground">
              {cagnotte.isActive
                ? "La cagnotte ne sera plus accessible publiquement"
                : "La cagnotte sera de nouveau accessible"}
            </p>
          </div>
          <Button
            variant={cagnotte.isActive ? "danger" : "primary"}
            iconLeft={
              cagnotte.isActive ? (
                <PowerOff size={16} />
              ) : (
                <Power size={16} />
              )
            }
            onClick={() => {
              setDialogError(null);
              setActiveDialog(true);
            }}
            className="w-full sm:w-auto"
          >
            {cagnotte.isActive ? "Desactiver" : "Reactiver"}
          </Button>
        </div>

        {/* Toggle visibility */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Visibilite</p>
            <p className="text-xs text-muted-foreground">
              {cagnotte.visibility === "public"
                ? "Actuellement publique — visible dans la liste des cagnottes"
                : "Actuellement privee — accessible uniquement via le lien direct"}
            </p>
          </div>
          <Button
            variant="outline"
            iconLeft={
              cagnotte.visibility === "public" ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )
            }
            onClick={() => {
              setDialogError(null);
              setVisibilityDialog(true);
            }}
            className="w-full sm:w-auto"
          >
            {cagnotte.visibility === "public"
              ? "Passer en privee"
              : "Passer en publique"}
          </Button>
        </div>
      </div>

      {/* Recent orders */}
      <div className="space-y-4">
        <h2 className="font-headings text-lg font-bold text-primary">
          Derniers dons ({recentOrders.length})
        </h2>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun don pour le moment.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 font-semibold text-primary">
                    Donateur
                  </th>
                  <th className="px-4 py-3 font-semibold text-primary">
                    Montant
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-primary md:table-cell">
                    Commission
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">
                    Operateur
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-primary lg:table-cell">
                    Message
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Date</th>
                  <th className="px-4 py-3 font-semibold text-primary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">
                        {order.isAnonymous
                          ? "Anonyme"
                          : order.customerName || "Anonyme"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.customerEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">
                      {formatPrice(order.amount)}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {formatPrice(order.commissionAmount)}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {order.paymentOperator ?? "-"}
                    </td>
                    <td className="hidden max-w-[200px] px-4 py-3 lg:table-cell">
                      <p className="truncate text-xs text-muted-foreground">
                        {order.donorMessage || "-"}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {formatDateTime(order.paidAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}

      {/* Toggle active dialog */}
      <ConfirmDialog
        open={activeDialog}
        onClose={() => setActiveDialog(false)}
        title={
          data.cagnotte.isActive
            ? "Desactiver la cagnotte"
            : "Reactiver la cagnotte"
        }
        message={
          data.cagnotte.isActive
            ? "La cagnotte ne sera plus accessible et ne pourra plus recevoir de dons."
            : "La cagnotte sera de nouveau accessible."
        }
        confirmLabel={data.cagnotte.isActive ? "Desactiver" : "Reactiver"}
        tone={data.cagnotte.isActive ? "danger" : "primary"}
        onConfirm={handleToggleActive}
        errorMessage={dialogError}
      />

      {/* Toggle visibility dialog */}
      <ConfirmDialog
        open={visibilityDialog}
        onClose={() => setVisibilityDialog(false)}
        title={
          data.cagnotte.visibility === "public"
            ? "Passer en privee"
            : "Passer en publique"
        }
        message={
          data.cagnotte.visibility === "public"
            ? "La cagnotte ne sera plus visible dans la liste publique. Elle restera accessible via son lien direct."
            : "La cagnotte sera visible dans la liste publique."
        }
        confirmLabel="Confirmer"
        tone="primary"
        onConfirm={handleToggleVisibility}
        errorMessage={dialogError}
      />
    </div>
  );
}
