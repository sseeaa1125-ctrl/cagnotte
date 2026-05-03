import { notFound, redirect } from "next/navigation";
import { ParticiperForm } from "./ParticiperForm";
import type { FundraiserSubtype } from "@/lib/commission";

// Fallback presets if the creator never set custom amounts. Hard-capped to 3
// so the participer UI always renders the same number of pills regardless
// of how many the creator saved.
const DEFAULT_SUGGESTED_AMOUNTS: readonly number[] = [2000, 5000, 10000];

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// CRITICAL — OQ-3 / Pitfall P05. No pre-render at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Je participe",
  // Defense-in-depth on top of robots.txt disallow.
  robots: { index: false, follow: false },
};

interface CagnotteDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  subtype: FundraiserSubtype | null;
  visibility: "public" | "private";
  status?: "active" | "closed" | null;
  endDate?: string | null;
  goalAmount: number | null;
  totalRaised: number | null;
  donorCount: number | null;
  hideAmount: boolean;
  hideDonors: boolean;
  cardEnabled?: boolean;
  suggestedAmounts: number[] | null;
  seller: {
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
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

export default async function ParticiperPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cagnotte = await getCagnotte(slug);
  if (!cagnotte) notFound();

  // Si la cagnotte est clôturée ou expirée, on renvoie vers la page publique
  // qui affiche le bandeau "Cagnotte terminée". Évite qu'un donor avec un
  // lien direct remplisse tout le formulaire pour se prendre un 400 sur
  // /paiement — guard aligné avec le backend POST /api/orders.
  if (cagnotte.status === "closed") {
    redirect(`/c/${slug}`);
  }
  if (cagnotte.endDate) {
    const end = new Date(cagnotte.endDate);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      if (new Date() > end) {
        redirect(`/c/${slug}`);
      }
    }
  }

  const subtype = (cagnotte.subtype ?? "festive") as FundraiserSubtype;

  // Read creator-set presets from the detail payload. Fall back to the
  // built-in defaults if empty/missing. Cap at 3 to match the form's
  // pill layout.
  const creatorPresets =
    Array.isArray(cagnotte.suggestedAmounts) && cagnotte.suggestedAmounts.length > 0
      ? cagnotte.suggestedAmounts
      : DEFAULT_SUGGESTED_AMOUNTS;
  const suggestedAmounts = creatorPresets.slice(0, 3);

  return (
    <ParticiperForm
      cagnotte={{
        slug: cagnotte.slug,
        title: cagnotte.title,
        coverUrl: cagnotte.coverUrl,
        subtype,
        goalAmount: cagnotte.goalAmount,
        totalRaised: cagnotte.totalRaised,
        hideAmount: cagnotte.hideAmount,
        hideDonors: cagnotte.hideDonors,
        cardEnabled: cagnotte.cardEnabled === true,
        seller: cagnotte.seller
          ? { slug: cagnotte.seller.slug, displayName: cagnotte.seller.displayName }
          : null,
      }}
      slug={slug}
      suggestedAmounts={suggestedAmounts}
    />
  );
}
