"use client";

import * as React from "react";
import { ShieldCheck, Eye, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminApi } from "@/lib/adminApi";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { useToast } from "@/contexts/ToastContext";

interface KycSeller {
  id: string;
  slug: string;
  email: string;
  displayName: string | null;
  kycStatus: string;
  kycFullName: string | null;
  kycIdUrl: string | null;
  kycSelfieUrl: string | null;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  createdAt: string;
}

interface KycListResponse {
  sellers: KycSeller[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const STATUS_TABS = [
  { value: "PENDING", label: "En attente" },
  { value: "APPROVED", label: "Approuves" },
  { value: "REJECTED", label: "Rejetes" },
] as const;

export default function AdminKycPage() {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("PENDING");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<KycListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Image preview modal
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // Reject modal
  const [rejectSeller, setRejectSeller] = React.useState<KycSeller | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchSellers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const result = await adminApi<KycListResponse>(
        `/api/admin/kyc?${params.toString()}`,
      );
      setData(result);
    } catch {
      toast("Erreur lors du chargement des dossiers KYC", "error");
    } finally {
      setLoading(false);
    }
  }, [status, page, search, dateFrom, dateTo, toast]);

  React.useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const handleApprove = async (seller: KycSeller) => {
    setActionLoading(seller.id);
    try {
      await adminApi(`/api/admin/kyc/${seller.id}/review`, {
        method: "POST",
        body: { status: "APPROVED" },
      });
      toast(`KYC de ${seller.displayName || seller.slug} approuve`, "success");
      await fetchSellers();
    } catch {
      toast("Erreur lors de l'approbation", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectSeller) return;
    setActionLoading(rejectSeller.id);
    try {
      await adminApi(`/api/admin/kyc/${rejectSeller.id}/review`, {
        method: "POST",
        body: { status: "REJECTED", reason: rejectReason || undefined },
      });
      toast(`KYC de ${rejectSeller.displayName || rejectSeller.slug} rejete`, "success");
      setRejectSeller(null);
      setRejectReason("");
      await fetchSellers();
    } catch {
      toast("Erreur lors du rejet", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("fr-SN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sellers = data?.sellers ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-headings text-xl font-bold text-primary sm:text-2xl">
            Verification KYC
          </h1>
          {data && status === "PENDING" && data.totalCount > 0 && (
            <Badge
              variant="solidaire"
              className="bg-amber-100 text-amber-700"
            >
              {data.totalCount} en attente
            </Badge>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              status === tab.value
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <AdminSearch
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Rechercher par nom, email ou slug..."
        className="w-full"
      />

      {/* Date filter */}
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onChange={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : sellers.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={28} />}
          title={
            status === "PENDING"
              ? "Aucun dossier KYC en attente"
              : status === "APPROVED"
                ? "Aucun dossier approuve"
                : "Aucun dossier rejete"
          }
          description={
            status === "PENDING"
              ? "Tous les dossiers KYC ont ete traites."
              : undefined
          }
        />
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">Slug</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Documents</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Soumis le</th>
                  {status === "PENDING" && (
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => (
                  <tr key={seller.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <a
                          href={`/admin/sellers/${seller.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {seller.kycFullName || seller.displayName || "-"}
                        </a>
                        <p className="text-xs text-muted-foreground sm:hidden">{seller.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{seller.email}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{seller.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {seller.kycIdUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewUrl(seller.kycIdUrl)}
                            className="group relative h-10 w-14 overflow-hidden rounded-md border border-border hover:border-primary"
                            title="Piece d'identite"
                          >
                            <img
                              src={seller.kycIdUrl}
                              alt="Piece d'identite"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                              <Eye size={14} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                            </span>
                          </button>
                        )}
                        {seller.kycSelfieUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewUrl(seller.kycSelfieUrl)}
                            className="group relative h-10 w-14 overflow-hidden rounded-md border border-border hover:border-primary"
                            title="Selfie"
                          >
                            <img
                              src={seller.kycSelfieUrl}
                              alt="Selfie"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                              <Eye size={14} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                            </span>
                          </button>
                        )}
                        {!seller.kycIdUrl && !seller.kycSelfieUrl && (
                          <span className="text-xs text-muted-foreground">Aucun document</span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {formatDate(seller.kycSubmittedAt)}
                    </td>
                    {status === "PENDING" && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                          <Button
                            variant="primary"
                            size="md"
                            loading={actionLoading === seller.id}
                            iconLeft={<Check size={16} />}
                            onClick={() => handleApprove(seller)}
                            className="!min-h-9 !px-3 !py-1.5 !text-xs bg-green-600 hover:bg-green-700"
                          >
                            Approuver
                          </Button>
                          <Button
                            variant="danger"
                            size="md"
                            disabled={actionLoading === seller.id}
                            iconLeft={<X size={16} />}
                            onClick={() => { setRejectSeller(seller); setRejectReason(""); }}
                            className="!min-h-9 !px-3 !py-1.5 !text-xs"
                          >
                            Rejeter
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <Pagination
              page={data.currentPage}
              pageCount={data.totalPages}
              onChange={setPage}
            />
          )}
        </>
      )}

      {/* Image preview modal */}
      <Modal
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        title="Document KYC"
        size="lg"
      >
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Document KYC"
            className="w-full rounded-lg"
          />
        )}
      </Modal>

      {/* Reject reason modal */}
      <Modal
        open={!!rejectSeller}
        onClose={() => setRejectSeller(null)}
        title="Rejeter le dossier KYC"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Vous etes sur le point de rejeter le dossier KYC de{" "}
            <span className="font-medium text-primary">
              {rejectSeller?.kycFullName || rejectSeller?.displayName || rejectSeller?.slug}
            </span>.
          </p>
          <Textarea
            label="Raison du rejet (optionnel)"
            placeholder="Ex: Photo d'identite floue, selfie non conforme..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setRejectSeller(null)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={!!actionLoading}
              onClick={handleReject}
            >
              Confirmer le rejet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
