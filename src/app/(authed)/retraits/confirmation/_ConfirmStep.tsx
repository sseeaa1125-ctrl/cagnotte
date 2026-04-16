"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { WITHDRAWAL_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { useWithdrawalDraft } from "@/hooks/useWithdrawalDraft";
import {
  isCompleteDraft,
  validatePin,
} from "@/lib/withdrawal/schema";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /retraits/confirmation client island.
//
// Guards on incomplete draft → /retraits. Missing PIN → /retraits/pin.
// Confirm → POST /api/withdrawals { amount, phone, provider, recipientName,
// withdrawalPin }. On success → router.replace("/retraits/succes?...").
// Error handling covers 403 (KYC / wrong pin), 400 (PIN_REQUIRED),
// 429 (rate limit), 503 (circuit breaker).
// ─────────────────────────────────────────────────────────────────────────

function providerLabel(p: string | undefined): string {
  if (p === "wave_money") return "Wave Sénégal";
  if (p === "orange_money") return "Orange Money";
  return "";
}

export function ConfirmStep() {
  const router = useRouter();
  const { toast } = useToast();
  const { draft, clear, isReady } = useWithdrawalDraft();
  const [submitting, setSubmitting] = React.useState(false);

  // Guard: incomplete draft or missing PIN → bounce.
  React.useEffect(() => {
    if (!isReady) return;
    if (!isCompleteDraft(draft)) {
      router.replace("/retraits");
      return;
    }
    if (!draft.pin || !validatePin(draft.pin)) {
      router.replace("/retraits/pin");
    }
  }, [isReady, draft, router]);

  async function handleConfirm() {
    // Audit 011 D-04: re-entrancy guard in addition to disabled button.
    if (submitting) return;
    if (!isCompleteDraft(draft) || !draft.pin) return;
    setSubmitting(true);
    try {
      await api("/api/withdrawals", {
        method: "POST",
        body: {
          amount: draft.amount,
          phone: draft.phone,
          provider: draft.provider,
          recipientName: draft.recipientName,
          withdrawalPin: draft.pin,
        },
      });
      // Success — clear draft AFTER successful submit but BEFORE navigation
      // so that the success page starts fresh. (Draft clearer runs on mount
      // too as a belt-and-suspenders defense.)
      clear();
      const query = new URLSearchParams({
        amount: String(draft.amount),
        provider: draft.provider,
      });
      router.replace(`/retraits/succes?${query.toString()}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          // Could be KYC rejection OR wrong PIN — check error message.
          const msg = (err.message || "").toLowerCase();
          if (msg.includes("code") || msg.includes("pin")) {
            toast(WITHDRAWAL_LABELS.pinIncorrect, "error");
            router.replace("/retraits/pin");
          } else {
            toast(WITHDRAWAL_LABELS.kycBlockedBody, "error");
          }
        } else if (err.status === 400) {
          const code = (err.body as { code?: string })?.code;
          if (code === "PIN_REQUIRED") {
            router.replace("/profil/securite");
          } else {
            toast(err.message || WITHDRAWAL_LABELS.submitError, "error");
          }
        } else if (err.status === 429) {
          toast(err.message || WITHDRAWAL_LABELS.rateLimited, "error");
        } else if (err.status === 503) {
          toast(WITHDRAWAL_LABELS.circuitOpen, "error");
        } else {
          toast(err.message || WITHDRAWAL_LABELS.submitError, "error");
        }
      } else {
        toast(WITHDRAWAL_LABELS.submitError, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isReady || !isCompleteDraft(draft)) {
    return (
      <div className="mx-auto max-w-md text-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => router.replace("/retraits/pin")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ArrowLeft size={14} aria-hidden />
        {WITHDRAWAL_LABELS.back}
      </button>

      <div className="rounded-3xl bg-white p-6 shadow-sm md:p-10">
        <h2 className="mb-1 font-headings text-xl font-bold text-primary md:text-2xl">
          {WITHDRAWAL_LABELS.confirmTitle}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {WITHDRAWAL_LABELS.confirmSubtitle}
        </p>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-gray-50/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {WITHDRAWAL_LABELS.confirmAmount}
            </span>
            <span className="font-headings text-lg font-bold text-primary">
              {formatPrice(draft.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {WITHDRAWAL_LABELS.confirmFees}
            </span>
            <span className="text-sm font-semibold text-[#00B67A]">
              {WITHDRAWAL_LABELS.confirmFeesFree}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {WITHDRAWAL_LABELS.confirmDelay}
            </span>
            <span className="text-sm text-primary">
              {WITHDRAWAL_LABELS.confirmDelayInstant}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Vers</span>
            <span className="text-sm text-primary">
              {providerLabel(draft.provider)} · {draft.phone}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Bénéficiaire</span>
            <span className="text-sm text-primary">{draft.recipientName}</span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3">
            <span className="text-sm font-semibold text-primary">
              {WITHDRAWAL_LABELS.confirmNet}
            </span>
            <span className="font-headings text-2xl font-black text-[#00B67A]">
              {formatPrice(draft.amount)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleConfirm}
            loading={submitting}
            disabled={submitting}
            className="w-full"
          >
            {submitting
              ? WITHDRAWAL_LABELS.confirmSubmitting
              : WITHDRAWAL_LABELS.confirmCta}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock size={12} aria-hidden />
            {WITHDRAWAL_LABELS.secured}
          </p>
        </div>
      </div>
    </div>
  );
}
