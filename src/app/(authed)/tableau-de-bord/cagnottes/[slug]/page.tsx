import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeft,
  Settings,
  Share2,
  Users,
  Wallet,
} from "lucide-react";
import { Badge, Button, ProgressBar } from "@/components/ui";
import { CREATOR_DETAIL_LABELS, MISC } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { CopyLinkBox } from "./_components/CopyLinkBox";

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
//
// All copy sources from CREATOR_DETAIL_LABELS (constants.ts). Banani
// wireframe: .planning/banani/screens/phase-7/creator-cagnotte-detail.md
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

  // Fetch me + cagnotte first — we need the owner gate to resolve before
  // we expose any further detail.
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

  // OWNER GATE — fail closed via notFound() so non-owners can't probe
  // existence. Never return 403 here.
  if (cagnotte.seller.id !== me.seller.id) {
    notFound();
  }

  // Second wave — participants + seller balance. These can run in
  // parallel now that the owner gate has passed.
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
  const percent =
    goalAmount > 0
      ? Math.min(100, Math.round((totalRaised / goalAmount) * 100))
      : 0;

  const isFestive = cagnotte.subtype === "festive";
  const subtypeLabel = isFestive
    ? CREATOR_DETAIL_LABELS.subtypeFestive
    : CREATOR_DETAIL_LABELS.subtypeSolidaire;
  const createdAtLabel = formatDateFr(cagnotte.createdAt);
  const subtitle = `${subtypeLabel} • Créée le ${createdAtLabel}`;

  const publicBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://cagnottes.sn";
  const shareUrl = `${publicBaseUrl}/c/${cagnotte.slug}`;

  const visibilityLabel =
    cagnotte.visibility === "public"
      ? CREATOR_DETAIL_LABELS.visibilityPublic
      : CREATOR_DETAIL_LABELS.visibilityPrivate;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Back link */}
      <Link
        href="/tableau-de-bord"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={14} aria-hidden />
        {CREATOR_DETAIL_LABELS.backToDashboard}
      </Link>

      {/* Header row ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          {cagnotte.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cagnotte.coverUrl}
              alt={cagnotte.title}
              className="h-20 w-20 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-accent text-2xl font-black text-primary">
              {cagnotte.title.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Badge variant="status-active">
              <span
                className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500"
                aria-hidden
              />
              {CREATOR_DETAIL_LABELS.statusOnline}
            </Badge>
            <h1 className="font-headings text-3xl font-black text-primary md:text-4xl">
              {cagnotte.title}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:shrink-0">
          <Button
            as="a"
            href={`/tableau-de-bord/cagnottes/${cagnotte.slug}/modifier`}
            variant="outline"
            size="md"
            iconLeft={<Settings size={16} />}
          >
            {CREATOR_DETAIL_LABELS.manageCta}
          </Button>
          <Button
            as="a"
            href={`/c/${cagnotte.slug}`}
            variant="primary"
            size="md"
            iconLeft={<Share2 size={16} />}
          >
            {CREATOR_DETAIL_LABELS.shareCta}
          </Button>
        </div>
      </header>

      {/* KPI grid ───────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Wallet size={16} aria-hidden />
            {CREATOR_DETAIL_LABELS.kpiCollected}
          </div>
          <p className="mb-3 font-headings text-3xl font-black text-primary">
            {formatPrice(totalRaised)}
          </p>
          <ProgressBar
            value={percent}
            raisedLabel={`${percent}%`}
            goalLabel={`${"Objectif"} : ${formatPrice(goalAmount)}`}
            color={isFestive ? "gold" : "primary"}
          />
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Users size={16} aria-hidden />
            {CREATOR_DETAIL_LABELS.kpiParticipants}
          </div>
          <p className="font-headings text-3xl font-black text-primary">
            {donorCount}
          </p>
        </div>
      </section>

      {/* Withdraw Action Box ────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-primary bg-white p-6 shadow-sm md:p-8">
        {/* Decorative pink blob */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent opacity-50"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-full bg-green-500"
                aria-hidden
              />
              {CREATOR_DETAIL_LABELS.kpiAvailableFunds}
            </div>
            <h3 className="mb-3 font-headings text-3xl font-black text-primary md:text-4xl">
              {formatPrice(availableFunds)}
            </h3>
            <p className="max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
              {CREATOR_DETAIL_LABELS.withdrawHelper}
            </p>
            {!kycApproved ? (
              <p className="mt-2 text-xs font-semibold text-amber-600">
                {CREATOR_DETAIL_LABELS.kycNotApprovedNote}
              </p>
            ) : null}
          </div>
          {kycApproved && availableFunds > 0 ? (
            <Button
              as="a"
              href="/retraits"
              variant="primary"
              size="lg"
              iconLeft={<ArrowDownCircle size={18} />}
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

      {/* Main / sidebar split ───────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column — recent participations */}
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headings text-lg font-semibold text-primary">
              {CREATOR_DETAIL_LABELS.recentParticipations}
            </h2>
            <Link
              href={`/tableau-de-bord/cagnottes/${cagnotte.slug}/stats`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {CREATOR_DETAIL_LABELS.viewAllParticipations} ({donorCount})
            </Link>
          </div>

          {participants.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {CREATOR_DETAIL_LABELS.emptyParticipations}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {participants.map((p) => {
                const name = p.name || CREATOR_DETAIL_LABELS.anonymousDonor;
                return (
                  <li
                    key={p.id}
                    className="flex gap-4 rounded-2xl border border-border bg-gray-50/60 p-4"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent font-headings text-lg font-black text-primary"
                      aria-hidden
                    >
                      {initial(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div className="truncate font-bold text-primary">
                          {name}
                        </div>
                        <div className="shrink-0 font-headings font-black text-primary">
                          {p.amount !== null ? formatPrice(p.amount) : "—"}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        {formatDateFr(p.createdAt)}
                      </div>
                      {p.message ? (
                        <p className="mt-2 rounded-xl border border-border bg-white p-3 text-sm italic text-muted-foreground">
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

        {/* Sidebar — share / visibility / danger */}
        <aside className="flex flex-col gap-4">
          {/* Share link card */}
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-headings text-base font-semibold text-primary">
              {CREATOR_DETAIL_LABELS.shareLinkTitle}
            </h3>
            <CopyLinkBox url={shareUrl} />
            <p className="mt-2 text-xs text-muted-foreground">
              {MISC.siteName}/c/{cagnotte.slug}
            </p>
          </div>

          {/* Visibility card — read-only in v1, edit lives on /modifier */}
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-headings text-base font-semibold text-primary">
                {CREATOR_DETAIL_LABELS.visibilityTitle}
              </h3>
              <Link
                href={`/tableau-de-bord/cagnottes/${cagnotte.slug}/modifier`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {CREATOR_DETAIL_LABELS.visibilityEditCta}
              </Link>
            </div>
            <p className="text-sm font-semibold text-primary">
              {visibilityLabel}
            </p>
          </div>

          {/* Danger zone card */}
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-red-800">
              <AlertTriangle size={16} aria-hidden />
              {CREATOR_DETAIL_LABELS.dangerZoneTitle}
            </div>
            <p className="mb-4 text-xs text-red-700">
              {CREATOR_DETAIL_LABELS.dangerZoneHelper}
            </p>
            {/* TODO PHASE-8: in-place close action. For now we route to
                the modifier page anchor so the owner can close from
                there. */}
            <Link
              href={`/tableau-de-bord/cagnottes/${cagnotte.slug}/modifier#cloturer`}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {CREATOR_DETAIL_LABELS.closeCagnotte}
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
