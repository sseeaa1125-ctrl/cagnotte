import type { Metadata } from "next";
import { HomeHero } from "./_home/_Hero";
import { HomePublicCampaignsList } from "./_home/_PublicCampaignsList";
import { HomeFeaturesPink } from "./_home/_FeaturesPink";
import { HomeFAQ } from "./_home/_FAQ";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cagnotte.sn";

const seoDescription =
  "Créez votre cagnotte en ligne au Sénégal. Collectez des contributions via Wave, Orange Money ou Free Money pour vos baptêmes, mariages, tabaski ou projets solidaires.";

// ─────────────────────────────────────────────────────────────────────────
// Banani home page composition.
// The (public) layout already wraps every child with
// TopBanner + PublicNavbar + main + PreFooter + Footer — we only add the
// route-scoped sections here.
//
// Phase 10 — `HomeSolidaryCampaigns` was removed from the home page per
// product direction (shown on /cagnottes?subtype=solidaire instead). The
// component file is kept for that future reuse.
// ─────────────────────────────────────────────────────────────────────────

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "cagnotte.sn",
  url: BASE_URL,
  description: seoDescription,
  inLanguage: "fr",
};

export default async function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeHero />
      <HomePublicCampaignsList />
      <HomeFeaturesPink />
      <HomeFAQ />
    </>
  );
}

// Dynamic rendering — the featured cagnottes section must reflect live
// donation totals on every visit (matches /c/[slug] polling cadence).
// The other home sections (hero, features, FAQ) are static but rendering
// them dynamically costs nothing since there are no fetches.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "cagnotte.sn — La cagnotte qui fait du bien",
  },
  description: seoDescription,
  openGraph: {
    title: "cagnotte.sn — La cagnotte qui fait du bien",
    description: seoDescription,
    url: BASE_URL,
    type: "website",
    siteName: "cagnotte.sn",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "cagnotte.sn — La cagnotte qui fait du bien",
    description: seoDescription,
  },
  alternates: {
    canonical: BASE_URL,
  },
};
