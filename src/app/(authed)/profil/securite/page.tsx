import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileSidebar } from "@/components/layout/ProfileSidebar";
import { PROFILE_LABELS, SECURITY_LABELS } from "@/lib/constants";
import { PasswordForm } from "./_PasswordForm";
import { PinForm } from "./_PinForm";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /profil/securite.
//
// Server component. Reads /api/auth/me (for sidebar) and
// /api/sellers/withdrawal-pin/status (for hasPin boolean).
//
// CRITICAL CONTRACT FACTS:
//   - Password change verb is PUT, not POST (auth.ts:702)
//   - PIN is EXACTLY 4 digits (sellers.ts:993)
// ─────────────────────────────────────────────────────────────────────────

interface SellerPayload {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  kycStatus?: string;
}

async function fetchSellerMe(token: string): Promise<SellerPayload | null> {
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

async function fetchPinStatus(token: string): Promise<boolean> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(
      `${backendUrl}/api/sellers/withdrawal-pin/status`,
      {
        headers: { cookie: `izy-token=${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { hasPin?: boolean };
    return data.hasPin === true;
  } catch {
    return false;
  }
}

export const dynamic = "force-dynamic";

export default async function SecuritePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect("/connexion?next=/profil/securite");

  const [seller, hasPin] = await Promise.all([
    fetchSellerMe(token),
    fetchPinStatus(token),
  ]);
  if (!seller) redirect("/connexion?next=/profil/securite");

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
        activeTab="security"
        seller={{
          displayName: seller.displayName,
          avatarUrl: seller.avatarUrl,
          email: seller.email,
          kycStatus: seller.kycStatus ?? "NONE",
        }}
      >
        <h2 className="mb-1 font-headings text-xl font-bold text-primary">
          {SECURITY_LABELS.h1}
        </h2>
        <p className="mb-8 text-sm text-muted-foreground">
          {SECURITY_LABELS.subtitle}
        </p>

        <div className="flex flex-col gap-10">
          <section>
            <h3 className="mb-1 font-headings text-lg font-semibold text-primary">
              {SECURITY_LABELS.passwordSection}
            </h3>
            <p className="mb-5 text-xs text-muted-foreground">
              {SECURITY_LABELS.passwordDescription}
            </p>
            <PasswordForm />
          </section>

          <div className="border-t border-border" aria-hidden />

          <section>
            <h3 className="mb-1 font-headings text-lg font-semibold text-primary">
              {SECURITY_LABELS.pinSection}
            </h3>
            <p className="mb-5 text-xs text-muted-foreground">
              {SECURITY_LABELS.pinDescription}
            </p>
            <PinForm hasPin={hasPin} />
          </section>
        </div>
      </ProfileSidebar>
    </div>
  );
}
