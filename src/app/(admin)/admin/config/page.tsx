"use client";

import * as React from "react";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";

// ── Types ──
interface ConfigRow {
  id: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminConfigPage() {
  const [search, setSearch] = React.useState("");
  const [configs, setConfigs] = React.useState<ConfigRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [formKey, setFormKey] = React.useState("");
  const [formValue, setFormValue] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Delete confirm
  const [deleteKey, setDeleteKey] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const fetchConfigs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi<{ configs: ConfigRow[] }>("/api/admin/config");
      setConfigs(res.configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  function openCreate() {
    setEditingKey(null);
    setFormKey("");
    setFormValue("");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(config: ConfigRow) {
    setEditingKey(config.key);
    setFormKey(config.key);
    setFormValue(JSON.stringify(config.value, null, 2));
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setFormError(null);

    const key = editingKey || formKey.trim();
    if (!key) {
      setFormError("La cle est requise.");
      return;
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(formValue);
    } catch {
      setFormError("La valeur doit etre du JSON valide.");
      return;
    }

    setSaving(true);
    try {
      await adminApi(`/api/admin/config/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: { value: parsedValue },
      });
      setModalOpen(false);
      fetchConfigs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteKey) return;
    setDeleteError(null);
    try {
      await adminApi(`/api/admin/config/${encodeURIComponent(deleteKey)}`, {
        method: "DELETE",
      });
      setDeleteKey(null);
      fetchConfigs();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const filtered = configs.filter(
    (c) =>
      !search ||
      c.key.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(c.value).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headings text-2xl font-black text-primary">
            Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Parametres globaux de la plateforme (SUPER_ADMIN)
          </p>
        </div>
        <Button onClick={openCreate} iconLeft={<Plus size={16} />}>
          Ajouter
        </Button>
      </div>

      {/* Search */}
      <AdminSearch
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par cle ou valeur..."
        className="w-full"
      />

      {/* Error */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon={<Settings size={28} />}
          title="Aucune configuration"
          description="Ajoutez votre premiere cle de configuration."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-semibold text-primary">Cle</th>
                <th className="px-4 py-3 font-semibold text-primary">Valeur</th>
                <th className="hidden px-4 py-3 font-semibold text-primary sm:table-cell">Modifie le</th>
                <th className="px-4 py-3 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={4} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                : filtered.map((config) => (
                    <tr
                      key={config.key}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-primary">
                          {config.key}
                        </code>
                      </td>
                      <td className="max-w-[150px] px-4 py-3 text-muted-foreground sm:max-w-md">
                        <pre className="overflow-hidden text-xs font-mono whitespace-pre max-h-[60px]">
                          {JSON.stringify(config.value, null, 2).slice(0, 200)}
                        </pre>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatDate(config.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                          <Button
                            variant="ghost"
                            onClick={() => openEdit(config)}
                            iconLeft={<Pencil size={14} />}
                            className="text-xs"
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setDeleteKey(config.key);
                              setDeleteError(null);
                            }}
                            iconLeft={<Trash2 size={14} />}
                            className="text-xs text-red-600"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingKey ? `Modifier : ${editingKey}` : "Nouvelle configuration"}
      >
        <div className="space-y-4">
          {!editingKey ? (
            <Input
              label="Cle"
              placeholder="ex: maintenance_mode"
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
            />
          ) : null}

          <Textarea
            label="Valeur (JSON)"
            placeholder='ex: true, "hello", {"key": "val"}'
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
          />

          {formError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              {editingKey ? "Enregistrer" : "Creer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteKey !== null}
        onClose={() => setDeleteKey(null)}
        title="Supprimer la configuration"
        message={`Etes-vous sur de vouloir supprimer la cle "${deleteKey}" ? Cette action est irreversible.`}
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={handleDelete}
        errorMessage={deleteError}
      />
    </div>
  );
}
