"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Check, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { ShareSheet } from "@/components/share/ShareSheet";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { MERCI_LABELS } from "@/lib/constants";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 40; // 3s × 40 = 2 minutes
const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://cagnotte.sn";

type Status = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "TIMEOUT";

interface OrderStatusResponse {
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  orderType?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  customerName?: string | null;
  donorMessage?: string | null;
  thankYouMessage?: string | null;
  seller?: { slug: string; name: string } | null;
}

export default function MerciPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params?.slug ?? "";
  const refFromUrl = searchParams.get("ref");

  const [reference, setReference] = React.useState<string | null>(refFromUrl);
  const [status, setStatus] = React.useState<Status>("PENDING");
  const [order, setOrder] = React.useState<OrderStatusResponse | null>(null);
  const [attempts, setAttempts] = React.useState(0);

  // Hydrate reference from sessionStorage if URL query is missing
  // (TikTok WebView sometimes drops query params on share-sheet round trips).
  React.useEffect(() => {
    if (reference) return;
    if (!slug) return;
    try {
      const stored = sessionStorage.getItem(`cagnotte.order.${slug}`);
      if (stored) setReference(stored);
    } catch {
      // sessionStorage blocked — nothing more we can do.
    }
  }, [reference, slug]);

  // Bounded poll: 3s × 40 = 2min max. Pauses when tab hidden.
  React.useEffect(() => {
    if (!reference) return;
    if (status !== "PENDING") return;
    if (attempts >= MAX_POLLS) {
      setStatus("TIMEOUT");
      return;
    }

    let cancelled = false;
    const id = window.setTimeout(async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        // Don't increment attempts while tab is hidden — wake handler retriggers.
        return;
      }
      try {
        const data = await api<OrderStatusResponse>(
          `/api/orders/${reference}/status`,
        );
        if (cancelled) return;
        setOrder(data);
        if (
          data.status === "PAID" ||
          data.status === "FAILED" ||
          data.status === "EXPIRED"
        ) {
          setStatus(data.status);
        } else {
          setAttempts((n) => n + 1);
        }
      } catch {
        if (!cancelled) setAttempts((n) => n + 1);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [reference, status, attempts]);

  // Wake the polling loop when the tab becomes visible again.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => {
      if (document.visibilityState === "visible" && status === "PENDING") {
        // Force a re-tick by bumping attempts; the main effect will fire again.
        setAttempts((n) => (n >= MAX_POLLS ? n : n));
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [status]);

  function manualRetry() {
    setStatus("PENDING");
    setAttempts(0);
  }

  // No reference at all → user landed on /merci without an order.
  if (!reference) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500" aria-hidden />
        <h1 className="mt-4 font-headings text-2xl font-bold text-primary">
          {MERCI_LABELS.headingFailed}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {MERCI_LABELS.missingReferenceDescription}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link href={`/c/${slug}`}>
            <Button variant="primary" size="lg">
              {MERCI_LABELS.backCta}
            </Button>
          </Link>
          <Link href="/cagnottes">
            <Button variant="ghost">Parcourir les cagnottes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-12 text-center">
      {status === "PENDING" && (
        <>
          <Clock
            size={56}
            className="mx-auto animate-pulse text-primary"
            aria-hidden
          />
          <h1 className="font-headings text-2xl font-bold text-primary">
            {MERCI_LABELS.headingPending}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tentative {Math.min(attempts + 1, MAX_POLLS)}/{MAX_POLLS}
          </p>
        </>
      )}

      {status === "PAID" && (
        <>
          {/* Phase 7 plan 07-03 — animate-ping halo matches /retraits/succes. */}
          <div className="relative mx-auto h-24 w-24">
            <div
              className="absolute inset-0 animate-ping rounded-full bg-[#00B67A]/20"
              aria-hidden
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#E6F3EE]">
              <Check
                size={48}
                strokeWidth={3}
                className="text-[#00B67A]"
                aria-hidden
              />
            </div>
          </div>
          <h1 className="font-headings text-3xl font-bold text-primary">
            {MERCI_LABELS.headingPaid}
          </h1>
          {typeof order?.amount === "number" && (
            <p className="text-lg text-primary">
              {MERCI_LABELS.amountPrefix}{" "}
              <strong>{formatPrice(order.amount)}</strong>
            </p>
          )}
          {order?.thankYouMessage ? (
            <section className="mx-auto max-w-md rounded-2xl border border-pink-200 bg-pink/40 p-6 text-left">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary/60">
                {MERCI_LABELS.thankYouMessageEyebrow}
              </p>
              <p className="text-base italic leading-relaxed text-primary">
                &ldquo;{order.thankYouMessage}&rdquo;
              </p>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              {MERCI_LABELS.thankYouFallback}
            </p>
          )}
          {order?.reference ? (
            <section className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
                {MERCI_LABELS.confirmationCodeLabel}
              </p>
              <p className="font-mono text-xl font-bold text-primary">
                {order.reference}
              </p>
            </section>
          ) : null}
          <div className="space-y-4 pt-2">
            <p className="text-sm font-medium text-primary">
              {MERCI_LABELS.shareCtaTitle}
            </p>
            <ShareSheet
              url={`${PUBLIC_BASE_URL}/c/${slug}`}
              title={MERCI_LABELS.shareCtaTitle}
              description={MERCI_LABELS.shareCtaText}
            />
          </div>
          <div className="pt-2">
            <Link href={`/c/${slug}`}>
              <Button variant="primary" size="lg">
                {MERCI_LABELS.viewCagnotteCta}
              </Button>
            </Link>
          </div>
        </>
      )}

      {(status === "FAILED" || status === "EXPIRED") && (
        <>
          <AlertCircle
            size={56}
            className="mx-auto text-red-500"
            aria-hidden
          />
          <h1 className="font-headings text-2xl font-bold text-red-700">
            {MERCI_LABELS.headingFailed}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu peux réessayer le paiement, tes informations sont conservées.
          </p>
          <div className="flex flex-col items-center gap-3 pt-2">
            <Link href={`/c/${slug}/paiement`}>
              <Button variant="primary" size="lg">
                {MERCI_LABELS.retryPaymentCta}
              </Button>
            </Link>
            <Link href={`/c/${slug}`}>
              <Button variant="ghost">{MERCI_LABELS.backCta}</Button>
            </Link>
          </div>
        </>
      )}

      {status === "TIMEOUT" && (
        <>
          <Clock size={56} className="mx-auto text-amber-500" aria-hidden />
          <h1 className="font-headings text-2xl font-bold text-primary">
            {MERCI_LABELS.headingTimeout}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu recevras une notification dès que ta contribution sera
            confirmée. Vérifie aussi l&apos;historique de ton Mobile Money.
          </p>
          {reference ? (
            <section className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-800/80">
                Référence de ta transaction
              </p>
              <p className="font-mono text-sm font-bold text-amber-900 break-all">
                {reference}
              </p>
              <p className="mt-2 text-xs text-amber-800/80">
                Si tu as été débité(e), envoie cette référence à{" "}
                <a
                  href="mailto:contact@cagnottes.sn"
                  className="font-semibold underline"
                >
                  contact@cagnottes.sn
                </a>
                .
              </p>
            </section>
          ) : null}
          <div className="flex flex-col items-center gap-3 pt-2">
            <Button variant="outline" onClick={manualRetry}>
              {MERCI_LABELS.manualRetryCta}
            </Button>
            <Link href={`/c/${slug}`}>
              <Button variant="ghost">{MERCI_LABELS.backCta}</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
