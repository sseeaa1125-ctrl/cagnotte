"use client";

// ─────────────────────────────────────────────────────────────────────────
// CSS-only confetti burst. 12 absolutely-positioned span particles with
// randomized horizontal offsets and colors from the cagnottes.sn palette
// (navy / pink / cream / trustpilot green). Plays once on mount, 1.8s total.
// Zero new npm deps — Framer Motion is banned by CLAUDE.md.
// ─────────────────────────────────────────────────────────────────────────

const COLORS = ["#172866", "#F4D3DE", "#FEF4E3", "#00B67A", "#FBE6ED"] as const;

// Deterministic pseudo-random: keeps the server + client render stable
// even though this component is "use client" (hydration match not required
// because it renders post-mount via React, but stable offsets look better).
function stableOffsets(count: number): number[] {
  return Array.from({ length: count }).map((_, i) =>
    Math.round(((i * 137) % 100) + ((i * 31) % 10)),
  );
}

export function ConfettiBurst() {
  const offsets = stableOffsets(14);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[60vh] overflow-hidden"
    >
      <style>{`
        @keyframes cagnottes-confetti-fall {
          0%   { transform: translate3d(0,-20%, 0) rotate(0deg);   opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate3d(0, 120vh, 0) rotate(540deg); opacity: 0; }
        }
        .cagnottes-confetti-piece {
          position: absolute;
          top: -20%;
          width: 10px;
          height: 14px;
          border-radius: 2px;
          animation-name: cagnottes-confetti-fall;
          animation-duration: 1.8s;
          animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
          animation-fill-mode: forwards;
        }
      `}</style>
      {offsets.map((off, i) => {
        const color = COLORS[i % COLORS.length];
        const delay = (i * 60) % 320;
        return (
          <span
            key={i}
            className="cagnottes-confetti-piece"
            style={{
              left: `${off}%`,
              backgroundColor: color,
              animationDelay: `${delay}ms`,
              transform: `rotate(${(i * 43) % 180}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
