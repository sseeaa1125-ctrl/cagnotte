"use client";

import * as React from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { ConfirmDialog } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";

// Client island that wraps the DashboardNavbar + BottomNav so we can pass
// the AuthContext logout callback without turning the (authed) layout into
// a client component. Server layout owns the redirect-guard, this wrapper
// owns the logout action + confirmation dialog + mobile bottom nav.
//
// Audit 026 HIGH-1: BottomNav owns its own /api/notifications/count polling
// now. No unreadCount prop drilling from here.

interface DashboardShellProps {
  seller: { displayName: string; avatarUrl: string | null };
}

export function DashboardShell({ seller }: DashboardShellProps) {
  const { logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  async function handleLogout() {
    await logout();
    // AuthContext's logout handles the redirect; we only close the dialog
    // in case the redirect is delayed.
    setConfirmOpen(false);
  }

  return (
    <>
      <DashboardNavbar
        seller={seller}
        onLogout={() => setConfirmOpen(true)}
      />
      <BottomNav />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Se déconnecter ?"
        message="Tu vas être redirigé·e vers la page de connexion."
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        tone="primary"
        onConfirm={handleLogout}
      />
    </>
  );
}
