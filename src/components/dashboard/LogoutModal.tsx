"use client";

import { useState } from "react";
import { Modal, Button } from "@/components/ui";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
}

export function LogoutModal({ open, onClose }: LogoutModalProps) {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await logout();
  }

  return (
    <Modal open={open} onClose={onClose} title="Déconnexion">
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Tu es sur le point de te déconnecter. Tu devras te reconnecter pour accéder à ton tableau de bord.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleConfirm}
            loading={loading}
          >
            <LogOut size={16} className="mr-1.5" />
            Se déconnecter
          </Button>
        </div>
      </div>
    </Modal>
  );
}
