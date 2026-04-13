// PROXY: All client-side API calls go through Next.js rewrites (same-origin)
// This fixes Safari ITP blocking cross-origin cookies (Vercel ↔ Railway)
const API_URL = "";

// Direct backend URL — used by public endpoints (store checkout, uploads) to bypass
// Vercel's rewrite proxy which can drop POST bodies on mobile devices
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// S6b: Read CSRF token — try localStorage first, fallback to cookie (httpOnly=false)
function getCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("izy-csrf");
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|;\s*)izy-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function storeCsrfToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("izy-csrf", token);
    // Also set as cookie for double-submit pattern (Set-Cookie from backend may not survive proxy)
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `izy-csrf=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax${secure}`;
  }
}

export function clearCsrfToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("izy-csrf");
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `izy-csrf=; path=/; max-age=0; SameSite=Lax${secure}`;
  }
}

// Refresh token lock — prevent multiple simultaneous refresh calls
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.csrfToken) storeCsrfToken(data.csrfToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  baseUrl?: string;
  _isRetryAfterRefresh?: boolean;
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, baseUrl, _isRetryAfterRefresh = false } = options;
  const effectiveBaseUrl = baseUrl ?? API_URL;

  const fetchHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // S6: Attach CSRF token header on state-changing requests
  const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (mutationMethods.includes(method.toUpperCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      fetchHeaders["x-csrf-token"] = csrfToken;
    }
  }

  // FL7: Auto-retry on network errors (1 retry after 1s delay)
  const MAX_RETRIES = 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // L3: AbortController timeout — 30s max per request to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(`${effectiveBaseUrl}${path}`, {
        method,
        headers: fetchHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Auto-refresh: if 401 and not already retrying after refresh, try to refresh
        if (response.status === 401 && !_isRetryAfterRefresh && path !== "/api/auth/refresh") {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            return api<T>(path, { ...options, _isRetryAfterRefresh: true });
          }
        }

        // Parse error body — try JSON first, fallback to text
        let errorMessage = `Erreur ${response.status}`;
        let errorBody: Record<string, unknown> = {};
        try {
          const text = await response.text();
          try {
            const json = JSON.parse(text);
            errorBody = json as Record<string, unknown>;
            errorMessage = (json as { error?: string }).error || errorMessage;
          } catch {
            // Non-JSON response (e.g. HTML from proxy 502/503)
            errorMessage = response.status >= 500
              ? "Le serveur est temporairement indisponible"
              : `Erreur ${response.status}`;
          }
        } catch {
          // Could not read response body at all
        }

        throw new ApiError(response.status, errorMessage, errorBody);
      }

      return response.json() as Promise<T>;
    } catch (err) {
      lastError = err;
      // Only retry on network failures (TypeError from fetch), not on API errors
      if (err instanceof ApiError || attempt >= MAX_RETRIES) {
        // U3: Distinguish timeout vs offline vs unknown network error
        if (!(err instanceof ApiError)) {
          const isTimeout = err instanceof DOMException && err.name === "AbortError";
          const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
          const message = isTimeout
            ? "La requête a pris trop de temps. Vérifie ta connexion et réessaye."
            : isOffline
              ? "Pas de connexion internet. Vérifie ton réseau et réessaye."
              : "Erreur réseau. Réessaye.";
          throw new ApiError(0, message);
        }
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw lastError;
}

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, message: string, body?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.body = body || {};
    this.name = "ApiError";
  }
}
