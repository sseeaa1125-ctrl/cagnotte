"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { CampaignCard } from "@/components/cagnottes/CampaignCard";
import { FilterChipBar } from "@/components/cagnottes/FilterChipBar";
import { SortSelect, type SortMode } from "@/components/cagnottes/SortSelect";
import { Button, EmptyState, Pagination } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { ALL_CAGNOTTES_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

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

interface LoadMoreCagnottesProps {
  initialCagnottes: ApiCagnotte[];
  initialTotalCount: number;
  initialTotalPages: number;
  initialSubtype: SubtypeFilter;
  initialQuery: string;
  initialSort: SortMode;
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

function buildApiUrl(opts: {
  page?: number;
  limit?: number;
  subtype: SubtypeFilter;
  q: string;
  sort?: SortMode;
}): string {
  const params = new URLSearchParams();
  params.set("limit", String(opts.limit ?? 20));
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  if (opts.subtype !== "all") params.set("subtype", opts.subtype);
  const trimmedQ = opts.q.trim();
  if (trimmedQ) params.set("q", trimmedQ);
  if (opts.sort && opts.sort !== "recent") params.set("sort", opts.sort);
  return `/api/cagnottes?${params.toString()}`;
}

export function LoadMoreCagnottes({
  initialCagnottes,
  initialTotalCount,
  initialTotalPages,
  initialSubtype,
  initialQuery,
  initialSort,
}: LoadMoreCagnottesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cagnottes, setCagnottes] = React.useState<ApiCagnotte[]>(initialCagnottes);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(initialTotalPages);
  const [totalCount, setTotalCount] = React.useState(initialTotalCount);
  const [loading, setLoading] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [subtype, setSubtype] = React.useState<SubtypeFilter>(initialSubtype);
  const [sort, setSort] = React.useState<SortMode>(initialSort);
  const [queryInput, setQueryInput] = React.useState<string>(initialQuery);
  const [activeQuery, setActiveQuery] = React.useState<string>(initialQuery);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && queryInput) {
      e.preventDefault();
      setQueryInput("");
    }
  }

  // Re-hydrate from URL
  React.useEffect(() => {
    const urlSubtype = searchParams.get("subtype");
    const nextSubtype: SubtypeFilter =
      urlSubtype === "festive" || urlSubtype === "solidaire" ? urlSubtype : "all";
    const urlSort = searchParams.get("sort");
    const nextSort: SortMode =
      urlSort === "oldest" || urlSort === "raised_desc" || urlSort === "raised_asc"
        ? urlSort
        : "recent";
    const urlQ = (searchParams.get("q") ?? "").trim();
    setSubtype((current) => (current !== nextSubtype ? nextSubtype : current));
    setSort((current) => (current !== nextSort ? nextSort : current));
    setActiveQuery((current) => (current !== urlQ ? urlQ : current));
    setQueryInput((current) => (current !== urlQ ? urlQ : current));
  }, [searchParams]);

  // Sync URL when subtype changes
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
    router.replace(qs ? `/cagnottes?${qs}` : "/cagnottes", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtype]);

  // Sync URL when sort changes
  React.useEffect(() => {
    const current = searchParams.get("sort") ?? "recent";
    if (current === sort) return;
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "recent") {
      params.delete("sort");
    } else {
      params.set("sort", sort);
    }
    const qs = params.toString();
    router.replace(qs ? `/cagnottes?${qs}` : "/cagnottes", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  // Debounce search
  React.useEffect(() => {
    if (queryInput === activeQuery) return;
    const id = window.setTimeout(() => {
      setActiveQuery(queryInput.trim());
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = queryInput.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `/cagnottes?${qs}` : "/cagnottes", { scroll: false });
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  // Refetch when activeQuery, subtype or sort changes (reset to page 1)
  const lastFetchedRef = React.useRef({
    subtype: initialSubtype,
    query: initialQuery,
    sort: initialSort,
  });
  React.useEffect(() => {
    const lastFetch = lastFetchedRef.current;
    if (
      lastFetch.subtype === subtype &&
      lastFetch.query === activeQuery &&
      lastFetch.sort === sort
    )
      return;
    lastFetchedRef.current = { subtype, query: activeQuery, sort };
    let cancelled = false;
    async function refetch() {
      setSearching(true);
      setError(null);
      try {
        const data = await api<ListResponse>(
          buildApiUrl({ subtype, q: activeQuery, page: 1, sort }),
        );
        if (cancelled) return;
        setCagnottes(data.cagnottes ?? []);
        setPage(1);
        setTotalPages(data.totalPages ?? 1);
        setTotalCount(data.totalCount ?? 0);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Erreur lors du chargement. Réessaye.",
        );
      } finally {
        if (!cancelled) setSearching(false);
      }
    }
    refetch();
    return () => { cancelled = true; };
  }, [activeQuery, subtype, sort]);

  // Page change handler
  async function goToPage(newPage: number) {
    if (newPage === page || loading || searching) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<ListResponse>(
        buildApiUrl({ page: newPage, subtype, q: activeQuery, sort }),
      );
      setCagnottes(data.cagnottes ?? []);
      setPage(newPage);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.totalCount ?? 0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Erreur lors du chargement. Réessaye.",
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

  const hasActiveFilter =
    subtype !== "all" || activeQuery.length > 0 || sort !== "recent";

  return (
    <div className="space-y-6">
      {/* Search bar — centered */}
      <div className="mx-auto w-full max-w-2xl">
        <div className="group relative">
          <div
            className={cn(
              "pointer-events-none absolute left-5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center",
              "text-primary/70 transition-colors duration-200",
              "group-focus-within:text-primary",
            )}
            aria-hidden
          >
            {searching ? (
              <div className="flex items-end gap-[3px]">
                <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
              </div>
            ) : (
              <Search
                size={18}
                strokeWidth={2.25}
                className="animate-search-icon-focused transition-transform"
              />
            )}
          </div>
          <input
            ref={inputRef}
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={ALL_CAGNOTTES_LABELS.searchPlaceholder}
            aria-label={ALL_CAGNOTTES_LABELS.searchAriaLabel}
            aria-describedby="search-results-live"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className={cn(
              "h-12 w-full rounded-full border-2 border-primary/40 bg-white",
              "pl-12 pr-12 text-[15px] font-medium text-primary placeholder:text-gray-400",
              "shadow-[0_1px_2px_rgba(23,40,102,0.06)]",
              "transition-[border-color,box-shadow,background-color] duration-200",
              "hover:border-primary/60",
              "focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-pink-100",
              "focus:shadow-[0_4px_16px_rgba(23,40,102,0.08)]",
              "[&::-webkit-search-cancel-button]:appearance-none",
              "[&::-webkit-search-decoration]:appearance-none",
            )}
          />
          {queryInput ? (
            <button
              type="button"
              onClick={() => {
                setQueryInput("");
                inputRef.current?.focus();
              }}
              aria-label="Effacer la recherche"
              className={cn(
                "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
                "animate-pop-in bg-gray-100 text-gray-500 transition-all duration-200",
                "hover:scale-110 hover:bg-primary hover:text-white active:scale-95",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
              )}
            >
              <X size={14} aria-hidden strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
        <div
          id="search-results-live"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {searching
            ? "Recherche en cours…"
            : activeQuery
              ? cagnottes.length === 0
                ? `Aucun résultat pour ${activeQuery}`
                : `${cagnottes.length} résultat${cagnottes.length > 1 ? "s" : ""} pour ${activeQuery}`
              : ""}
        </div>
      </div>

      {/* Toolbar — chips + compact sort pill on a single row.
          No overflow-x-auto on the wrapper (it would clip the desktop
          dropdown); scroll is handled inside the FilterChipBar itself. */}
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 sm:flex sm:justify-start">
          <FilterChipBar
            filters={filters}
            value={subtype}
            onChange={(v) => setSubtype(v as SubtypeFilter)}
            align="center-mobile"
          />
        </div>
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {searching && cagnottes.length === 0 ? (
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`search-skeleton-${i}`}
              aria-hidden
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="aspect-video w-full animate-pulse bg-gray-100" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                <div className="h-2 w-full animate-pulse rounded-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : cagnottes.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title={
            activeQuery
              ? `Aucun résultat pour « ${activeQuery} »`
              : ALL_CAGNOTTES_LABELS.emptyTitle
          }
          description={ALL_CAGNOTTES_LABELS.emptyBody}
          cta={
            hasActiveFilter ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSubtype("all");
                  setSort("recent");
                  setQueryInput("");
                }}
              >
                {ALL_CAGNOTTES_LABELS.emptyResetCta}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div
            className={cn(
              "mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              loading && "pointer-events-none opacity-60",
            )}
          >
            {cagnottes
              .filter((c) => c.slug !== null)
              .map((c) => (
                <CampaignCard key={c.id} cagnotte={toCardProps(c)} />
              ))}
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            pageCount={totalPages}
            onChange={goToPage}
            className="mt-8"
          />

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
