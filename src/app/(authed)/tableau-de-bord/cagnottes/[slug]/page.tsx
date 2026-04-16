import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowLeft,
  Share2,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { Badge, Button, ProgressBar } from "@/components/ui";
import { CREATOR_DETAIL_LABELS, MISC } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { computeProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { CopyLinkBox } from "./_components/CopyLinkBox";
import { DangerZoneCard } from "./_components/DangerZoneCard";
import { HeroActions } from "./_components/HeroActions";
import { MobileActionBar } from "./_components/MobileActionBar";

// ─────────────────────────────────────────────────────────────────────────
// Phase 7 plan 07-01 — /tableau-de-bord/cagnottes/[slug] (creator detail).
//
// Server component with a server-side OWNER GATE: if the authed seller
// does not own the block, we return notFound() (404). We never return
// 403 so non-owners can't confirm the slug exists.
//
// Data fetches (parallelized):
//   1. GET /api/auth/me                                  → seller.id
//   2. GET /api/cagnottes/:slug                          → block + totals
//   3. GET /api/cagnottes/:slug/participants?limit=5     → recent list
//   4. GET /api/withdrawals/balance                      → netWithdrawable
// ─────────────────────────────────────────────────────────────────────────

interface MePayload {
  seller?: { id: string };
}

interface DonorRow {
  id: string;
  amount: number | null;
  donorMessage: string | null;
  isAnonymous: boolean;
  messageIsPrivate: boolean;
  customerName: string | null;
  createdAt: string;
}

interface CagnottePayload {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  subtype: "festive" | "solidaire" | null;
  visibility: "public" | "private";
  status: "active" | "closed";
  goalAmount: number | null;
  endDate: string | null;
  hideAmount: boolean;
  hideDonors: boolean;
  totalRaised: number | null;
  donorCount: number | null;
  recentDonations: DonorRow[];
  seller: { id: string; slug: string; displayName: string };
  createdAt: string;
}

interface ParticipantItem {
  id: string;
  name: string;
  amount: number | null;
  message: string | null;
  createdAt: string;
}

interface ParticipantsPayload {
  participants: ParticipantItem[];
  nextCursor: string | null;
}

interface BalancePayload {
  balance: number;
  kycStatus: string;
}

async function fetchJson<T>(
  url: string,
  token: string | undefined,
): Promise<T | null> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers.cookie = `izy-token=${token}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

function formatDateFr(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === CREATOR_DETAIL_LABELS.anonymousDonor) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export default async function CreatorCagnotteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) {
    redirect(`/connexion?next=/tableau-de-bord/cagnottes/${slug}`);
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [me, cagnotte] = await Promise.all([
    fetchJson<MePayload>(`${backendUrl}/api/auth/me`, token),
    fetchJson<CagnottePayload>(
      `${backendUrl}/api/cagnottes/${encodeURIComponent(slug)}`,
      token,
    ),
  ]);

  if (!me?.seller) {
    redirect(`/connexion?next=/tableau-de-bord/cagnottes/${slug}`);
  }
  if (!cagnotte) notFound();

  if (cagnotte.seller.id !== me.seller.id) {
    notFound();
  }

  const [participantsPayload, balance] = await Promise.all([
    fetchJson<ParticipantsPayload>(
      `${backendUrl}/api/cagnottes/${encodeURIComponent(slug)}/participants?limit=5`,
      token,
    ),
    fetchJson<BalancePayload>(`${backendUrl}/api/withdrawals/balance`, token),
  ]);

  const participants = participantsPayload?.participants ?? [];
  const availableFunds = balance?.balance ?? 0;
  const kycApproved = balance?.kycStatus === "APPROVED";

  const totalRaised = cagnotte.totalRaised ?? 0;
  const donorCount = cagnotte.donorCount ?? 0;
  const goalAmount = cagnotte.goalAmount ?? 0;
  const { percent, barWidth } = computeProgress(totalRaised, goalAmount);

  const isFestive = cagnotte.subtype === "festive";
  const subtypeLabel = isFestive
    ? CREATOR_DETAIL_LABELS.subtypeFestive
    : CREATOR_DETAIL_LABELS.subtypeSolidaire;
  const createdAtLabel = formatDateFr(cagnotte.createdAt);
  const subtitle = `${subtypeLabel} • Créée le ${createdAtLabel}`;

  const publicBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://cagnotte.sn";
  const shareUrl = `${publicBaseUrl}/c/${cagnotte.slug}`;

  const visibilityLabel =
    cagnotte.visibility === "public"
      ? CREATOR_DETAIL_LABELS.visibilityPublic
      : CREATOR_DETAIL_LABELS.visibilityPrivate;

  const isClosed = cagnotte.status === "closed";
  const accentHex = isFestive ? "#C7922D" : "#172866";

  return (
    <>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 pb-4 md:gap-6 md:pb-6">
        {/* Back link ────────────────────────────────────────────────── */}
        <Link
          href="/tableau-de-bord"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft size={15} aria-hidden />
          {CREATOR_DETAIL_LABELS.backToDashboard}
        </Link>

        {/* Hero banner ──────────────────────────────────────────────── */}
        <header className="relative overflow-hidden rounded-[28px] border border-border/60 bg-primary shadow-[0_1px_0_0_rgba(23,40,102,0.04),0_20px_60px_-24px_rgba(23,40,102,0.25)]">
          {/* Cover image */}
          <div className="relative h-44 w-full sm:h-56 md:h-64 lg:h-72">
            {cagnotte.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cagnotte.coverUrl}
                alt={cagnotte.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary via-primary to-[#0E1A40]">
                <span
                  aria-hidden
                  className="font-headings text-6xl font-black text-white/10 sm:text-8xl"
                >
                  {cagnotte.title.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            {/* Scrim: bottom-up navy fade for title legibility */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#0E1A40] via-[#0E1A40]/70 to-[#0E1A40]/10"
            />
            {/* Accent glow — subtype-colored */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
              style={{ backgroundColor: accentHex }}
            />
          </div>

          {/* Overlay content */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-end md:justify-between md:gap-6 md:p-8">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {isClosed ? (
                  <Badge variant="status-closed">
                    <span
                      aria-hidden
                      className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400"
                    />
                    {CREATOR_DETAIL_LABELS.statusClosed}
                  </Badge>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-400/40 bg-green-500/15 px-2.5 py-1 text-xs font-bold text-green-300 backdrop-blur-sm">
                    <span
                      aria-hidden
                      className="relative flex h-1.5 w-1.5"
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
                    </span>
                    {CREATOR_DETAIL_LABELS.statusOnline}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold backdrop-blur-sm",
                    isFestive
                      ? "border-amber-300/40 bg-amber-400/15 text-amber-200"
                      : "border-white/30 bg-white/10 text-white",
                  )}
                >
                  {subtypeLabel}
                </span>
              </div>
              <h1 className="font-headings text-2xl font-black leading-[1.1] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-3xl md:text-4xl lg:text-[44px]">
                {cagnotte.title}
              </h1>
              <p className="text-sm font-medium text-white/70">
                Créée le {createdAtLabel}
              </p>
            </div>

            {/* Desktop-only header actions (mobile uses sticky bottom bar) */}
            <HeroActions
              slug={cagnotte.slug}
              title={cagnotte.title}
              shareUrl={shareUrl}
            />
          </div>
        </header>

        {/* Hidden subtitle for screen readers */}
        <span className="sr-only">{subtitle}</span>

        {/* KPI strip ────────────────────────────────────────────────── */}
        <section
          aria-label="Statistiques"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {/* Collected — hero KPI with gradient border */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#0E1A40] p-[1.5px] shadow-[0_1px_0_0_rgba(23,40,102,0.06),0_10px_30px_-18px_rgba(23,40,102,0.35)] sm:col-span-1">
            <div className="relative h-full rounded-[calc(1.5rem-1.5px)] bg-white p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Wallet size={14} aria-hidden />
                  </span>
                  {CREATOR_DETAIL_LABELS.kpiCollected}
                </span>
              </div>
              <p className="font-headings text-2xl font-black leading-none text-primary sm:text-3xl md:text-[32px]">
                {formatPrice(totalRaised)}
              </p>
              <div className="mt-4">
                <ProgressBar
                  value={barWidth}
                  raisedLabel={`${percent}%`}
                  goalLabel={`Objectif · ${formatPrice(goalAmount)}`}
                  color={isFestive ? "gold" : "primary"}
                />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-[0_1px_0_0_rgba(23,40,102,0.04),0_8px_24px_-16px_rgba(23,40,102,0.12)] sm:p-6">
            <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink text-primary">
                <Users size={14} aria-hidden />
              </span>
              {CREATOR_DETAIL_LABELS.kpiParticipants}
            </span>
            <p className="mt-1 font-headings text-2xl font-black leading-none text-primary sm:text-3xl md:text-[32px]">
              {donorCount}
            </p>
            <p className="mt-4 text-xs font-medium text-muted-foreground">
              {donorCount === 0
                ? "En attente du premier soutien"
                : donorCount === 1
                  ? "personne a contribué"
                  : "personnes ont contribué"}
            </p>
          </div>

          {/* Progress */}
          <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-[0_1px_0_0_rgba(23,40,102,0.04),0_8px_24px_-16px_rgba(23,40,102,0.12)] sm:p-6">
            <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  isFestive ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary",
                )}
              >
                <Target size={14} aria-hidden />
              </span>
              Progression
            </span>
            <p className="mt-1 font-headings text-2xl font-black leading-none text-primary sm:text-3xl md:text-[32px]">
              {percent}
              <span className="text-lg text-muted-foreground sm:text-xl">%</span>
            </p>
            <p className="mt-4 text-xs font-medium text-muted-foreground">
              {percent >= 100
                ? "Objectif atteint"
                : `Reste ${formatPrice(Math.max(0, goalAmount - totalRaised))}`}
            </p>
          </div>
        </section>

        {/* Withdraw feature block ──────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-white via-pink/40 to-pink p-5 shadow-[0_1px_0_0_rgba(23,40,102,0.04),0_20px_50px_-24px_rgba(23,40,102,0.25)] sm:p-6 md:p-8">
          {/* Radial glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/10 to-primary/0 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-accent opacity-60 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary shadow-sm backdrop-blur-sm">
                <span
                  aria-hidden
                  className="relative flex h-1.5 w-1.5"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                {CREATOR_DETAIL_LABELS.kpiAvailableFunds}
              </div>
              <h3 className="font-headings text-[28px] font-black leading-none text-primary sm:text-4xl md:text-[44px] lg:text-5xl">
                {formatPrice(availableFunds)}
              </h3>
              <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-primary/70">
                {CREATOR_DETAIL_LABELS.withdrawHelper}
              </p>
              {!kycApproved ? (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-100/70 px-3 py-1.5 text-xs font-bold text-amber-800 backdrop-blur-sm">
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
                  />
                  {CREATOR_DETAIL_LABELS.kycNotApprovedNote}
                </div>
              ) : null}
            </div>

            {kycApproved && availableFunds > 0 ? (
              <Button
                as="a"
                href="/retraits"
                variant="primary"
                size="lg"
                iconLeft={<ArrowDownCircle size={18} />}
                className="shadow-lg"
              >
                {CREATOR_DETAIL_LABELS.withdrawCta}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="lg"
                iconLeft={<ArrowDownCircle size={18} />}
                disabled
              >
                {CREATOR_DETAIL_LABELS.withdrawCta}
              </Button>
            )}
          </div>
        </section>

        {/* Main / sidebar split ──────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Main column — recent participations */}
          <div className="rounded-3xl border border-border/60 bg-white shadow-[0_1px_0_0_rgba(23,40,102,0.04),0_8px_24px_-16px_rgba(23,40,102,0.12)] lg:col-span-2">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6 sm:py-5">
              <h2 className="font-headings text-base font-bold text-primary sm:text-lg">
                {CREATOR_DETAIL_LABELS.recentParticipations}
              </h2>
              <Link
                href={`/tableau-de-bord/cagnottes/${cagnotte.slug}/stats`}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:underline sm:text-sm"
              >
                {CREATOR_DETAIL_LABELS.viewAllParticipations}
                <span className="text-primary/50">·</span>
                <span className="text-primary/70">{donorCount}</span>
              </Link>
            </div>

            {participants.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink">
                  <Users size={22} className="text-primary/50" aria-hidden />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {CREATOR_DETAIL_LABELS.emptyParticipations}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-border/50">
                {participants.map((p) => {
                  const name = p.name || CREATOR_DETAIL_LABELS.anonymousDonor;
                  return (
                    <li
                      key={p.id}
                      className="flex gap-4 px-5 py-4 transition-colors hover:bg-pink/20 sm:px-6 sm:py-5"
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-headings text-base font-black text-white shadow-sm",
                          "bg-gradient-to-br",
                          isFestive
                            ? "from-amber-400 to-amber-600"
                            : "from-primary to-[#0E1A40]",
                        )}
                        aria-hidden
                      >
                        {initial(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-primary">
                              {name}
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                              {formatDateFr(p.createdAt)}
                            </div>
                          </div>
                          <div className="shrink-0 rounded-full bg-primary/5 px-3 py-1 font-headings text-sm font-black text-primary">
                            {p.amount !== null ? formatPrice(p.amount) : "—"}
                          </div>
                        </div>
                        {p.message ? (
                          <p className="mt-3 border-l-2 border-pink-200 pl-3 text-xs italic leading-relaxed text-muted-foreground">
                            {"«\u00A0"}
                            {p.message}
                            {"\u00A0»"}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Sidebar ─────────────────────────────────────────────── */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            {/* Share card */}
            <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-[0_1px_0_0_rgba(23,40,102,0.04),0_8px_24px_-16px_rgba(23,40,102,0.12)] sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink text-primary">
                  <Share2 size={15} aria-hidden />
                </span>
                <h3 className="font-headings text-base font-bold text-primary">
                  {CREATOR_DETAIL_LABELS.shareLinkTitle}
                </h3>
              </div>
              <CopyLinkBox url={shareUrl} />
              <p className="mt-3 break-all text-[11px] font-medium text-muted-foreground">
                {MISC.siteName}/c/{cagnotte.slug}
              </p>
            </div>

            {/* Visibility card */}
            <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-[0_1px_0_0_rgba(23,40,102,0.04),0_8px_24px_-16px_rgba(23,40,102,0.12)] sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-headings text-base font-bold text-primary">
                  {CREATOR_DETAIL_LABELS.visibilityTitle}
                </h3>
                <Link
                  href={`/tableau-de-bord/cagnottes/${cagnotte.slug}/modifier`}
                  className="text-xs font-bold text-primary transition-colors hover:underline"
                >
                  {CREATOR_DETAIL_LABELS.visibilityEditCta}
                </Link>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
                  cagnotte.visibility === "public"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-700",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    cagnotte.visibility === "public"
                      ? "bg-green-500"
                      : "bg-gray-400",
                  )}
                />
                {visibilityLabel}
              </div>
            </div>

            {/* Danger zone (collapsible) */}
            <DangerZoneCard blockId={cagnotte.id} status={cagnotte.status} />
          </aside>
        </section>
      </div>

      {/* Sticky mobile action bar ────────────────────────────────── */}
      <MobileActionBar
        slug={cagnotte.slug}
        title={cagnotte.title}
        shareUrl={shareUrl}
      />
    </>
  );
}
