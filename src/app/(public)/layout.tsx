import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { PreFooter } from "@/components/layout/PreFooter";
import { TopBannerHost } from "./TopBannerHost";

// Server Component (no "use client"). Wraps every /(public)/ route in the
// Phase 3 Ring 2 layout blocks (TopBanner + PublicNavbar + PreFooter + Footer).
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBannerHost />
      <PublicNavbar />
      <main className="min-h-screen">{children}</main>
      <PreFooter />
      <Footer />
    </>
  );
}
