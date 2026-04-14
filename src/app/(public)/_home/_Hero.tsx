import Link from "next/link";
import { cookies } from "next/headers";
import { Check, ShieldCheck } from "lucide-react";
import { HOME_HERO_LABELS } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// Phase 9 fixpack — Banani home page Hero section.
// Server component. Reads izy-token cookie to decide the CTA destination:
// logged-in users go straight to /tableau-de-bord/nouvelle, others to
// /inscription. No API call — presence of the cookie is sufficient for a
// CTA hint; the real auth check happens at the destination route.
// Source: .planning/banani/screens/phase-9/home-source.md (Hero.jsx)
// ─────────────────────────────────────────────────────────────────────────

export async function HomeHero() {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get("izy-token")?.value);
  const ctaHref = hasSession ? "/tableau-de-bord/nouvelle" : "/inscription";

  return (
    <section className="bg-white px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
        <ShieldCheck
          size={16}
          className="text-trustpilot"
          aria-hidden
        />
        {HOME_HERO_LABELS.trustPre}
      </div>

      <h1 className="mx-auto mb-6 max-w-4xl font-headings text-5xl font-black leading-tight tracking-tight text-primary md:text-7xl">
        {HOME_HERO_LABELS.h1Part1}
        <br />
        <span className="text-gradient">{HOME_HERO_LABELS.h1Part2}</span>
      </h1>

      <p className="mx-auto mb-10 max-w-2xl text-xl font-medium text-gray-600 md:text-2xl">
        {HOME_HERO_LABELS.subtitle}
      </p>

      <Link
        href={ctaHref}
        className="mb-8 inline-flex min-h-14 items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-blue-900/20 transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {HOME_HERO_LABELS.ctaCreate}
      </Link>

      <div className="flex justify-center px-2">
        <div className="flex items-center rounded-full border border-green-100 bg-[#F0FDF4] py-2 pl-2 pr-6 text-sm font-medium text-[#166534] shadow-sm md:text-base">
          <div className="mr-3 rounded-full bg-[#DCFCE7] p-2">
            <Check size={16} className="text-[#15803D]" aria-hidden />
          </div>
          <span>
            {HOME_HERO_LABELS.freeBannerIntro}{" "}
            <span className="underline">
              {HOME_HERO_LABELS.freeBannerEmphasis}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
