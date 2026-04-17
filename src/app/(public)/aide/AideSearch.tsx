"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { FaqSection } from "@/lib/faq-content";

export interface AideSearchProps {
  sections: readonly FaqSection[];
}

// Client-side instant search over the FAQ corpus. Lowercase contains match
// on question + answer — no fancy ranking, no fuzzy matching. Keep it
// predictable. Results link to the corresponding section anchor.
export function AideSearch({ sections }: AideSearchProps) {
  const [query, setQuery] = React.useState("");

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: Array<{
      sectionId: string;
      sectionLabel: string;
      q: string;
      a: string;
    }> = [];
    for (const section of sections) {
      for (const item of section.items) {
        const haystack = `${item.q} ${item.a}`.toLowerCase();
        if (haystack.includes(q)) {
          hits.push({
            sectionId: section.id,
            sectionLabel: section.label,
            q: item.q,
            a: item.a,
          });
        }
      }
    }
    return hits.slice(0, 20);
  }, [query, sections]);

  return (
    <div className="relative">
      <label htmlFor="aide-search" className="sr-only">
        Rechercher dans l&apos;aide
      </label>
      <div className="relative flex items-center">
        <Search
          size={20}
          aria-hidden
          className="pointer-events-none absolute left-4 text-gray-500"
        />
        <input
          id="aide-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="À vous les studios !"
          className="min-h-14 w-full rounded-full border border-border bg-background pl-12 pr-4 text-base text-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          autoComplete="off"
        />
      </div>

      {query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
          {results.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              Aucun résultat pour «&nbsp;{query}&nbsp;».
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((hit, idx) => (
                <li key={idx}>
                  <Link
                    href={`#${hit.sectionId}`}
                    onClick={() => setQuery("")}
                    className="flex flex-col gap-1 px-5 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      {hit.sectionLabel}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {hit.q}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
