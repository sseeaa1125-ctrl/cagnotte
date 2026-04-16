import type { ReactNode } from "react";
import { ProfileShell } from "@/components/layout/ProfileShell";
import { getProfileSeller } from "@/lib/serverProfile";

// ─────────────────────────────────────────────────────────────────────────
// Route-group layout for /profil/*.
//
// Fetches the seller ONCE via React.cache() (shared with each page
// below) and hands it to <ProfileShell> which renders the responsive
// nav + identity card. Child pages no longer need their own header
// block, max-w wrapper, or <ProfileSidebar> import — they just return
// their form content.
// ─────────────────────────────────────────────────────────────────────────

export default async function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  const seller = await getProfileSeller();

  return (
    <ProfileShell
      seller={{
        displayName: seller.displayName,
        avatarUrl: seller.avatarUrl,
        email: seller.email,
        kycStatus: seller.kycStatus ?? "NONE",
      }}
    >
      {children}
    </ProfileShell>
  );
}
