import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireSellerMe } from "@/lib/serverAuth";
import { DashboardShell } from "./DashboardShell";

// Private space — never indexed, never crawled, never cached by proxies.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 plan 05-02 — (authed) layout with SERVER-SIDE AuthGuard.
//
// Audit R-01 fix: auth resolution is now centralized in requireSellerMe()
// which distinguishes 401 (redirect through /api/auth/refresh-and-return for
// silent refresh) from terminal failures (redirect to /connexion). The
// `next=` param is rebuilt from the x-pathname header set by src/middleware.
// ─────────────────────────────────────────────────────────────────────────

interface LayoutSeller {
  id: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
}

export default async function AuthedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const seller = await requireSellerMe<LayoutSeller>();

  return (
    <div className="min-h-screen bg-background">
      <DashboardShell
        seller={{
          displayName: seller.displayName,
          avatarUrl: seller.avatarUrl,
        }}
      />
      {/* Mobile-only 180px bottom padding clears the fixed BottomNav
          (h-16 + iOS safe-area) so the last content block never hides
          under it. Desktop (md+) uses the normal py-10 rhythm since
          BottomNav is md:hidden. */}
      <main className="container mx-auto animate-page-enter px-4 pt-6 pb-24 md:pt-10 md:pb-10">
        {children}
      </main>
    </div>
  );
}
