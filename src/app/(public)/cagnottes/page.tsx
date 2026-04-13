import { LoadMoreCagnottes } from "./LoadMore";
import { ALL_CAGNOTTES_LABELS } from "@/lib/constants";

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

async function getInitial(): Promise<ListResponse> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/cagnottes?limit=20`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { cagnottes: [], nextCursor: null };
    return (await res.json()) as ListResponse;
  } catch {
    return { cagnottes: [], nextCursor: null };
  }
}

export const revalidate = 60;

export const metadata = {
  title: "Toutes les cagnottes",
  description:
    "Découvre toutes les cagnottes festives et solidaires publiées sur cagnotte.sn.",
};

type SubtypeFilter = "all" | "festive" | "solidaire";

function parseSubtype(raw: string | string[] | undefined): SubtypeFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "festive" || value === "solidaire") return value;
  return "all";
}

export default async function ToutesLesCagnottesPage({
  searchParams,
}: {
  searchParams: Promise<{ subtype?: string }>;
}) {
  const params = await searchParams;
  const initialSubtype = parseSubtype(params.subtype);
  const initial = await getInitial();
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-headings text-3xl font-bold text-primary md:text-4xl">
          {ALL_CAGNOTTES_LABELS.pageTitle}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {ALL_CAGNOTTES_LABELS.pageSubtitle}
        </p>
      </header>
      <LoadMoreCagnottes
        initialCagnottes={initial.cagnottes}
        initialCursor={initial.nextCursor}
        initialSubtype={initialSubtype}
      />
    </div>
  );
}
