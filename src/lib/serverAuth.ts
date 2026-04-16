import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Audit R-01 — centralized server-side auth gate for (authed) routes.
//
// The subtle bug we're fixing: when the 15-min JWT expires but the browser's
// local clock drifts (tab paused, laptop sleep), the cookie may still be
// present while the backend sees the token as stale. Old flow: layout/page
// fetch `/api/auth/me`, gets 401, silently returns null, then redirects to
// `/connexion` — kicking the user out of a valid 7-day session.
//
// New flow: distinguish 401 (token refreshable) from network/500 (terminal).
// On 401 OR no cookie we bounce through `/api/auth/refresh-and-return`, which
// is the sealed silent-refresh gate (same as middleware's missing-cookie
// path). On any other failure we land the user on /connexion.
//
// The `next=` param is reconstructed from the `x-pathname` request header set
// by src/middleware.ts, so the user lands back on the exact URL they were
// trying to view — including any ?query=string.

// Base shape — every caller picks a subset via the generic parameter.
// No index signature so callers can use strict interfaces without adding one.
export interface ServerSeller {
  id: string;
  email: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  kycStatus?: string;
}

export async function requireSellerMe<T = ServerSeller>(): Promise<T> {
  const cookieStore = await cookies();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/tableau-de-bord";
  const refreshUrl = `/api/auth/refresh-and-return?next=${encodeURIComponent(pathname)}`;
  const connexionUrl = `/connexion?next=${encodeURIComponent(pathname)}`;
  const token = cookieStore.get("izy-token")?.value;

  if (!token) redirect(refreshUrl);

  let res: Response | null = null;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[requireSellerMe] fetch threw:", err);
    redirect(connexionUrl);
  }

  if (res.status === 401) redirect(refreshUrl);
  if (!res.ok) {
    console.error(`[requireSellerMe] /api/auth/me returned ${res.status}`);
    redirect(connexionUrl);
  }

  let data: { seller?: T } | null = null;
  try {
    data = (await res.json()) as { seller?: T };
  } catch {
    redirect(connexionUrl);
  }

  if (!data?.seller) redirect(connexionUrl);
  return data.seller;
}
