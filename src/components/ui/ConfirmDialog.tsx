"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export type ConfirmTone = "primary" | "danger";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Primary = navy button. Danger = red button + warning icon. */
  tone?: ConfirmTone;
  /**
   * Called on confirm. May be async — the dialog shows a pending state
   * while the promise is in flight and stays open if the callback throws
   * (the error is surfaced inline via `errorMessage` prop — the parent
   * owns the error state so it can retry without re-opening).
   */
  onConfirm: () => Promise<void> | void;
  /**
   * Optional async loading label. Defaults to confirmLabel so the button
   * width stays stable.
   */
  pendingLabel?: string;
  /**
   * Inline error to show above the buttons (red-tinted strip). Reset it
   * from the parent on every re-open.
   */
  errorMessage?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Premium confirm-and-commit dialog. Custom layout (no longer wraps the
// generic Modal primitive) so we can give the destructive flow a real
// mobile bottom-sheet pattern instead of a centered scale-fade card.
//
// Mobile: bottom sheet with drag handle + slide-up animation, action
//         buttons stacked with Cancel at thumb-reach (bottom).
// Desktop: centered card with scale-fade, action buttons side-by-side
//          right-aligned (Cancel left, Confirm right).
//
// Body scroll lock + Esc + backdrop tap + focus management implemented
// inline. Always mounted in a portal so the open/close transition runs
// both ways (no flash of unmounted content).
// ─────────────────────────────────────────────────────────────────────────
export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = "Annuler",
  tone = "primary",
  onConfirm,
  pendingLabel,
  errorMessage,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const messageId = React.useId();

  // Wait for hydration before portal-ing
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Reset pending state when the dialog is reopened
  React.useEffect(() => {
    if (!open) setPending(false);
  }, [open]);

  // Body scroll lock + Escape + auto-focus the sheet (Tab reaches the
  // cancel button first because of JSX order — safer for destructive).
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    const id = requestAnimationFrame(() => {
      // Focus the first <button> inside the sheet (Cancel by JSX order).
      const firstBtn = sheetRef.current?.querySelector<HTMLButtonElement>(
        'button[type="button"]:not([aria-label="Fermer la boîte de dialogue"])',
      );
      firstBtn?.focus();
    });
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose, pending]);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  if (!mounted) return null;

  const isDanger = tone === "danger";

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {/* Backdrop — tap closes (unless an in-flight confirm) */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Fermer la boîte de dialogue"
        onClick={() => {
          if (!pending) onClose();
        }}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Sheet (mobile) / Card (desktop) */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md bg-white shadow-2xl outline-none",
          "rounded-t-3xl md:mx-4 md:rounded-3xl",
          "transition-all duration-300 ease-out",
          "pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:pb-0",
          open
            ? "translate-y-0 opacity-100 md:scale-100"
            : "translate-y-full opacity-0 md:translate-y-0 md:scale-95",
        )}
      >
        {/* Drag handle (mobile only — visual affordance, not interactive) */}
        <div
          className="flex justify-center pt-3 md:hidden"
          aria-hidden
        >
          <span className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-5 md:px-8 md:pb-6 md:pt-8">
          {isDanger ? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-50/50">
              <AlertTriangle
                size={28}
                className="text-red-600"
                aria-hidden
              />
            </div>
          ) : null}

          <h2
            id={titleId}
            className="text-center font-headings text-xl font-black text-primary md:text-2xl"
          >
            {title}
          </h2>
          <div
            id={messageId}
            className="mt-2 text-center text-sm leading-relaxed text-gray-600 md:text-base"
          >
            {message}
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>

        {/* Actions — Cancel declared first, Confirm declared second.
            Mobile (flex-col-reverse): Confirm at top (visual prominence),
            Cancel at bottom (thumb reach — iOS Action Sheet pattern).
            Desktop (flex-row + justify-end): Cancel left, Confirm right. */}
        <div className="flex flex-col-reverse gap-2 px-6 pb-2 md:flex-row md:justify-end md:px-8 md:pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
            fullWidth
            className="md:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={pending}
            disabled={pending}
            fullWidth
            className="md:w-auto"
          >
            {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
