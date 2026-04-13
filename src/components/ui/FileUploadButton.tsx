"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, FileText, Loader2, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageGallery } from "@/components/ui/ImageGallery";

function getCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("izy-csrf");
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|;\s*)izy-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface FileUploadButtonProps {
  label: string;
  accept?: string;
  maxSizeMB?: number;
  onUpload: (url: string, fileName: string) => void;
  currentUrl?: string | null;
  currentFileName?: string | null;
  variant?: "image" | "file";
  multiple?: boolean;
  className?: string;
  noGallery?: boolean;
  uploadPurpose?: string;
}

export function FileUploadButton({
  label,
  accept,
  maxSizeMB = 5,
  onUpload,
  currentUrl,
  currentFileName,
  variant = "file",
  multiple = false,
  className,
  noGallery = false,
  uploadPurpose,
}: FileUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [fileName, setFileName] = useState<string | null>(currentFileName || null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state when props change (e.g. edit page loads data async)
  useEffect(() => {
    if (currentUrl !== undefined) setPreview(currentUrl || null);
  }, [currentUrl]);
  useEffect(() => {
    if (currentFileName !== undefined) setFileName(currentFileName || null);
  }, [currentFileName]);

  async function uploadSingleFile(file: File): Promise<{ url: string; fileName: string }> {
    const formData = new FormData();
    formData.append("file", file);

    // PROXY: Use same-origin to avoid Safari ITP blocking cross-origin cookies
    const headers: Record<string, string> = {};
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
    const purposeParam = uploadPurpose ? `?purpose=${encodeURIComponent(uploadPurpose)}` : "";
    const res = await fetch(`/api/upload${purposeParam}`, {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Erreur upload" }));
      throw new Error((data as { error?: string }).error || "Erreur upload");
    }

    return await res.json() as { url: string; fileName: string };
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError("");
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`${file.name} trop lourd (max ${maxSizeMB} Mo)`);
          continue;
        }

        const data = await uploadSingleFile(file);

        if (!multiple) {
          if (variant === "image" && file.type.startsWith("image/")) {
            setPreview(data.url);
          }
          setFileName(data.fileName);
        }
        onUpload(data.url, data.fileName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    setPreview(null);
    setFileName(null);
    onUpload("", "");
  }

  const isImage = variant === "image";
  const hasFile = !!(preview || fileName);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-gray-700">{label}</p>

      {hasFile ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          {isImage && preview ? (
            <img
              src={preview}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200">
              <FileText size={18} className="text-gray-500" />
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
            {fileName || (isImage ? "Image uploadée" : "Fichier uploadé")}
          </span>
          {isImage && !noGallery && (
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
              aria-label="Changer"
            >
              <Images size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500"
            aria-label="Supprimer"
          >
            <X size={16} />
          </button>
        </div>
      ) : isImage && !noGallery ? (
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-sm font-medium text-gray-500 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600"
        >
          <Images size={18} />
          Choisir une image
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-sm font-medium text-gray-500 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Upload size={18} />
              Choisir un fichier
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      {isImage && !noGallery && (
        <ImageGallery
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          onSelect={(url) => {
            setPreview(url);
            setFileName(null);
            onUpload(url, "");
          }}
          currentUrl={preview}
        />
      )}
    </div>
  );
}
