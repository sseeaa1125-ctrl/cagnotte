/**
 * Link Preview — Scrape OG metadata from a URL
 *
 * GET /api/link-preview?url=https://example.com
 * Returns: { ogImage, ogTitle, ogDescription }
 *
 * - Auth required (vendeur dashboard only)
 * - Cache Redis 24h par URL
 * - Timeout 5s, max 500KB HTML
 */
import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { redis } from "../lib/redis.js";
import { uploadToR2 } from "../lib/storage.js";
import * as logger from "../lib/logger.js";

export const linkPreviewRouter = Router();

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h
const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 512 * 1024; // 500KB

// Browser-like UA — bot UAs get blocked by YouTube, Twitter, Facebook CDNs (especially from cloud IPs)
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

interface OgData {
  ogImage: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
}

function extractMetaContent(html: string, property: string): string | null {
  // Match <meta property="og:..." content="..."> or <meta name="og:..." content="...">
  // Also handle content before property and single quotes
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function parseOgFromHtml(html: string): OgData {
  return {
    ogImage: extractMetaContent(html, "og:image"),
    ogTitle: extractMetaContent(html, "og:title"),
    ogDescription: extractMetaContent(html, "og:description"),
  };
}

function getCacheKey(url: string): string {
  return `lp3:${url}`;
}

// SSRF Protection — block internal/private IPs and cloud metadata endpoints
const BLOCKED_HOSTNAMES = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "[::1]", "metadata.google.internal",
]);

function isBlockedHost(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) return true;
  // Block private IP ranges: 10.x, 172.16-31.x, 192.168.x, 169.254.x (link-local/cloud metadata)
  const ipMatch = hostname.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
  }
  return false;
}

// GET /api/link-preview?url=...
linkPreviewRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  const rawUrl = req.query.url as string | undefined;

  if (!rawUrl) {
    res.status(400).json({ error: "URL manquante" });
    return;
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      res.status(400).json({ error: "URL invalide (http/https uniquement)" });
      return;
    }
    // SSRF: Block internal/private network access
    if (isBlockedHost(parsedUrl.hostname)) {
      res.status(400).json({ error: "URL non autorisée" });
      return;
    }
  } catch {
    res.status(400).json({ error: "URL invalide" });
    return;
  }

  const url = parsedUrl.toString();
  const isYouTube = parsedUrl.hostname.includes("youtube.com") || parsedUrl.hostname.includes("youtu.be");

  // Check Redis cache
  try {
    const cached = await redis.get(getCacheKey(url));
    if (cached) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      res.json(data);
      return;
    }
  } catch {
    // Cache miss or Redis down — continue
  }

  // Specialized YouTube oEmbed fetching
  if (isYouTube) {
    try {
      logger.log(`[LinkPreview] YouTube URL detected, using oEmbed: ${url}`);
      const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const oEmbedRes = await fetch(oEmbedUrl, {
        headers: { "User-Agent": BROWSER_UA },
      });

      if (oEmbedRes.ok) {
        const ytData = await oEmbedRes.json() as { title?: string; author_name?: string; thumbnail_url?: string };
        const ogData: OgData = {
          ogTitle: ytData.title || null,
          ogDescription: ytData.author_name ? `Vidéo YouTube de ${ytData.author_name}` : null,
          ogImage: ytData.thumbnail_url || null,
        };

        if (ogData.ogImage) {
          ogData.ogImage = await rehostImage(ogData.ogImage, parsedUrl);
        }

        // Cache result
        try {
          await redis.set(getCacheKey(url), JSON.stringify(ogData), { ex: CACHE_TTL_SECONDS });
        } catch {}

        res.json(ogData);
        return;
      }
    } catch (err) {
      logger.warn(`[LinkPreview] YouTube oEmbed failed — falling back to scraper`, err);
    }
  }

  // Fetch the URL (Scraper fallback)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      res.json({ ogImage: null, ogTitle: null, ogDescription: null });
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      res.json({ ogImage: null, ogTitle: null, ogDescription: null });
      return;
    }

    // Read limited HTML
    const reader = response.body?.getReader();
    if (!reader) {
      res.json({ ogImage: null, ogTitle: null, ogDescription: null });
      return;
    }

    let html = "";
    let totalBytes = 0;
    const decoder = new TextDecoder();

    while (totalBytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      html += decoder.decode(value, { stream: true });
      // Early exit if we've found </head> — OG tags are always in <head>
      if (html.includes("</head>")) break;
    }
    reader.cancel();

    const ogData = parseOgFromHtml(html);

    // Re-host OG image on R2 to avoid CSP/CORS issues with external URLs
    if (ogData.ogImage) {
      ogData.ogImage = await rehostImage(ogData.ogImage, parsedUrl);
    }

    // Cache result in Redis (even empty results to avoid repeated fetches)
    try {
      await redis.set(getCacheKey(url), JSON.stringify(ogData), { ex: CACHE_TTL_SECONDS });
    } catch {
      // Redis down — no-op
    }

    res.json(ogData);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      logger.warn(`[LinkPreview] Timeout fetching ${url}`);
    } else {
      logger.warn(`[LinkPreview] Error fetching ${url}`, err);
    }
    res.json({ ogImage: null, ogTitle: null, ogDescription: null });
  }
});

/**
 * Re-host an external image on R2
 */
async function rehostImage(imgUrl: string, originUrl: URL): Promise<string | null> {
  try {
    let finalImgUrl = imgUrl;
    // Handle protocol-relative URLs
    if (finalImgUrl.startsWith("//")) finalImgUrl = `https:${finalImgUrl}`;
    // Handle relative URLs
    if (finalImgUrl.startsWith("/")) finalImgUrl = `${originUrl.origin}${finalImgUrl}`;

    logger.log(`[LinkPreview] Re-hosting image: ${finalImgUrl}`);
    const imgController = new AbortController();
    const imgTimeout = setTimeout(() => imgController.abort(), FETCH_TIMEOUT_MS);
    const imgRes = await fetch(finalImgUrl, {
      signal: imgController.signal,
      headers: { "User-Agent": BROWSER_UA, "Accept": "image/*,*/*;q=0.8" },
      redirect: "follow",
    });
    clearTimeout(imgTimeout);

    if (imgRes.ok) {
      const imgContentType = imgRes.headers.get("content-type") || "image/jpeg";
      if (imgContentType.startsWith("image/")) {
        const arrayBuf = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        logger.log(`[LinkPreview] Image downloaded: ${buffer.length} bytes, type: ${imgContentType}`);
        // Only upload reasonably sized images (< 2MB)
        if (buffer.length > 0 && buffer.length < 2 * 1024 * 1024) {
          const ext = imgContentType.includes("png") ? ".png" : imgContentType.includes("webp") ? ".webp" : ".jpg";
          const r2Url = await uploadToR2(buffer, `og-preview${ext}`, imgContentType);
          logger.log(`[LinkPreview] Image uploaded to R2: ${r2Url}`);
          return r2Url;
        } else {
          logger.warn(`[LinkPreview] Image too large or empty: ${buffer.length} bytes — dropping`);
        }
      } else {
        logger.warn(`[LinkPreview] URL not an image type: ${imgContentType} — dropping`);
      }
    } else {
      logger.warn(`[LinkPreview] Failed to download image: ${imgRes.status} — dropping`);
    }
  } catch (err) {
    logger.warn(`[LinkPreview] Error re-hosting image — dropping`, err);
  }
  return null;
}
