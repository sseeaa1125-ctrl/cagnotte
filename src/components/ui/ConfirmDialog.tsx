"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

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
// Shared confirm-and-commit dialog. Wraps the Modal primitive so every
// destructive or non-trivial action on the site shares the same focus
// trap + body-scroll lock + Esc + backdrop click + layout.
//
// Usage (destructive):
//   <ConfirmDialog
//     open={open} onClose={() => setOpen(false)}
//     tone="danger"
//     title="Clôturer la cagnotte ?"
//     message="Les donateurs ne pourront plus participer."
//     confirmLabel="Clôturer" cancelLabel="Annuler"
//     onConfirm={async () => { await api(...); }}
//   />
//
// Mobile first: buttons stack full-width on < sm, row-reverse on sm+.
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

  // Reset pending state when the dialog is reopened (parent may keep the
  // error message around for UX — we only manage the pending flag here).
  React.useEffect(() => {
    if (!open) setPending(false);
  }, [open]);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  const isDanger = tone === "danger";

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={title}
      size="sm"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          {isDanger ? (
            <div
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
            >
              <AlertTriangle size={20} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 text-sm leading-relaxed text-gray-700">
            {message}
          </div>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
            fullWidth
            className="sm:w-auto"
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
            className="sm:w-auto"
          >
            {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
