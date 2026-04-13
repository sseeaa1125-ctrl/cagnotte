// ── Deep link normalization for social media WebViews ──
// When a visitor taps a link-in-bio from Instagram/TikTok/Facebook,
// the page opens in the app's in-app browser (WebView).
// These utilities normalize outbound URLs to maximize native app opening.

/**
 * Normalize a social URL to its canonical deep-link-friendly format.
 * Standard HTTPS URLs are the most reliable for cross-app deep linking.
 * - Removes unnecessary "www." prefix (instagram.com deep-links better without it)
 * - Normalizes Telegram URLs to t.me format
 * - Ensures WhatsApp uses wa.me format
 * - Cleans tracking parameters that add bloat
 */
export function normalizeDeepLink(url: string): string {
  if (!url) return url;

  // Block javascript: and data: URLs to prevent XSS via LINK blocks
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) {
    return "#";
  }

  try {
    const u = new URL(url);

    // Instagram: remove www for more reliable deep linking
    if (u.hostname === "www.instagram.com") {
      u.hostname = "instagram.com";
      return cleanUrl(u);
    }

    // Telegram: normalize to t.me (the official deep link domain)
    if (u.hostname === "telegram.me" || u.hostname === "www.telegram.me" || u.hostname === "www.t.me") {
      u.hostname = "t.me";
      return cleanUrl(u);
    }

    // Twitter/X: keep as-is (both twitter.com and x.com work for deep linking)

    // YouTube: remove www for cleaner URLs
    if (u.hostname === "www.youtube.com") {
      u.hostname = "youtube.com";
      return cleanUrl(u);
    }

    // TikTok: keep standard format (www.tiktok.com works)

    // Facebook: remove m.facebook.com → facebook.com
    if (u.hostname === "m.facebook.com") {
      u.hostname = "facebook.com";
      return cleanUrl(u);
    }

    // WhatsApp: normalize to wa.me
    if (u.hostname === "api.whatsapp.com" || u.hostname === "web.whatsapp.com") {
      // Extract phone number from path like /send?phone=221XXXXXXX
      const phone = u.searchParams.get("phone");
      if (phone) return `https://wa.me/${phone}`;
    }

    return url;
  } catch {
    // Not a valid URL, return as-is
    return url;
  }
}

/** Build the optimal WhatsApp deep link from a phone number */
export function buildWhatsAppLink(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}`;
}

/** Strip common tracking params that add no value for deep linking */
function cleanUrl(u: URL): string {
  // Remove common tracking params
  const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "igshid", "ref", "si"];
  for (const p of trackingParams) {
    u.searchParams.delete(p);
  }
  return u.toString();
}

/**
 * Detect icon type from a URL for automatic icon assignment.
 * Used when creating LINK blocks — auto-detect which social platform.
 */
export function detectLinkIcon(url: string): string {
  if (!url) return "other";
  try {
    const hostname = new URL(url).hostname.replace("www.", "").replace("m.", "");
    if (hostname.includes("instagram.com")) return "instagram";
    if (hostname.includes("tiktok.com")) return "tiktok";
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
    if (hostname.includes("facebook.com") || hostname.includes("fb.com")) return "facebook";
    if (hostname.includes("wa.me") || hostname.includes("whatsapp.com")) return "whatsapp";
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "twitter";
    if (hostname.includes("t.me") || hostname.includes("telegram")) return "telegram";
    return "website";
  } catch {
    return "other";
  }
}
