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
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

type SubtypeFilter = "all" | "festive" | "solidaire";
type SortMode = "recent" | "oldest" | "raised_desc" | "raised_asc";

interface InitialFetchOpts {
  subtype: SubtypeFilter;
  q: string;
  sort: SortMode;
}

async function getInitial(opts: InitialFetchOpts): Promise<ListResponse> {
  const params = new URLSearchParams();
  params.set("limit", "20");
  if (opts.subtype !== "all") params.set("subtype", opts.subtype);
  if (opts.q) params.set("q", opts.q);
  if (opts.sort !== "recent") params.set("sort", opts.sort);
  try {
    // `cache: 'no-store'` keeps the listing live — a new donation is
    // visible on the first reload rather than up to 60s later. Matches
    // the LP featured section and the detail page polling cadence.
    const res = await fetch(
      `${BACKEND_API_URL}/api/cagnottes?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      console.error(
        `[cagnottes/getInitial] ${res.status} ${res.statusText}`,
      );
      return { cagnottes: [], nextCursor: null, totalCount: 0, totalPages: 1, currentPage: 1 };
    }
    return (await res.json()) as ListResponse;
  } catch (err) {
    console.error("[cagnottes/getInitial] fetch threw:", err);
    return { cagnottes: [], nextCursor: null, totalCount: 0, totalPages: 1, currentPage: 1 };
  }
}

// Dynamic rendering — matches the LP and detail page freshness policy.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Toutes les cagnottes",
  description:
    "Découvre toutes les cagnottes festives et solidaires au Sénégal. Collecte via Wave, Orange Money — baptêmes, mariages, causes solidaires sur cagnotte.sn.",
  alternates: { canonical: "https://cagnotte.sn/cagnottes" },
  openGraph: {
    title: "Toutes les cagnottes",
    description:
      "Découvre toutes les cagnottes festives et solidaires au Sénégal. Collecte via Wave, Orange Money — baptêmes, mariages, causes solidaires sur cagnotte.sn.",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Toutes les cagnottes",
    description:
      "Découvre toutes les cagnottes festives et solidaires au Sénégal. Collecte via Wave, Orange Money — baptêmes, mariages, causes solidaires sur cagnotte.sn.",
  },
};

function parseSubtype(raw: string | string[] | undefined): SubtypeFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "festive" || value === "solidaire") return value;
  return "all";
}

function parseSort(raw: string | string[] | undefined): SortMode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "oldest" || value === "raised_desc" || value === "raised_asc") {
    return value;
  }
  return "recent";
}

function parseQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 100);
}

export default async function ToutesLesCagnottesPage({
  searchParams,
}: {
  searchParams: Promise<{ subtype?: string; q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const initialSubtype = parseSubtype(params.subtype);
  const initialQuery = parseQuery(params.q);
  const initialSort = parseSort(params.sort);
  const initial = await getInitial({
    subtype: initialSubtype,
    q: initialQuery,
    sort: initialSort,
  });
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="mb-8 text-center">
        <h1 className="font-headings text-3xl font-bold text-primary md:text-4xl">
          {ALL_CAGNOTTES_LABELS.pageTitle}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-base text-muted-foreground">
          {ALL_CAGNOTTES_LABELS.pageSubtitle}
        </p>
      </header>
      <LoadMoreCagnottes
        initialCagnottes={initial.cagnottes}
        initialTotalCount={initial.totalCount ?? 0}
        initialTotalPages={initial.totalPages ?? 1}
        initialSubtype={initialSubtype}
        initialQuery={initialQuery}
      />
    </div>
  );
}
