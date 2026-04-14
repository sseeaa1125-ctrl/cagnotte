// Pure helpers for YouTube URL parsing. No runtime deps. Supports both
// canonical forms: https://www.youtube.com/watch?v=VIDEOID (+ optional &t=…)
// and https://youtu.be/VIDEOID. Returns null for anything else so callers
// can surface a "lien YouTube invalide" error.

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function extractYoutubeId(rawUrl: string): string | null {
  const url = rawUrl.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0] ?? "";
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v && YOUTUBE_ID_RE.test(v)) return v;
      // Shorts: /shorts/VIDEOID
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
      // Embed: /embed/VIDEOID
      const embedMatch = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    // Not a parseable URL — reject.
  }
  return null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbed(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
