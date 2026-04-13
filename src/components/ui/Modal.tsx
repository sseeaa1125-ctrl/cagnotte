"use client";

import { useEffect, useRef, useId } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

// C2: Focusable elements selector for focus trap
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, footer, className, contentClassName }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownTarget = useRef<EventTarget | null>(null);
  const titleId = useId();

  // Lock body scroll when modal is open — position:fixed technique for iOS Safari
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

  // Focus trap — trap Tab/Shift+Tab inside the modal panel
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    requestAnimationFrame(() => {
      const firstInput = panelRef.current?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled])");
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstInput || firstFocusable)?.focus();
    });

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Drag-to-dismiss — mobile bottom sheet only
  // Attaches to panel level but only activates when touch starts in the top non-scroll zone.
  // Non-passive touchmove is added dynamically (only while dragging) to avoid scroll latency.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel) return;

    // Only activate on mobile (sm = 640px)
    if (window.innerWidth >= 640) return;

    let startY = 0;
    let currentY = 0;
    let active = false;

    // Drag zone = top portion of panel (handle bar + optional modal header ~ 100px)
    const DRAG_ZONE_PX = 100;

    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const delta = Math.max(0, e.touches[0].clientY - startY);
      currentY = e.touches[0].clientY;
      panel.style.transform = `translateY(${delta}px)`;
      if (backdrop) {
        const progress = Math.min(delta / 280, 1);
        backdrop.style.opacity = String(1 - progress * 0.75);
      }
      e.preventDefault();
    };

    const onEnd = () => {
      if (!active) return;
      active = false;
      // Remove non-passive listener as soon as drag ends
      panel.removeEventListener("touchmove", onMove);

      const delta = Math.max(0, currentY - startY);

      if (delta > 110) {
        panel.style.transition = "transform 0.22s cubic-bezier(0.4, 0, 1, 1)";
        panel.style.transform = "translateY(110%)";
        if (backdrop) {
          backdrop.style.transition = "opacity 0.22s ease-in";
          backdrop.style.opacity = "0";
        }
        setTimeout(() => onCloseRef.current(), 220);
      } else {
        // Spring snap-back
        panel.style.transition = "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)";
        panel.style.transform = "";
        if (backdrop) {
          backdrop.style.transition = "opacity 0.3s ease-out";
          backdrop.style.opacity = "";
        }
      }
    };

    const onStart = (e: TouchEvent) => {
      const rect = panel.getBoundingClientRect();
      const relativeY = e.touches[0].clientY - rect.top;
      if (relativeY > DRAG_ZONE_PX) return; // Outside drag zone

      startY = e.touches[0].clientY;
      currentY = startY;
      active = true;
      panel.style.transition = "none";
      // Add non-passive touchmove only when drag is active
      panel.addEventListener("touchmove", onMove, { passive: false });
    };

    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchend", onEnd, { passive: true });
    panel.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      panel.removeEventListener("touchend", onEnd);
      panel.removeEventListener("touchcancel", onEnd);
      panel.style.transform = "";
      panel.style.transition = "";
      if (backdrop) {
        backdrop.style.opacity = "";
        backdrop.style.transition = "";
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 overflow-y-auto"
      onMouseDown={(e) => { mouseDownTarget.current = e.target; }}
      onMouseUp={(e) => {
        if (
          mouseDownTarget.current &&
          !panelRef.current?.contains(mouseDownTarget.current as Node) &&
          !panelRef.current?.contains(e.target as Node)
        ) {
          onClose();
        }
        mouseDownTarget.current = null;
      }}
      onTouchEnd={(e) => {
        if (!panelRef.current?.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/50"
        style={{ touchAction: "none" }}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Centering wrapper */}
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
        {/* Panel — bottom sheet on mobile, centered modal on desktop */}
        <div
          ref={panelRef}
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : "Modal"}
          className={cn(
            "relative z-10 w-full sm:max-w-md sm:rounded-2xl",
            "rounded-t-2xl sm:rounded-2xl",
            "max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]",
            "animate-[slideUp_0.25s_cubic-bezier(0.34,1.56,0.64,1)] sm:animate-[scaleIn_0.2s_ease-out]",
            className
          )}
          style={{
            backgroundColor: "var(--theme-modal-bg, #FFFFFF)",
            fontFamily: "var(--theme-font-family, inherit)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle — mobile only, visual affordance (drag zone = top 100px of panel) */}
          <div
            className="sm:hidden shrink-0 flex justify-center items-center h-9 select-none"
            aria-hidden="true"
          >
            <div
              className="h-1.5 w-12 rounded-full transition-colors"
              style={{ backgroundColor: "var(--theme-modal-text-muted, #CBD5E1)" }}
            />
          </div>

          {/* Header */}
          {title && (
            <div
              className="flex items-center justify-between px-4 pb-3 pt-1 sm:px-6 sm:pt-4 shrink-0"
              style={{ borderBottom: "1px solid var(--theme-modal-border, #F3F4F6)" }}
            >
              <h2
                id={titleId}
                className="text-lg font-bold"
                style={{ color: "var(--theme-modal-text, #111827)" }}
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                style={{ color: "var(--theme-modal-text-muted, #9CA3AF)", width: 44, height: 44, minWidth: 44 }}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Content — scrollable (min-h-0 is critical for flex overflow to work) */}
          <div
            data-lenis-prevent
            className={cn("overflow-y-auto overscroll-contain flex-1 min-h-0 px-4 py-4 sm:px-6", contentClassName)}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {children}
          </div>

          {/* Sticky footer */}
          {footer && (
            <div
              className="shrink-0 px-4 pb-4 pt-3 sm:px-6"
              style={{ borderTop: "1px solid var(--theme-modal-border, #F3F4F6)" }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
