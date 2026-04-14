import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Flag, Share2, Sparkles, Youtube } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { ShareSheet } from "@/components/share/ShareSheet";
import { SUBTYPE_LABELS, ACTIONS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { youtubeEmbed } from "@/lib/youtube";
import { ProgressPoll } from "./ProgressPoll";

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://cagnotte.sn";

// CRITICAL — OQ-3 / Pitfall P05 mitigation. Never pre-render at build time.
export const dynamic = "force-dynamic";

interface GalleryItem {
  kind: "image" | "youtube";
  url: string;
  videoId?: string;
}

interface CagnotteDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  subtype: "festive" | "solidaire" | null;
  visibility: "public" | "private";
  status: "active" | "closed";
  gallery: GalleryItem[];
  goalAmount: number | null;
  endDate: string | null;
  hideAmount: boolean;
  hideDonors: boolean;
  totalRaised: number | null;
  donorCount: number | null;
  recentDonations: Array<{
    id: string;
    amount: number | null;
    name: string | null;
    message: string | null;
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

interface ParticipantItem {
  id: string;
  amount: number | null;
  name: string | null;
  message: string | null;
  createdAt: string;
}

interface ParticipantsResponse {
  participants: ParticipantItem[];
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
      `${BACKEND_API_URL}/api/cagnottes/${slug}/participants?limit=50`,
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
      robots: { index: false, follow: false },
    };
  }

  const description = (
    cagnotte.description ?? "Soutiens cette cagnotte sur cagnotte.sn"
  ).slice(0, 200);
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
      siteName: "cagnotte.sn",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: cagnotte.title,
      description,
      images: cagnotte.coverUrl ? [cagnotte.coverUrl] : [],
    },
    robots: { index: false, follow: false },
  };
}

function formatRelative(iso: string): string {
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days}j`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `il y a ${weeks}sem`;
    const months = Math.floor(days / 30);
    return `il y a ${months}mois`;
  } catch {
    return "";
  }
}

function initial(name: string | null | undefined): string {
  if (!name) return "?";
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() || "?";
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
  const isClosed = cagnotte.status === "closed";
  const subtype = (cagnotte.subtype ?? "festive") as "festive" | "solidaire";
  const goalAmount = cagnotte.goalAmount ?? 0;
  const totalRaised = cagnotte.totalRaised ?? 0;
  const donorCount = cagnotte.donorCount ?? 0;
  const sellerName = cagnotte.seller?.displayName ?? "Anonyme";

  const participants = participantsData.participants;
  const messagesCount = participants.filter((p) => p.message).length;
  const average = donorCount > 0 ? Math.floor(totalRaised / donorCount) : 0;
  const latest = participants[0] ?? null;

  const messageWall = participants.filter((p) => p.message).slice(0, 6);
  const donorWall = participants.slice(0, 8);

  return (
    <article className="container mx-auto px-4 py-6 md:py-10">
      {/* Latest participation pill */}
      {latest && !cagnotte.hideDonors ? (
        <p className="mb-4 flex items-center justify-center gap-2 text-center text-xs font-medium text-gray-500 md:text-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
          Dernière participation · {formatRelative(latest.createdAt)} ·{" "}
          <span className="font-semibold text-primary">
            {latest.name ?? "Anonyme"}
          </span>{" "}
          a participé
        </p>
      ) : null}

      {isPrivate ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Cagnotte privée — accessible uniquement via le lien direct.
        </div>
      ) : null}

      {/* ─── Hero: title / amount / CTAs + cover ──────────────────────── */}
      <header className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="flex flex-col gap-5">
          <Badge variant={subtype}>
            <Sparkles size={14} aria-hidden className="text-primary/70" />
            {SUBTYPE_LABELS[subtype]}
          </Badge>

          <h1 className="font-headings text-3xl font-black leading-tight text-primary sm:text-4xl md:text-5xl">
            {cagnotte.title}
          </h1>

          <p className="text-sm text-gray-600">
            Créée par{" "}
            <span className="font-semibold text-primary">{sellerName}</span>
          </p>

          {!cagnotte.hideAmount ? (
            <div>
              <p className="font-headings text-4xl font-black text-primary sm:text-5xl md:text-6xl">
                {formatPrice(totalRaised)}
              </p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Collectés
                {goalAmount > 0 ? ` · Objectif ${formatPrice(goalAmount)}` : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm italic text-gray-500">Montant masqué par le créateur</p>
          )}

          <ProgressPoll
            slug={slug}
            initialTotalRaised={totalRaised}
            initialDonorCount={donorCount}
            goalAmount={goalAmount}
            hideAmount={cagnotte.hideAmount}
            hideDonors={cagnotte.hideDonors}
          />

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            {isClosed ? (
              <div
                role="status"
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 text-sm font-semibold text-gray-600"
              >
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full bg-gray-500"
                />
                Cagnotte clôturée
              </div>
            ) : (
              <Button
                as="a"
                href={`/c/${slug}/participer`}
                variant="primary"
                size="lg"
                fullWidth
                className="sm:max-w-[220px]"
              >
                {ACTIONS.participer}
              </Button>
            )}
            <Button
              as="a"
              href={`#partager`}
              variant="outline"
              size="lg"
              iconLeft={<Share2 size={18} />}
              fullWidth
              className="sm:max-w-[180px]"
            >
              {ACTIONS.partager}
            </Button>
          </div>
        </div>

        <div className="order-first md:order-last">
          {cagnotte.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cagnotte.coverUrl}
              alt={cagnotte.title}
              className="aspect-[4/3] w-full rounded-3xl bg-muted object-cover shadow-xl shadow-black/5"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl bg-pink">
              <span
                className="font-headings text-5xl font-bold text-primary/40"
                aria-hidden
              >
                {cagnotte.title.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ─── Stats bar ─────────────────────────────────────────────────── */}
      <section
        aria-label="Chiffres clés"
        className="mt-10 rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6"
      >
        <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          En quelques chiffres
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="font-headings text-2xl font-black text-primary md:text-3xl">
              {cagnotte.hideDonors ? "—" : donorCount}
            </p>
            <p className="text-xs font-medium text-gray-500 md:text-sm">
              participations
            </p>
          </div>
          <div>
            <p className="font-headings text-2xl font-black text-primary md:text-3xl">
              {cagnotte.hideDonors ? "—" : messagesCount}
            </p>
            <p className="text-xs font-medium text-gray-500 md:text-sm">
              messages
            </p>
          </div>
          <div>
            <p className="font-headings text-2xl font-black text-primary md:text-3xl">
              {cagnotte.hideAmount || donorCount === 0
                ? "—"
                : formatPrice(average)}
            </p>
            <p className="text-xs font-medium text-gray-500 md:text-sm">
              en moyenne
            </p>
          </div>
        </div>
      </section>

      {/* ─── Why section ──────────────────────────────────────────────── */}
      {cagnotte.description ? (
        <section className="mt-10" aria-labelledby="why-heading">
          <h2
            id="why-heading"
            className="mb-2 font-headings text-2xl font-black text-primary md:text-3xl"
          >
            Pourquoi cette cagnotte ?
          </h2>
          <p className="mb-4 text-sm font-semibold text-primary/80 md:text-base">
            ✨ Le parcours de {sellerName}
          </p>
          <details className="group">
            <summary className="list-none">
              <div className="whitespace-pre-line text-base leading-relaxed text-primary/90 group-open:line-clamp-none line-clamp-6">
                {cagnotte.description}
              </div>
              <span className="mt-2 inline-block text-sm font-bold text-primary underline underline-offset-2 group-open:hidden">
                Lire la suite →
              </span>
              <span className="mt-2 hidden text-sm font-bold text-primary underline underline-offset-2 group-open:inline-block">
                ← Réduire
              </span>
            </summary>
          </details>
          <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gray-500">
            <Flag size={12} aria-hidden />
            <a
              href="mailto:contact@cagnottes.sn?subject=Signaler%20une%20cagnotte"
              className="underline underline-offset-2 hover:text-primary"
            >
              Signaler la cagnotte
            </a>
          </p>
        </section>
      ) : null}

      {/* ─── Gallery ───────────────────────────────────────────────────── */}
      {cagnotte.gallery && cagnotte.gallery.length > 0 ? (
        <section className="mt-10" aria-labelledby="gallery-heading">
          <h2
            id="gallery-heading"
            className="mb-4 font-headings text-xl font-black text-primary md:text-2xl"
          >
            Galerie
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {cagnotte.gallery.map((item, idx) => (
              <li
                key={`${item.kind}-${item.url}-${idx}`}
                className="group overflow-hidden rounded-xl border border-border bg-muted transition-shadow duration-300 hover:shadow-lg"
              >
                {item.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    className="aspect-video w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : item.videoId ? (
                  <div className="relative aspect-video w-full">
                    <iframe
                      src={youtubeEmbed(item.videoId)}
                      title="Vidéo YouTube"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-black/80 text-white">
                    <Youtube size={28} aria-hidden />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ─── Two-column: messages + donors ─────────────────────────────── */}
      {!cagnotte.hideDonors && participants.length > 0 ? (
        <section className="mt-10 grid gap-6 lg:grid-cols-5">
          {/* Messages de soutien */}
          <div className="rounded-3xl border border-border bg-white p-5 shadow-sm md:p-6 lg:col-span-3">
            <h2 className="mb-4 flex items-center gap-2 font-headings text-lg font-black text-primary">
              💬 Les messages de soutien
            </h2>
            {messageWall.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Aucun message pour l&apos;instant. Sois le·la premier·ère à
                encourager !
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {messageWall.map((p) => (
                  <li
                    key={p.id}
                    className="border-b border-border/60 pb-4 last:border-0 last:pb-0"
                  >
                    <p className="mb-1 text-sm font-bold text-primary">
                      {p.name ?? "Anonyme"}{" "}
                      <span className="font-medium text-gray-500">
                        · {formatRelative(p.createdAt)}
                      </span>
                    </p>
                    <p className="text-sm leading-relaxed text-primary/80">
                      {p.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ils ont participé */}
          <div className="rounded-3xl border border-border bg-white p-5 shadow-sm md:p-6 lg:col-span-2">
            <h2 className="mb-4 font-headings text-lg font-black text-primary">
              Ils ont participé
            </h2>
            <ul className="flex flex-col gap-3">
              {donorWall.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <div
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-headings text-sm font-black text-primary"
                  >
                    {initial(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-primary">
                      {p.name ?? "Anonyme"}
                    </p>
                    <p className="text-xs text-gray-500">
                      a fait un don · {formatRelative(p.createdAt)}
                    </p>
                  </div>
                  {!cagnotte.hideAmount && typeof p.amount === "number" ? (
                    <span className="shrink-0 text-sm font-bold text-primary">
                      {formatPrice(p.amount)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {donorCount > donorWall.length ? (
              <button
                type="button"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-primary bg-white px-4 py-3 text-sm font-bold text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-pink/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Afficher tout ({donorCount})
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ─── Share card ───────────────────────────────────────────────── */}
      <section
        id="partager"
        className="mt-10 rounded-3xl bg-pink p-6 text-center md:p-10"
        aria-labelledby="share-heading"
      >
        <h2
          id="share-heading"
          className="mb-3 font-headings text-2xl font-black text-primary md:text-3xl"
        >
          Partager, c&apos;est aussi soutenir
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-sm text-primary/80 md:text-base">
          Chaque partage est une chance en plus d&apos;atteindre l&apos;objectif.
          Partage la cagnotte autour de toi — sur WhatsApp, Instagram,
          LinkedIn.
        </p>
        <div className="mx-auto max-w-md">
          <ShareSheet
            url={`${PUBLIC_BASE_URL}/c/${slug}`}
            title={cagnotte.title}
            description={cagnotte.description ?? undefined}
          />
        </div>
      </section>
    </article>
  );
}
