import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { PreFooter } from "@/components/layout/PreFooter";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { TopBannerHost } from "./TopBannerHost";

// Server Component (no "use client"). Wraps every /(public)/ route in the
// Phase 3 Ring 2 layout blocks (TopBanner + PublicNavbar + PreFooter + Footer)
// plus the Phase 10 CookieBanner (fixed bottom-right, self-dismissing).
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBannerHost />
      <PublicNavbar />
      <main className="min-h-screen animate-page-enter">{children}</main>
      <PreFooter />
      <Footer />
      <CookieBanner />
    </>
  );
}
