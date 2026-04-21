"use client";

import * as React from "react";
import { UserCog, Plus, ShieldAlert, Power } from "lucide-react";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { useAdminSelection } from "@/hooks/useAdminSelection";

// ── Types ──
interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  SUPER_ADMIN: { label: "Super Admin", className: "bg-purple-100 text-purple-700" },
  ADMIN: { label: "Admin", className: "bg-blue-100 text-blue-700" },
  SUPPORT: { label: "Support", className: "bg-gray-100 text-gray-600" },
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPPORT", label: "Support" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const [search, setSearch] = React.useState("");
  const [admins, setAdmins] = React.useState<AdminRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create modal
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createEmail, setCreateEmail] = React.useState("");
  const [createPassword, setCreatePassword] = React.useState("");
  const [createRole, setCreateRole] = React.useState("ADMIN");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  // Inline update state
  const [updating, setUpdating] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Role change confirmation
  const [roleChange, setRoleChange] = React.useState<{ adminId: string; adminName: string; newRole: string } | null>(null);

  // Toggle active confirmation
  const [toggleTarget, setToggleTarget] = React.useState<AdminRow | null>(null);

  // Check current admin role + id from the /me endpoint (cached by layout)
  const [currentRole, setCurrentRole] = React.useState<string | null>(null);
  const [currentId, setCurrentId] = React.useState<string | null>(null);
  React.useEffect(() => {
    adminApi<{ admin: { id: string; role: string } }>("/api/admin/auth/me")
      .then((res) => { setCurrentRole(res.admin.role); setCurrentId(res.admin.id); })
      .catch(() => { setCurrentRole(null); setCurrentId(null); });
  }, []);

  // Bulk activate/deactivate. Self-target protégé côté backend + côté UI
  // (checkbox désactivée sur la ligne de l'admin courant).
  const selection = useAdminSelection(search);
  const [bulkAction, setBulkAction] = React.useState<"ACTIVATE" | "DEACTIVATE" | null>(null);
  const [bulkError, setBulkError] = React.useState<string | null>(null);

  const fetchAdmins = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi<{ admins: AdminRow[] }>("/api/admin/users");
      setAdmins(res.admins);
    } catch (err) {
      // 403 = not SUPER_ADMIN
      if (err instanceof Error && err.message.includes("403")) {
        setError("ACCES_REFUSE");
      } else {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Access denied gate
  if (error === "ACCES_REFUSE" || (currentRole && currentRole !== "SUPER_ADMIN")) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <ShieldAlert size={48} className="text-red-400" />
        <h1 className="font-headings text-xl font-bold text-primary">
          Acces refuse
        </h1>
        <p className="text-sm text-muted-foreground">
          Seuls les super administrateurs peuvent acceder a cette page.
        </p>
      </div>
    );
  }

  async function handleCreate() {
    setCreateError(null);

    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError("Tous les champs sont requis.");
      return;
    }
    if (createPassword.length < 8) {
      setCreateError("Le mot de passe doit avoir au moins 8 caracteres.");
      return;
    }

    setCreating(true);
    try {
      await adminApi("/api/admin/users", {
        method: "POST",
        body: {
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          role: createRole,
        },
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("ADMIN");
      fetchAdmins();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  async function doToggleActive() {
    if (!toggleTarget) return;
    setToggleTarget(null);
    setUpdating(toggleTarget.id);
    try {
      await adminApi(`/api/admin/users/${toggleTarget.id}`, {
        method: "PATCH",
        body: { isActive: !toggleTarget.isActive },
      });
      toast(
        toggleTarget.isActive ? `${toggleTarget.name} desactive` : `${toggleTarget.name} active`,
        "success",
      );
      fetchAdmins();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setUpdating(null);
    }
  }

  async function doRoleChange() {
    if (!roleChange) return;
    const { adminId, newRole } = roleChange;
    setRoleChange(null);
    setUpdating(adminId);
    try {
      await adminApi(`/api/admin/users/${adminId}`, {
        method: "PATCH",
        body: { role: newRole },
      });
      toast(`Role mis a jour: ${newRole}`, "success");
      fetchAdmins();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setUpdating(null);
    }
  }

  async function handleBulkActive() {
    if (selection.selectedCount === 0 || bulkAction === null) return;
    const isActive = bulkAction === "ACTIVATE";
    setBulkError(null);
    try {
      const res = await adminApi<{
        ok: boolean;
        updated: number;
        succeededIds: string[];
        failedIds: string[];
      }>(`/api/admin/users/bulk/set-active`, {
        method: "POST",
        body: {
          adminIds: selection.selectedIds,
          isActive,
        },
      });
      toast(
        `${res.updated} admin(s) ${isActive ? "activé(s)" : "désactivé(s)"}${
          res.failedIds.length ? `, ${res.failedIds.length} ignoré(s)` : ""
        }.`,
        "success",
      );
      setBulkAction(null);
      selection.clear();
      fetchAdmins();
    } catch (err) {
      // Le backend renvoie des messages explicites (self-target, dernier super admin)
      setBulkError(err instanceof AdminApiError ? err.message : "Erreur");
      throw err;
    }
  }

  const filtered = admins.filter(
    (a) =>
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headings text-2xl font-black text-primary">
            Utilisateurs admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestion des comptes administrateurs (SUPER_ADMIN)
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} iconLeft={<Plus size={16} />}>
          Creer
        </Button>
      </div>

      {/* Search */}
      <AdminSearch
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par nom ou email..."
        className="w-full"
      />

      {/* Error */}
      {error && error !== "ACCES_REFUSE" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon={<UserCog size={28} />}
          title="Aucun admin"
          description="Creez le premier compte administrateur."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-4 py-3">
                  {(() => {
                    // Exclut l'admin courant — pas de self-target possible
                    const ids = filtered.filter((a) => a.id !== currentId).map((a) => a.id);
                    const allSelected = ids.length > 0 && ids.every((id) => selection.isSelected(id));
                    const someSelected = ids.some((id) => selection.isSelected(id));
                    return (
                      <input
                        type="checkbox"
                        aria-label="Tout sélectionner (sauf vous)"
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-40"
                        disabled={ids.length === 0}
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={() => selection.toggleAll(ids)}
                      />
                    );
                  })()}
                </th>
                <th className="px-4 py-3 font-semibold text-primary">Nom</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Email</th>
                <th className="px-4 py-3 font-semibold text-primary">Role</th>
                <th className="px-4 py-3 font-semibold text-primary">Statut</th>
                <th className="hidden px-4 py-3 font-semibold text-primary md:table-cell">Cree le</th>
                <th className="px-4 py-3 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                : filtered.map((admin) => {
                    const roleBadge = ROLE_BADGE[admin.role] ?? ROLE_BADGE.ADMIN;
                    const isSelf = admin.id === currentId;
                    return (
                      <tr
                        key={admin.id}
                        className={`border-b border-border transition-colors hover:bg-muted/30 ${
                          !admin.isActive ? "opacity-50" : ""
                        }`}
                      >
                        <td className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Sélectionner ${admin.name}`}
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-40"
                            disabled={isSelf}
                            checked={selection.isSelected(admin.id)}
                            onChange={() => !isSelf && selection.toggleOne(admin.id)}
                            title={isSelf ? "Vous ne pouvez pas vous sélectionner vous-même" : undefined}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {admin.name}
                          {isSelf && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              vous
                            </span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {admin.email}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            compact
                            options={ROLE_OPTIONS}
                            value={admin.role}
                            onChange={(e) => {
                              const newRole = e.target.value;
                              if (newRole !== admin.role) {
                                setRoleChange({ adminId: admin.id, adminName: admin.name, newRole });
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              admin.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {admin.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {formatDate(admin.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            onClick={() => setToggleTarget(admin)}
                            loading={updating === admin.id}
                            disabled={updating === admin.id}
                            className="text-xs"
                          >
                            {admin.isActive ? "Desactiver" : "Activer"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {/* Role change confirmation */}
      <ConfirmDialog
        open={roleChange !== null}
        onClose={() => setRoleChange(null)}
        title="Changer le role"
        message={`Etes-vous sur de vouloir changer le role de ${roleChange?.adminName} en ${roleChange?.newRole} ?`}
        confirmLabel="Confirmer"
        tone="primary"
        onConfirm={doRoleChange}
      />

      {/* Toggle active confirmation */}
      <ConfirmDialog
        open={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.isActive ? "Desactiver le compte" : "Activer le compte"}
        message={
          toggleTarget?.isActive
            ? `Etes-vous sur de vouloir desactiver le compte de ${toggleTarget?.name} ? Il ne pourra plus se connecter.`
            : `Reactiver le compte de ${toggleTarget?.name} ?`
        }
        confirmLabel={toggleTarget?.isActive ? "Desactiver" : "Activer"}
        tone={toggleTarget?.isActive ? "danger" : "primary"}
        onConfirm={doToggleActive}
      />

      {/* Bulk action bar */}
      <BulkActionBar
        count={selection.selectedCount}
        onClear={selection.clear}
      >
        <Button
          variant="primary"
          iconLeft={<Power size={14} />}
          onClick={() => { setBulkAction("ACTIVATE"); setBulkError(null); }}
          className="!min-h-9 !px-3 !py-1.5 !text-xs bg-green-600 hover:bg-green-700"
        >
          Activer
        </Button>
        <Button
          variant="danger"
          iconLeft={<Power size={14} />}
          onClick={() => { setBulkAction("DEACTIVATE"); setBulkError(null); }}
          className="!min-h-9 !px-3 !py-1.5 !text-xs"
        >
          Désactiver
        </Button>
      </BulkActionBar>

      {/* Bulk confirm dialog */}
      <ConfirmDialog
        open={bulkAction !== null}
        onClose={() => { setBulkAction(null); setBulkError(null); }}
        title={
          bulkAction === "ACTIVATE"
            ? "Activer les comptes sélectionnés"
            : "Désactiver les comptes sélectionnés"
        }
        message={
          <div className="space-y-3">
            <p>
              Vous êtes sur le point de{" "}
              <span className="font-bold">
                {bulkAction === "ACTIVATE" ? "activer" : "désactiver"}{" "}
                {selection.selectedCount} compte{selection.selectedCount > 1 ? "s" : ""}
              </span>.
            </p>
            {bulkAction === "DEACTIVATE" && (
              <p className="text-sm text-muted-foreground">
                Les admins désactivés ne pourront plus se connecter. L&apos;opération
                sera refusée si elle laisse moins d&apos;1 SUPER_ADMIN actif.
              </p>
            )}
          </div>
        }
        confirmLabel={bulkAction === "ACTIVATE" ? "Activer" : "Désactiver"}
        tone={bulkAction === "ACTIVATE" ? "primary" : "danger"}
        onConfirm={handleBulkActive}
        errorMessage={bulkError}
      />

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Creer un administrateur"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            placeholder="Nom complet"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            placeholder="admin@cagnottes.sn"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
          />
          <Input
            label="Mot de passe"
            type="password"
            placeholder="Minimum 8 caracteres"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
          />
          <Select
            options={ROLE_OPTIONS}
            value={createRole}
            onChange={(e) => setCreateRole(e.target.value)}
          />

          {createError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={creating}>
              Creer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
