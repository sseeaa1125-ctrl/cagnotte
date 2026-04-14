"use client";

import * as React from "react";
import { TopBanner } from "@/components/layout/TopBanner";

/**
 * Thin client wrapper around the Ring 2 TopBanner so the route-group layout
 * can stay a Server Component. Dismiss state is in-memory only (re-appears
 * on next page load — that's acceptable for a marketing nudge in v1).
 */
export function TopBannerHost() {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;
  return (
    <TopBanner
      message="Lance ta cagnotte en 2 minutes."
      ctaLabel="Créer maintenant"
      ctaHref="/inscription"
      onClose={() => setDismissed(true)}
    />
  );
}
