"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  Facebook,
  Link2,
  Mail,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

// Inlined bottom-sheet-on-mobile / centered-modal-on-desktop because the
// shared <Modal> primitive is centered-only. Keeps this component self
// contained without touching the design system.
export function ShareSheet({ open, onClose, url, title }: ShareSheetProps) {
  const [copied, setCopied] = React.useState(false);
  const [canNativeShare, setCanNativeShare] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) {
      requestAnimationFrame(() => dialogRef.current?.focus());
    }
  }, [open]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback select (best effort)
      const input = document.getElementById(
        "share-sheet-url",
      ) as HTMLInputElement | null;
      input?.select();
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url, text: title });
      onClose();
    } catch {
      /* user cancelled */
    }
  }

  if (!open) return null;
  if (typeof window === "undefined") return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const socialLinks: Array<{
    key: string;
    label: string;
    href: string;
    icon: React.ReactNode;
    bg: string;
  }> = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: <MessageCircle size={20} aria-hidden />,
      bg: "bg-[#25D366]",
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <Facebook size={20} aria-hidden />,
      bg: "bg-[#1877F2]",
    },
    {
      key: "mail",
      label: "Email",
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      icon: <Mail size={20} aria-hidden />,
      bg: "bg-gradient-to-br from-primary to-[#0E1A40]",
    },
  ];

  const node = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s] sm:items-center sm:p-4"
      onClick={onClose}
      aria-hidden={false}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-lg overflow-hidden bg-white shadow-2xl focus:outline-none",
          // Mobile: bottom sheet w/ grabber + safe-area padding + top radius only
          "rounded-t-[28px] pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-[slideUp_0.25s_ease-out]",
          // Desktop: centered modal w/ full radius
          "sm:rounded-3xl sm:pb-0 sm:animate-[scaleIn_0.2s]",
        )}
      >
        {/* Mobile grabber */}
        <div
          aria-hidden
          className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-gray-300 sm:hidden"
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-pink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Share2 size={11} aria-hidden />
              Partager
            </div>
            <h2
              id="share-sheet-title"
              className="font-headings text-lg font-black leading-tight text-primary sm:text-xl"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Link box */}
        <div className="px-5 pb-5 pt-3 sm:px-6">
          <div className="flex items-stretch gap-2 rounded-2xl border border-border bg-muted/50 p-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
              <Link2
                size={15}
                aria-hidden
                className="shrink-0 text-muted-foreground"
              />
              <input
                id="share-sheet-url"
                type="text"
                value={url}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 truncate bg-transparent font-mono text-sm text-primary focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleCopy}
              aria-live="polite"
              className={cn(
                "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
                copied
                  ? "bg-green-500 text-white"
                  : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]",
              )}
            >
              {copied ? (
                <>
                  <Check size={14} aria-hidden />
                  Copié
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden />
                  Copier
                </>
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-border sm:mx-6" />

        {/* Social actions */}
        <div className="px-5 py-5 sm:px-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Partager via
          </p>
          <div className="grid grid-cols-3 gap-3">
            {socialLinks.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
              >
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition-transform group-hover:scale-110",
                    s.bg,
                  )}
                >
                  {s.icon}
                </span>
                <span className="text-xs font-bold text-primary">{s.label}</span>
              </a>
            ))}
          </div>

          {canNativeShare ? (
            <button
              type="button"
              onClick={handleNativeShare}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
            >
              <Share2 size={16} aria-hidden />
              Plus d&apos;options
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
