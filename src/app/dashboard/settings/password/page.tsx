"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { Eye, EyeOff } from "lucide-react";
import { SettingsSubPage } from "../_shared";

export default function PasswordSettingsPage() {
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }

    setPasswordSaving(true);

    try {
      await api("/api/auth/change-password", {
        method: "PUT",
        body: { currentPassword, newPassword },
      });
      toast("Mot de passe mis à jour !");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof ApiError) setPasswordError(err.message);
      else setPasswordError("Erreur réseau");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <SettingsSubPage title="Mot de passe">
      <p className="mb-4 text-xs text-gray-500">Choisis un nouveau mot de passe pour sécuriser ton compte.</p>
      <form onSubmit={handleChangePassword} className="space-y-4">
        <Input
          label="Mot de passe actuel"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <Input
              type={showNewPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showNewPw ? "Masquer" : "Afficher"}
            >
              {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Input
          label="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

        <Button
          type="submit"
          loading={passwordSaving}
          disabled={!currentPassword || !newPassword || !confirmPassword || newPassword.length < 8}
        >
          Changer le mot de passe
        </Button>
      </form>
    </SettingsSubPage>
  );
}
