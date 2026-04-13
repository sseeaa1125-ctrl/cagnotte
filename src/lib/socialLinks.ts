// Social link configuration and utilities
// Handles smart conversion between handles and full URLs

export interface SocialNetwork {
  key: string;
  label: string;
  inputType: "handle" | "url" | "phone";
  placeholder: string;
  baseUrl?: string;
  color: string;
  iconSvg: string;
}

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  {
    key: "instagramUrl",
    label: "Instagram",
    inputType: "handle",
    placeholder: "ton_compte",
    baseUrl: "https://instagram.com/",
    color: "#E4405F",
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
  },
  {
    key: "tiktokUrl",
    label: "TikTok",
    inputType: "handle",
    placeholder: "ton_compte",
    baseUrl: "https://tiktok.com/@",
    color: "#000000",
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.16v-3.44a4.85 4.85 0 01-3.77-1.26V6.69h3.77z"/></svg>`,
  },
  {
    key: "youtubeUrl",
    label: "YouTube",
    inputType: "url",
    placeholder: "https://youtube.com/@ton-compte",
    baseUrl: "https://youtube.com/",
    color: "#FF0000",
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  },
  {
    key: "facebookUrl",
    label: "Facebook",
    inputType: "url",
    placeholder: "https://facebook.com/ton-compte",
    baseUrl: "https://facebook.com/",
    color: "#1877F2",
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  },
  {
    key: "twitterUrl",
    label: "X",
    inputType: "handle",
    placeholder: "ton_compte",
    baseUrl: "https://x.com/",
    color: "#000000",
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  },
  {
    key: "telegramUrl",
    label: "Telegram",
    inputType: "handle",
    placeholder: "ton_compte",
    baseUrl: "https://t.me/",
    color: "#26A5E4",
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  },
  {
    key: "whatsappNumber",
    label: "WhatsApp",
    inputType: "phone",
    placeholder: "+221 77 123 45 67",
    color: "#25D366",
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  },
  {
    key: "snapchatUrl",
    label: "Snapchat",
    inputType: "handle",
    placeholder: "ton_compte",
    baseUrl: "https://snapchat.com/add/",
    color: "#FFFC00",
    iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.214.04-.012.06-.012.1-.012.16 0 .3.044.4.12.1.073.16.18.16.33a.46.46 0 01-.27.39c-.12.06-.27.12-.42.18-.33.13-.78.27-1.14.48-.12.06-.21.18-.24.33a.78.78 0 00.06.45c.54 1.17 1.32 2.16 2.31 2.94.18.15.42.27.63.36.57.24.93.48.93.81 0 .42-.6.66-1.14.81-.18.06-.39.09-.57.15-.42.09-.87.24-.96.51-.03.12-.03.27.03.42.15.33.33.66.33.93 0 .39-.39.6-.78.72-.6.18-1.14.27-1.5.36-.12.03-.21.06-.27.09-.18.12-.27.39-.42.75-.18.42-.42.93-.96 1.26-.6.36-1.38.42-2.04.42-.36 0-.66-.03-.84-.06a4.55 4.55 0 00-.69-.06c-.24 0-.51.03-.81.06-.18.03-.48.06-.84.06-.66 0-1.44-.06-2.04-.42-.54-.33-.78-.84-.96-1.26-.15-.36-.24-.63-.42-.75-.06-.03-.15-.06-.27-.09-.36-.09-.9-.18-1.5-.36-.39-.12-.78-.33-.78-.72 0-.27.18-.6.33-.93.06-.15.06-.3.03-.42-.09-.27-.54-.42-.96-.51-.18-.06-.39-.09-.57-.15-.54-.15-1.14-.39-1.14-.81 0-.33.36-.57.93-.81.21-.09.45-.21.63-.36.99-.78 1.77-1.77 2.31-2.94a.78.78 0 00.06-.45.52.52 0 00-.24-.33c-.36-.21-.81-.36-1.14-.48-.15-.06-.3-.12-.42-.18a.46.46 0 01-.27-.39c0-.15.06-.27.16-.33.1-.08.24-.12.4-.12.04 0 .06 0 .1.01.26.09.62.2.92.22.2 0 .33-.05.4-.09l-.03-.51-.003-.06c-.104-1.628-.23-3.654.3-4.848C7.447 1.069 10.804.793 11.794.793h.412z"/></svg>`,
  },
  {
    key: "websiteUrl",
    label: "Site web",
    inputType: "url",
    placeholder: "https://ton-site.com",
    color: "#6B7280",
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
  },
];

// Primary networks shown by default
export const PRIMARY_SOCIAL_KEYS = ["instagramUrl", "tiktokUrl"];

// Extract handle from a full URL for a given network
export function extractHandle(network: SocialNetwork, fullUrl: string): string {
  if (!fullUrl) return "";
  const url = fullUrl.trim();

  if (network.inputType === "phone") {
    // For WhatsApp, extract number from wa.me link or return as-is
    const waMatch = url.match(/wa\.me\/(\+?\d[\d\s-]*)/);
    if (waMatch) return waMatch[1].replace(/[\s-]/g, "");
    // Already just a number
    return url.replace(/https?:\/\/.*/, "").trim() || url;
  }

  if (network.inputType === "url") {
    return url;
  }

  // Handle-based: extract handle from full URL
  if (network.baseUrl) {
    // Try to extract handle from URL patterns
    const baseUrlObj = new URL(network.baseUrl);
    const basePath = baseUrlObj.pathname.replace(/\/$/, ""); // e.g., "/add" for snapchat
    const patterns = [
      // Match full baseUrl pattern: https://snapchat.com/add/handle
      new RegExp(`(?:https?://)?(?:www\\.)?${escapeRegex(baseUrlObj.hostname)}${escapeRegex(basePath)}/(@?[\\w.-]+)/?`),
      // Fallback: just hostname/handle (for simpler URLs)
      new RegExp(`(?:https?://)?(?:www\\.)?${escapeRegex(baseUrlObj.hostname)}/(@?[\\w.-]+)/?`),
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return cleanHandle(match[1]);
      }
    }
  }

  // Not a URL — treat as raw handle
  return cleanHandle(url);
}

// Build full URL from a handle for a given network
export function buildUrl(network: SocialNetwork, handle: string): string {
  if (!handle) return "";
  const cleaned = handle.trim();

  if (network.inputType === "phone") {
    // WhatsApp: build wa.me link from phone number
    const digits = cleaned.replace(/[\s()-]/g, "");
    return digits ? `https://wa.me/${digits.startsWith("+") ? digits.slice(1) : digits}` : "";
  }

  if (network.inputType === "url") {
    // URL-based: return as-is, add https if missing
    if (!cleaned) return "";
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) return cleaned;
    return `https://${cleaned}`;
  }

  // Handle-based: construct full URL
  if (!network.baseUrl || !cleaned) return "";
  const h = cleanHandle(cleaned);
  return h ? `${network.baseUrl}${h}` : "";
}

// Clean a handle: strip @, strip full URL prefix if accidentally pasted
function cleanHandle(input: string): string {
  let h = input.trim();
  // Remove leading @
  if (h.startsWith("@")) h = h.slice(1);
  // Remove any URL prefix that might have been pasted
  h = h.replace(/^https?:\/\/[^/]+\//, "");
  // Remove trailing slash
  h = h.replace(/\/$/, "");
  // Remove leading @ again (in case URL had /@handle)
  if (h.startsWith("@")) h = h.slice(1);
  return h;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
