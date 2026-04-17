import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Server-side admin auth gate — mirrors serverAuth.ts for the admin surface.
// Cookie: izy-admin-token (access, 15min) + izy-admin-refresh (refresh, 7d).
// On 401: attempt server-side refresh using the refresh token cookie.
// On final failure: redirect to /admin/connexion.

export interface ServerAdmin {
  id: string;
  email: string;
  role: string;
  name: string;
}

export async function requireAdminMe<T = ServerAdmin>(): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-admin-token")?.value;
  const refreshToken = cookieStore.get("izy-admin-refresh")?.value;

  if (!token && !refreshToken) redirect("/admin/connexion");

  // Try with current access token first
  if (token) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/auth/me`, {
        headers: { cookie: `izy-admin-token=${token}` },
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as { admin?: T };
        if (data?.admin) return data.admin;
      }

      // If not 401, it's a real error
      if (res.status !== 401) {
        console.error(`[requireAdminMe] /me returned ${res.status}`);
        redirect("/admin/connexion");
      }
    } catch (err) {
      console.error("[requireAdminMe] fetch threw:", err);
      redirect("/admin/connexion");
    }
  }

  // Access token expired or missing — try server-side refresh
  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${BACKEND_URL}/api/admin/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `izy-admin-refresh=${refreshToken}`,
        },
        cache: "no-store",
      });

      if (refreshRes.ok) {
        // Extract the new access token from Set-Cookie headers
        const setCookies = refreshRes.headers.getSetCookie?.() ?? [];
        let newAccessToken: string | null = null;

        for (const sc of setCookies) {
          const match = sc.match(/^izy-admin-token=([^;]+)/);
          if (match) {
            newAccessToken = match[1];
            break;
          }
        }

        if (newAccessToken) {
          // Retry /me with the fresh token
          const retryRes = await fetch(`${BACKEND_URL}/api/admin/auth/me`, {
            headers: { cookie: `izy-admin-token=${newAccessToken}` },
            cache: "no-store",
          });

          if (retryRes.ok) {
            const data = (await retryRes.json()) as { admin?: T };
            if (data?.admin) return data.admin;
          }
        }
      }
    } catch (err) {
      console.error("[requireAdminMe] refresh threw:", err);
    }
  }

  redirect("/admin/connexion");
}
