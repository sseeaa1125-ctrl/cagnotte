"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  User,
  Wallet,
} from "lucide-react";
import { Avatar, ConfirmDialog } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { PROFILE_SIDEBAR } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// ProfileShell — replaces the old <ProfileSidebar> Ring-2 server block.
//
// Why this exists:
//   - Old layout stacked the avatar card + 5 nav items + logout ABOVE the
//     page content on mobile. Users had to scroll past the entire sidebar
//     every time they navigated. Terrible UX.
//   - Old "logout" was a <Link href="/connexion"> that didn't call the
//     actual logout endpoint — session stayed alive.
//   - Each page re-fetched /api/auth/me independently. With this shell +
//     serverProfile.ts::getProfileSeller (React.cache), the fetch is
//     deduped across the layout + page for each request.
//
// Layout contract:
//   - Mobile (< md): compact identity row (avatar + name + KYC pill on ONE
//     row), horizontal sticky tab bar below the DashboardNavbar, content
//     card pleine largeur, logout CTA at the bottom of the page.
//   - Desktop (≥ md): classic 2-column — sticky sidebar (identity card +
//     vertical nav + logout button) + content card.
//   - Active tab derived from usePathname() so callers never pass it.
//   - Logout opens a ConfirmDialog and calls useAuth().logout() — real
//     session invalidation, then redirect via AuthContext.
// ─────────────────────────────────────────────────────────────────────────

export interface ProfileShellSeller {
  displayName: string;
  avatarUrl: string | null;
  email: string;
  kycStatus: string;
}

export interface ProfileShellProps {
  seller: ProfileShellSeller;
  children: React.ReactNode;
}

interface TabDef {
  href: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    "aria-hidden"?: boolean;
  }>;
}

const TABS: readonly TabDef[] = [
  {
    href: "/profil",
    label: "Informations personnelles",
    shortLabel: "Profil",
    icon: User,
  },
  {
    href: "/profil/securite",
    label: "Sécurité & Mot de passe",
    shortLabel: "Sécurité",
    icon: Lock,
  },
  {
    href: "/profil/coordonnees-bancaires",
    label: "Retrait",
    shortLabel: "Retrait",
    icon: Wallet,
  },
  {
    href: "/profil/preferences",
    label: "Préférences de notification",
    shortLabel: "Notifs",
    icon: Bell,
  },
  {
    href: "/profil/kyc",
    label: "Vérification d'identité",
    shortLabel: "Identité",
    icon: ShieldCheck,
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/profil") return pathname === "/profil";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function KycPill({ status }: { status: string }) {
  const base =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold";
  if (status === "APPROVED") {
    return (
      <span className={cn(base, "bg-accent text-success")}>
        <ShieldCheck size={12} aria-hidden />
        Vérifié
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className={cn(base, "bg-amber-50 text-amber-700")}>
        <ShieldQuestion size={12} aria-hidden />
        En cours
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className={cn(base, "bg-red-50 text-red-700")}>
        <ShieldAlert size={12} aria-hidden />
        Refusé
      </span>
    );
  }
  return (
    <span className={cn(base, "bg-gray-100 text-gray-600")}>
      <ShieldQuestion size={12} aria-hidden />
      Non vérifié
    </span>
  );
}

export function ProfileShell({ seller, children }: ProfileShellProps) {
  const pathname = usePathname() ?? "";
  const { logout, loggingOut } = useAuth();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  const activeTab = TABS.find((t) => isActivePath(pathname, t.href));
  const pageTitle = activeTab?.label ?? "Mon profil";

  async function handleLogout() {
    await logout();
    setLogoutOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* ─── MOBILE IDENTITY HEADER ───────────────────────────────────
          Single compact row — avatar + name/email + KYC pill. Stays
          BEFORE the sticky tabs so it scrolls away. Card padding p-4
          keeps it breathable without eating vertical space. */}
      <header className="mb-4 md:hidden">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <Avatar
            name={seller.displayName}
            src={seller.avatarUrl}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-headings text-base font-bold text-primary">
              {seller.displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {seller.email}
            </p>
          </div>
          <KycPill status={seller.kycStatus} />
        </div>
      </header>

      {/* ─── MOBILE STICKY TAB BAR ────────────────────────────────────
          Horizontal scroll chips. Sticks under the DashboardNavbar
          (h-16 = top-16). Full-bleed on mobile via negative margins
          that match the page's px-3 / sm:px-4 padding. Backdrop-blur
          so content underneath stays subtly visible while scrolling. */}
      <nav
        aria-label="Navigation du profil"
        className="sticky top-16 z-20 -mx-3 mb-5 bg-gray-50/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 sm:-mx-4 sm:px-4 md:hidden"
      >
        <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const active = isActivePath(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white text-primary ring-1 ring-border hover:bg-pink/40 hover:ring-primary/20",
                  )}
                >
                  <Icon size={16} aria-hidden />
                  <span>{tab.shortLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ─── 2-COLUMN GRID ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        {/* Desktop sidebar — hidden on mobile */}
        <aside className="hidden md:block md:w-[18rem] md:shrink-0 lg:w-[20rem]">
          <div className="sticky top-24 flex flex-col gap-4">
            {/* Identity card */}
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-sm">
              <Avatar
                name={seller.displayName}
                src={seller.avatarUrl}
                size="xl"
              />
              <div className="min-w-0 max-w-full">
                <p className="font-headings text-lg font-bold text-primary">
                  {seller.displayName}
                </p>
                <p className="mt-0.5 break-all text-xs text-muted-foreground">
                  {seller.email}
                </p>
              </div>
              <KycPill status={seller.kycStatus} />
            </div>

            {/* Nav card */}
            <nav
              aria-label="Navigation du profil"
              className="rounded-3xl bg-white p-3 shadow-sm"
            >
              <ul className="flex flex-col gap-0.5">
                {TABS.map((tab) => {
                  const active = isActivePath(pathname, tab.href);
                  const Icon = tab.icon;
                  return (
                    <li key={tab.href}>
                      <Link
                        href={tab.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          active
                            ? "bg-primary text-white shadow-sm"
                            : "text-primary hover:bg-pink/40",
                        )}
                      >
                        <Icon
                          size={18}
                          aria-hidden
                          className={active ? "" : "text-primary/60"}
                        />
                        <span className="flex-1 truncate">{tab.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="my-2 border-t border-border" aria-hidden />

              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
              >
                <LogOut size={18} aria-hidden />
                <span>{PROFILE_SIDEBAR.logout}</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* ─── CONTENT COLUMN ──────────────────────────────────────── */}
        <section className="min-w-0 flex-1">
          {/* Mobile: page title lives OUTSIDE the content card so the
              sticky tabs read as a navigation rail, not a section label. */}
          <div className="mb-3 px-1 md:hidden">
            <h1 className="font-headings text-xl font-black leading-tight text-primary">
              {pageTitle}
            </h1>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5 md:p-7">
            {/* Desktop: title lives at the top of the content card */}
            <div className="mb-5 hidden md:block">
              <h1 className="font-headings text-2xl font-black text-primary md:text-3xl">
                {pageTitle}
              </h1>
            </div>

            {children}
          </div>

          {/* Mobile logout — AT THE BOTTOM of the content, not at the top */}
          <div className="mt-6 md:hidden">
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              <LogOut size={18} aria-hidden />
              {PROFILE_SIDEBAR.logout}
            </button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Se déconnecter ?"
        message="Tu vas être redirigé·e vers la page d'accueil."
        confirmLabel={loggingOut ? "Déconnexion…" : "Se déconnecter"}
        cancelLabel="Annuler"
        tone="primary"
        onConfirm={handleLogout}
      />
    </div>
  );
}
