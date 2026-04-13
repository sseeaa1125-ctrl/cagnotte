"use client";

import * as React from "react";
import { useWithdrawalDraft } from "@/hooks/useWithdrawalDraft";

// Phase 6 plan 06-02 — /retraits/succes draft clearer.
// Wipes the sessionStorage withdrawal draft on mount so that hitting the
// back button cannot resurrect a half-submitted flow. The confirmation
// step already clears on success; this is a belt-and-suspenders guard
// for deep-link loads of the success URL.

export function DraftClearer() {
  const { clear, isReady } = useWithdrawalDraft();
  React.useEffect(() => {
    if (isReady) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);
  return null;
}
