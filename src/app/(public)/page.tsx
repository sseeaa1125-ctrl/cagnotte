import { HomeHero } from "./_home/_Hero";
import { HomePublicCampaignsList } from "./_home/_PublicCampaignsList";
import { HomeFeaturesPink } from "./_home/_FeaturesPink";
import { HomeSolidaryCampaigns } from "./_home/_SolidaryCampaigns";
import { HomeFAQ } from "./_home/_FAQ";

// ─────────────────────────────────────────────────────────────────────────
// Phase 9 fixpack — Banani home page composition.
// The (public) layout already wraps every child with
// TopBanner + PublicNavbar + main + PreFooter + Footer — we only add the
// 5 route-scoped sections here.
// Source: .planning/banani/screens/phase-9/home-source.md (main.jsx)
// ─────────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  return (
    <>
      <HomeHero />
      <HomePublicCampaignsList />
      <HomeFeaturesPink />
      <HomeSolidaryCampaigns />
      <HomeFAQ />
    </>
  );
}

// Enable short ISR at the page level so fresh deployments show fresh data.
export const revalidate = 60;

export const metadata = {
  title: "La cagnotte qui fait du bien — cagnotte.sn",
  description:
    "Des cagnottes en ligne au Sénégal pour faire plaisir à vos proches et soutenir celles et ceux qui en ont besoin. Wave, Orange Money, Free Money, carte bancaire.",
};
