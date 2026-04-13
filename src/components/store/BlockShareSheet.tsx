"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Link2, Check, Flag } from "lucide-react";
import { copyToClipboard } from "@/lib/share";

interface BlockShareSheetProps {
  blockTitle: string;
  shareUrl: string;
  sellerSlug: string;
  onClose: () => void;
}

const SHARE_TARGETS = [
  {
    id: "copy",
    label: "Copier",
    icon: Link2,
    color: "#6B7280",
    bg: "#F3F4F6",
  },
  {
    id: "x",
    label: "X",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "#000000",
    bg: "#F3F4F6",
  },
  {
    id: "facebook",
    label: "Facebook",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: "#1877F2",
    bg: "#EBF5FF",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: "#25D366",
    bg: "#ECFDF5",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    svg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: "#0A66C2",
    bg: "#EFF6FF",
  },
] as const;

export function BlockShareSheet({ blockTitle, shareUrl, sellerSlug, onClose }: BlockShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [reportStep, setReportStep] = useState<"idle" | "form" | "sent">("idle");
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportSending, setReportSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal needs to wait for client mount
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const text = blockTitle;

  function handleShare(targetId: string) {
    switch (targetId) {
      case "copy":
        copyToClipboard(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      case "x":
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`, "_blank");
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank");
        break;
    }
    onClose();
  }

  async function handleReport() {
    setReportSending(true);
    try {
      await fetch(`/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: sellerSlug,
          reason: reportReason,
          description: `Bloc signalé : ${blockTitle} (${shareUrl})`,
        }),
      });
      setReportStep("sent");
    } catch {
      // Silent fail
    } finally {
      setReportSending(false);
    }
  }

  if (!mounted) return null;

  // Portal into .store-theme-root so CSS variables (--theme-btn-bg, etc.) are inherited
  const portalTarget = document.querySelector(".store-theme-root") || document.body;

  const sheet = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[61] max-h-[92vh] overflow-y-auto rounded-t-3xl px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))] pt-5 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[90vh] sm:w-[400px] sm:rounded-3xl sm:pb-8" style={{ backgroundColor: "var(--theme-modal-bg, #FFFFFF)", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
        {/* Handle bar (mobile) */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full sm:hidden" style={{ backgroundColor: "var(--theme-modal-border, #E5E7EB)" }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--theme-modal-text, #111827)" }}>Partager le lien</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "var(--theme-input-bg, #F3F4F6)", color: "var(--theme-modal-text-muted, #6B7280)" }}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview card */}
        <div className="mb-5 rounded-2xl border p-4" style={{ backgroundColor: "var(--theme-input-bg, #F9FAFB)", borderColor: "var(--theme-modal-border, #E5E7EB)" }}>
          <p className="text-sm font-semibold line-clamp-2" style={{ color: "var(--theme-modal-text, #111827)" }}>{blockTitle}</p>
          <p className="mt-1 text-xs truncate" style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}>{shareUrl}</p>
        </div>

        {/* Share targets */}
        <div className="flex items-center justify-between gap-2 mb-5">
          {SHARE_TARGETS.map((target) => (
            <button
              key={target.id}
              onClick={() => handleShare(target.id)}
              className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-colors hover:bg-gray-50 active:scale-95 min-w-0 flex-1"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full transition-transform"
                style={{ backgroundColor: target.bg, color: target.color }}
              >
                {target.id === "copy" ? (
                  copied ? <Check size={20} /> : <target.icon size={20} />
                ) : (
                  "svg" in target && target.svg
                )}
              </div>
              <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
                {target.id === "copy" && copied ? "Copié !" : target.label}
              </span>
            </button>
          ))}
        </div>

        {/* CTA Fari */}
        <div className="border-t pt-4 mb-3" style={{ borderColor: "var(--theme-modal-border, #E5E7EB)" }}>
          <a
            href="/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-colors hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: "var(--theme-btn-bg, #0D9488)",
              color: "var(--theme-btn-color, #FFFFFF)",
              border: "var(--theme-btn-border, none)",
            }}
          >
            Crée ta page gratuitement sur Izy
          </a>
        </div>

        {/* Report */}
        {reportStep === "idle" && (
          <button
            onClick={() => setReportStep("form")}
            className="flex w-full items-center justify-center gap-1.5 py-2 text-xs transition-colors hover:opacity-80"
            style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}
          >
            <Flag size={12} />
            Signaler ce contenu
          </button>
        )}

        {reportStep === "form" && (
          <div className="mt-2 space-y-3 border-t pt-3" style={{ borderColor: "var(--theme-modal-border, #E5E7EB)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>Raison du signalement</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "SPAM", label: "Spam" },
                { value: "SCAM", label: "Arnaque" },
                { value: "INAPPROPRIATE", label: "Inapproprié" },
                { value: "IMPERSONATION", label: "Usurpation" },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReportReason(r.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    reportReason === r.value
                      ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleReport}
              disabled={reportSending}
              className="w-full rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {reportSending ? "Envoi..." : "Envoyer le signalement"}
            </button>
          </div>
        )}

        {reportStep === "sent" && (
          <p className="mt-2 text-center text-xs border-t pt-3" style={{ color: "var(--theme-modal-text-muted, #6B7280)", borderColor: "var(--theme-modal-border, #E5E7EB)" }}>
            Merci pour ton signalement. Notre équipe va examiner ce contenu.
          </p>
        )}
      </div>
    </>
  );

  return createPortal(sheet, portalTarget);
}
