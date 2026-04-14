import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_FEATURED_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────
// Phase 9 fixpack — Banani home page "Les cagnottes du moment".
// Server component. Fetches 3 featured cagnottes from the backend with a
// 60s ISR cache. Renders a custom 3-card grid (NOT the CampaignCard
// primitive — this layout is route-specific per Banani).
// Source: .planning/banani/screens/phase-9/home-source.md (PublicCampaignsList.jsx)
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
    // Phase 10 — rank by `popular` so the home hero surfaces the cagnottes
    // with the most participations (ties broken by total raised, then most
    // recent). The backend re-sorts a 60-row pool in JS so we avoid a raw
    // SQL join on the prototype.
    const res = await fetch(
      `${BACKEND_API_URL}/api/cagnottes?sort=popular&limit=3`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as ListResponse;
    return (data.cagnottes ?? []).filter((c): c is ApiCagnotte => Boolean(c.slug));
  } catch {
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
    <section className="mx-4 my-4 max-w-[1400px] px-2 py-10 sm:py-14 md:mx-12 md:px-8 md:py-16 xl:mx-auto">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:mb-10 md:flex-row md:items-end">
        <div>
          <h2 className="mb-3 font-headings text-2xl font-black leading-tight text-primary sm:mb-4 sm:text-3xl md:text-4xl">
            {HOME_FEATURED_LABELS.h2}
          </h2>
          <p className="text-base font-medium text-gray-600 sm:text-lg">
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
        <div className="grid gap-8 md:grid-cols-3">
          {cagnottes.map((c) => {
            const slug = c.slug as string;
            const raised = c.totalRaised ?? 0;
            const goal = c.goalAmount ?? 0;
            const percent =
              goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
            const raisedLabel =
              c.totalRaised === null ? "Montant masqué" : formatPrice(raised);
            return (
              <Link
                key={c.id}
                href={`/c/${slug}`}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_20px_50px_rgb(23,40,102,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="relative h-48 overflow-hidden">
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
                  <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-primary shadow-sm backdrop-blur">
                    <span className="text-sm drop-shadow-sm" aria-hidden>
                      {categoryEmoji(c.subtype)}
                    </span>{" "}
                    {categoryLabel(c.subtype)}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="mb-8 line-clamp-2 font-headings text-xl font-black leading-tight text-primary">
                    {c.title}
                  </h3>
                  <div className="mt-auto">
                    <div className="mb-2 flex items-end justify-between">
                      <span className="text-lg font-bold text-primary">
                        {raisedLabel}
                      </span>
                      {goal > 0 ? (
                        <span className="text-sm font-medium text-gray-500">
                          {HOME_FEATURED_LABELS.onLabel} {formatPrice(goal)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="block w-full rounded-xl bg-[#F4D3DE] py-3.5 text-center font-bold text-primary shadow-sm transition-colors hover:bg-[#efc7d5]">
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
        className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gray-50 py-4 font-bold text-primary hover:bg-gray-100 md:hidden"
      >
        {HOME_FEATURED_LABELS.viewAll}
        <ArrowRight size={20} aria-hidden />
      </Link>
    </section>
  );
}
