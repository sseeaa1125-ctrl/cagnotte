import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileSidebar } from "@/components/layout/ProfileSidebar";
import { NOTIF_PREFS_LABELS } from "@/lib/constants";
import { PreferencesForm } from "./_PreferencesForm";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — /profil/preferences (Banani screen 19).
//
// Server component. Two parallel fetches (cookie forwarded):
//   1. GET /api/auth/me — for ProfileSidebar props
//   2. GET /api/notifications/prefs — seeds PreferencesForm initial
// ─────────────────────────────────────────────────────────────────────────

interface SellerPayload {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  kycStatus?: string;
}

async function fetchWithCookie<T>(
  path: string,
  token: string,
): Promise<T | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}${path}`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect("/connexion?next=/profil/preferences");

  const [me, prefs] = await Promise.all([
    fetchWithCookie<{ seller: SellerPayload }>("/api/auth/me", token),
    fetchWithCookie<Record<string, boolean>>(
      "/api/notifications/prefs",
      token,
    ),
  ]);

  if (!me?.seller) redirect("/connexion?next=/profil/preferences");
  const seller = me.seller;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="font-headings text-2xl font-bold text-primary md:text-3xl">
          {NOTIF_PREFS_LABELS.h1}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {NOTIF_PREFS_LABELS.subtitle}
        </p>
      </header>

      <ProfileSidebar
        activeTab="preferences"
        seller={{
          displayName: seller.displayName,
          avatarUrl: seller.avatarUrl,
          email: seller.email,
          kycStatus: seller.kycStatus ?? "NONE",
        }}
      >
        <h2 className="mb-6 font-headings text-xl font-bold text-primary">
          {NOTIF_PREFS_LABELS.h1}
        </h2>
        <PreferencesForm initial={prefs ?? {}} />
      </ProfileSidebar>
    </div>
  );
}
