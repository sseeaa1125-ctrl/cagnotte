"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { CampaignCard } from "@/components/cagnottes/CampaignCard";
import { FilterChipBar } from "@/components/cagnottes/FilterChipBar";
import { Button, EmptyState } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { ALL_CAGNOTTES_LABELS } from "@/lib/constants";

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

type SubtypeFilter = "all" | "festive" | "solidaire";

interface LoadMoreCagnottesProps {
  initialCagnottes: ApiCagnotte[];
  initialCursor: string | null;
  initialSubtype: SubtypeFilter;
}

function toCardProps(c: ApiCagnotte) {
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

export function LoadMoreCagnottes({
  initialCagnottes,
  initialCursor,
  initialSubtype,
}: LoadMoreCagnottesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cagnottes, setCagnottes] = React.useState<ApiCagnotte[]>(
    initialCagnottes,
  );
  const [cursor, setCursor] = React.useState<string | null>(initialCursor);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [subtype, setSubtype] = React.useState<SubtypeFilter>(initialSubtype);

  // Sync URL search params (shareable filter state) without scroll jump.
  React.useEffect(() => {
    const current = searchParams.get("subtype") ?? "all";
    if (current === subtype) return;
    const params = new URLSearchParams(searchParams.toString());
    if (subtype === "all") {
      params.delete("subtype");
    } else {
      params.set("subtype", subtype);
    }
    const qs = params.toString();
    router.replace(qs ? `/cagnottes?${qs}` : "/cagnottes", {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtype]);

  // Client-side subtype filter (backend doesn't accept ?subtype= yet — D-06)
  const filtered = React.useMemo(() => {
    if (subtype === "all") return cagnottes;
    return cagnottes.filter((c) => c.subtype === subtype);
  }, [cagnottes, subtype]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<ListResponse>(
        `/api/cagnottes?limit=20&cursor=${encodeURIComponent(cursor)}`,
      );
      setCagnottes((prev) => [...prev, ...(data.cagnottes ?? [])]);
      setCursor(data.nextCursor ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Erreur lors du chargement. Réessaye.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filters = [
    { value: "all", label: ALL_CAGNOTTES_LABELS.filterAll },
    { value: "festive", label: ALL_CAGNOTTES_LABELS.filterFestive },
    { value: "solidaire", label: ALL_CAGNOTTES_LABELS.filterSolidaire },
  ];

  return (
    <div className="space-y-8">
      <FilterChipBar
        filters={filters}
        value={subtype}
        onChange={(v) => setSubtype(v as SubtypeFilter)}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title={ALL_CAGNOTTES_LABELS.emptyTitle}
          description={ALL_CAGNOTTES_LABELS.emptyBody}
          cta={
            subtype !== "all" ? (
              <Button variant="outline" onClick={() => setSubtype("all")}>
                {ALL_CAGNOTTES_LABELS.emptyResetCta}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered
              .filter((c) => c.slug !== null)
              .map((c) => (
                <CampaignCard key={c.id} cagnotte={toCardProps(c)} />
              ))}
          </div>

          {cursor && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={loadMore}
                loading={loading}
                disabled={loading}
              >
                {loading
                  ? ALL_CAGNOTTES_LABELS.loadingLabel
                  : ALL_CAGNOTTES_LABELS.loadMoreCta}
              </Button>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
