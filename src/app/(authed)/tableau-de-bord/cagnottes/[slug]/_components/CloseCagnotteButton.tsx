"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { CREATOR_DETAIL_LABELS } from "@/lib/constants";

export interface CloseCagnotteButtonProps {
  blockId: string;
  status: "active" | "closed";
}

// Phase 10 — small client island wrapping the danger-zone close/reopen
// toggle. The server component page passes in the current status so the
// button renders the right label without an extra client fetch. Uses the
// shared Modal primitive (focus trap + Esc + backdrop click + body-scroll
// lock) instead of window.confirm() which isn't styled and isn't
// accessible on mobile.
export function CloseCagnotteButton({
  blockId,
  status,
}: CloseCagnotteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const isClosed = status === "closed";
  const confirmMessage = isClosed
    ? CREATOR_DETAIL_LABELS.reopenConfirm
    : CREATOR_DETAIL_LABELS.closeConfirm;
  const idleLabel = isClosed
    ? CREATOR_DETAIL_LABELS.reopenCagnotte
    : CREATOR_DETAIL_LABELS.closeCagnotte;
  const pendingLabel = isClosed
    ? CREATOR_DETAIL_LABELS.reopeningCagnotte
    : CREATOR_DETAIL_LABELS.closingCagnotte;
  const dialogTitle = isClosed
    ? CREATOR_DETAIL_LABELS.reopenCagnotte
    : CREATOR_DETAIL_LABELS.closeCagnotte;

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const action = isClosed ? "reopen" : "close";
      await api(`/api/blocks/${blockId}/${action}`, { method: "POST" });
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? ((err.body as { error?: string })?.error ??
            CREATOR_DETAIL_LABELS.closeError)
          : CREATOR_DETAIL_LABELS.closeError;
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && !confirmOpen ? pendingLabel : idleLabel}
      </button>
      {error && !confirmOpen ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!pending) setConfirmOpen(false);
        }}
        title={dialogTitle}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-gray-700">
            {confirmMessage}
          </p>
          {error ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirm}
              loading={pending}
              disabled={pending}
            >
              {pending ? pendingLabel : idleLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
