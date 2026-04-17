"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldAlert,
  Flag,
  Trash2,
  Percent,
  ShoppingCart,
  Wallet,
  Heart,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Save,
} from "lucide-react";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Textarea } from "@/components/ui/Textarea";

// ── Types ──
interface SellerDetail {
  id: string;
  slug: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  subtitle: string | null;
  phone: string | null;
  plan: "FREE" | "PRO";
  kycStatus: string;
  kycFullName: string | null;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  payoutPhone: string | null;
  payoutProvider: string | null;
  payoutName: string | null;
  payoutCountry: string | null;
  isFlagged: boolean;
  flaggedAt: string | null;
  flagReason: string | null;
  withdrawalBlocked: boolean;
  withdrawalBlockedAt: string | null;
  withdrawalBlockReason: string | null;
  customCommissionRate: number | null;
  onboardingCompleted: boolean;
  emailVerified: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SellerResponse {
  seller: SellerDetail;
  orderCount: number;
  withdrawalCount: number;
  blockCount: number;
}

// ── KYC badge ──
const KYC_BADGE: Record<string, { label: string; className: string }> = {
  NONE: { label: "Aucun", className: "bg-gray-100 text-gray-600" },
  PENDING: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Approuve", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Refuse", className: "bg-red-100 text-red-700" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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

export default function AdminSellerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [data, setData] = React.useState<SellerResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [blockDialog, setBlockDialog] = React.useState(false);
  const [blockReason, setBlockReason] = React.useState("");
  const [flagDialog, setFlagDialog] = React.useState(false);
  const [flagReason, setFlagReason] = React.useState("");
  const [deleteDialog, setDeleteDialog] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  // Commission
  const [commissionInput, setCommissionInput] = React.useState("");
  const [savingCommission, setSavingCommission] = React.useState(false);

  // Fetch seller
  const fetchSeller = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi<SellerResponse>(`/api/admin/sellers/${id}`);
      setData(res);
      setCommissionInput(
        res.seller.customCommissionRate != null
          ? String(res.seller.customCommissionRate)
          : "",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchSeller();
  }, [fetchSeller]);

  // ── Handlers ──
  async function handleBlockWithdrawal() {
    if (!data) return;
    setDialogError(null);
    const blocked = !data.seller.withdrawalBlocked;
    try {
      await adminApi(`/api/admin/sellers/${id}/block-withdrawal`, {
        method: "PATCH",
        body: { blocked, reason: blocked ? blockReason : undefined },
      });
      toast(blocked ? "Retraits bloques" : "Retraits debloques", "success");
      setBlockDialog(false);
      setBlockReason("");
      await fetchSeller();
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : "Erreur";
      setDialogError(msg);
      throw err; // keep dialog open
    }
  }

  async function handleFlag() {
    if (!data) return;
    setDialogError(null);
    const flagged = !data.seller.isFlagged;
    try {
      await adminApi(`/api/admin/sellers/${id}/flag`, {
        method: "PATCH",
        body: { flagged, reason: flagged ? flagReason : undefined },
      });
      toast(flagged ? "Vendeur signale" : "Signalement retire", "success");
      setFlagDialog(false);
      setFlagReason("");
      await fetchSeller();
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : "Erreur";
      setDialogError(msg);
      throw err;
    }
  }

  async function handleDelete() {
    setDialogError(null);
    try {
      await adminApi(`/api/admin/sellers/${id}`, { method: "DELETE" });
      toast("Compte supprime", "success");
      setDeleteDialog(false);
      await fetchSeller();
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : "Erreur";
      setDialogError(msg);
      throw err;
    }
  }

  async function handleSaveCommission() {
    setSavingCommission(true);
    try {
      const value = commissionInput.trim() === "" ? null : parseInt(commissionInput, 10);
      if (value !== null && (isNaN(value) || value < 0 || value > 5000)) {
        toast("Valeur invalide (0-5000 basis points)", "error");
        return;
      }
      await adminApi(`/api/admin/sellers/${id}/commission`, {
        method: "PATCH",
        body: { customCommissionRate: value },
      });
      toast("Commission mise a jour", "success");
      await fetchSeller();
    } catch (err) {
      toast(err instanceof AdminApiError ? err.message : "Erreur", "error");
    } finally {
      setSavingCommission(false);
    }
  }

  // ── Loading / Error ──
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
          href="/admin/sellers"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          Retour aux vendeurs
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { seller, orderCount, withdrawalCount, blockCount } = data;
  const kycBadge = KYC_BADGE[seller.kycStatus] ?? KYC_BADGE.NONE;

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/admin/sellers"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft size={16} />
        Retour aux vendeurs
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Avatar src={seller.avatarUrl} name={seller.displayName} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headings text-2xl font-black text-primary">
              {seller.displayName}
            </h1>
            <Badge
              className={
                seller.plan === "PRO"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-600"
              }
            >
              {seller.plan}
            </Badge>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${kycBadge.className}`}>
              KYC: {kycBadge.label}
            </span>
            {seller.deletedAt ? (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                Supprime
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground truncate">{seller.email}</p>
          <p className="text-sm text-muted-foreground truncate">@{seller.slug}</p>
        </div>
      </div>

      {/* Info section */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-3">
          <Phone size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Telephone</p>
            <p className="text-sm font-medium text-primary">{seller.phone || "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Mail size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Email verifie</p>
            <p className="text-sm font-medium text-primary">
              {seller.emailVerified ? "Oui" : "Non"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CreditCard size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Paiement</p>
            <p className="text-sm font-medium text-primary">
              {seller.payoutProvider
                ? `${seller.payoutProvider} - ${seller.payoutPhone ?? "-"}`
                : "-"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Inscription</p>
            <p className="text-sm font-medium text-primary">
              {formatDate(seller.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Derniere activite</p>
            <p className="text-sm font-medium text-primary">
              {formatDateTime(seller.updatedAt)}
            </p>
          </div>
        </div>
        {seller.kycFullName ? (
          <div className="flex items-center gap-3">
            <ShieldAlert size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nom KYC</p>
              <p className="text-sm font-medium text-primary">{seller.kycFullName}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* KPI cards — clickable links to filtered views */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href={`/admin/orders?search=${encodeURIComponent(seller.email)}`} className="block">
          <KpiCard
            icon={<ShoppingCart size={18} />}
            label="Commandes payees"
            value={String(orderCount)}
            className="hover:ring-2 hover:ring-primary/30 transition-shadow"
          />
        </Link>
        <KpiCard
          icon={<Wallet size={18} />}
          label="Retraits"
          value={String(withdrawalCount)}
        />
        <Link href={`/admin/cagnottes?search=${encodeURIComponent(seller.displayName)}`} className="block">
          <KpiCard
            icon={<Heart size={18} />}
            label="Cagnottes"
            value={String(blockCount)}
            className="hover:ring-2 hover:ring-primary/30 transition-shadow"
          />
        </Link>
      </div>

      {/* Actions */}
      <div className="space-y-6 rounded-xl border border-border bg-background p-5 shadow-sm">
        <h2 className="font-headings text-lg font-bold text-primary">Actions</h2>

        {/* Block withdrawal */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Blocage des retraits</p>
            <p className="text-xs text-muted-foreground">
              {seller.withdrawalBlocked
                ? `Bloque le ${formatDateTime(seller.withdrawalBlockedAt)}${seller.withdrawalBlockReason ? ` — ${seller.withdrawalBlockReason}` : ""}`
                : "Les retraits sont autorises"}
            </p>
          </div>
          <Button
            variant={seller.withdrawalBlocked ? "outline" : "primary"}
            iconLeft={<ShieldAlert size={16} />}
            onClick={() => {
              setDialogError(null);
              setBlockReason("");
              setBlockDialog(true);
            }}
            className="w-full sm:w-auto"
          >
            {seller.withdrawalBlocked ? "Debloquer les retraits" : "Bloquer les retraits"}
          </Button>
        </div>

        {/* Flag */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Signalement</p>
            <p className="text-xs text-muted-foreground">
              {seller.isFlagged
                ? `Signale le ${formatDateTime(seller.flaggedAt)}${seller.flagReason ? ` — ${seller.flagReason}` : ""}`
                : "Aucun signalement"}
            </p>
          </div>
          <Button
            variant={seller.isFlagged ? "outline" : "danger"}
            iconLeft={<Flag size={16} />}
            onClick={() => {
              setDialogError(null);
              setFlagReason("");
              setFlagDialog(true);
            }}
            className="w-full sm:w-auto"
          >
            {seller.isFlagged ? "Retirer le signalement" : "Signaler"}
          </Button>
        </div>

        {/* Commission */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex-1">
            <Input
              label="Commission personnalisee (basis points)"
              helper="Laissez vide pour le taux global. Ex: 600 = 6%"
              type="number"
              min={0}
              max={5000}
              icon={<Percent size={16} />}
              value={commissionInput}
              onChange={(e) => setCommissionInput(e.target.value)}
              placeholder="Taux global"
            />
          </div>
          <Button
            variant="primary"
            iconLeft={<Save size={16} />}
            loading={savingCommission}
            onClick={handleSaveCommission}
            className="w-full sm:w-auto"
          >
            Enregistrer
          </Button>
        </div>

        {/* Delete */}
        {!seller.deletedAt ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Supprimer le compte</p>
              <p className="text-xs text-muted-foreground">
                Suppression douce — le compte sera desactive mais les donnees seront conservees.
              </p>
            </div>
            <Button
              variant="danger"
              iconLeft={<Trash2 size={16} />}
              onClick={() => {
                setDialogError(null);
                setDeleteDialog(true);
              }}
              className="w-full sm:w-auto"
            >
              Supprimer le compte
            </Button>
          </div>
        ) : (
          <div className="border-t border-border pt-4">
            <p className="text-sm text-red-600">
              Ce compte a ete supprime le {formatDateTime(seller.deletedAt)}.
            </p>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}

      {/* Block withdrawal dialog */}
      <ConfirmDialog
        open={blockDialog}
        onClose={() => setBlockDialog(false)}
        title={
          data.seller.withdrawalBlocked
            ? "Debloquer les retraits"
            : "Bloquer les retraits"
        }
        message={
          <div className="space-y-3">
            <p>
              {data.seller.withdrawalBlocked
                ? "Voulez-vous autoriser a nouveau les retraits pour ce vendeur ?"
                : "Le vendeur ne pourra plus effectuer de retraits."}
            </p>
            {!data.seller.withdrawalBlocked ? (
              <Textarea
                label="Raison (optionnel)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                maxLength={500}
                placeholder="Raison du blocage..."
              />
            ) : null}
          </div>
        }
        confirmLabel={data.seller.withdrawalBlocked ? "Debloquer" : "Bloquer"}
        tone={data.seller.withdrawalBlocked ? "primary" : "danger"}
        onConfirm={handleBlockWithdrawal}
        errorMessage={dialogError}
      />

      {/* Flag dialog */}
      <ConfirmDialog
        open={flagDialog}
        onClose={() => setFlagDialog(false)}
        title={data.seller.isFlagged ? "Retirer le signalement" : "Signaler le vendeur"}
        message={
          <div className="space-y-3">
            <p>
              {data.seller.isFlagged
                ? "Voulez-vous retirer le signalement de ce vendeur ?"
                : "Ce vendeur sera marque comme signale."}
            </p>
            {!data.seller.isFlagged ? (
              <Textarea
                label="Raison (optionnel)"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                maxLength={500}
                placeholder="Raison du signalement..."
              />
            ) : null}
          </div>
        }
        confirmLabel={data.seller.isFlagged ? "Retirer" : "Signaler"}
        tone={data.seller.isFlagged ? "primary" : "danger"}
        onConfirm={handleFlag}
        errorMessage={dialogError}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        title="Supprimer le compte"
        message="Cette action desactivera le compte du vendeur. Les donnees seront conservees pour reference. Cette action est irreversible depuis l'interface."
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={handleDelete}
        errorMessage={dialogError}
      />
    </div>
  );
}
