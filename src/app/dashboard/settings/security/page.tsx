"use client";

import { useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { AlertTriangle } from "lucide-react";
import { SettingsSubPage } from "../_shared";

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const { logout } = useAuth();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api("/api/auth/account", {
        method: "DELETE",
      });
      toast("Compte supprimé");
      logout();
    } catch {
      toast("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsSubPage title="Sécurité">
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          Cette action est irréversible. Toutes tes données (page, blocs, commandes, clients)
          seront définitivement supprimées.
        </p>
        <Button
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
        >
          <AlertTriangle size={16} className="mr-1.5" />
          Supprimer mon compte
        </Button>
      </div>

      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText("");
        }}
        title="Supprimer mon compte"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              Cette action est définitive. Toutes tes données seront supprimées.
            </p>
          </div>
          <p className="text-sm text-gray-600">
            Tape <span className="font-bold text-gray-900">SUPPRIMER</span> pour confirmer.
          </p>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText("");
              }}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={deleteConfirmText !== "SUPPRIMER"}
              loading={deleting}
              onClick={handleDeleteAccount}
            >
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>
    </SettingsSubPage>
  );
}
