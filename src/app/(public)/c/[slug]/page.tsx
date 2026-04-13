import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { ShareSheet } from "@/components/share/ShareSheet";
import { SUBTYPE_LABELS, ACTIONS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { ProgressPoll } from "./ProgressPoll";

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://cagnottes.sn";

// CRITICAL — OQ-3 / Pitfall P05 mitigation. Never pre-render at build time.
export const dynamic = "force-dynamic";

interface CagnotteDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  subtype: "festive" | "solidaire" | null;
  visibility: "public" | "private";
  goalAmount: number | null;
  endDate: string | null;
  hideAmount: boolean;
  hideDonors: boolean;
  totalRaised: number | null;
  donorCount: number | null;
  recentDonations: Array<{
    id: string;
    amount: number | null;
    customerName: string | null;
    donorMessage: string | null;
    createdAt: string;
  }>;
  seller: {
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  createdAt: string;
}

interface ParticipantsResponse {
  participants: Array<{
    id: string;
    amount: number | null;
    customerName: string | null;
    donorMessage: string | null;
    createdAt: string;
  }>;
  nextCursor: string | null;
}

async function getCagnotte(slug: string): Promise<CagnotteDetail | null> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/cagnottes/${slug}`, {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as CagnotteDetail;
  } catch {
    return null;
  }
}

async function getParticipants(slug: string): Promise<ParticipantsResponse> {
  try {
    const res = await fetch(
      `${BACKEND_API_URL}/api/cagnottes/${slug}/participants?limit=10`,
      { cache: "no-store" },
    );
    if (!res.ok) return { participants: [], nextCursor: null };
    return (await res.json()) as ParticipantsResponse;
  } catch {
    return { participants: [], nextCursor: null };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cagnotte = await getCagnotte(slug);
  if (!cagnotte) {
    return {
      title: "Cagnotte introuvable",
      // CRITICAL — OQ-4: ALL /c/ variants noindex in v1.
      robots: { index: false, follow: false },
    };
  }

  const description = (cagnotte.description ?? "Soutiens cette cagnotte sur Cagnottes.sn").slice(0, 200);
  const ogImages = cagnotte.coverUrl
    ? [{ url: cagnotte.coverUrl, width: 1200, height: 630 }]
    : [];

  return {
    title: cagnotte.title,
    description: description.slice(0, 155),
    openGraph: {
      title: cagnotte.title,
      description,
      images: ogImages,
      url: `${PUBLIC_BASE_URL}/c/${slug}`,
      type: "website",
      siteName: "Cagnottes.sn",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: cagnotte.title,
      description,
      images: cagnotte.coverUrl ? [cagnotte.coverUrl] : [],
    },
    // CRITICAL — OQ-4 lock: ALL /c/[slug] are noindex in v1, public OR private.
    robots: { index: false, follow: false },
  };
}

function formatEndDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default async function CagnottePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [cagnotte, participantsData] = await Promise.all([
    getCagnotte(slug),
    getParticipants(slug),
  ]);

  if (!cagnotte) notFound();

  const isPrivate = cagnotte.visibility === "private";
  const subtype = (cagnotte.subtype ?? "festive") as "festive" | "solidaire";
  const goalAmount = cagnotte.goalAmount ?? 0;
  const totalRaised = cagnotte.totalRaised ?? 0;
  const donorCount = cagnotte.donorCount ?? 0;
  const endDateLabel = formatEndDate(cagnotte.endDate);
  const sellerName = cagnotte.seller?.displayName ?? "Anonyme";

  return (
    <article className="container mx-auto px-4 py-6 md:py-10">
      {isPrivate && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Cagnotte privée — accessible uniquement via le lien direct.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {cagnotte.coverUrl ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
              <Image
                src={cagnotte.coverUrl}
                alt={cagnotte.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-pink">
              <span
                className="font-headings text-5xl font-bold text-primary/40"
                aria-hidden
              >
                {cagnotte.title.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          <header className="space-y-3">
            <Badge variant={subtype}>{SUBTYPE_LABELS[subtype]}</Badge>
            <h1 className="font-headings text-3xl font-bold text-primary md:text-4xl">
              {cagnotte.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              par <span className="font-medium text-primary">{sellerName}</span>
              {endDateLabel ? ` · Fin le ${endDateLabel}` : null}
            </p>
          </header>

          {cagnotte.description && (
            <div className="prose prose-sm max-w-none whitespace-pre-line text-base text-primary/90">
              {cagnotte.description}
            </div>
          )}

          {!cagnotte.hideDonors && participantsData.participants.length > 0 && (
            <section aria-labelledby="participants-heading">
              <h2
                id="participants-heading"
                className="mb-3 font-headings text-xl font-semibold text-primary"
              >
                Derniers participants
              </h2>
              <ul className="divide-y divide-border rounded-xl border border-border bg-background">
                {participantsData.participants.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary">
                        {p.customerName ?? "Anonyme"}
                      </p>
                      {p.donorMessage && (
                        <p className="truncate text-xs text-muted-foreground">
                          {p.donorMessage}
                        </p>
                      )}
                    </div>
                    {!cagnotte.hideAmount && typeof p.amount === "number" && (
                      <span className="flex-shrink-0 font-semibold text-primary">
                        {formatPrice(p.amount)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="share-heading" className="pt-2">
            <h2
              id="share-heading"
              className="mb-3 font-headings text-lg font-semibold text-primary"
            >
              {ACTIONS.partager}
            </h2>
            <ShareSheet
              url={`${PUBLIC_BASE_URL}/c/${slug}`}
              title={cagnotte.title}
              description={cagnotte.description ?? undefined}
            />
          </section>
        </div>

        {/* Sticky sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-4 space-y-5 rounded-xl border border-border bg-background p-6">
            <ProgressPoll
              slug={slug}
              initialTotalRaised={totalRaised}
              initialDonorCount={donorCount}
              goalAmount={goalAmount}
              hideAmount={cagnotte.hideAmount}
              hideDonors={cagnotte.hideDonors}
            />
            <Link href={`/c/${slug}/participer`} className="block">
              <Button variant="primary" size="lg" fullWidth>
                {ACTIONS.participer}
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
