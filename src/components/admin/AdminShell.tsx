"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Heart,
  Receipt,
  Wallet,
  Landmark,
  Flag,
  Bell,
  Settings,
  UserCog,
  ScrollText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { clearAdminCsrfToken, adminApi } from "@/lib/adminApi";

interface AdminShellProps {
  admin: { id: string; email: string; role: string; name: string };
  children: React.ReactNode;
}

type AdminRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Roles that can see this nav item. If omitted, all roles see it. */
  roles?: AdminRole[];
  /** Badge key from the badges API response */
  badgeKey?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Accueil", icon: LayoutDashboard },
  { href: "/admin/kyc", label: "KYC", icon: ShieldCheck, badgeKey: "pendingKyc" },
  { href: "/admin/sellers", label: "Vendeurs", icon: Users, badgeKey: "newSellersWeek" },
  { href: "/admin/cagnottes", label: "Cagnottes", icon: Heart },
  { href: "/admin/orders", label: "Commandes", icon: Receipt, badgeKey: "todayOrders" },
  { href: "/admin/retraits", label: "Retraits", icon: Wallet, badgeKey: "pendingWithdrawals" },
  { href: "/admin/wallet", label: "Wallet", icon: Landmark, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/reports", label: "Signalements", icon: Flag, badgeKey: "pendingReports" },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/config", label: "Config", icon: Settings, roles: ["SUPER_ADMIN"] },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: UserCog, roles: ["SUPER_ADMIN"] },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
];

// Bottom nav shows only the most important items on mobile
const MOBILE_NAV_HREFS = ["/admin", "/admin/kyc", "/admin/orders", "/admin/retraits", "/admin/sellers"];

// ── Badge type ──
interface Badges {
  pendingKyc: number;
  pendingWithdrawals: number;
  pendingReports: number;
  todayOrders: number;
  newSellersWeek: number;
}

const EMPTY_BADGES: Badges = {
  pendingKyc: 0,
  pendingWithdrawals: 0,
  pendingReports: 0,
  todayOrders: 0,
  newSellersWeek: 0,
};

export function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [badges, setBadges] = React.useState<Badges>(EMPTY_BADGES);

  const role = admin.role as AdminRole;

  // Filter nav items by role
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  const visibleMobileItems = visibleItems.filter((item) =>
    MOBILE_NAV_HREFS.includes(item.href),
  );

  // Poll badges every 60s
  React.useEffect(() => {
    let cancelled = false;

    async function fetchBadges() {
      try {
        const data = await adminApi<Badges>("/api/admin/dashboard/badges");
        if (!cancelled) setBadges(data);
      } catch {
        // silent — badges are non-critical
      }
    }

    fetchBadges();
    const interval = setInterval(fetchBadges, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function getBadgeCount(item: NavItem): number {
    if (!item.badgeKey) return 0;
    const count = badges[item.badgeKey as keyof Badges] ?? 0;
    // Don't show badge if user is already on this page
    if (isActive(item.href)) return 0;
    return count;
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    clearAdminCsrfToken();
    router.replace("/admin/connexion");
  }

  // Close sidebar on route change
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#172866] text-white">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-white/10">
          <span className="text-lg font-bold tracking-tight">cagnotte.sn</span>
          <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold uppercase">
            Admin
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const badgeCount = getBadgeCount(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Admin info + logout */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-1 truncate text-sm text-white/80 font-medium">
            {admin.name || admin.email}
          </div>
          <div className="mb-3 text-xs text-white/40 uppercase tracking-wide">
            {role === "SUPER_ADMIN" ? "Super Admin" : role === "SUPPORT" ? "Support" : "Admin"}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Deconnexion
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between bg-[#172866] px-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">cagnotte.sn</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
            Admin
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 hover:bg-white/10"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile slide-over sidebar ── */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#172866] text-white pt-14">
            <nav className="overflow-y-auto px-3 py-4 space-y-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const badgeCount = getBadgeCount(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {badgeCount > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 px-4 py-4">
              <div className="mb-1 truncate text-sm text-white/80 font-medium">
                {admin.name || admin.email}
              </div>
              <div className="mb-3 text-xs text-white/40 uppercase tracking-wide">
                {role === "SUPER_ADMIN" ? "Super Admin" : role === "SUPPORT" ? "Support" : "Admin"}
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Deconnexion
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-gray-200 bg-white px-2 pb-safe">
        {visibleMobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const badgeCount = getBadgeCount(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
                active ? "text-[#172866]" : "text-gray-500"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badgeCount > 0 ? (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                ) : null}
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Main content area ── */}
      <div className="flex-1 min-w-0 md:ml-64 mt-14 md:mt-0 mb-20 md:mb-0">
        {children}
      </div>
    </div>
  );
}
