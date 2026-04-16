import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_FEATURED_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { computeProgress } from "@/lib/progress";

// ─────────────────────────────────────────────────────────────────────────
// Banani home page "Les cagnottes du moment".
// Server component. Fetches up to 6 featured cagnottes ranked by
// popularity on every request (cache: "no-store" — see audit-020). The
// backend global limiter skips public GET /api/cagnottes so this SSR
// call doesn't burn the 300/15min budget from the Next.js server IP.
// ─────────────────────────────────────────────────────────────────────────

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiCagnotte {
  id: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;
  subtype: "festive" | "solidaire" | null;
  goalAmount: number | null;
  totalRaised: number | null;
  donorCount: number | null;
}

interface ListResponse {
  cagnottes: ApiCagnotte[];
}

async function getFeatured(): Promise<ApiCagnotte[]> {
  try {
    // Rank by `popular` (participations, then total raised, then recent).
    // `cache: "no-store"` makes each SSR request hit the backend fresh —
    // matches the detail page's 20s polling cadence so a new donation is
    // visible on the LP within one page load. Backend global limiter
    // skips GET /api/cagnottes (audit-020 HIGH-1 fix).
    const res = await fetch(
      `${BACKEND_API_URL}/api/cagnottes?sort=popular&limit=6`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      console.error(
        `[home/getFeatured] ${res.status} ${res.statusText}`,
      );
      return [];
    }
    const data = (await res.json()) as ListResponse;
    return (data.cagnottes ?? []).filter(
      (c): c is ApiCagnotte => Boolean(c.slug),
    );
  } catch (err) {
    console.error("[home/getFeatured] fetch threw:", err);
    return [];
  }
}

function categoryEmoji(subtype: string | null): string {
  return subtype === "solidaire" ? "❤️" : "🎉";
}

function categoryLabel(subtype: string | null): string {
  return subtype === "solidaire" ? "Solidaire" : "Festive";
}

export async function HomePublicCampaignsList() {
  const cagnottes = await getFeatured();

  return (
    <section className="mx-4 my-4 max-w-[1400px] px-0 py-10 sm:px-2 sm:py-14 md:mx-12 md:px-8 md:py-16 xl:mx-auto">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 px-2 sm:mb-10 sm:px-0 md:flex-row md:items-end md:gap-4">
        <div>
          <h2 className="mb-2 font-headings text-[26px] font-black leading-[1.1] text-primary sm:mb-3 sm:text-3xl md:text-4xl">
            {HOME_FEATURED_LABELS.h2}
          </h2>
          <p className="text-[15px] font-medium text-gray-600 sm:text-base md:text-lg">
            {HOME_FEATURED_LABELS.subtitle}
          </p>
        </div>
        <Link
          href="/cagnottes"
          className="hidden min-h-12 items-center gap-2 font-bold text-primary hover:underline md:inline-flex"
        >
          {HOME_FEATURED_LABELS.viewAll}
          <ArrowRight size={20} aria-hidden />
        </Link>
      </div>

      {cagnottes.length === 0 ? (
        <div className="rounded-3xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
          {HOME_FEATURED_LABELS.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {cagnottes.map((c) => {
            const slug = c.slug as string;
            const raised = c.totalRaised ?? 0;
            const goal = c.goalAmount ?? 0;
            const { percent, barWidth } = computeProgress(raised, goal);
            const raisedLabel =
              c.totalRaised === null ? "Montant masqué" : formatPrice(raised);
            return (
              <Link
                key={c.id}
                href={`/c/${slug}`}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_6px_24px_rgb(0,0,0,0.04)] transition-all duration-300 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_20px_50px_rgb(23,40,102,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:rounded-3xl"
              >
                <div className="relative h-40 overflow-hidden sm:h-44 lg:h-48">
                  {c.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.coverUrl}
                      alt={c.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-pink text-4xl font-black text-primary/30">
                      {c.title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-xs">
                    <span className="text-sm drop-shadow-sm" aria-hidden>
                      {categoryEmoji(c.subtype)}
                    </span>{" "}
                    {categoryLabel(c.subtype)}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
                  <h3 className="mb-5 line-clamp-2 font-headings text-[17px] font-black leading-tight text-primary sm:mb-6 sm:text-lg lg:mb-8 lg:text-xl">
                    {c.title}
                  </h3>
                  <div className="mt-auto">
                    <div className="mb-1.5 flex flex-col gap-0.5 sm:mb-2">
                      <span className="break-words text-[17px] font-bold tabular-nums leading-tight text-primary sm:text-lg">
                        {raisedLabel}
                      </span>
                      {goal > 0 ? (
                        <span className="text-xs font-medium text-gray-500 sm:text-sm">
                          {HOME_FEATURED_LABELS.onLabel} {formatPrice(goal)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    {goal > 0 ? (
                      <p className="mb-4 text-xs font-bold tabular-nums text-primary sm:mb-5 lg:mb-6">
                        {percent}% de l&apos;objectif
                      </p>
                    ) : (
                      <div className="mb-4 sm:mb-5 lg:mb-6" />
                    )}
                    <span className="block w-full rounded-xl bg-[#F4D3DE] py-3 text-center text-sm font-bold text-primary shadow-sm transition-colors group-hover:bg-[#efc7d5] sm:py-3.5 sm:text-base">
                      {HOME_FEATURED_LABELS.participate}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/cagnottes"
        className="mx-2 mt-6 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gray-50 py-4 font-bold text-primary hover:bg-gray-100 sm:mx-0 md:hidden"
      >
        {HOME_FEATURED_LABELS.viewAll}
        <ArrowRight size={20} aria-hidden />
      </Link>
    </section>
  );
}
