// Phase 4 plan 04-01 — 3-way in-app browser redirect helper.
//
// Consumes the sealed `isInAppBrowser` / `isTikTokBrowser` primitives from
// @/lib/utils (audit-008/009). NEVER modifies them. Adds defense-in-depth
// via a payment domain allowlist before navigating anywhere.
//
// Branch order inside openPaymentUrl (MATTERS):
//   1. TikTok (specificity — isInAppBrowser is a superset)
//   2. Normal browsers (same-window navigation)
//
// The Instagram/Facebook (Meta) branch is handled by the caller in JSX as
// <a target="_blank" rel="noopener noreferrer"> because that is the only
// thing that works inside Meta WebViews per audit-008. openPaymentUrl() is
// never called for Meta — the caller branches on browser kind before.

import { isTikTokBrowser } from "@/lib/utils";

const PAY_REDIRECT_ALLOWED_DOMAINS = [
  "pay.wave.com",
  "checkout.bfrpay.com",
  "checkout.bfrpay.net",
  "pay.bfrpay.com",
  // `bictorys.com` (racine) couvre pay.bictorys.com (prod) ET
  // api.test.bictorys.com (simulateur test). Le match `endsWith(".bictorys.com")`
  // n'ouvre que les sous-domaines Bictorys — acceptable en défense-en-profondeur.
  "bictorys.com",
  // Orange Money — Bictorys renvoie un Firebase Flow Link qui deep-link
  // vers l'app OM (iOS Universal Links / Android App Links). Domaine
  // spécifique à Orange prod — ne whitelist PAS `web.app` racine, sinon
  // n'importe quel site Firebase passerait.
  "orange-money-prod-flowlinks.web.app",
];

export type OpenResult = "navigated" | "shared" | "copied" | "unsupported";

/**
 * Safety gate: refuse to navigate to anything outside the known Bictorys /
 * Wave domain list. This is defense-in-depth on top of the allowlist in
 * /api/pay-redirect/route.ts (which is the sealed primary defense).
 */
export function isAllowedPayDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return PAY_REDIRECT_ALLOWED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

/**
 * Extrait le hostname d'une URL pour le diagnostic — utilisé par le caller
 * quand openPaymentUrl retourne "unsupported" pour afficher l'info dans la
 * console devtools ET remonter le domaine rejeté via un toast / waiting card.
 */
export function getHostnameSafe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalide";
  }
}

/**
 * Builds a /api/pay-redirect?t=BASE64 URL (the sealed proxy route). Used only
 * as an ultimate fallback — the current TikTok path is navigator.share, not
 * this proxy (audit-009 found that TikTok blocks both).
 */
export function buildProxyRedirectUrl(bictorysUrl: string): string {
  if (typeof window === "undefined") return "";
  return `/api/pay-redirect?t=${btoa(bictorysUrl)}`;
}

/**
 * Open a Bictorys payment redirect URL honoring audit-008/009 constraints.
 *
 * - TikTok WebView: navigator.share() is the ONLY way out (audit-009). Falls
 *   back to clipboard.writeText if share is cancelled or unavailable.
 * - Instagram / Facebook WebView: NOT HANDLED HERE — the caller renders an
 *   <a target="_blank" rel="noopener noreferrer"> in JSX (audit-008).
 * - Normal browsers (Safari, Chrome, desktop, etc.): same-window navigation
 *   via window.location.href.
 *
 * MUST be called from a click handler (user gesture) — navigator.share and
 * clipboard.writeText both require a user gesture in mobile WebViews.
 * MUST be called from a "use client" component (accesses window/navigator).
 */
export async function openPaymentUrl(url: string): Promise<OpenResult> {
  // Defense-in-depth allowlist.
  if (!isAllowedPayDomain(url)) {
    // Log always (plus uniquement en dev). Le caller bascule sur la waiting
    // card pour donner à l'utilisateur un chemin de secours (lien manuel).
    // Le hostname est visible dans les devtools pour diagnostiquer quel
    // domaine (ex : OM) doit être ajouté à l'allowlist.
    console.warn(
      "[openPaymentUrl] Domaine rejeté par l'allowlist:",
      getHostnameSafe(url),
    );
    return "unsupported";
  }

  // TikTok branch — MUST run BEFORE the normal branch because isInAppBrowser
  // is a superset of isTikTokBrowser. We detect TikTok specifically; Meta is
  // not handled here (caller's JSX branches to <a target="_blank">).
  if (isTikTokBrowser()) {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url });
        return "shared";
      } catch {
        // User cancelled the share sheet — fall through to clipboard.
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        return "copied";
      } catch {
        // clipboard blocked — no more fallbacks.
      }
    }
    return "unsupported";
  }

  // Normal browsers (Safari, Chrome, desktop, etc.) — same-window navigation.
  if (typeof window !== "undefined") {
    window.location.href = url;
    return "navigated";
  }

  return "unsupported";
}
