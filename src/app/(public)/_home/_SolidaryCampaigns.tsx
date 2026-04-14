import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_SOLIDAIRE_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────
// Phase 9 fixpack — Banani home "Les cagnottes solidaires".
// Server component. Fetches up to 8 and filters to subtype=solidaire
// client-side (backend list doesn't support a subtype filter in v1).
// Source: .planning/banani/screens/phase-9/home-source.md (SolidaryCampaigns.jsx)
// ─────────────────────────────────────────────────────────────────────────

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiCagnotte {
  id: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;
  subtype: "festive" | "solidaire" | null;
  totalRaised: number | null;
}

interface ListResponse {
  cagnottes: ApiCagnotte[];
}

async function getSolidaires(): Promise<ApiCagnotte[]> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/cagnottes?limit=20`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ListResponse;
    return (data.cagnottes ?? [])
      .filter((c) => c.subtype === "solidaire" && c.slug)
      .slice(0, 4);
  } catch {
    return [];
  }
}

export async function HomeSolidaryCampaigns() {
  const cagnottes = await getSolidaires();

  return (
    <section className="mx-4 my-8 rounded-[2rem] bg-[#E6F3EE] px-4 py-14 text-center sm:my-10 sm:rounded-[2.5rem] sm:py-16 md:mx-12 md:my-12 md:rounded-[3rem] md:px-8 md:py-24">
      <h2 className="mb-4 font-headings text-2xl font-black leading-tight text-primary sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl">
        {HOME_SOLIDAIRE_LABELS.h2}
      </h2>
      <p className="mx-auto mb-10 max-w-2xl text-base font-medium leading-relaxed text-gray-700 sm:mb-12 sm:text-lg md:mb-16">
        {HOME_SOLIDAIRE_LABELS.subtitle}
      </p>

      {cagnottes.length === 0 ? (
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-sm text-muted-foreground">
          {HOME_SOLIDAIRE_LABELS.empty}
        </div>
      ) : (
        <div className="mx-auto grid max-w-7xl gap-6 text-left md:grid-cols-4">
          {cagnottes.map((c) => {
            const slug = c.slug as string;
            const raisedLabel =
              c.totalRaised === null
                ? "Montant masqué"
                : formatPrice(c.totalRaised ?? 0);
            return (
              <Link
                key={c.id}
                href={`/c/${slug}`}
                className="flex flex-col overflow-hidden rounded-3xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="mb-4 h-32 w-full overflow-hidden rounded-2xl bg-muted">
                  {c.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.coverUrl}
                      alt={c.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-pink text-2xl font-black text-primary/30">
                      {c.title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col px-2">
                  <h3 className="mb-2 font-bold leading-tight text-primary">
                    {c.title}
                  </h3>
                  <p className="mb-6 flex-1 text-sm text-gray-500">
                    {raisedLabel} {HOME_SOLIDAIRE_LABELS.collectedSuffix}
                  </p>
                  <div className="mt-auto">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400">
                      <ArrowRight size={16} aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
