import Link from "next/link";
import { cookies } from "next/headers";
import { HOME_HERO_LABELS } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// Banani home page Hero section.
// Server component. Reads izy-token cookie to decide the CTA destination:
// logged-in users go straight to /tableau-de-bord/nouvelle, others to
// /inscription. No API call — presence of the cookie is sufficient for a
// CTA hint; the real auth check happens at the destination route.
// ─────────────────────────────────────────────────────────────────────────

export async function HomeHero() {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get("izy-token")?.value);
  const ctaHref = hasSession ? "/tableau-de-bord/nouvelle" : "/inscription";

  return (
    <section className="bg-white px-4 py-12 text-center sm:py-16 md:py-20">
      <div className="mx-auto mb-6 inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
        {HOME_HERO_LABELS.trustPre}
      </div>

      <h1 className="mx-auto mb-6 max-w-4xl font-headings text-4xl font-black leading-tight tracking-tight text-primary sm:text-5xl md:text-6xl lg:text-7xl">
        {HOME_HERO_LABELS.h1Part1}
        <br />
        <span className="text-gradient">{HOME_HERO_LABELS.h1Part2}</span>
      </h1>

      <p className="mx-auto mb-10 max-w-2xl text-base font-medium text-gray-600 sm:text-lg md:text-xl lg:text-2xl">
        {HOME_HERO_LABELS.subtitle}
      </p>

      <Link
        href={ctaHref}
        className="inline-flex min-h-14 items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-blue-900/20 transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {HOME_HERO_LABELS.ctaCreate}
      </Link>
    </section>
  );
}
