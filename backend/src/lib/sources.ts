/**
 * Shared referrer → source name mapping.
 * Used by analytics tracking and order creation.
 */

const SOURCE_PATTERNS: [RegExp, string][] = [
  [/instagram\.com|l\.instagram\.com/i, "Instagram"],
  [/tiktok\.com|vm\.tiktok\.com/i, "TikTok"],
  [/wa\.me|whatsapp\.com|api\.whatsapp\.com/i, "WhatsApp"],
  [/facebook\.com|fb\.com|fb\.me|l\.facebook\.com|m\.facebook\.com|lm\.facebook\.com/i, "Facebook"],
  [/twitter\.com|t\.co|x\.com/i, "X (Twitter)"],
  [/youtube\.com|youtu\.be/i, "YouTube"],
  [/linkedin\.com|lnkd\.in/i, "LinkedIn"],
  [/snapchat\.com|snap\.com/i, "Snapchat"],
  [/threads\.net/i, "Threads"],
  [/pinterest\.com|pin\.it/i, "Pinterest"],
  [/t\.me|telegram\.org|telegram\.me/i, "Telegram"],
  [/google\./i, "Google"],
  [/bing\.com/i, "Bing"],
  [/yahoo\./i, "Yahoo"],
];

export function parseSource(referrer: string | undefined): string {
  if (!referrer) return "Direct";
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (!hostname) return "Direct";
    for (const [pattern, name] of SOURCE_PATTERNS) {
      if (pattern.test(hostname)) return name;
    }
    return hostname.replace(/^www\./, "");
  } catch {
    return "Direct";
  }
}
