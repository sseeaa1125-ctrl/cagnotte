"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, ImageUpload, Input, useToast } from "@/components/ui";
import { api, ApiError, BACKEND_URL } from "@/lib/api";
import { KYC_LABELS } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /profil/kyc client island.
//
// Upload flow:
//   1. User picks ID + selfie (ImageUpload primitive, JPG/PNG, 5 Mo max)
//   2. Each file goes via multipart POST /api/upload?purpose=kyc
//      (direct to BACKEND_URL — same pattern as _ProfileForm.tsx avatar
//      upload; proxy rewrite drops large bodies on mobile per Phase 3
//      research).
//   3. The backend returns a URL that is ALREADY the /api/files/:key proxy
//      — we persist it as-is and send to POST /api/sellers/kyc.
//   4. Backend flips Seller.kycStatus to PENDING.
//
// APPROVED variant is read-only: no inputs, just previews + full name.
// ─────────────────────────────────────────────────────────────────────────

type KycVariant = "none" | "pending" | "approved" | "rejected";

interface KycFormProps {
  variant: KycVariant;
  existingFullName: string;
  existingIdUrl: string | null;
  existingSelfieUrl: string | null;
  defaultFullName: string;
}

function readCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("izy-csrf");
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|;\s*)izy-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function uploadKycFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const csrf = readCsrfToken();
  const res = await fetch(`${BACKEND_URL}/api/upload?purpose=kyc`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: csrf ? { "x-csrf-token": csrf } : undefined,
  });
  if (!res.ok) {
    let message: string = KYC_LABELS.uploadFailed;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error(KYC_LABELS.uploadFailed);
  return data.url;
}

export function KycForm({
  variant,
  existingFullName,
  existingIdUrl,
  existingSelfieUrl,
  defaultFullName,
}: KycFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = React.useState(
    existingFullName || defaultFullName || "",
  );
  const [idFile, setIdFile] = React.useState<File | null>(null);
  const [selfieFile, setSelfieFile] = React.useState<File | null>(null);
  const [idError, setIdError] = React.useState<string | null>(null);
  const [selfieError, setSelfieError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // APPROVED state — read-only preview.
  if (variant === "approved") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-medium text-primary">
            {KYC_LABELS.approvedFullName}
          </p>
          <p className="mt-1 text-base text-primary">{existingFullName || "—"}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {existingIdUrl ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-primary">
                {KYC_LABELS.idLabel}
              </p>
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-border bg-muted p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingIdUrl}
                  alt="Pièce d'identité"
                  className="max-h-40 w-auto rounded-lg object-contain"
                />
              </div>
            </div>
          ) : null}
          {existingSelfieUrl ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-primary">
                {KYC_LABELS.selfieLabel}
              </p>
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-border bg-muted p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingSelfieUrl}
                  alt="Selfie avec pièce"
                  className="max-h-40 w-auto rounded-lg object-contain"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // PENDING state — show existing previews read-only, no submit button
  if (variant === "pending") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-medium text-primary">
            {KYC_LABELS.fullNameLabel}
          </p>
          <p className="mt-1 text-base text-primary">{existingFullName || "—"}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {existingIdUrl ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-primary">
                {KYC_LABELS.idLabel}
              </p>
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-border bg-muted p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingIdUrl}
                  alt="Pièce d'identité"
                  className="max-h-40 w-auto rounded-lg object-contain"
                />
              </div>
            </div>
          ) : null}
          {existingSelfieUrl ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-primary">
                {KYC_LABELS.selfieLabel}
              </p>
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-border bg-muted p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingSelfieUrl}
                  alt="Selfie avec pièce"
                  className="max-h-40 w-auto rounded-lg object-contain"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // NONE / REJECTED — upload form
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Audit 2026-04-14 #25 — double-submit guard. Two simultaneous KYC
    // POSTs would create duplicate R2 uploads AND race the rate limiter.
    if (submitting) return;
    if (fullName.trim().length < 2) {
      toast(KYC_LABELS.nameTooShort, "error");
      return;
    }
    if (!idFile || !selfieFile) {
      toast(KYC_LABELS.missingFiles, "error");
      return;
    }
    setSubmitting(true);
    setIdError(null);
    setSelfieError(null);
    try {
      const [idUrl, selfieUrl] = await Promise.all([
        uploadKycFile(idFile),
        uploadKycFile(selfieFile),
      ]);
      await api("/api/sellers/kyc", {
        method: "POST",
        body: {
          fullName: fullName.trim(),
          idUrl,
          selfieUrl,
        },
      });
      toast("Documents envoyés. Vérification en cours.", "success");
      setIdFile(null);
      setSelfieFile(null);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message || KYC_LABELS.uploadFailed, "error");
      } else if (err instanceof Error) {
        toast(err.message, "error");
      } else {
        toast(KYC_LABELS.uploadFailed, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        label={KYC_LABELS.fullNameLabel}
        helper={KYC_LABELS.fullNameHelper}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        maxLength={100}
        required
        autoComplete="name"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ImageUpload
          label={KYC_LABELS.idLabel}
          helper={KYC_LABELS.idHelper}
          value={idFile}
          onChange={(file) => {
            setIdFile(file);
            setIdError(null);
          }}
          onError={(msg) => setIdError(msg)}
          error={idError ?? undefined}
          maxSizeMb={5}
        />
        <ImageUpload
          label={KYC_LABELS.selfieLabel}
          helper={KYC_LABELS.selfieHelper}
          value={selfieFile}
          onChange={(file) => {
            setSelfieFile(file);
            setSelfieError(null);
          }}
          onError={(msg) => setSelfieError(msg)}
          error={selfieError ?? undefined}
          maxSizeMb={5}
        />
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!idFile || !selfieFile || submitting}
        >
          {submitting ? KYC_LABELS.submitting : KYC_LABELS.submit}
        </Button>
      </div>
    </form>
  );
}
