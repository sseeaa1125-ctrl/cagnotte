"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AnimatedProgressBarProps {
  /** Target percent 0–100. Clamped internally. */
  percent: number;
  /** Optional caption row rendered below the track. */
  label?: React.ReactNode;
  /** Track height + bg override — defaults to `h-3 bg-gray-100`. */
  trackClassName?: string;
  /** Fill color override — defaults to `bg-primary`. */
  fillClassName?: string;
  className?: string;
}

// Phase 10 v3 — Premium minimalist progress bar.
//
// On mount the fill width transitions from 0% → target over 1.4s with a
// soft cubic-bezier. A low-opacity diagonal shimmer sweeps across the
// filled portion every 3.5s via the `progress-shimmer` keyframe in
// globals.css, and the leading edge carries a subtle navy glow for a
// "live" feel. `prefers-reduced-motion` disables both animations (the
// fill still arrives at target — we skip the transition, not the result).
export function AnimatedProgressBar({
  percent,
  label,
  trackClassName,
  fillClassName,
  className,
}: AnimatedProgressBarProps) {
  const target = Math.max(0, Math.min(100, percent));
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    // Defer to the next frame so the CSS transition registers from 0.
    const id = window.requestAnimationFrame(() => setWidth(target));
    return () => window.cancelAnimationFrame(id);
  }, [target]);

  return (
    <div className={className}>
      <div
        className={cn(
          "relative h-3 w-full overflow-hidden rounded-full bg-gray-100",
          trackClassName,
        )}
      >
        <div
          role="progressbar"
          aria-valuenow={Math.round(target)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression de la cagnotte"
          className={cn(
            "relative h-full rounded-full bg-primary shadow-[0_0_10px_rgba(23,40,102,0.3)]",
            "transition-[width] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            "motion-reduce:transition-none",
            fillClassName,
          )}
          style={{ width: `${width}%` }}
        >
          {target > 0 ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-[50%] w-[50%] animate-progress-shimmer skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent"
            />
          ) : null}
        </div>
      </div>
      {label ? <div className="mt-3">{label}</div> : null}
    </div>
  );
}
