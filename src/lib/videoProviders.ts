// Pure helpers to detect and embed third-party video URLs in the gallery.
// We only support providers we can render with a stable iframe contract:
// YouTube, Vimeo, Wistia, Loom. Anything else is rejected so we never end
// up embedding arbitrary user content (XSS / mixed-content / autoplay risk).
//
// No API calls. Thumbnails are served by the provider CDN where possible
// (YouTube: i.ytimg.com, Vimeo: vumbnail.com — Vimeo's own oembed needs a
// network round-trip we don't want on render).

export type VideoProvider = "youtube" | "vimeo" | "wistia" | "loom";

export interface VideoInfo {
  provider: VideoProvider;
  id: string;
  embedUrl: string;
  thumbnailUrl: string | null;
}

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID_RE = /^[0-9]{6,12}$/;
const WISTIA_ID_RE = /^[a-z0-9]{8,15}$/i;
const LOOM_ID_RE = /^[a-f0-9]{20,40}$/i;

function safeUrl(rawUrl: string): URL | null {
  const url = rawUrl.trim();
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function host(parsed: URL): string {
  return parsed.hostname.replace(/^www\./, "");
}

// ── YouTube ──
function detectYoutube(parsed: URL): VideoInfo | null {
  const h = host(parsed);
  if (h === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0] ?? "";
    return YOUTUBE_ID_RE.test(id) ? buildYoutube(id) : null;
  }
  if (h === "youtube.com" || h === "m.youtube.com") {
    const v = parsed.searchParams.get("v");
    if (v && YOUTUBE_ID_RE.test(v)) return buildYoutube(v);
    const shorts = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shorts) return buildYoutube(shorts[1]);
    const embed = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embed) return buildYoutube(embed[1]);
  }
  return null;
}

function buildYoutube(id: string): VideoInfo {
  return {
    provider: "youtube",
    id,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

// ── Vimeo ──
function detectVimeo(parsed: URL): VideoInfo | null {
  const h = host(parsed);
  if (h !== "vimeo.com" && h !== "player.vimeo.com") return null;
  // /VIDEOID, /channels/.../VIDEOID, /album/.../video/VIDEOID, player path
  // /video/VIDEOID. We grab the last numeric segment that matches the id RE.
  const segments = parsed.pathname.split("/").filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    if (VIMEO_ID_RE.test(segments[i])) {
      const id = segments[i];
      return {
        provider: "vimeo",
        id,
        embedUrl: `https://player.vimeo.com/video/${id}`,
        // vumbnail.com is a free thumbnail proxy maintained by the Vimeo
        // community — no API key, no rate limit issues for our scale.
        thumbnailUrl: `https://vumbnail.com/${id}.jpg`,
      };
    }
  }
  return null;
}

// ── Wistia ──
function detectWistia(parsed: URL): VideoInfo | null {
  const h = host(parsed);
  // Public share: foo.wistia.com/medias/HASH
  // Embed iframe:  fast.wistia.net/embed/iframe/HASH
  if (h.endsWith(".wistia.com") || h === "wistia.com") {
    const m = parsed.pathname.match(/\/medias\/([a-z0-9]{8,15})/i);
    if (m && WISTIA_ID_RE.test(m[1])) return buildWistia(m[1]);
  }
  if (h === "fast.wistia.net" || h === "wistia.net") {
    const m = parsed.pathname.match(/\/embed\/iframe\/([a-z0-9]{8,15})/i);
    if (m && WISTIA_ID_RE.test(m[1])) return buildWistia(m[1]);
  }
  return null;
}

function buildWistia(id: string): VideoInfo {
  return {
    provider: "wistia",
    id,
    embedUrl: `https://fast.wistia.net/embed/iframe/${id}`,
    thumbnailUrl: `https://fast.wistia.com/embed/medias/${id}/swatch`,
  };
}

// ── Loom ──
function detectLoom(parsed: URL): VideoInfo | null {
  const h = host(parsed);
  if (h !== "loom.com" && h !== "www.loom.com") return null;
  const m = parsed.pathname.match(/\/(?:share|embed)\/([a-f0-9]{20,40})/i);
  if (m && LOOM_ID_RE.test(m[1])) {
    return {
      provider: "loom",
      id: m[1],
      embedUrl: `https://www.loom.com/embed/${m[1]}`,
      // Loom requires an API call for thumbnails — fall back to null and
      // the renderer shows a branded placeholder tile.
      thumbnailUrl: null,
    };
  }
  return null;
}

// ── Public entry point ──
export function detectVideo(rawUrl: string): VideoInfo | null {
  const parsed = safeUrl(rawUrl);
  if (!parsed) return null;
  return (
    detectYoutube(parsed) ||
    detectVimeo(parsed) ||
    detectWistia(parsed) ||
    detectLoom(parsed)
  );
}

export const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  wistia: "Wistia",
  loom: "Loom",
};
