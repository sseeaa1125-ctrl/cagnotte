import { Heart, Shield, Smartphone } from "lucide-react";
import { CampaignCard } from "@/components/cagnottes/CampaignCard";
import { TrustpilotBadge } from "@/components/trust/TrustpilotBadge";
import { Button } from "@/components/ui";
import { HOME_COPY } from "@/lib/constants";

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiCagnotte {
  id: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;
  subtype: "festive" | "solidaire" | null;
  goalAmount: number | null;
  endDate: string | null;
  totalRaised: number | null;
  donorCount: number | null;
  seller: { slug: string; displayName: string; avatarUrl: string | null } | null;
  createdAt: string;
}

interface ListResponse {
  cagnottes: ApiCagnotte[];
  nextCursor: string | null;
}

// Ring 3 owns data fetching. Server-side fetch to the backend directly —
// Next's /api/* rewrite targets the client side, so we call BACKEND_URL.
async function getFeatured(): Promise<ApiCagnotte[]> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/cagnottes?limit=6`, {
      // Short ISR — the /c/[slug] pages are force-dynamic, but the featured
      // grid can tolerate 60s staleness for the viral share loop.
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ListResponse;
    return (data.cagnottes ?? []).filter((c): c is ApiCagnotte => Boolean(c.slug));
  } catch {
    return [];
  }
}

function toCampaignCardProps(c: ApiCagnotte) {
  return {
    slug: c.slug ?? "",
    title: c.title,
    coverUrl: c.coverUrl,
    subtype: (c.subtype ?? "festive") as "festive" | "solidaire",
    raised: c.totalRaised ?? 0,
    goal: c.goalAmount ?? 0,
    donorCount: c.donorCount ?? 0,
    endDate: c.endDate,
  };
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-primary-hover px-6 py-16 text-white md:py-24">
      <div className="container mx-auto max-w-5xl">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-5">
            <h1 className="font-headings text-4xl font-bold leading-tight md:text-5xl">
              {HOME_COPY.heroTitle}
            </h1>
            <p className="text-lg text-white/85 md:text-xl">
              {HOME_COPY.heroSubtitle}
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                as="a"
                href="/inscription"
                variant="primary"
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
              >
                {HOME_COPY.heroCtaCreate}
              </Button>
              <Button
                as="a"
                href="/cagnottes"
                variant="ghost"
                size="lg"
                className="border border-white/40 text-white hover:bg-white/10"
              >
                {HOME_COPY.heroCtaDiscover}
              </Button>
            </div>
          </div>
          <div className="hidden md:block" aria-hidden>
            <div className="aspect-square rounded-3xl bg-white/10 p-6 backdrop-blur-sm">
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-white/5 p-8 text-center">
                <Heart size={64} className="text-pink" />
                <p className="font-headings text-xl font-semibold text-white">
                  Ensemble, on va plus loin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedSection({ cagnottes }: { cagnottes: ApiCagnotte[] }) {
  return (
    <section className="container mx-auto px-4 py-16 md:py-20">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h2 className="font-headings text-3xl font-bold text-primary md:text-4xl">
          {HOME_COPY.featuredTitle}
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          {HOME_COPY.featuredSubtitle}
        </p>
      </div>
      {cagnottes.length === 0 ? (
        <div className="mx-auto max-w-md rounded-xl border border-border bg-background p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {HOME_COPY.featuredEmpty}
          </p>
          <div className="mt-4">
            <Button as="a" href="/inscription" variant="primary" size="lg">
              {HOME_COPY.featuredEmptyCta}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cagnottes.map((c) => (
              <CampaignCard
                key={c.id}
                cagnotte={toCampaignCardProps(c)}
              />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Button as="a" href="/cagnottes" variant="outline" size="lg">
              {HOME_COPY.featuredViewAllCta}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function FeaturesSection() {
  const icons = [
    <Shield key="shield" size={28} />,
    <Smartphone key="smartphone" size={28} />,
    <Heart key="heart" size={28} />,
  ];
  return (
    <section className="bg-muted/30 px-4 py-16 md:py-20">
      <div className="container mx-auto max-w-5xl">
        <h2 className="mb-10 text-center font-headings text-3xl font-bold text-primary md:text-4xl">
          {HOME_COPY.featuresTitle}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {HOME_COPY.featuresList.map((f, i) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 rounded-xl border border-border bg-background p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink text-primary">
                {icons[i] ?? icons[0]}
              </div>
              <h3 className="font-headings text-lg font-semibold text-primary">
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="container mx-auto px-4 py-12 text-center">
      <p className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {HOME_COPY.trustTitle}
      </p>
      <div className="flex justify-center">
        <TrustpilotBadge rating={4.8} reviewCount={127} />
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-8 text-center font-headings text-3xl font-bold text-primary md:text-4xl">
          {HOME_COPY.faqTitle}
        </h2>
        <div className="space-y-3">
          {HOME_COPY.faqItems.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border bg-background p-5 open:bg-muted/20"
            >
              <summary className="cursor-pointer list-none font-headings text-base font-semibold text-primary">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-xl transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const cagnottes = await getFeatured();
  return (
    <>
      <HeroSection />
      <FeaturedSection cagnottes={cagnottes} />
      <FeaturesSection />
      <TrustSection />
      <FaqSection />
    </>
  );
}

// Enable short ISR at the page level so fresh deployments show fresh data.
export const revalidate = 60;

export const metadata = {
  title: "Crée ta cagnotte, partage, collecte",
  description:
    "cagnotte.sn est la plateforme sénégalaise pour lever des fonds via Wave, Orange Money et Free Money. Crée ta cagnotte en 2 minutes.",
};
