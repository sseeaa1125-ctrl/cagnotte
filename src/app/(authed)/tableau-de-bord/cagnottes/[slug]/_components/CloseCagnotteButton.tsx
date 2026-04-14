"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { CREATOR_DETAIL_LABELS } from "@/lib/constants";

export interface CloseCagnotteButtonProps {
  blockId: string;
  status: "active" | "closed";
}

// Phase 10 — small client island wrapping the danger-zone close/reopen
// toggle. The server component page passes in the current status so the
// button renders the right label without an extra client fetch.
export function CloseCagnotteButton({
  blockId,
  status,
}: CloseCagnotteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
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

  async function handleClick() {
    if (pending) return;
    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const action = isClosed ? "reopen" : "close";
      await api(`/api/blocks/${blockId}/${action}`, { method: "POST" });
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? ((err.body as { error?: string })?.error ??
            CREATOR_DETAIL_LABELS.closeError)
          : CREATOR_DETAIL_LABELS.closeError;
      setError(msg);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? pendingLabel : idleLabel}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
