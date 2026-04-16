"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, LayoutDashboard } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Mobile bottom navigation — shown only when the user is authenticated.
//
// Layout contract:
//   - Fixed to the bottom edge of the viewport (z-40, same tier as the
//     top DashboardNavbar — they don't overlap).
//   - Full-width 3-tab strip, equal-width tabs via flex-1.
//   - Safe-area-inset-bottom so the tab labels stay above the iOS home
//     indicator. Paired with `main { padding-bottom: 180px }` in
//     globals.css so the content never slides under it.
//   - Hidden at md+ (desktop uses the top DashboardNavbar's center nav
//     instead — one pattern per breakpoint).
//   - Active state: primary color + a 2px bar hugging the top edge of the
//     active tab. usePathname() for detection, no prop drilling.
//
// Audit 026 HIGH-1: owns its own `/api/notifications/count` polling so the
// red unread dot on the Notifs tab actually updates. Polls every 60s and
// re-fetches whenever the tab becomes visible (user returns from another
// app / tab). 401s are swallowed silently — they happen during transient
// auth-refresh windows and shouldn't nuke the component.
// ─────────────────────────────────────────────────────────────────────────

export interface BottomNavProps {
  className?: string;
}

const POLL_INTERVAL_MS = 60_000;

function useUnreadNotificationCount(): number {
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
        // Silent on 401 — the user is mid auth-refresh, not an error.
        // Also silent on network errors — we'll retry on the next tick.
        if (err instanceof ApiError && err.status === 401) return;
        // For any other error, keep the previous count (don't reset to 0).
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
    // `pathname` in deps so a navigation — especially TO /notifications
    // after marking items read — triggers an immediate re-fetch.
  }, [pathname]);

  return count;
}

interface TabDef {
  href: string;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    "aria-hidden"?: boolean;
  }>;
}

const TABS: readonly TabDef[] = [
  {
    href: "/tableau-de-bord",
    label: "Accueil",
    icon: LayoutDashboard,
  },
  {
    href: "/participations",
    label: "Mes dons",
    icon: Heart,
  },
  {
    href: "/notifications",
    label: "Notifs",
    icon: Bell,
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname() ?? "";
  const unreadCount = useUnreadNotificationCount();

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white shadow-[0_-4px_16px_rgba(23,40,102,0.06)] md:hidden",
        className,
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex h-16">
        {TABS.map((tab) => {
          const active = isActivePath(pathname, tab.href);
          const Icon = tab.icon;
          const isNotifs = tab.href === "/notifications";
          const showBadge = isNotifs && unreadCount > 0;
          return (
            <li key={tab.href} className="relative flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full min-h-12 flex-col items-center justify-center gap-1 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {active ? (
                  <span
                    className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-primary"
                    aria-hidden
                  />
                ) : null}

                <span className="relative flex h-6 w-6 items-center justify-center">
                  <Icon size={22} aria-hidden />
                  {showBadge ? (
                    <span
                      className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white ring-2 ring-white"
                      aria-hidden
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </span>

                <span
                  className={cn(
                    "text-[11px] leading-none tracking-tight",
                    active ? "font-bold" : "font-semibold",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
