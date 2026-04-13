"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, Loader2, Check, Image as ImageIcon } from "lucide-react";

function getCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("izy-csrf");
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|;\s*)izy-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface GalleryImage {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

interface ImageGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  currentUrl?: string | null;
}

export function ImageGallery({ open, onClose, onSelect, currentUrl }: ImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    fetchImages();
  }, [open]);

  async function fetchImages() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/upload/images`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      const data = await res.json() as { images: GalleryImage[] };
      setImages(data.images);
    } catch {
      setError("Impossible de charger les images");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image trop lourde (max 5 Mo)");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // PROXY: Use same-origin to avoid Safari ITP blocking cross-origin cookies
      const uploadHeaders: Record<string, string> = {};
      const csrfToken = getCsrfToken();
      if (csrfToken) uploadHeaders["x-csrf-token"] = csrfToken;
      const res = await fetch(`/api/upload`, {
        method: "POST",
        credentials: "include",
        headers: uploadHeaders,
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Erreur upload" }));
        throw new Error((data as { error?: string }).error || "Erreur upload");
      }

      const data = await res.json() as { url: string };
      onSelect(data.url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleSelect(url: string) {
    onSelect(url);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0">
          <h2 className="text-base font-extrabold text-gray-900">Choisir une image</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Upload button */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Upload size={16} />
                Uploader une nouvelle image
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        {error && (
          <p className="mx-5 mt-1 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Images grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <ImageIcon size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">Aucune image uploadée</p>
              <p className="mt-1 text-xs text-gray-400">Uploade ta première image ci-dessus</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => {
                const isSelected = currentUrl === img.url;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => handleSelect(img.url)}
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-teal-600 ring-2 ring-teal-600/20"
                        : "border-transparent hover:border-teal-300"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.fileName}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-teal-600/20">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white shadow">
                          <Check size={14} />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent px-2 pb-1.5 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="truncate text-[10px] font-medium text-white">{img.fileName}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
