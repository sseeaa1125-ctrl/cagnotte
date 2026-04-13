import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "./DashboardShell";

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 plan 05-02 — (authed) layout with SERVER-SIDE AuthGuard.
//
// Why this is a server component (NO "use client"):
//   - Redirects fire BEFORE any JSX renders → no FOUC, no client flash of
//     protected content.
//   - `cookies()` is only available in server components.
//   - `api()` from @/lib/api is window-only (reads localStorage for CSRF,
//     uses document.cookie). We must NEVER call it server-side. Instead we
//     do a raw `fetch` with the cookie header forwarded.
//
// v1 simple path: any 401 / network-error on /api/auth/me → redirect to
// /connexion. v2 can add a client-side refresh island to handle the
// 15min-expiry → 7d-refresh-token race more gracefully.
// ─────────────────────────────────────────────────────────────────────────

interface SellerShape {
  id: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  plan?: string;
  onboardingCompleted?: boolean;
  kycStatus?: string;
}

async function fetchSellerFromCookie(
  token: string,
): Promise<SellerShape | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { seller?: SellerShape };
    return data.seller ?? null;
  } catch {
    return null;
  }
}

export default async function AuthedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;

  if (!token) {
    redirect("/connexion?next=/tableau-de-bord");
  }

  const seller = await fetchSellerFromCookie(token);
  if (!seller) {
    redirect("/connexion?next=/tableau-de-bord");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardShell
        seller={{
          displayName: seller.displayName,
          avatarUrl: seller.avatarUrl,
        }}
      />
      <main className="container mx-auto px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}
