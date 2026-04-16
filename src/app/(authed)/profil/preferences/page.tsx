import { cookies } from "next/headers";
import { PreferencesForm } from "./_PreferencesForm";

// ─────────────────────────────────────────────────────────────────────────
// /profil/preferences — layout + nav + page title come from ../layout.tsx.
// Only fetches the notification prefs (the seller itself is already
// resolved by the parent layout via the cached helper).
// ─────────────────────────────────────────────────────────────────────────

async function fetchPrefs(
  token: string,
): Promise<Record<string, boolean> | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}/api/notifications/prefs`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, boolean>;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value ?? "";
  const prefs = await fetchPrefs(token);

  return <PreferencesForm initial={prefs ?? {}} />;
}
