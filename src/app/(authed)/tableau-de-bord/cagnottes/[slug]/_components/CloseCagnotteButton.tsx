"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { CREATOR_DETAIL_LABELS } from "@/lib/constants";

export interface CloseCagnotteButtonProps {
  blockId: string;
  status: "active" | "closed";
}

// Phase 10 — danger-zone close/reopen toggle. Delegates confirmation to
// the shared <ConfirmDialog> so focus trap + Esc + backdrop + mobile
// styling come for free.
export function CloseCagnotteButton({
  blockId,
  status,
}: CloseCagnotteButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  async function handleConfirm() {
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
      // Rethrow so ConfirmDialog resets pending to false via finally.
      throw err;
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
        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 active:translate-y-0 active:scale-[0.98]"
      >
        {idleLabel}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={idleLabel}
        message={confirmMessage}
        confirmLabel={idleLabel}
        cancelLabel="Annuler"
        tone={isClosed ? "primary" : "danger"}
        pendingLabel={pendingLabel}
        errorMessage={error}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
