"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui";
import { NAV_LABELS, MISC } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface DashboardNavbarProps {
  seller: { displayName: string; avatarUrl: string | null } | null;
  onLogout: () => void;
  className?: string;
}

const NAV_ITEMS: Array<{ label: string; href: string }> = [
  { label: NAV_LABELS.tableauBord, href: "/tableau-de-bord" },
  { label: NAV_LABELS.mesContributions, href: "/participations" },
  { label: NAV_LABELS.notifications, href: "/notifications" },
];

export function DashboardNavbar({
  seller,
  onLogout,
  className,
}: DashboardNavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        e.target instanceof Node &&
        !menuRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  // Close the dropdown whenever the active route changes. Handles every
  // navigation path — menu item clicks, center-nav clicks, browser back/
  // forward — without each Link needing its own onClick handler.
  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!seller) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background",
        className,
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo — two-tone lowercase wordmark (Banani phase-7 navbar-logo) */}
        <Link
          href="/tableau-de-bord"
          aria-label={MISC.siteName}
          className="flex items-center font-headings text-2xl font-black tracking-tighter text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
        >
          {MISC.brandMark}
          <span className="ml-1 text-lg font-medium text-gray-400">
            {MISC.brandSuffix}
          </span>
        </Link>

        {/* Center nav (desktop) */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: avatar only. The standalone notification bell was removed —
            the desktop center nav already has a "Notifications" link and the
            mobile BottomNav owns the notifications tab. One entry point per
            context, no duplicate bell. */}
        <div className="flex items-center gap-2">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Ouvrir le menu du compte"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <Avatar
                name={seller.displayName}
                src={seller.avatarUrl}
                size="md"
              />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-background shadow-lg"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-primary">
                    {seller.displayName}
                  </p>
                </div>
                <Link
                  href="/profil"
                  role="menuitem"
                  className="flex min-h-12 items-center px-4 text-sm text-primary hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                >
                  {NAV_LABELS.profil}
                </Link>
                <Link
                  href="/retraits"
                  role="menuitem"
                  className="flex min-h-12 items-center px-4 text-sm text-primary hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                >
                  {NAV_LABELS.retirerMesFonds}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="flex min-h-12 w-full items-center px-4 text-left text-sm text-primary hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                >
                  {NAV_LABELS.seDeconnecter}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
