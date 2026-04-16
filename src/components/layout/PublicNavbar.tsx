"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  ChevronRight,
  HandHeart,
  HelpCircle,
  Home,
  Info,
  LogOut,
  Menu,
  User,
  Wallet,
  X,
} from "lucide-react";
import { Avatar, Button, ConfirmDialog } from "@/components/ui";
import { NAV_LABELS, MISC } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export interface PublicNavbarProps {
  className?: string;
}

type NavItem = { label: string; href: string; icon: typeof Home };

const NAV_ITEMS: NavItem[] = [
  { label: NAV_LABELS.accueil, href: "/", icon: Home },
  { label: NAV_LABELS.cagnottes, href: "/cagnottes", icon: HandHeart },
  { label: NAV_LABELS.comment, href: "/comment", icon: BookOpen },
  { label: NAV_LABELS.aide, href: "/aide", icon: HelpCircle },
  { label: NAV_LABELS.apropos, href: "/a-propos", icon: Info },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { label: NAV_LABELS.profil, href: "/profil", icon: User },
  { label: NAV_LABELS.notifications, href: "/notifications", icon: Bell },
  { label: NAV_LABELS.retirerMesFonds, href: "/retraits", icon: Wallet },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicNavbar({ className }: PublicNavbarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const closeBtnRef = React.useRef<HTMLButtonElement>(null);
  const { seller, loading, logout } = useAuth();
  const pathname = usePathname() ?? "";

  function openLogoutConfirm() {
    setMenuOpen(false);
    setMobileOpen(false);
    setLogoutConfirmOpen(true);
  }

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

  // Body scroll lock + Escape close + auto-focus while the mobile drawer
  // is open. Replaces the Modal component's built-in handling.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

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
                      onClick={openLogoutConfirm}
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

      {/* ─── Mobile drawer — premium full-height slide-in panel ───────────
          Replaces the previous centered Modal. Audited and rebuilt for
          mobile UX: identity card on top, sectioned navigation with
          icons + active state, sticky destructive logout at bottom.
          Always mounted on mobile (md:hidden) — transform + opacity
          gate visibility so the slide animation runs both ways. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        {/* Backdrop — tap closes */}
        <button
          type="button"
          aria-label="Fermer le menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Slide-in panel from the right */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              aria-label={MISC.siteName}
              className="flex items-center font-headings text-2xl font-black tracking-tighter text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
            >
              {MISC.brandMark}
              <span className="ml-1 text-base font-medium text-gray-400">
                {MISC.brandSuffix}
              </span>
            </Link>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer le menu"
              className="flex h-12 w-12 items-center justify-center rounded-full text-primary transition-colors hover:bg-pink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <X size={22} aria-hidden />
            </button>
          </div>

          {/* Scrollable middle */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
            {/* Identity card — only when logged in */}
            {!loading && seller ? (
              <div className="mb-6 rounded-2xl bg-gradient-to-br from-pink to-pink/40 p-4 ring-1 ring-pink/60">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={seller.displayName}
                    src={seller.avatarUrl}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-headings text-base font-black text-primary">
                      {seller.displayName}
                    </p>
                    <p className="truncate text-xs font-medium text-primary/70">
                      {seller.email}
                    </p>
                  </div>
                </div>
                <Link
                  href="/tableau-de-bord"
                  onClick={() => setMobileOpen(false)}
                  className="group relative mt-4 flex min-h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-sm transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-[50%] w-[50%] animate-button-shine-sweep bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  />
                  <span className="relative">{NAV_LABELS.tableauBord}</span>
                </Link>
              </div>
            ) : null}

            {/* Navigation section */}
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Navigation
            </p>
            <ul className="mb-6 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex min-h-14 items-center gap-3 rounded-xl px-3 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive
                          ? "bg-pink font-bold text-primary"
                          : "text-primary hover:bg-pink/40",
                      )}
                    >
                      <Icon
                        size={20}
                        aria-hidden
                        className={
                          isActive ? "text-primary" : "text-primary/60"
                        }
                      />
                      <span className="flex-1 text-base">{item.label}</span>
                      <ChevronRight
                        size={18}
                        aria-hidden
                        className={
                          isActive
                            ? "text-primary"
                            : "text-gray-300 transition-colors group-hover:text-primary/60"
                        }
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Account section — only when logged in */}
            {!loading && seller ? (
              <>
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Mon compte
                </p>
                <ul className="flex flex-col gap-1">
                  {ACCOUNT_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActivePath(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "group flex min-h-14 items-center gap-3 rounded-xl px-3 transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            isActive
                              ? "bg-pink font-bold text-primary"
                              : "text-primary hover:bg-pink/40",
                          )}
                        >
                          <Icon
                            size={20}
                            aria-hidden
                            className={
                              isActive ? "text-primary" : "text-primary/60"
                            }
                          />
                          <span className="flex-1 text-base">
                            {item.label}
                          </span>
                          <ChevronRight
                            size={18}
                            aria-hidden
                            className={
                              isActive
                                ? "text-primary"
                                : "text-gray-300 transition-colors group-hover:text-primary/60"
                            }
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </div>

          {/* Sticky bottom — auth action */}
          <div className="border-t border-gray-100 bg-white px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {loading ? null : seller ? (
              <button
                type="button"
                onClick={openLogoutConfirm}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <LogOut size={18} aria-hidden />
                {NAV_LABELS.seDeconnecter}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/connexion"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-bold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {NAV_LABELS.connexion}
                </Link>
                <Link
                  href="/inscription"
                  onClick={() => setMobileOpen(false)}
                  className="group relative flex min-h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-[#F4D3DE] px-4 py-3 text-sm font-black text-primary shadow-sm transition-all hover:bg-[#efc7d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-[50%] w-[50%] animate-button-shine-sweep bg-gradient-to-r from-transparent via-white/55 to-transparent"
                  />
                  <span className="relative">{NAV_LABELS.inscription}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        title="Se déconnecter ?"
        message="Tu vas être redirigé·e vers la page d'accueil."
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        tone="primary"
        onConfirm={async () => {
          await logout();
          setLogoutConfirmOpen(false);
        }}
      />
    </header>
  );
}
