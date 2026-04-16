import { getProfileSeller } from "@/lib/serverProfile";
import { ProfileForm } from "./_ProfileForm";

// ─────────────────────────────────────────────────────────────────────────
// /profil (Banani screen 17). Layout + nav + identity card + page title
// are handled by the route-group layout (./layout.tsx → ProfileShell).
// This file just renders the form content inside the shell's content card.
// ─────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const seller = await getProfileSeller();

  return (
    <ProfileForm
      initial={{
        displayName: seller.displayName,
        email: seller.email,
        avatarUrl: seller.avatarUrl,
        phone: seller.phone ?? null,
      }}
    />
  );
}
