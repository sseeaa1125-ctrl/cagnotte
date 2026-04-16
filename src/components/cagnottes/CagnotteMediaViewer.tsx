"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectVideo, VIDEO_PROVIDER_LABELS } from "@/lib/videoProviders";

// ─────────────────────────────────────────────────────────────────────────
// Skool-style media viewer for the public cagnotte page.
//
// Replaces the static cover + bottom polaroid gallery with a single inline
// viewer:
//   1. The cover (if present) becomes item 0 in a unified media list.
//   2. Gallery images and videos are appended after.
//   3. A thumbnail strip below the viewer lets the visitor swap the main
//      pane to any item — image or embedded video.
//
// Autoplay rule: videos NEVER autoplay on first render (would be jarring on
// landing). They only autoplay after the visitor explicitly picks a thumb.
// ─────────────────────────────────────────────────────────────────────────

interface GalleryItemInput {
  // "youtube" preserved as legacy alias for "video" + provider="youtube".
  kind: "image" | "video" | "youtube";
  url: string;
  videoId?: string;
  provider?: "youtube" | "vimeo" | "wistia" | "loom";
}

interface MediaItem {
  kind: "image" | "video";
  src: string;
  thumb: string | null;
  embedUrl: string | null;
  providerLabel: string | null;
  alt: string;
}

interface Props {
  coverUrl: string | null;
  title: string;
  gallery: GalleryItemInput[];
  subtype: "festive" | "solidaire";
  subtypeLabel: string;
}

function buildMediaItems(
  coverUrl: string | null,
  gallery: GalleryItemInput[],
  title: string,
): MediaItem[] {
  const items: MediaItem[] = [];
  if (coverUrl) {
    items.push({
      kind: "image",
      src: coverUrl,
      thumb: coverUrl,
      embedUrl: null,
      providerLabel: null,
      alt: title,
    });
  }
  for (const g of gallery) {
    if (g.kind === "image") {
      items.push({
        kind: "image",
        src: g.url,
        thumb: g.url,
        embedUrl: null,
        providerLabel: null,
        alt: title,
      });
      continue;
    }
    const info = detectVideo(g.url);
    if (!info) continue;
    const label = VIDEO_PROVIDER_LABELS[info.provider];
    items.push({
      kind: "video",
      src: g.url,
      thumb: info.thumbnailUrl,
      embedUrl: info.embedUrl,
      providerLabel: label,
      alt: `Vidéo ${label}`,
    });
  }
  return items;
}

function SubtypeBadge({
  subtype,
  label,
}: {
  subtype: "festive" | "solidaire";
  label: string;
}) {
  // Offset bumped from top-4/left-4 to top-5/left-5 (sm:top-7/left-7) to
  // clear the section's rounded-3xl corner radius — at top-4, the badge
  // sat inside the 24px corner arc and looked visually clipped.
  return (
    <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-primary shadow-sm backdrop-blur sm:left-7 sm:top-7 sm:px-4 sm:py-2 sm:text-sm">
      <span aria-hidden className="text-base drop-shadow-sm">
        {subtype === "solidaire" ? "❤️" : "🎉"}
      </span>
      {label}
    </div>
  );
}

export function CagnotteMediaViewer({
  coverUrl,
  title,
  gallery,
  subtype,
  subtypeLabel,
}: Props) {
  const items = React.useMemo(
    () => buildMediaItems(coverUrl, gallery, title),
    [coverUrl, gallery, title],
  );
  const [selected, setSelected] = React.useState(0);
  // Only autoplay videos AFTER a user click — never on initial mount.
  const [autoplay, setAutoplay] = React.useState(false);

  const pickItem = React.useCallback((idx: number) => {
    setAutoplay(true);
    setSelected(idx);
  }, []);

  // Empty state — no cover, no usable gallery items. Falls back to the
  // initials placeholder the page used previously.
  if (items.length === 0) {
    return (
      <div className="relative h-56 sm:h-64 md:h-80 lg:h-96">
        <div className="flex h-full w-full items-center justify-center bg-pink">
          <span
            aria-hidden
            className="font-headings text-5xl font-black text-primary/30"
          >
            {title.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <SubtypeBadge subtype={subtype} label={subtypeLabel} />
      </div>
    );
  }

  const safeIndex = Math.min(selected, items.length - 1);
  const active = items[safeIndex];

  return (
    <div>
      {/* Main viewer pane */}
      <div className="relative h-56 bg-gray-100 sm:h-64 md:h-80 lg:h-96">
        {active.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.src}
            alt={active.alt}
            width={1200}
            height={630}
            fetchPriority={safeIndex === 0 ? "high" : "low"}
            className="h-full w-full object-cover"
          />
        ) : active.embedUrl ? (
          <iframe
            // Re-mount iframe on swap so the previous video stops playing.
            key={`${safeIndex}-${autoplay ? "play" : "idle"}`}
            src={autoplay ? `${active.embedUrl}?autoplay=1` : active.embedUrl}
            title={active.alt}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-hover text-white">
            <Play size={48} aria-hidden />
          </div>
        )}

        <SubtypeBadge subtype={subtype} label={subtypeLabel} />
      </div>

      {/* Story-style thumbnail strip — circular, navy ring on active item.
          Only rendered when there's more than 1 media item. No top border:
          padding alone separates from the viewer (avoids the 1px white
          line the user reported as "bande blanche qui coupe les contours"). */}
      {items.length > 1 ? (
        <div className="bg-white px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6">
          <ul
            // Hide native scrollbar (cross-browser) — the strip stays
            // horizontally scrollable but no visible track/thumb.
            className="flex gap-3 overflow-x-auto sm:gap-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
            aria-label="Galerie de la cagnotte"
          >
            {items.map((item, idx) => {
              const isActive = idx === safeIndex;
              return (
                <li
                  key={`${item.kind}-${idx}-${item.src}`}
                  className="shrink-0 p-[5px]"
                >
                  <button
                    type="button"
                    onClick={() => pickItem(idx)}
                    aria-label={
                      item.kind === "video"
                        ? `Lire la vidéo ${item.providerLabel ?? ""} (${idx + 1} sur ${items.length})`
                        : `Voir l'image ${idx + 1} sur ${items.length}`
                    }
                    aria-pressed={isActive}
                    className={cn(
                      "relative block h-16 w-16 overflow-hidden rounded-full ring-offset-2 ring-offset-white transition-all sm:h-20 sm:w-20",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary",
                      isActive
                        ? "ring-[3px] ring-primary shadow-md"
                        : "ring-2 ring-gray-200 hover:ring-gray-300",
                    )}
                  >
                    {item.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-hover text-white">
                        <Play size={18} aria-hidden />
                      </div>
                    )}
                    {item.kind === "video" ? (
                      <span
                        aria-hidden
                        className="absolute inset-0 flex items-center justify-center bg-black/35"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-primary shadow-md">
                          <Play
                            size={12}
                            strokeWidth={2.5}
                            className="ml-0.5"
                          />
                        </span>
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
