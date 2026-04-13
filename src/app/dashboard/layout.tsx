"use client";

import { useState, useEffect, useCallback } from "react";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { BottomTabBar } from "@/components/dashboard/BottomTabBar";
import { MobileDrawer } from "@/components/dashboard/MobileDrawer";
import { LogoutModal } from "@/components/dashboard/LogoutModal";
import { PushNotificationPrompt } from "@/components/dashboard/PushNotificationPrompt";
import { DashboardShellSkeleton } from "@/components/ui";
import { ProductTour } from "@/components/dashboard/ProductTour";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DevTools } from "@/components/DevTools";
import { RefreshCw, Clock } from "lucide-react";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { seller, loading, loggingOut, error, refreshSeller } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("izy-sidebar-collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleStorage = () => {
      setSidebarCollapsed(localStorage.getItem("izy-sidebar-collapsed") === "true");
    };
    window.addEventListener("storage", handleStorage);
    // Also listen for custom event from sidebar toggle
    const handleCustom = () => {
      setSidebarCollapsed(localStorage.getItem("izy-sidebar-collapsed") === "true");
    };
    window.addEventListener("sidebar-toggle", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sidebar-toggle", handleCustom);
    };
  }, []);

  const handleCloseDrawer = useCallback(() => setDrawerOpen(false), []);
  const handleOpenLogout = useCallback(() => setLogoutOpen(true), []);
  const handleCloseLogout = useCallback(() => setLogoutOpen(false), []);

  // FL2: Redirect to onboarding if not completed
  useEffect(() => {
    if (seller && !seller.onboardingCompleted) {
      window.location.href = "/onboarding";
    }
  }, [seller]);

  if (loading || loggingOut) {
    return <DashboardShellSkeleton />;
  }

  if (!seller) {
    const isRateLimit = error?.includes("Trop de requêtes");
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-gray-50 px-6 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${isRateLimit ? "bg-amber-100" : "bg-red-50"}`}>
          {isRateLimit ? (
            <Clock size={28} className="text-amber-600" />
          ) : (
            <RefreshCw size={28} className="text-red-400" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {isRateLimit ? "Doucement !" : "Impossible de charger ton compte"}
          </h2>
          {error && (
            <p className="mt-1.5 text-sm text-gray-500 max-w-xs mx-auto">{error}</p>
          )}
        </div>
        <button
          onClick={() => refreshSeller()}
          className="flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 active:scale-[0.98]"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] lg:block lg:h-auto lg:min-h-[100dvh] bg-gray-50 overflow-x-hidden">
      <Sidebar
        sellerName={seller.displayName}
        sellerSlug={seller.slug}
        sellerAvatar={seller.avatarUrl}
        sellerEmail={seller.email}
        sellerPlan={seller.plan}
        onLogout={handleOpenLogout}
      />
      <TopBar
        sellerName={seller.displayName}
        sellerSlug={seller.slug}
        sellerAvatar={seller.avatarUrl}
        onMenuOpen={() => setDrawerOpen(true)}
      />
      <MobileDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        sellerName={seller.displayName}
        sellerSlug={seller.slug}
        sellerAvatar={seller.avatarUrl}
        onLogout={handleOpenLogout}
      />

      <main
        className={`flex flex-1 flex-col overflow-y-auto overscroll-contain lg:overflow-visible lg:flex-none lg:pt-0 lg:pb-0 transition-all duration-300 ease-in-out ${sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-60"}`}
      >
        <div className="flex flex-1 flex-col px-3 py-4 sm:p-4 lg:p-6">{children}</div>
      </main>

      <BottomTabBar />
      <PushNotificationPrompt />
      <ProductTour />
      <DevTools />
      <LogoutModal open={logoutOpen} onClose={handleCloseLogout} />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <DashboardShell>{children}</DashboardShell>
      </NotificationProvider>
    </AuthProvider>
  );
}
