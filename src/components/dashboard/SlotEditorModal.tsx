"use client";

import { useState, useEffect } from "react";
import { Button, Modal } from "@/components/ui";
import { AvailabilityEditor } from "@/components/dashboard/AvailabilityEditor";
import type { SlotRow } from "@/components/dashboard/AvailabilityEditor";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

function newSlotId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function withIds(rows: Omit<SlotRow, "id">[]): SlotRow[] {
  return rows.map((r) => ({ ...r, id: newSlotId() }));
}

interface SlotEditorModalProps {
  open: boolean;
  onClose: () => void;
  blockId: string;
  initialSlots: Omit<SlotRow, "id">[];
  onSaved: () => void;
}

export function SlotEditorModal({
  open,
  onClose,
  blockId,
  initialSlots,
  onSaved,
}: SlotEditorModalProps) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<SlotRow[]>(
    initialSlots.length > 0
      ? withIds(initialSlots)
      : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Re-sync slots when modal opens for a different block
  useEffect(() => {
    if (open) {
      setSlots(
        initialSlots.length > 0
          ? withIds(initialSlots)
          : []
      );
      setError("");
    }
  }, [open, initialSlots]);

  async function handleSave() {
    // Validation frontend : startTime < endTime
    const invalid = slots.find((s) => s.startTime >= s.endTime);
    if (invalid) {
      setError("L'heure de début doit être avant l'heure de fin");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await api(`/api/blocks/${blockId}/slots`, {
        method: "PUT",
        body: { slots: slots.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })) },
      });
      onSaved();
      onClose();
      toast("Créneaux enregistrés !");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gérer les disponibilités"
      footer={
        <>
          {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
          <Button
            size="lg"
            className="w-full"
            onClick={handleSave}
            loading={saving}
          >
            Enregistrer les créneaux
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Configure les jours et heures où tes clients peuvent réserver.
        </p>
        <AvailabilityEditor
          slots={slots}
          onChange={setSlots}
        />
      </div>
    </Modal>
  );
}
