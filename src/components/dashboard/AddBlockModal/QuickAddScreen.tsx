"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Link2, ImageIcon, X } from "lucide-react";
import { api } from "@/lib/api";
import { InstagramIcon, TikTokIcon, YouTubeIcon, SpotifyIcon, FacebookIcon, TelegramIcon, SnapchatIcon } from "./icons";

const SOCIAL_CONFIG: Record<string, { icon: React.ReactNode; bgColor: string; ringColor: string }> = {
  Instagram: { icon: <InstagramIcon />, bgColor: "#FDF2F8", ringColor: "#F9A8D4" },
  TikTok:    { icon: <TikTokIcon />,   bgColor: "#F3F4F6", ringColor: "#D1D5DB" },
  YouTube:   { icon: <YouTubeIcon />,  bgColor: "#FEF2F2", ringColor: "#FCA5A5" },
  Facebook:  { icon: <FacebookIcon />, bgColor: "#EFF6FF", ringColor: "#93C5FD" },
  Snapchat:  { icon: <SnapchatIcon />, bgColor: "#FEFCE8", ringColor: "#FDE047" },
  Telegram:  { icon: <TelegramIcon />, bgColor: "#F0F9FF", ringColor: "#7DD3FC" },
  Spotify:   { icon: <SpotifyIcon />,  bgColor: "#F0FDF4", ringColor: "#86EFAC" },
};

interface LinkPreview {
  ogImage: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
}

interface QuickAddScreenProps {
  quickAddType: string;
  quickAddUrl: string;
  quickAddTitle: string;
  quickAddDescription: string;
  isSubmitting: boolean;
  placeholder: string;
  resolvedPreview: string | null;
  urlError: string | null;
  coverUrl: string | null;
  onCoverChange: (url: string | null) => void;
  onUrlChange: (url: string) => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

// ── Skeleton card ──────────────────────────────────────────────────
function PreviewSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white flex gap-3 p-3 shadow-sm mt-3 animate-step-enter text-left">
      <div className="w-14 h-14 rounded-lg bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 py-0.5 space-y-2 min-w-0">
        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/4" />
        <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-full" />
        <div className="h-2 bg-gray-100 rounded-full animate-pulse w-1/3" />
      </div>
    </div>
  );
}

// ── Preview card ───────────────────────────────────────────────────
function PreviewCard({ preview, domain }: { preview: LinkPreview; domain: string }) {
  if (!preview.ogTitle && !preview.ogImage) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white flex gap-3 p-3 shadow-sm mt-3 animate-step-enter text-left overflow-hidden">
      {preview.ogImage && (
        <img
          src={preview.ogImage}
          alt=""
          className="w-14 h-14 rounded-lg object-cover shrink-0 bg-gray-100"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="flex-1 min-w-0 py-0.5">
        {preview.ogTitle && (
          <p className="text-sm font-semibold text-gray-900 line-clamp-1 leading-snug">{preview.ogTitle}</p>
        )}
        {preview.ogDescription && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">{preview.ogDescription}</p>
        )}
        <p className="text-[10px] text-gray-400 font-medium mt-1.5">{domain}</p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export function QuickAddScreen({
  quickAddType,
  quickAddUrl,
  quickAddTitle,
  quickAddDescription,
  isSubmitting,
  placeholder,
  resolvedPreview,
  urlError,
  coverUrl,
  onCoverChange,
  onUrlChange,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
  onBack,
}: QuickAddScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Tracks whether the current fields were set by user manual edit
  const userEditedTitleRef = useRef(false);
  const userEditedDescRef = useRef(false);
  const userUploadedRef = useRef(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const social = SOCIAL_CONFIG[quickAddType];
  const hasInput = quickAddUrl.trim().length > 0;
  const isValid = hasInput && resolvedPreview !== null && !urlError;
  const domain = resolvedPreview ? new URL(resolvedPreview).hostname.replace("www.", "") : "";
  const hasPreviewData = linkPreview && (linkPreview.ogTitle || linkPreview.ogImage);

  const isYouTubeVideo = resolvedPreview && (
    resolvedPreview.includes("watch?v=") || 
    resolvedPreview.includes("youtu.be/") || 
    resolvedPreview.includes("/shorts/") || 
    resolvedPreview.includes("/live/") || 
    resolvedPreview.includes("/embed/")
  );

  const showRichFields = isValid && !previewLoading && (!social || (quickAddType === "YouTube" && isYouTubeVideo));

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 16);
    return () => clearTimeout(t);
  }, []);

  // Shake on new error
  useEffect(() => {
    if (urlError) setShakeKey((k) => k + 1);
  }, [urlError]);

  // Reset flags + upload error when URL changes
  useEffect(() => {
    userUploadedRef.current = false;
    userEditedTitleRef.current = false;
    userEditedDescRef.current = false;
    setUploadError(null);
  }, [resolvedPreview]);

  // Debounced OG preview fetch
  useEffect(() => {
    if (!resolvedPreview) {
      setLinkPreview(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setLinkPreview(null);

    const t = setTimeout(async () => {
      try {
        const data = await api<LinkPreview>(
          `/api/link-preview?url=${encodeURIComponent(resolvedPreview)}`
        );
        if (!cancelled) setLinkPreview(data);
      } catch {
        if (!cancelled) setLinkPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(t);
      setPreviewLoading(false);
    };
  }, [resolvedPreview]);

  // Auto-select OG image (only if user hasn't uploaded a custom one)
  useEffect(() => {
    if (linkPreview) {
      if (!userUploadedRef.current && linkPreview.ogImage) {
        onCoverChange(linkPreview.ogImage);
      }
      if (!userEditedTitleRef.current && linkPreview.ogTitle) {
        onTitleChange(linkPreview.ogTitle);
      }
      if (!userEditedDescRef.current && linkPreview.ogDescription) {
        onDescriptionChange(linkPreview.ogDescription);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkPreview]);

  // Reset cover when input is cleared
  useEffect(() => {
    if (!hasInput) {
      userUploadedRef.current = false;
      onCoverChange(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInput]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleOgToggle = () => {
    const ogImg = linkPreview?.ogImage ?? null;
    if (coverUrl === ogImg) {
      userUploadedRef.current = false;
      onCoverChange(null);
    } else {
      userUploadedRef.current = false;
      onCoverChange(ogImg);
    }
  };

  const handleClear = () => {
    userUploadedRef.current = false;
    onCoverChange(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const csrfToken = document.cookie.match(/izy-csrf=([^;]*)/)?.[1];
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        headers: csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {},
        body: formData,
      });

      if (res.status === 429) {
        setUploadError("Trop de requêtes — réessaie dans quelques secondes.");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setUploadError(err.error || "Erreur lors de l'upload.");
        return;
      }

      const data = await res.json() as { proxyUrl?: string; url?: string };
      const uploadedUrl = data.proxyUrl || data.url;
      if (uploadedUrl) {
        userUploadedRef.current = true;
        onCoverChange(uploadedUrl);
      }
    } catch {
      setUploadError("Erreur réseau — vérifie ta connexion.");
    } finally {
      setUploadLoading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const customUploadedUrl = coverUrl && coverUrl !== linkPreview?.ogImage ? coverUrl : null;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-8 transition-all duration-300 ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      }`}
    >
      {/* Image Preview / Icon / Upload Zone */}
      <div className="relative mb-6">
        <label
          className={`group relative h-24 w-24 rounded-[30px] flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ring-offset-4 ring-2 ${
            coverUrl 
              ? "ring-teal-500 shadow-xl shadow-teal-500/20 active:scale-95" 
              : "ring-gray-100 hover:ring-teal-200 active:scale-95 translate-y-0"
          }`}
          style={{
            backgroundColor: !coverUrl ? (social?.bgColor ?? "#F0FDFA") : "#F3F4F6",
          }}
        >
          {coverUrl ? (
            <img 
              src={coverUrl} 
              alt="Preview" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            />
          ) : (
            <span className="scale-[1.8] opacity-80 group-hover:opacity-100 transition-all duration-300 group-hover:scale-[2]">
              {social ? social.icon : <Link2 size={22} className="text-teal-600" />}
            </span>
          )}
          
          {/* Upload Overlay */}
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
            <ImageIcon size={24} className="text-white mb-1 animate-in zoom-in-50 duration-300" />
            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Modifier</span>
          </div>

          {uploadLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
              <Loader2 size={24} className="animate-spin text-teal-600" />
            </div>
          )}

          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>

        {/* Revert to OG Image Small Button (if manual upload and OG image exists) */}
        {coverUrl && customUploadedUrl && linkPreview?.ogImage && (
          <button
            type="button"
            onClick={handleOgToggle}
            className="absolute -right-2 -bottom-1 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm hover:border-teal-300 hover:text-teal-600 transition-all group/revert"
            title="Revenir à l'image du site"
          >
            <div className="relative w-5 h-5 rounded-md overflow-hidden">
              <img src={linkPreview.ogImage} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent" />
            </div>
          </button>
        )}

        {/* Clear Image Button */}
        {coverUrl && !linkPreview?.ogImage && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute -right-2 -bottom-1 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm hover:border-red-200 hover:text-red-500 transition-all"
            title="Supprimer l'image"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <h3 className="text-[19px] font-black text-gray-900 mb-1.5 tracking-tight">
        {hasInput && isValid ? (quickAddTitle || `Lien ${quickAddType}`) : `Ajouter ${quickAddType}`}
      </h3>
      <p className="text-sm text-gray-400 mb-8 max-w-[280px] leading-relaxed">
        {social ? "Colle le lien ou ton pseudo (avec ou sans @)." : "Colle l'URL complète ci-dessous."}
      </p>

      {/* Input + shake zone */}
      <div
        key={shakeKey > 0 ? `shake-${shakeKey}` : "stable"}
        className={`w-full max-w-[340px] ${shakeKey > 0 ? "animate-shake" : ""}`}
      >
        <div className="relative">
          <input
            autoFocus
            type="text"
            placeholder={placeholder}
            value={quickAddUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isSubmitting) onSubmit(); }}
            className={`w-full pl-4 pr-20 py-3.5 rounded-2xl text-[14px] font-bold border transition-all outline-none shadow-sm
              ${urlError
                ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                : isValid
                  ? "border-teal-300 bg-teal-50/40 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                  : "border-gray-200 bg-gray-50/50 focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
              }`}
          />

          {hasInput && (
            <span className="absolute right-12 top-1/2 -translate-y-1/2 transition-all duration-200">
              {previewLoading
                ? <Loader2 size={13} className="text-gray-300 animate-spin" />
                : isValid
                  ? <CheckCircle2 size={15} className="text-teal-500 animate-in zoom-in duration-300" />
                  : urlError
                    ? <AlertCircle size={15} className="text-red-400 animate-in shake-in-1 duration-300" />
                    : null}
            </span>
          )}

          <button
            onClick={onSubmit}
            disabled={!hasInput || isSubmitting}
            className={`absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-xl flex items-center justify-center transition-all duration-300
              ${isValid
                ? "bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 hover:scale-105"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"}
              disabled:opacity-50`}
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={16} strokeWidth={2.5} />}
          </button>
        </div>

        {/* URL pill (no rich preview) */}
        {isValid && !previewLoading && !hasPreviewData && (
          <div className="mt-3 flex items-center gap-1.5 px-2 animate-in slide-in-from-top-1 duration-300">
            <CheckCircle2 size={11} className="text-teal-500 shrink-0" />
            <p className="text-[11px] text-teal-600 font-bold truncate tracking-wide">{resolvedPreview}</p>
          </div>
        )}

        {/* Skeleton */}
        {isValid && previewLoading && <PreviewSkeleton />}

        {/* Rich preview edit fields (Hidden for social networks, except YouTube videos) */}
        {showRichFields && (
          <div className="mt-6 space-y-4 text-left animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="group/field">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within/field:text-teal-500">
                Titre du lien
              </p>
              <input
                type="text"
                placeholder="Titre du lien..."
                value={quickAddTitle}
                onChange={(e) => {
                  userEditedTitleRef.current = true;
                  onTitleChange(e.target.value);
                }}
                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-[14px] font-bold text-gray-900 shadow-sm focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all placeholder:text-gray-300"
              />
            </div>
            
            <div className="group/field">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within/field:text-teal-500">
                Description (optionnel)
              </p>
              <textarea
                placeholder="Petite description..."
                value={quickAddDescription}
                onChange={(e) => {
                  userEditedDescRef.current = true;
                  onDescriptionChange(e.target.value);
                }}
                rows={2}
                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-800 shadow-sm focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all resize-none placeholder:text-gray-300"
              />
            </div>
            
            <div className="flex items-center gap-2 px-1 py-1 opacity-50">
              <div className="h-px flex-1 bg-gray-100" />
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Aperçu : {domain}</p>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
          </div>
        )}

        {/* Inline error */}
        {urlError && hasInput && (
          <div className="mt-3 flex items-center gap-1.5 px-2 animate-in slide-in-from-top-1 duration-300">
            <AlertCircle size={11} className="text-red-400 shrink-0" />
            <p className="text-[11px] text-red-500 font-bold">{urlError}</p>
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="mt-8 flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-gray-500 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-700 active:scale-[0.98]"
      >
        <ArrowLeft size={16} />
        Retour aux options
      </button>
    </div>
  );
}
