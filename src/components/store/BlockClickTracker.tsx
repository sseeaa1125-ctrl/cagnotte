"use client";

import { useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface BlockClickTrackerProps {
  slug: string;
  blockId: string;
  children: React.ReactNode;
}

export function BlockClickTracker({ slug, blockId, children }: BlockClickTrackerProps) {
  const trackClick = useCallback(() => {
    fetch(`${BACKEND_URL}/api/analytics/block-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, blockId }),
    }).catch(() => {});
  }, [slug, blockId]);

  return (
    <div onClick={trackClick} className="contents">
      {children}
    </div>
  );
}
