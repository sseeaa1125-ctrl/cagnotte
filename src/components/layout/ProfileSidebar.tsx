import * as React from "react";
import Link from "next/link";
import {
  User,
  Lock,
  CreditCard,
  Bell,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  LogOut,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { SidebarNav, type SidebarNavItem } from "./SidebarNav";
import { PROFILE_SIDEBAR } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — Ring 2 composed block. Server-safe (no "use client").
//
// Ring 2 purity rule: NO `api()`, NO `useApi`, NO fetch. Props-only. Data
// comes from the page (server component) that fetches GET /api/auth/me once
// and forwards the relevant fields via the `seller` prop.
//
// Banani screen 17 left column: profile card (avatar + name + email + KYC
// pill) stacked above a vertical SidebarNav with 5 tabs + divider + logout.
// Right column = children (white rounded-3xl card).
// ─────────────────────────────────────────────────────────────────────────

export type ProfileSidebarTab =
  | "profile"
  | "security"
  | "bank"
  | "preferences"
  | "kyc";

export interface ProfileSidebarProps {
  activeTab: ProfileSidebarTab;
  seller: {
    displayName: string;
    avatarUrl: string | null;
    email: string;
    kycStatus: string;
  };
  children: React.ReactNode;
  className?: string;
}

function KycPill({ status }: { status: string }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
        <ShieldCheck size={12} aria-hidden />
        {PROFILE_SIDEBAR.kycApproved}
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
        <ShieldQuestion size={12} aria-hidden />
        {PROFILE_SIDEBAR.kycPending}
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        <ShieldAlert size={12} aria-hidden />
        {PROFILE_SIDEBAR.kycRejected}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
        <ShieldQuestion size={12} aria-hidden />
        {PROFILE_SIDEBAR.kycNone}
      </span>
      <Link
        href="/profil/kyc"
        className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {PROFILE_SIDEBAR.kycCta}
      </Link>
    </div>
  );
}

export function ProfileSidebar({
  activeTab,
  seller,
  children,
  className,
}: ProfileSidebarProps) {
  const navItems: SidebarNavItem[] = [
    {
      label: PROFILE_SIDEBAR.tabProfile,
      href: "/profil",
      icon: <User size={18} />,
      active: activeTab === "profile",
    },
    {
      label: PROFILE_SIDEBAR.tabSecurity,
      href: "/profil/securite",
      icon: <Lock size={18} />,
      active: activeTab === "security",
    },
    {
      label: PROFILE_SIDEBAR.tabBank,
      href: "/profil/coordonnees-bancaires",
      icon: <CreditCard size={18} />,
      active: activeTab === "bank",
    },
    {
      label: PROFILE_SIDEBAR.tabPreferences,
      href: "/profil/preferences",
      icon: <Bell size={18} />,
      active: activeTab === "preferences",
    },
    {
      label: PROFILE_SIDEBAR.tabKyc,
      href: "/profil/kyc",
      icon: <ShieldCheck size={18} />,
      active: activeTab === "kyc",
    },
  ];

  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:gap-8", className)}>
      {/* Left column — profile card + nav */}
      <aside className="w-full md:w-1/3 md:max-w-xs">
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-sm">
          <Avatar
            name={seller.displayName}
            src={seller.avatarUrl}
            size="xl"
          />
          <div>
            <p className="font-headings text-lg font-bold text-primary">
              {seller.displayName}
            </p>
            <p className="text-xs text-muted-foreground">{seller.email}</p>
          </div>
          <KycPill status={seller.kycStatus} />
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          <SidebarNav items={navItems} />
          <div className="my-2 border-t border-border" aria-hidden />
          <Link
            href="/connexion"
            className="flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            <LogOut size={18} aria-hidden />
            <span>{PROFILE_SIDEBAR.logout}</span>
          </Link>
        </div>
      </aside>

      {/* Right column — page content */}
      <section className="flex-1 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        {children}
      </section>
    </div>
  );
}
