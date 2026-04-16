"use client";

import * as React from "react";
import { TopBanner } from "@/components/layout/TopBanner";
import { cn } from "@/lib/utils";

// Thin client wrapper around the Ring 2 TopBanner so the route-group layout
// can stay a Server Component.
//
// Phase 10 polish — the banner now:
//   1. Slides in from above on mount (`animate-top-banner-in`)
//   2. On close, switches to `animate-top-banner-out` which collapses the
//      wrapper's height via max-height while translating up and fading, so
//      the navbar below reclaims the space smoothly instead of snapping.
//   3. Fully unmounts only after the exit animation completes (350ms).
// Dismiss state is in-memory only — the banner reappears on the next page
// load, which is acceptable for a marketing nudge in v1.
const EXIT_MS = 450;

type Status = "entering" | "open" | "closing" | "closed";

export function TopBannerHost() {
  const [status, setStatus] = React.useState<Status>("entering");

  React.useEffect(() => {
    if (status !== "entering") return;
    const id = window.setTimeout(() => setStatus("open"), 550);
    return () => window.clearTimeout(id);
  }, [status]);

  React.useEffect(() => {
    if (status !== "closing") return;
    const id = window.setTimeout(() => setStatus("closed"), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  if (status === "closed") return null;

  const isClosing = status === "closing";

  return (
    <div
      className={cn(
        "origin-top",
        isClosing ? "animate-top-banner-out" : "animate-top-banner-in",
      )}
    >
      <TopBanner
        message="Lance ta cagnotte en 2 minutes."
        ctaLabel="Créer maintenant"
        ctaHref="/inscription"
        onClose={() => setStatus("closing")}
      />
    </div>
  );
}
