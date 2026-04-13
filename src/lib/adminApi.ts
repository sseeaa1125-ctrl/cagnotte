// PROXY: All client-side API calls go through Next.js rewrites (same-origin)
const API_URL = "";

function getCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  // 1. Try localStorage (set by login/auto-login response body)
  const fromStorage = localStorage.getItem("izy-csrf");
  if (fromStorage) return fromStorage;
  // 2. Fallback: read directly from cookie (httpOnly=false)
  const match = document.cookie.match(/(?:^|;\s*)izy-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface AdminApiOptions {
  method?: string;
  body?: unknown;
}

export async function adminApi<T = unknown>(
  path: string,
  options: AdminApiOptions = {}
): Promise<T> {
  const { method = "GET", body } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Attach CSRF token on state-changing requests
  const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (mutationMethods.includes(method.toUpperCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    let errorMessage = `Erreur ${response.status}`;
    try {
      const json = await response.json();
      errorMessage = (json as { error?: string }).error || errorMessage;
    } catch {
      // Non-JSON response
    }
    throw new AdminApiError(response.status, errorMessage);
  }

  return response.json() as Promise<T>;
}

export class AdminApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AdminApiError";
  }
}
