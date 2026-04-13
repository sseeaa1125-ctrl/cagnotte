"use client";

import { useEffect, useState } from "react";
import { Button, Input, SettingsSkeleton } from "@/components/ui";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { AlertTriangle, Clock, CheckCircle2, XCircle, Fingerprint } from "lucide-react";
import { SettingsSubPage, SellerProfile } from "../_shared";

export default function KycSettingsPage() {
  const { toast } = useToast();
  const { refreshSeller } = useAuth();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ seller: SellerProfile }>("/api/auth/me")
      .then((res) => setSeller(res.seller))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SettingsSkeleton />;

  return (
    <SettingsSubPage title="Vérification d'identité">
      <div className="space-y-4">
        {(!seller?.kycStatus || seller.kycStatus === "NONE") && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Vérification requise</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Pour retirer tes gains, tu dois vérifier ton identité. Cette vérification est manuelle et sera traitée par notre équipe.
                </p>
              </div>
            </div>
          </div>
        )}

        {seller?.kycStatus === "PENDING" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Clock size={18} className="mt-0.5 shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Vérification en cours</p>
                <p className="mt-0.5 text-xs text-blue-700">
                  Ton dossier est en cours de vérification. Tu seras notifié dès que c&apos;est terminé. Délai habituel : 24-48h.
                </p>
              </div>
            </div>
          </div>
        )}

        {seller?.kycStatus === "APPROVED" && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">Identité vérifiée</p>
                <p className="mt-0.5 text-xs text-green-700">
                  Ton compte est vérifié. Tu peux retirer tes gains à tout moment.
                </p>
              </div>
            </div>
          </div>
        )}

        {seller?.kycStatus === "REJECTED" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-800">Vérification refusée</p>
                <p className="mt-0.5 text-xs text-red-700">
                  Ta demande a été refusée. Vérifie que tes documents sont lisibles et réessaie.
                </p>
              </div>
            </div>
          </div>
        )}

        {(!seller?.kycStatus || seller.kycStatus === "NONE" || seller.kycStatus === "REJECTED") && (
          <KycUploadForm onSuccess={() => refreshSeller()} />
        )}
      </div>
    </SettingsSubPage>
  );
}

function KycUploadForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [idUrl, setIdUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = fullName.trim().length >= 2 && idUrl && selfieUrl && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await api("/api/sellers/kyc", {
        method: "POST",
        body: { fullName: fullName.trim(), idUrl, selfieUrl },
      });
      toast("Demande envoyée ! Vérification en cours.");
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vérifier mon identité</p>

      <Input
        label="Nom complet (tel que sur la pièce)"
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Prénom Nom"
        required
      />

      <FileUploadButton
        label="Photo recto de ta pièce d'identité (CNI, passeport, permis)"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        maxSizeMB={5}
        variant="image"
        noGallery
        uploadPurpose="kyc"
        currentUrl={idUrl || null}
        onUpload={(url: string) => setIdUrl(url)}
      />

      <FileUploadButton
        label="Selfie avec ta pièce d'identité (tiens-la à côté de ton visage)"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        maxSizeMB={5}
        variant="image"
        noGallery
        uploadPurpose="kyc"
        currentUrl={selfieUrl || null}
        onUpload={(url: string) => setSelfieUrl(url)}
      />

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={!canSubmit}
        loading={submitting}
      >
        <Fingerprint size={16} className="mr-2" />
        Soumettre ma vérification
      </Button>

      <p className="text-center text-[10px] text-gray-400">
        Tes documents sont protégés et ne seront utilisés que pour la vérification.
      </p>
    </div>
  );
}
