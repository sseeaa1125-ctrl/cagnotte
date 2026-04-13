import Script from "next/script";

interface PixelScriptsProps {
  metaPixelId: string | null;
  googleAdsId: string | null;
  googleAnalyticsId: string | null;
  tiktokPixelId: string | null;
}

// Defense-in-depth: strip anything that isn't alphanumeric, hyphen, or underscore
function sanitizePixelId(id: string | null): string | null {
  if (!id) return null;
  const clean = id.replace(/[^A-Za-z0-9\-_]/g, "");
  return clean.length > 0 ? clean : null;
}

export function PixelScripts({
  metaPixelId: rawMeta,
  googleAdsId: rawGads,
  googleAnalyticsId: rawGa,
  tiktokPixelId: rawTiktok,
}: PixelScriptsProps) {
  const metaPixelId = sanitizePixelId(rawMeta);
  const googleAdsId = sanitizePixelId(rawGads);
  const googleAnalyticsId = sanitizePixelId(rawGa);
  const tiktokPixelId = sanitizePixelId(rawTiktok);

  const hasAny = metaPixelId || googleAdsId || googleAnalyticsId || tiktokPixelId;
  if (!hasAny) return null;

  // Google tag IDs to load via gtag.js (GA4 and/or Google Ads)
  const gtagIds = [googleAnalyticsId, googleAdsId].filter(Boolean) as string[];
  const primaryGtagId = gtagIds[0];

  return (
    <>
      {/* ── Meta (Facebook) Pixel ── */}
      {metaPixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}</Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* ── Google Analytics (GA4) + Google Ads — shared gtag.js ── */}
      {primaryGtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${primaryGtagId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            ${gtagIds.map((id) => `gtag('config', '${id}');`).join("\n            ")}
          `}</Script>
        </>
      )}

      {/* ── TikTok Pixel ── */}
      {tiktokPixelId && (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`
          !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
          ttq.methods=["page","track","identify","instances","debug","on","off",
          "once","ready","alias","group","enableCookie","disableCookie","holdConsent",
          "revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){
          t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
          for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
          ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)
          ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){
          var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
          ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},
          ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
          var a=d.createElement("script");a.type="text/javascript",a.async=!0,
          a.src=r+"?sdkid="+e+"&lib="+t;var s=d.getElementsByTagName("script")[0];
          s.parentNode.insertBefore(a,s)};
          ttq.load('${tiktokPixelId}');
          ttq.page();
          }(window, document, 'ttq');
        `}</Script>
      )}
    </>
  );
}
