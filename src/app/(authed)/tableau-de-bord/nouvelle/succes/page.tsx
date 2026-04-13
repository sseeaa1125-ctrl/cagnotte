import Link from "next/link";
import { redirect } from "next/navigation";
import { CampaignCard } from "@/components/cagnottes/CampaignCard";
import { ShareSheet } from "@/components/share/ShareSheet";
import { SUCCESS_LABELS } from "@/lib/constants";
import { ConfettiBurst } from "./_ConfettiBurst";
import { DraftClearer } from "./_DraftClearer";
import { CopyableUrlInput } from "./_CopyableUrlInput";

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 plan 05-02 — /tableau-de-bord/nouvelle/succes (Banani screen 15).
//
// Server component. Reads ?slug= from searchParams, fetches
// GET /api/cagnottes/:slug (public, no auth header), renders CampaignCard
// preview + copy URL + ShareSheet + confetti + DraftClearer.
//
// The cagnotte detail endpoint returns a FLAT payload (see Phase 2
// backend/src/routes/cagnottes.ts line 275). We map it to CampaignCard's
// expected props at the leaf.
// ─────────────────────────────────────────────────────────────────────────

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
  seller: {
    displayName: string;
    slug: string;
  };
}

interface PageProps {
  searchParams: Promise<{ slug?: string }>;
}

async function fetchCagnotte(
  slug: string,
): Promise<CagnotteDetail | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(
      `${backendUrl}/api/cagnottes/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as CagnotteDetail;
  } catch {
    return null;
  }
}

export default async function CreateSuccessPage({ searchParams }: PageProps) {
  const { slug } = await searchParams;
  if (!slug) redirect("/tableau-de-bord");

  const cagnotte = await fetchCagnotte(slug);
  if (!cagnotte) redirect("/tableau-de-bord");

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const publicUrl = `${baseUrl}/c/${cagnotte.slug}`;

  return (
    <div className="mx-auto max-w-2xl">
      <ConfettiBurst />
      <DraftClearer />

      <header className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-trustpilot/10 text-trustpilot">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <h1 className="font-headings text-3xl font-bold text-primary md:text-4xl">
          {SUCCESS_LABELS.title}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {SUCCESS_LABELS.subtitle}
        </p>
      </header>

      <section className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {SUCCESS_LABELS.previewLabel}
        </p>
        <CampaignCard
          cagnotte={{
            slug: cagnotte.slug,
            title: cagnotte.title,
            coverUrl: cagnotte.coverUrl,
            subtype: cagnotte.subtype ?? "festive",
            raised: cagnotte.totalRaised ?? 0,
            goal: cagnotte.goalAmount ?? 0,
            donorCount: cagnotte.donorCount ?? 0,
            endDate: cagnotte.endDate,
          }}
        />
      </section>

      <section className="mb-6 flex flex-col gap-2">
        <label className="text-sm font-medium text-primary">
          {SUCCESS_LABELS.shareableUrlLabel}
        </label>
        <CopyableUrlInput url={publicUrl} />
      </section>

      <section className="mb-8">
        <ShareSheet url={publicUrl} title={cagnotte.title} />
      </section>

      <div className="flex justify-center">
        <Link
          href="/tableau-de-bord"
          className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {SUCCESS_LABELS.backToDashboardCta}
        </Link>
      </div>
    </div>
  );
}
