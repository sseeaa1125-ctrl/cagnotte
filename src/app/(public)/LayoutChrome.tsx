"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { PreFooter } from "@/components/layout/PreFooter";

// Route-aware wrapper around PreFooter + Footer so we can hide them on
// pages that own the full viewport.
//
// - ALWAYS_HIDE: the cagnotte detail page /c/[slug] — the sticky right
//   aside already carries the "Partager" + "Je participe" CTAs, and the
//   PreFooter ("Prêt à créer votre cagnotte ?") competes for attention.
// - MOBILE_HIDE: the /participer form and /paiement flow — both have
//   their own dense summary card at the bottom with a final CTA, and
//   stacking a pre-footer + footer below it on mobile just pushes the
//   "Participer" / "Payer" button off-screen.
const ALWAYS_HIDE_PATTERNS: readonly RegExp[] = [/^\/c\/[^/]+$/];

const MOBILE_HIDE_PATTERNS: readonly RegExp[] = [
  /^\/c\/[^/]+\/participer(?:\/.*)?$/,
  /^\/c\/[^/]+\/paiement(?:\/.*)?$/,
];

export function LayoutChrome() {
  const pathname = usePathname() ?? "";
  if (ALWAYS_HIDE_PATTERNS.some((re) => re.test(pathname))) return null;
  const hideOnMobile = MOBILE_HIDE_PATTERNS.some((re) => re.test(pathname));

  return (
    <div className={hideOnMobile ? "hidden lg:block" : undefined}>
      <PreFooter />
      <Footer />
    </div>
  );
}
