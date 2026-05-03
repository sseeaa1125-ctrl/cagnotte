"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminApi } from "@/lib/adminApi";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { useToast } from "@/contexts/ToastContext";

// Page miroir de /admin/kyc, focalisée sur le workflow d'approbation carte.
// Filtre par config.cardStatus (REQUESTED par défaut). Chaque ligne expose :
//   - Approuver  (disabled si seller.kycStatus !== APPROVED)
//   - Rejeter    (modal avec textarea raison)
//
// Pas de bulk actions en v1 — les volumes attendus sont faibles (1-5 demandes/jour).

interface CardRequestRow {
  id: string;
  title: string;
  slug: string | null;
  isActive: boolean;
  createdAt: string;
  config: Record<string, unknown>;
  seller: {
    id: string;
    slug: string;
    displayName: string | null;
    email: string | null;
    kycStatus: string;
  };
}

interface CardRequestListResponse {
  requests: CardRequestRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const STATUS_TABS = [
  { value: "REQUESTED", label: "En attente" },
  { value: "APPROVED", label: "Approuvées" },
  { value: "REJECTED", label: "Rejetées" },
] as const;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function AdminCardRequestsPage() {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("REQUESTED");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<CardRequestListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Reject modal
  const [rejectRow, setRejectRow] = React.useState<CardRequestRow | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      const result = await adminApi<CardRequestListResponse>(
        `/api/admin/cagnottes/card-requests?${params.toString()}`,
      );
      setData(result);
    } catch {
      toast("Erreur lors du chargement des demandes carte", "error");
    } finally {
      setLoading(false);
    }
  }, [status, page, search, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function approve(row: CardRequestRow) {
    if (row.seller.kycStatus !== "APPROVED") {
      toast(
        "KYC du créateur non validé — impossible d'activer la carte",
        "error",
      );
      return;
    }
    setActionLoading(row.id);
    try {
      await adminApi(`/api/admin/cagnottes/${row.id}/card-review`, {
        method: "POST",
        body: { status: "APPROVED" },
      });
      toast("Carte bancaire activée pour cette cagnotte", "success");
      fetchData();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Erreur lors de l'approbation";
      toast(msg, "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function confirmReject() {
    if (!rejectRow) return;
    if (rejectReason.trim().length < 5) {
      toast("Raison requise (≥5 caractères)", "error");
      return;
    }
    setActionLoading(rejectRow.id);
    try {
      await adminApi(`/api/admin/cagnottes/${rejectRow.id}/card-review`, {
        method: "POST",
        body: { status: "REJECTED", reason: rejectReason.trim() },
      });
      toast("Demande rejetée", "success");
      setRejectRow(null);
      setRejectReason("");
      fetchData();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Erreur lors du rejet";
      toast(msg, "error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-headings text-2xl font-black text-primary">
            Demandes carte bancaire
          </h1>
          <p className="text-sm text-muted-foreground">
            Activation au cas par cas après validation du KYC du créateur.
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={
              tab.value === status
                ? "border-b-2 border-primary px-4 py-2 text-sm font-bold text-primary"
                : "border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-primary"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AdminSearch
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Rechercher par titre, slug, créateur..."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !data || data.requests.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={48} />}
          title="Aucune demande"
          description={
            status === "REQUESTED"
              ? "Aucune demande d'activation carte en attente."
              : `Aucune demande ${status === "APPROVED" ? "approuvée" : "rejetée"}.`
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Cagnotte</th>
                  <th className="px-4 py-3">Créateur</th>
                  <th className="px-4 py-3">KYC</th>
                  <th className="px-4 py-3">Demandé le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.requests.map((row) => {
                  const cfg = row.config;
                  const requestedAt =
                    typeof cfg.cardRequestedAt === "string"
                      ? cfg.cardRequestedAt
                      : null;
                  const rejectionReason =
                    typeof cfg.cardRejectionReason === "string"
                      ? cfg.cardRejectionReason
                      : null;
                  const kycOk = row.seller.kycStatus === "APPROVED";
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-primary">
                          {row.title}
                        </div>
                        {row.slug ? (
                          <Link
                            href={`/c/${row.slug}`}
                            target="_blank"
                            className="text-xs text-gray-500 hover:underline"
                          >
                            /{row.slug}
                          </Link>
                        ) : null}
                        {status === "REJECTED" && rejectionReason ? (
                          <div className="mt-1 text-xs text-red-600">
                            Raison : {rejectionReason}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {row.seller.displayName ?? "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {row.seller.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={kycOk ? "status-active" : "status-closed"}
                        >
                          {row.seller.kycStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {formatDate(requestedAt ?? row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {status === "REQUESTED" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="primary"
                              loading={actionLoading === row.id}
                              disabled={!kycOk || actionLoading !== null}
                              onClick={() => approve(row)}
                              title={
                                kycOk
                                  ? undefined
                                  : "KYC du créateur non validé"
                              }
                            >
                              <Check size={14} className="mr-1" />
                              Approuver
                            </Button>
                            <Button
                              variant="outline"
                              disabled={actionLoading !== null}
                              onClick={() => {
                                setRejectRow(row);
                                setRejectReason("");
                              }}
                            >
                              <X size={14} className="mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 ? (
            <Pagination
              page={page}
              pageCount={data.totalPages}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <Modal
        open={rejectRow !== null}
        onClose={() => {
          if (actionLoading === null) {
            setRejectRow(null);
            setRejectReason("");
          }
        }}
        title="Rejeter la demande carte bancaire"
      >
        <div className="space-y-4">
          {rejectRow ? (
            <p className="text-sm text-gray-700">
              Cagnotte : <strong>{rejectRow.title}</strong>
              <br />
              Créateur : {rejectRow.seller.displayName ?? rejectRow.seller.email}
            </p>
          ) : null}
          <Textarea
            label="Raison du rejet"
            placeholder="Pourquoi rejeter cette demande ? (visible par le créateur)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectRow(null);
                setRejectReason("");
              }}
              disabled={actionLoading !== null}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              loading={actionLoading !== null}
              disabled={rejectReason.trim().length < 5}
              onClick={confirmReject}
            >
              Confirmer le rejet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
