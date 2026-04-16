import Link from "next/link";
import { cookies } from "next/headers";
import { HOME_HERO_LABELS } from "@/lib/constants";
import { RotatingHeadline } from "./_RotatingHeadline";

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
      <div
        className="mx-auto mb-6 inline-flex animate-[fade-in-up_0.6s_ease-out_both] items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600"
        style={{ animationDelay: "0ms" }}
      >
        {HOME_HERO_LABELS.trustPre}
      </div>

      <h1
        className="mx-auto mb-6 max-w-4xl animate-[fade-in-up_0.7s_ease-out_both] font-headings text-4xl font-black leading-tight tracking-tight text-primary sm:text-5xl md:text-6xl lg:text-7xl"
        style={{ animationDelay: "80ms" }}
      >
        {HOME_HERO_LABELS.h1Part1}
        <br />
        <RotatingHeadline />
      </h1>

      <p
        className="mx-auto mb-10 max-w-2xl animate-[fade-in-up_0.7s_ease-out_both] text-base font-medium text-gray-600 sm:text-lg md:text-xl lg:text-2xl"
        style={{ animationDelay: "180ms" }}
      >
        {HOME_HERO_LABELS.subtitle}
      </p>

      <Link
        href={ctaHref}
        className="inline-flex min-h-14 animate-[fade-in-up_0.7s_ease-out_both] items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-blue-900/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
        style={{ animationDelay: "280ms" }}
      >
        {HOME_HERO_LABELS.ctaCreate}
      </Link>
    </section>
  );
}
