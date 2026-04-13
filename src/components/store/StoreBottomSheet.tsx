"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface StoreBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function StoreBottomSheet({ open, onClose, title, children }: StoreBottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open — position:fixed technique for iOS Safari
  // Apply to both <body> and <html> (Firefox scrolls <html>)
  const scrollYRef = useRef(0);
  useEffect(() => {
    if (!open) return;

    scrollYRef.current = window.scrollY;
    const { body } = document;
    const html = document.documentElement;

    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overflow = "";
      html.style.overflow = "";
      window.scrollTo(0, scrollYRef.current);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain sm:items-center"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Backdrop — touch-action:none prevents scroll-through on mobile */}
      <div
        className="fixed inset-0 bg-black/50"
        style={{ touchAction: "none" }}
        onTouchMove={(e) => e.preventDefault()}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={panelRef}
        className="relative z-10 mt-auto w-full sm:max-w-md animate-[slideUp_0.2s_ease-out] rounded-t-2xl sm:mt-0 sm:rounded-2xl flex flex-col"
        style={{
          backgroundColor: "var(--theme-modal-bg, #FFFFFF)",
          fontFamily: "var(--theme-font-family, inherit)",
          maxHeight: "min(92vh, 92dvh)",
          touchAction: "pan-y",
        }}
      >
        {/* Mobile handle */}
        <div className="flex justify-center py-2 sm:hidden">
          <div
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: "var(--theme-modal-text-muted, #D1D5DB)" }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pb-3 pt-1 sm:px-5 sm:pt-4"
          style={{ borderBottom: "1px solid var(--theme-modal-border, #F3F4F6)" }}
        >
          <h2
            className="text-base font-bold"
            style={{ color: "var(--theme-modal-text, #111827)" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--theme-modal-border, #F3F4F6)" }}
            aria-label="Fermer"
          >
            <X size={18} style={{ color: "var(--theme-modal-text-muted, #6B7280)" }} />
          </button>
        </div>

        {/* Content — scrollable (min-h-0 is critical for flex overflow to work) */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))] sm:px-5 sm:pb-8"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
