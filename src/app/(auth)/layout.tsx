import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { PreFooter } from "@/components/layout/PreFooter";
import { TopBannerHost } from "../(public)/TopBannerHost";

// Server Component (no "use client"). Phase 5 plan 05-01 — wraps every
// /(auth)/ route (inscription, connexion, verification-email, mot-de-passe-*)
// in the same public shell as (public)/ so visitors see a consistent navbar
// + footer. Route-group layouts are NOT composable, so we duplicate the
// imports from (public)/layout.tsx rather than re-exporting it.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBannerHost />
      <PublicNavbar />
      <main className="min-h-screen bg-background">{children}</main>
      <PreFooter />
      <Footer />
    </>
  );
}
