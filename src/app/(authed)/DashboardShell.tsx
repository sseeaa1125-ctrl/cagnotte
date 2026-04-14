"use client";

import * as React from "react";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { ConfirmDialog } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";

// Client island that wraps the Phase 3 DashboardNavbar so we can pass the
// AuthContext logout callback without turning the (authed) layout into a
// client component. Server layout owns the redirect-guard, this wrapper
// owns the logout action + confirmation dialog.
//
// unreadCount is hardcoded to 0 in v1 — Phase 6 will wire the bell badge
// to /api/notifications/count via a small client island.

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
        unreadCount={0}
        onLogout={() => setConfirmOpen(true)}
      />
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
