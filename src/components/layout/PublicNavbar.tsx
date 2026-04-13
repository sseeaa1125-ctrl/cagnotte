"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Avatar, Button, Modal } from "@/components/ui";
import { NAV_LABELS, MISC } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export interface PublicNavbarProps {
  className?: string;
}

const NAV_ITEMS: Array<{ label: string; href: string }> = [
  { label: NAV_LABELS.accueil, href: "/" },
  { label: NAV_LABELS.cagnottes, href: "/cagnottes" },
  { label: NAV_LABELS.comment, href: "/comment" },
  { label: NAV_LABELS.apropos, href: "/a-propos" },
];

export function PublicNavbar({ className }: PublicNavbarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { seller, loading, logout } = useAuth();

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
          href="/"
          aria-label={MISC.siteName}
          className="flex items-center font-headings text-2xl font-black tracking-tighter text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
        >
          {MISC.brandMark}
          <span className="ml-1 text-lg font-medium text-gray-400">
            {MISC.brandSuffix}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
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

        {/* Right CTAs (desktop) — dynamic auth state (Phase 8 fixpack) */}
        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <div
              className="h-10 w-32 animate-pulse rounded-md bg-muted"
              aria-hidden
            />
          ) : seller ? (
            <>
              <Button as="a" href="/tableau-de-bord" variant="ghost">
                {NAV_LABELS.tableauBord}
              </Button>
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
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
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
                      href="/notifications"
                      role="menuitem"
                      className="flex min-h-12 items-center px-4 text-sm text-primary hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                    >
                      {NAV_LABELS.notifications}
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
                        logout();
                      }}
                      className="flex min-h-12 w-full items-center px-4 text-left text-sm text-primary hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                    >
                      {NAV_LABELS.seDeconnecter}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Button as="a" href="/connexion" variant="ghost">
                {NAV_LABELS.connexion}
              </Button>
              <Button as="a" href="/inscription" variant="primary">
                {NAV_LABELS.inscription}
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-md text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile nav modal */}
      <Modal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={MISC.siteName}
        size="sm"
      >
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex min-h-12 items-center rounded-lg px-4 text-base font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            {loading ? null : seller ? (
              <>
                <Button
                  as="a"
                  href="/tableau-de-bord"
                  variant="primary"
                  fullWidth
                >
                  {NAV_LABELS.tableauBord}
                </Button>
                <Button
                  as="a"
                  href="/profil"
                  variant="ghost"
                  fullWidth
                >
                  {NAV_LABELS.profil}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                >
                  {NAV_LABELS.seDeconnecter}
                </Button>
              </>
            ) : (
              <>
                <Button as="a" href="/connexion" variant="ghost" fullWidth>
                  {NAV_LABELS.connexion}
                </Button>
                <Button as="a" href="/inscription" variant="primary" fullWidth>
                  {NAV_LABELS.inscription}
                </Button>
              </>
            )}
          </div>
        </nav>
      </Modal>
    </header>
  );
}
