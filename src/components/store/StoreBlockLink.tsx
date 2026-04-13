"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, type ReactNode, type MouseEvent } from "react";

interface StoreBlockLinkProps {
  href: string;
  children: ReactNode;
}

export function StoreBlockLink({ href, children }: StoreBlockLinkProps) {
  const [navigating, setNavigating] = useState(false);

  const handleClick = useCallback((e: MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    setNavigating(true);
  }, []);

  // Safety reset après 10s (réseau très lent)
  useEffect(() => {
    if (!navigating) return;
    const t = setTimeout(() => setNavigating(false), 10000);
    return () => clearTimeout(t);
  }, [navigating]);

  return (
    <Link href={href} onClick={handleClick} className="block">
      <div
        className={navigating ? "nav-breathing" : ""}
        style={{
          transition: "transform 350ms cubic-bezier(0.2, 0, 0, 1)",
          transform: navigating ? "scale(0.96)" : "scale(1)",
          pointerEvents: navigating ? "none" : undefined,
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--theme-card-radius, 16px)",
        }}
      >
        {children}
        {navigating && (
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{ overflow: "hidden", borderRadius: "var(--theme-card-radius, 16px)" }}
          >
            {/* Tint coloré sur toute la card */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: "var(--theme-primary, #0D9488)",
                opacity: 0.08,
              }}
            />
            {/* Shimmer sweep : ombre + reflet visible sur fond clair ET sombre */}
            <div
              className="absolute inset-0 nav-shimmer-sweep"
              style={{
                background: "linear-gradient(105deg, transparent 30%, rgba(0,0,0,0.04) 42%, rgba(255,255,255,0.45) 50%, rgba(0,0,0,0.04) 58%, transparent 70%)",
              }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
