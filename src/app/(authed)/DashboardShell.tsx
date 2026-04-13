"use client";

import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { useAuth } from "@/contexts/AuthContext";

// Client island that wraps the Phase 3 DashboardNavbar so we can pass the
// AuthContext logout callback without turning the (authed) layout into a
// client component. Server layout owns the redirect-guard, this wrapper
// owns the logout action.
//
// unreadCount is hardcoded to 0 in v1 — Phase 6 will wire the bell badge
// to /api/notifications/count via a small client island.

interface DashboardShellProps {
  seller: { displayName: string; avatarUrl: string | null };
}

export function DashboardShell({ seller }: DashboardShellProps) {
  const { logout } = useAuth();
  return (
    <DashboardNavbar seller={seller} unreadCount={0} onLogout={logout} />
  );
}
