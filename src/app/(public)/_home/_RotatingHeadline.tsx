"use client";

import * as React from "react";
import { HOME_HERO_PHRASES } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// Cycles the second line of the hero headline through HOME_HERO_PHRASES
// with an odometer-style slide-up:
//   - outer span is `inline-block overflow-hidden` → clipping viewport
//   - inner span is keyed on index → React remounts on every swap,
//     which replays the `hero-slide-up` keyframe (starts at translateY(110%),
//     lifts to 0 with a soft cubic-bezier)
//   - the gradient behind the text flows continuously via `text-gradient-flow`
// Respects prefers-reduced-motion: the CSS freezes both animations.
//
// Descender safety: "change" has a descending 'g' — the wrapper uses
// `leading-[1.15] pb-[0.28em]` to expand the clip box beneath the baseline,
// plus `-mb-[0.14em]` to pull the following siblings back up so the overall
// hero layout doesn't shift.
// ─────────────────────────────────────────────────────────────────────────

const ROTATION_MS = 3000;

export function RotatingHeadline() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HOME_HERO_PHRASES.length);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      aria-live="polite"
      className="relative inline-block overflow-hidden leading-[1.15] pb-[0.28em] -mb-[0.14em] align-bottom"
    >
      <span
        key={index}
        className="text-gradient-flow animate-hero-slide-up block will-change-transform"
      >
        {HOME_HERO_PHRASES[index]}
      </span>
    </span>
  );
}
