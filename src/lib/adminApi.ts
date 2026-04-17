// Admin-specific fetch wrapper — mirrors api.ts but uses admin cookie/CSRF names.
// Auth cookie: izy-admin-token (httpOnly, set by backend)
// CSRF cookie: izy-admin-csrf (readable by JS)

const API_URL = "";

function getAdminCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)izy-admin-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function storeAdminCsrfToken(token: string): void {
  if (typeof window !== "undefined") {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `izy-admin-csrf=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax${secure}`;
  }
}

export function clearAdminCsrfToken(): void {
  if (typeof window !== "undefined") {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `izy-admin-csrf=; path=/; max-age=0; SameSite=Lax${secure}`;
  }
}

// Refresh token lock — prevent multiple simultaneous refresh calls
let refreshPromise: Promise<boolean> | null = null;

const REFRESH_TIMEOUT_MS = 10_000;

async function refreshAdminAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_URL}/api/admin/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.csrfToken) storeAdminCsrfToken(data.csrfToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

interface AdminApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  _isRetryAfterRefresh?: boolean;
}

export class AdminApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, message: string, body?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.body = body || {};
    this.name = "AdminApiError";
  }
}

export async function adminApi<T = unknown>(
  path: string,
  options: AdminApiOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, _isRetryAfterRefresh = false } = options;

  const fetchHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Attach CSRF token on state-changing requests
  const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (mutationMethods.includes(method.toUpperCase())) {
    const csrfToken = getAdminCsrfToken();
    if (csrfToken) {
      fetchHeaders["x-csrf-token"] = csrfToken;
    }
  }

  // Only retry idempotent verbs on network errors (audit 011 D-01)
  const isIdempotent = method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD";
  const MAX_RETRIES = isIdempotent ? 1 : 0;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: fetchHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 && !_isRetryAfterRefresh && path !== "/api/admin/auth/refresh") {
          const refreshed = await refreshAdminAccessToken();
          if (refreshed) {
            return adminApi<T>(path, { ...options, _isRetryAfterRefresh: true });
          }
        }

        let errorMessage = `Erreur ${response.status}`;
        let errorBody: Record<string, unknown> = {};
        try {
          const text = await response.text();
          try {
            const json = JSON.parse(text);
            errorBody = json as Record<string, unknown>;
            errorMessage = (json as { error?: string }).error || errorMessage;
          } catch {
            errorMessage = response.status >= 500
              ? "Le serveur est temporairement indisponible"
              : `Erreur ${response.status}`;
          }
        } catch {
          // Could not read response body
        }

        throw new AdminApiError(response.status, errorMessage, errorBody);
      }

      return response.json() as Promise<T>;
    } catch (err) {
      lastError = err;
      if (err instanceof AdminApiError || attempt >= MAX_RETRIES) {
        if (!(err instanceof AdminApiError)) {
          const isTimeout = err instanceof DOMException && err.name === "AbortError";
          const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
          const message = isTimeout
            ? "La requete a pris trop de temps. Verifie ta connexion et reessaye."
            : isOffline
              ? "Pas de connexion internet. Verifie ton reseau et reessaye."
              : "Erreur reseau. Reessaye.";
          throw new AdminApiError(0, message);
        }
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw lastError;
}
