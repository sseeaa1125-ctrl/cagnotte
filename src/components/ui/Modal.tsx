"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  closeOnBackdrop = true,
  closeOnEsc = true,
  className,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);
  const reactId = React.useId();
  const titleId = `${reactId}-title`;

  // Body scroll lock
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Focus management
  React.useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // Focus dialog on next tick to let it mount
    const id = requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(id);
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  // Esc key + Audit 032 C-03 — focus trap (WCAG 2.4.3)
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEsc) {
        e.stopPropagation();
        onClose();
        return;
      }
      // Focus trap: cycle Tab within the dialog
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables?.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;
  if (typeof window === "undefined") return null;

  const node = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] animate-[fadeIn_0.2s] sm:p-4"
      onClick={() => {
        if (closeOnBackdrop) onClose();
      }}
      aria-hidden={false}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative my-auto w-full max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl bg-background shadow-xl animate-[scaleIn_0.2s] focus:outline-none",
          SIZE_CLASSES[size],
          className,
        )}
      >
        {(title || true) && (
          <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            {title ? (
              <h2
                id={titleId}
                className="font-headings text-base font-semibold text-primary sm:text-lg"
              >
                {title}
              </h2>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
