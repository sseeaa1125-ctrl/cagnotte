"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { MiniCagnotteCard } from "@/components/checkout/MiniCagnotteCard";
import { api, ApiError } from "@/lib/api";
import { isInAppBrowser, isTikTokBrowser } from "@/lib/utils";
import { openPaymentUrl } from "@/lib/redirect";
import {
  computeCommission,
  type FundraiserSubtype,
} from "@/lib/commission";
import { PAIEMENT_LABELS, IN_APP_LABELS } from "@/lib/constants";

type PaymentType =
  | "wave_money"
  | "orange_money"
  | "moov"
  | "card";

type BrowserKind = "tiktok" | "meta" | "normal" | "unknown";

interface StashedPayload {
  sellerSlug: string;
  cagnotteSlug: string;
  orderType: "DONATION";
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  donorMessage?: string;
  isAnonymous: boolean;
  messageIsPrivate: boolean;
  cagnotteSubtype: FundraiserSubtype;
  cagnotteTitle: string;
  cagnotteCoverUrl: string | null;
}

interface CreateOrderResponse {
  order: { id: string; reference: string };
  redirectUrl: string;
}

const METHOD_LIST: Array<{ id: PaymentType; label: string }> = [
  { id: "wave_money", label: PAIEMENT_LABELS.methodWave },
  { id: "orange_money", label: PAIEMENT_LABELS.methodOrange },
  { id: "moov", label: PAIEMENT_LABELS.methodFree },
  { id: "card", label: PAIEMENT_LABELS.methodCard },
];

export default function PaiementPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [stashed, setStashed] = React.useState<StashedPayload | null>(null);
  const [stashChecked, setStashChecked] = React.useState(false);
  const [browser, setBrowser] = React.useState<BrowserKind>("unknown");
  const [pendingMethod, setPendingMethod] = React.useState<PaymentType | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [redirectInfo, setRedirectInfo] = React.useState<{
    redirectUrl: string;
    reference: string;
  } | null>(null);

  // Hydrate sessionStorage on mount; redirect to /participer if missing.
  React.useEffect(() => {
    if (!slug) return;
    let payload: StashedPayload | null = null;
    try {
      const raw = sessionStorage.getItem(`cagnotte.participer.${slug}`);
      if (raw) payload = JSON.parse(raw) as StashedPayload;
    } catch {
      payload = null;
    }
    if (!payload) {
      router.replace(`/c/${slug}/participer`);
      return;
    }
    setStashed(payload);
    setStashChecked(true);
  }, [slug, router]);

  // Detect WebView client-side only (audit-009 — never SSR).
  // Branch ORDER: TikTok first (specificity), then Meta, then normal.
  React.useEffect(() => {
    if (isTikTokBrowser()) setBrowser("tiktok");
    else if (isInAppBrowser()) setBrowser("meta");
    else setBrowser("normal");
  }, []);

  const subtype = stashed?.cagnotteSubtype;
  const amount = stashed?.amount ?? 0;
  const commissionResult = React.useMemo(() => {
    if (!subtype || !Number.isInteger(amount) || amount < 0) {
      return { rate: 0, commission: 0, net: 0 };
    }
    try {
      return computeCommission(amount, subtype);
    } catch {
      return { rate: 0, commission: 0, net: 0 };
    }
  }, [amount, subtype]);

  async function pay(paymentType: PaymentType) {
    if (!stashed || pendingMethod) return;
    setError(null);
    setPendingMethod(paymentType);
    try {
      const body = {
        sellerSlug: stashed.sellerSlug,
        cagnotteSlug: stashed.cagnotteSlug,
        orderType: stashed.orderType,
        amount: stashed.amount,
        paymentType,
        customerName: stashed.customerName,
        customerEmail: stashed.customerEmail,
        customerPhone: stashed.customerPhone,
        donorMessage: stashed.donorMessage,
        isAnonymous: stashed.isAnonymous,
        messageIsPrivate: stashed.messageIsPrivate,
      };
      const res = await api<CreateOrderResponse>("/api/orders", {
        method: "POST",
        body,
      });

      setRedirectInfo({
        redirectUrl: res.redirectUrl,
        reference: res.order.reference,
      });

      // Persist reference for /merci page (URL ?ref= remains authoritative).
      try {
        sessionStorage.setItem(
          `cagnotte.order.${stashed.cagnotteSlug}`,
          res.order.reference,
        );
      } catch {
        // ignore
      }

      // Branch:
      // - tiktok / normal → fire openPaymentUrl from this click handler
      // - meta → DO NOT auto-navigate; the JSX morphs the buttons into
      //   <a target="_blank"> and the user taps a second time
      if (browser !== "meta") {
        await openPaymentUrl(res.redirectUrl);
      }
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 429) {
        setError(PAIEMENT_LABELS.errorRateLimit);
      } else if (status === 503) {
        setError(PAIEMENT_LABELS.errorCircuitBreaker);
      } else if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError(PAIEMENT_LABELS.errorGeneric);
      }
    } finally {
      setPendingMethod(null);
    }
  }

  if (!stashChecked) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        {PAIEMENT_LABELS.processingLabel}
      </p>
    );
  }

  if (!stashed) {
    // useEffect already issued router.replace — render nothing while it kicks in.
    return null;
  }

  const metaReady = browser === "meta" && redirectInfo !== null;

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      <h1 className="mb-6 font-headings text-2xl font-bold text-primary md:text-3xl">
        {PAIEMENT_LABELS.pageTitle}
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        {PAIEMENT_LABELS.pageSubtitle}
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MiniCagnotteCard
            cagnotte={{
              title: stashed.cagnotteTitle,
              coverUrl: stashed.cagnotteCoverUrl,
              raised: 0,
              goal: 0,
              subtype: stashed.cagnotteSubtype,
            }}
          />

          <div className="space-y-3">
            {METHOD_LIST.map((m) => {
              if (metaReady) {
                // Meta WebView path — <a target="_blank"> is the ONLY thing
                // that works inside Instagram/Facebook (audit-008).
                return (
                  <a
                    key={m.id}
                    href={redirectInfo!.redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-14 w-full items-center justify-center rounded-lg border-2 border-primary bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary-hover"
                  >
                    {IN_APP_LABELS.metaButton}
                  </a>
                );
              }
              const isPending = pendingMethod === m.id;
              return (
                <Button
                  key={m.id}
                  variant={m.id === "wave_money" ? "primary" : "outline"}
                  size="lg"
                  fullWidth
                  loading={isPending}
                  disabled={pendingMethod !== null}
                  onClick={() => pay(m.id)}
                >
                  {isPending
                    ? PAIEMENT_LABELS.processingLabel
                    : `${PAIEMENT_LABELS.payWithPrefix} ${m.label}`}
                </Button>
              );
            })}
          </div>

          {browser === "tiktok" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {IN_APP_LABELS.tiktokHelp}
            </p>
          )}

          {browser === "meta" && metaReady && (
            <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              {IN_APP_LABELS.metaHelp}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <p className="text-center text-sm">
            <Link
              href={`/c/${slug}/participer`}
              className="text-muted-foreground underline underline-offset-2 hover:text-primary"
            >
              ← Modifier mes informations
            </Link>
          </p>
        </div>

        <aside className="lg:col-span-1">
          <OrderSummary
            amount={amount}
            subtype={subtype as FundraiserSubtype}
            commissionBp={commissionResult.rate}
            commissionAmount={commissionResult.commission}
            netAmount={commissionResult.net}
          />
        </aside>
      </div>
    </div>
  );
}
