"use client";

import * as React from "react";
import { Plus, Trash2, Video, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  detectVideo,
  VIDEO_PROVIDER_LABELS,
  type VideoProvider,
} from "@/lib/videoProviders";

export interface GalleryItem {
  // "youtube" is a legacy alias for video kept so older rows keep validating.
  kind: "image" | "video" | "youtube";
  url: string;
  // Provider id (only for video items). For legacy "youtube" rows we
  // resolve provider="youtube" at read time.
  provider?: VideoProvider;
  // Pre-extracted id so the public page doesn't have to re-parse on every
  // render.
  videoId?: string;
}

export interface GalleryBuilderProps {
  value: GalleryItem[];
  onChange: (next: GalleryItem[]) => void;
  uploadImage: (file: File) => Promise<string>;
  max?: number;
  className?: string;
}

// Ring 2 composed component — no data fetching, props-only. Used by the
// create wizard etape-2 AND the edit form. The parent owns the list and
// passes an `uploadImage` closure so this component stays framework-neutral.
export function GalleryBuilder({
  value,
  onChange,
  uploadImage,
  max = 10,
  className,
}: GalleryBuilderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [videoInput, setVideoInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const items = value;
  const isFull = items.length >= max;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const remaining = max - items.length;
    if (remaining <= 0) {
      setError(`Maximum ${max} éléments.`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: GalleryItem[] = [];
      for (const file of selected) {
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
          setError("Format invalide. Utilisez JPG, PNG ou WebP.");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError("Image trop lourde (max 5 Mo).");
          continue;
        }
        try {
          const url = await uploadImage(file);
          uploaded.push({ kind: "image", url });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Upload échoué";
          setError(msg);
        }
      }
      if (uploaded.length > 0) {
        onChange([...items, ...uploaded]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleAddVideo() {
    setError(null);
    const info = detectVideo(videoInput);
    if (!info) {
      setError(
        "Lien vidéo non reconnu. Colle un lien YouTube, Vimeo, Wistia ou Loom.",
      );
      return;
    }
    if (items.length >= max) {
      setError(`Maximum ${max} éléments.`);
      return;
    }
    // De-dupe by provider + video ID
    const dup = items.some((it) => {
      if (it.kind === "image") return false;
      const itemProvider =
        it.provider ?? (it.kind === "youtube" ? "youtube" : null);
      return itemProvider === info.provider && it.videoId === info.id;
    });
    if (dup) {
      setError("Cette vidéo est déjà dans la galerie.");
      return;
    }
    onChange([
      ...items,
      {
        kind: "video",
        url: videoInput.trim(),
        provider: info.provider,
        videoId: info.id,
      },
    ]);
    setVideoInput("");
  }

  function handleRemove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((item, idx) => (
            <li
              key={`${item.kind}-${item.url}-${idx}`}
              className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-muted"
            >
              {item.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt=""
                  width={320}
                  height={180}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                (() => {
                  // Re-resolve from the URL so legacy "youtube"-only rows
                  // and new multi-provider rows render through the same path.
                  const info = detectVideo(item.url);
                  const provider =
                    item.provider ??
                    info?.provider ??
                    (item.kind === "youtube" ? "youtube" : null);
                  const thumb = info?.thumbnailUrl ?? null;
                  return (
                    <>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          width={320}
                          height={180}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-hover text-white">
                          <Video size={28} aria-hidden />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-end justify-start bg-black/30 p-2 text-white">
                        <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                          {provider
                            ? VIDEO_PROVIDER_LABELS[provider]
                            : "Vidéo"}
                        </span>
                      </div>
                    </>
                  );
                })()
              )}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                aria-label="Supprimer cet élément"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isFull || uploading}
            className="inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-lg border border-primary bg-background px-4 py-2 text-sm font-semibold text-primary hover:bg-pink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus size={16} />
            {uploading ? "Envoi en cours…" : "Ajouter des images"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="sr-only"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            placeholder="Lien YouTube, Vimeo, Wistia ou Loom"
            disabled={isFull}
            aria-label="Lien vidéo à ajouter à la galerie"
            className="min-h-12 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddVideo();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddVideo}
            disabled={isFull || !videoInput.trim()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Ajouter la vidéo
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Jusqu&apos;à {max} images ou vidéos (YouTube, Vimeo, Wistia, Loom).{" "}
          {items.length}/{max}. Les vidéos sont des liens — pas
          d&apos;upload de fichier vidéo.
        </p>

        {error ? (
          <p className="text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
