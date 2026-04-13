import { notFound } from "next/navigation";
import { ParticiperForm } from "./ParticiperForm";
import { PARTICIPER_LABELS } from "@/lib/constants";
import type { FundraiserSubtype } from "@/lib/commission";

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
  goalAmount: number | null;
  totalRaised: number | null;
  donorCount: number | null;
  hideAmount: boolean;
  hideDonors: boolean;
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

  const subtype = (cagnotte.subtype ?? "festive") as FundraiserSubtype;

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
        seller: cagnotte.seller
          ? { slug: cagnotte.seller.slug, displayName: cagnotte.seller.displayName }
          : null,
      }}
      slug={slug}
      suggestedAmounts={PARTICIPER_LABELS.suggestedAmounts}
    />
  );
}
