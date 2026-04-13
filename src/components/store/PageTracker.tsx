"use client";

import { useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface PageTrackerProps {
  slug: string;
}

export function PageTracker({ slug }: PageTrackerProps) {
  useEffect(() => {
    const controller = new AbortController();

    // Detect timezone for accurate geo-location on the backend
    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch { /* fallback: backend will use headers */ }

    fetch(`${BACKEND_URL}/api/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        path: `/${slug}`,
        referrer: document.referrer || undefined,
        timezone,
      }),
      signal: controller.signal,
    }).catch(() => {});

    return () => controller.abort();
  }, [slug]);

  return null;
}
