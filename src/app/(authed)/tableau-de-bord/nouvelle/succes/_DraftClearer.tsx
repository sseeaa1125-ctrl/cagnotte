"use client";

import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────
// Clears BOTH wizard sessionStorage drafts on mount. Renders nothing.
// We clear both keys defensively — the user may have navigated here from
// either festive or solidaire. Neutral wipe = no stale data on the next
// "Créer une cagnotte" click.
// ─────────────────────────────────────────────────────────────────────────

export function DraftClearer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem("cagnotte.wizard.festive.draft.v1");
      window.sessionStorage.removeItem("cagnotte.wizard.solidaire.draft.v1");
    } catch {
      // ignore
    }
  }, []);
  return null;
}
