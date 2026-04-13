"use client";

// ─────────────────────────────────────────────────────────────────────────
// Shared client helper — POST /api/upload with multipart body.
// `api()` from @/lib/api is JSON-only; for multipart we need a raw fetch
// with the CSRF token attached manually.
//
// Returns the proxy URL (e.g. /api/files/abc.jpg) that the backend emits.
// Throws on any non-2xx or network error.
// ─────────────────────────────────────────────────────────────────────────

function getCsrfTokenClient(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromStorage = window.localStorage.getItem("izy-csrf");
    if (fromStorage) return fromStorage;
  } catch {
    // ignore
  }
  const match = document.cookie.match(/(?:^|;\s*)izy-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function uploadCover(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  const csrf = getCsrfTokenClient();
  if (csrf) headers["x-csrf-token"] = csrf;

  const res = await fetch(`/api/upload`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    let errorMessage = `Erreur ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) errorMessage = body.error;
    } catch {
      // non-JSON body
    }
    throw new Error(errorMessage);
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error("Réponse invalide du serveur.");
  }
  return data.url;
}
