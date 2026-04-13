"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminApi } from "@/lib/adminApi";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Wallet,
  Shield,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Flag,
  CreditCard,
} from "lucide-react";

interface BadgeCounts {
  kyc: number;
  withdrawals: number;
  reports: number;
  orders: number;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, badgeKey: null },
  { href: "/admin/sellers", label: "Vendeurs", icon: Users, badgeKey: null },
  { href: "/admin/reports", label: "Signalements", icon: Flag, badgeKey: "reports" as const },
  { href: "/admin/orders", label: "Paiements", icon: ShoppingCart, badgeKey: "orders" as const },
  { href: "/admin/withdrawals", label: "Retraits", icon: Wallet, badgeKey: "withdrawals" as const },
  { href: "/admin/kyc", label: "KYC", icon: Shield, badgeKey: "kyc" as const },
  { href: "/admin/analytics", label: "Analytics", icon: Activity, badgeKey: null },
  { href: "/admin/payment-methods", label: "Modes de paiement", icon: CreditCard, badgeKey: null },
  { href: "/admin/system", label: "Système", icon: Settings, badgeKey: null },
];

function AdminSidebar({
  collapsed,
  onToggle,
  onLogout,
  badges,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  badges: BadgeCounts | null;
}) {
  const pathname = usePathname();
  const { admin } = useAdminAuth();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col border-r border-gray-800 bg-gray-950 transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
              <span className="text-sm font-bold text-white">I</span>
            </div>
            <span className="text-sm font-bold text-white">Admin</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const badgeCount = item.badgeKey && badges ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-teal-600/10 text-teal-400"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
              {badgeCount > 0 && (
                <span className={`flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ${
                  collapsed ? "absolute -top-1 -right-1 h-4 w-4" : "ml-auto h-5 min-w-5 px-1.5"
                }`}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-3">
        {!collapsed && admin && (
          <div className="mb-3 px-2">
            <p className="text-xs font-medium text-white truncate">{admin.name}</p>
            <p className="text-xs text-gray-500 truncate">{admin.role}</p>
          </div>
        )}
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors w-full ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "Déconnexion" : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}

function AdminMobileHeader({
  onMenuOpen,
  onLogout,
}: {
  onMenuOpen: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex h-14 items-center justify-between border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 lg:hidden transform-[translate3d(0,0,0)]">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600">
            <span className="text-xs font-bold text-white">I</span>
          </div>
          <span className="text-sm font-bold text-white">Admin</span>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400"
      >
        <LogOut size={18} />
      </button>
    </header>
  );
}

function AdminMobileDrawer({
  open,
  onClose,
  badges,
}: {
  open: boolean;
  onClose: () => void;
  badges: BadgeCounts | null;
}) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-gray-950 border-r border-gray-800 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600">
              <span className="text-xs font-bold text-white">I</span>
            </div>
            <span className="text-sm font-bold text-white">Admin Izy</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const badgeCount = item.badgeKey && badges ? badges[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-600/10 text-teal-400"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {badgeCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, loading, logout } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [badges, setBadges] = useState<BadgeCounts | null>(null);

  const isLoginPage = pathname?.startsWith("/admin/login");

  // Fetch badge counts
  const fetchBadges = useCallback(async () => {
    try {
      const data = await adminApi<BadgeCounts>("/api/admin/dashboard/badges");
      setBadges(data);
    } catch {
      // Silently fail — badges are non-critical
    }
  }, []);

  useEffect(() => {
    if (admin && !isLoginPage) {
      fetchBadges();
      // Refresh badges every 60 seconds
      const interval = setInterval(fetchBadges, 60000);
      return () => clearInterval(interval);
    }
  }, [admin, isLoginPage, fetchBadges]);

  useEffect(() => {
    if (!loading && !admin && !isLoginPage) {
      router.replace("/admin/login");
    }
  }, [admin, loading, isLoginPage, router]);

  useEffect(() => {
    if (!loading && admin && isLoginPage) {
      router.replace("/admin");
    }
  }, [admin, loading, isLoginPage, router]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/admin/login");
  }, [logout, router]);

  // Login page — no shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-500" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
        onLogout={handleLogout}
        badges={badges}
      />
      <AdminMobileHeader
        onMenuOpen={() => setDrawerOpen(true)}
        onLogout={handleLogout}
      />
      <AdminMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        badges={badges}
      />

      <main
        className={`pt-14 lg:pt-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-60"
        }`}
      >
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
