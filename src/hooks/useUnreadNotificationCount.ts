"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { api, ApiError } from "@/lib/api";

const POLL_INTERVAL_MS = 60_000;

/**
 * Polls /api/notifications/count every 60s and on visibility change.
 * Re-fetches on pathname change so navigating to /notifications
 * after marking items read updates the count immediately.
 */
export function useUnreadNotificationCount(): number {
  const [count, setCount] = React.useState(0);
  const pathname = usePathname();

  React.useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const data = await api<{ total: number; unread: number }>(
          "/api/notifications/count",
        );
        if (!cancelled && typeof data.unread === "number") {
          setCount(data.unread);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
      }
    }

    fetchCount();
    const interval = window.setInterval(fetchCount, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return count;
}
