import { HomeHero } from "./_home/_Hero";
import { HomePublicCampaignsList } from "./_home/_PublicCampaignsList";
import { HomeFeaturesPink } from "./_home/_FeaturesPink";
import { HomeFAQ } from "./_home/_FAQ";

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

export default async function HomePage() {
  return (
    <>
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

export const metadata = {
  title: {
    absolute: "cagnotte.sn — La cagnotte qui fait du bien",
  },
  description:
    "Créez votre cagnotte en ligne au Sénégal. Collectez des contributions via Wave, Orange Money ou Free Money pour vos baptêmes, mariages, tabaski ou projets solidaires.",
};
