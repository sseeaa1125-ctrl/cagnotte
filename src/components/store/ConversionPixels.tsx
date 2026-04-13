"use client";

import { useEffect, useRef } from "react";

interface ConversionPixelsProps {
  metaPixelId: string | null | undefined;
  googleAdsId: string | null | undefined;
  googleAnalyticsId: string | null | undefined;
  tiktokPixelId: string | null | undefined;
  amount: number;
  currency?: string;
  orderReference: string;
  orderType: string;
}

// Defense-in-depth: strip anything that isn't alphanumeric, hyphen, or underscore
function sanitize(id: string | null | undefined): string | null {
  if (!id) return null;
  const clean = id.replace(/[^A-Za-z0-9\-_]/g, "");
  return clean.length > 0 ? clean : null;
}

export function ConversionPixels({
  metaPixelId: rawMeta,
  googleAdsId: rawGads,
  googleAnalyticsId: rawGa,
  tiktokPixelId: rawTiktok,
  amount,
  currency = "XOF",
  orderReference,
  orderType,
}: ConversionPixelsProps) {
  const firedRef = useRef(false);

  const metaPixelId = sanitize(rawMeta);
  const googleAdsId = sanitize(rawGads);
  const googleAnalyticsId = sanitize(rawGa);
  const tiktokPixelId = sanitize(rawTiktok);

  useEffect(() => {
    if (firedRef.current) return;
    if (!metaPixelId && !googleAdsId && !googleAnalyticsId && !tiktokPixelId) return;

    const win = window as unknown as Record<string, unknown>;
    let attempts = 0;
    const MAX_ATTEMPTS = 20;
    const RETRY_MS = 500;

    function tryFire() {
      if (firedRef.current) return;
      attempts++;

      // Check which SDKs are ready
      const metaReady = !metaPixelId || !!win.fbq;
      const gtagReady = (!googleAnalyticsId && !googleAdsId) || !!win.gtag;
      const tiktokReady = !tiktokPixelId || !!win.ttq;
      const allReady = metaReady && gtagReady && tiktokReady;

      if (!allReady && attempts < MAX_ATTEMPTS) {
        setTimeout(tryFire, RETRY_MS);
        return;
      }

      firedRef.current = true;

      // ── Meta (Facebook) Pixel — Purchase event ──
      if (metaPixelId && win.fbq) {
        const fbq = win.fbq as (...args: unknown[]) => void;
        fbq("track", "Purchase", {
          value: amount,
          currency,
          content_type: "product",
          content_ids: [orderReference],
        });
      }

      // ── Google Analytics (GA4) — purchase event ──
      if (googleAnalyticsId && win.gtag) {
        const gtag = win.gtag as (...args: unknown[]) => void;
        gtag("event", "purchase", {
          transaction_id: orderReference,
          value: amount,
          currency,
          items: [{ item_id: orderReference, item_name: orderType }],
        });
      }

      // ── Google Ads — conversion event ──
      if (googleAdsId && win.gtag) {
        const gtag = win.gtag as (...args: unknown[]) => void;
        gtag("event", "conversion", {
          send_to: googleAdsId,
          value: amount,
          currency,
          transaction_id: orderReference,
        });
      }

      // ── TikTok Pixel — CompletePayment event ──
      if (tiktokPixelId && win.ttq) {
        const ttq = win.ttq as (...args: unknown[]) => void;
        ttq("track", "CompletePayment", {
          value: amount,
          currency,
          content_id: orderReference,
          content_type: "product",
        });
      }
    }

    // Start trying after a short initial delay (let PixelScripts begin loading)
    setTimeout(tryFire, 300);

    return () => { firedRef.current = true; }; // cleanup: prevent firing after unmount
  }, [metaPixelId, googleAdsId, googleAnalyticsId, tiktokPixelId, amount, currency, orderReference, orderType]);

  // This component renders nothing — it just fires events
  return null;
}
