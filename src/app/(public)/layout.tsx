import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { TopBannerHost } from "./TopBannerHost";
import { LayoutChrome } from "./LayoutChrome";

// Server Component (no "use client"). Wraps every /(public)/ route in the
// Phase 3 Ring 2 layout blocks (TopBanner + PublicNavbar + PreFooter + Footer)
// plus the Phase 10 CookieBanner (fixed bottom-right, self-dismissing).
// PreFooter + Footer live inside the client-side `LayoutChrome` gate so
// they can be hidden on mobile for specific routes (e.g. /participer).
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBannerHost />
      <PublicNavbar />
      <main className="min-h-screen animate-page-enter">{children}</main>
      <LayoutChrome />
      <CookieBanner />
    </>
  );
}
