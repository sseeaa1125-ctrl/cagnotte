import { cookies } from "next/headers";
import { SECURITY_LABELS } from "@/lib/constants";
import { PasswordForm } from "./_PasswordForm";
import { PinForm } from "./_PinForm";

// ─────────────────────────────────────────────────────────────────────────
// /profil/securite — layout + nav + page title come from ../layout.tsx.
// Fetches PIN status inline; the seller itself is already fetched by the
// parent layout (no redundant /api/auth/me call needed here).
//
// CRITICAL CONTRACT FACTS:
//   - Password change verb is PUT, not POST (auth.ts:702)
//   - PIN is EXACTLY 4 digits (sellers.ts:993)
// ─────────────────────────────────────────────────────────────────────────

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
  const token = cookieStore.get("izy-token")?.value ?? "";
  const hasPin = await fetchPinStatus(token);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="font-headings text-lg font-bold text-primary md:text-xl">
            {SECURITY_LABELS.passwordSection}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {SECURITY_LABELS.passwordDescription}
          </p>
        </div>
        <PasswordForm />
      </section>

      <div className="border-t border-border" aria-hidden />

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="font-headings text-lg font-bold text-primary md:text-xl">
            {SECURITY_LABELS.pinSection}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {SECURITY_LABELS.pinDescription}
          </p>
        </div>
        <PinForm hasPin={hasPin} />
      </section>
    </div>
  );
}
