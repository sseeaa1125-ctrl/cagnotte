import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileSidebar } from "@/components/layout/ProfileSidebar";
import { PROFILE_LABELS } from "@/lib/constants";
import { ProfileForm } from "./_ProfileForm";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — /profil (Banani screen 17).
//
// Server component. Fetches GET /api/auth/me with izy-token forwarded
// (D-11 pattern). NO client-side AuthContext read — redirects pre-render.
//
// D-28: the plan's PATCH /api/sellers/me path does not exist. Writes use
// PUT /api/sellers/profile (the existing endpoint). Server read path uses
// /api/auth/me (already wired in the layout).
// ─────────────────────────────────────────────────────────────────────────

interface SellerPayload {
  id: string;
  email: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  phone?: string | null;
  phoneCountry?: string | null;
  kycStatus?: string;
}

async function fetchSellerMe(
  token: string,
): Promise<SellerPayload | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { seller?: SellerPayload };
    return data.seller ?? null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect("/connexion?next=/profil");

  const seller = await fetchSellerMe(token);
  if (!seller) redirect("/connexion?next=/profil");

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="font-headings text-2xl font-bold text-primary md:text-3xl">
          {PROFILE_LABELS.h1}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PROFILE_LABELS.subtitle}
        </p>
      </header>

      <ProfileSidebar
        activeTab="profile"
        seller={{
          displayName: seller.displayName,
          avatarUrl: seller.avatarUrl,
          email: seller.email,
          kycStatus: seller.kycStatus ?? "NONE",
        }}
      >
        <h2 className="mb-6 font-headings text-xl font-bold text-primary">
          {PROFILE_LABELS.sectionTitle}
        </h2>
        <ProfileForm
          initial={{
            displayName: seller.displayName,
            email: seller.email,
            avatarUrl: seller.avatarUrl,
            phone: seller.phone ?? null,
          }}
        />
      </ProfileSidebar>
    </div>
  );
}
