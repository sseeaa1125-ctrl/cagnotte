"use client";

import * as React from "react";
import { Gift, Heart, Mail } from "lucide-react";
import { Toggle, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { NOTIF_PREFS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — /profil/preferences auto-save toggles.
//
// NO save button. Each toggle flip PATCHes /api/notifications/prefs with
// just that single key (additive merge on the backend). Inline green
// "Enregistré" pulse appears for 1.5s on success. Reverts local state
// on error and shows a red toast.
//
// The 6 keys match the Banani screen 19 spec and are widened on the
// backend zod schema (see notifications.ts prefsSchema in T0).
// ─────────────────────────────────────────────────────────────────────────

type PrefKey =
  | "newParticipation"
  | "milestoneReached"
  | "endingSoonReminder"
  | "organizerUpdates"
  | "paymentReceipts"
  | "newsletter";

const DEFAULTS: Record<PrefKey, boolean> = {
  newParticipation: true,
  milestoneReached: true,
  endingSoonReminder: true,
  organizerUpdates: true,
  paymentReceipts: false,
  newsletter: false,
};

interface ToggleConfig {
  key: PrefKey;
  label: string;
  helper: string;
}

const GROUP_1: ToggleConfig[] = [
  {
    key: "newParticipation",
    label: NOTIF_PREFS_LABELS.newParticipation.label,
    helper: NOTIF_PREFS_LABELS.newParticipation.helper,
  },
  {
    key: "milestoneReached",
    label: NOTIF_PREFS_LABELS.milestoneReached.label,
    helper: NOTIF_PREFS_LABELS.milestoneReached.helper,
  },
  {
    key: "endingSoonReminder",
    label: NOTIF_PREFS_LABELS.endingSoonReminder.label,
    helper: NOTIF_PREFS_LABELS.endingSoonReminder.helper,
  },
];

const GROUP_2: ToggleConfig[] = [
  {
    key: "organizerUpdates",
    label: NOTIF_PREFS_LABELS.organizerUpdates.label,
    helper: NOTIF_PREFS_LABELS.organizerUpdates.helper,
  },
  {
    key: "paymentReceipts",
    label: NOTIF_PREFS_LABELS.paymentReceipts.label,
    helper: NOTIF_PREFS_LABELS.paymentReceipts.helper,
  },
];

const GROUP_3: ToggleConfig[] = [
  {
    key: "newsletter",
    label: NOTIF_PREFS_LABELS.newsletter.label,
    helper: NOTIF_PREFS_LABELS.newsletter.helper,
  },
];

interface PreferencesFormProps {
  initial: Record<string, boolean>;
}

export function PreferencesForm({ initial }: PreferencesFormProps) {
  const { toast } = useToast();

  // Seed local state: initial wins, fallback to defaults.
  const initialState = React.useMemo<Record<PrefKey, boolean>>(() => {
    const out: Record<PrefKey, boolean> = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS) as PrefKey[]) {
      if (typeof initial[k] === "boolean") out[k] = initial[k];
    }
    return out;
  }, [initial]);

  const [state, setState] = React.useState<Record<PrefKey, boolean>>(
    initialState,
  );
  const [pulseKey, setPulseKey] = React.useState<PrefKey | null>(null);
  const [busyKey, setBusyKey] = React.useState<PrefKey | null>(null);

  const handleFlip = async (key: PrefKey, next: boolean) => {
    setState((prev) => ({ ...prev, [key]: next }));
    setBusyKey(key);
    try {
      await api("/api/notifications/prefs", {
        method: "PATCH",
        body: { [key]: next },
      });
      setPulseKey(key);
      setTimeout(() => {
        setPulseKey((p) => (p === key ? null : p));
      }, 1500);
    } catch (err) {
      // Revert
      setState((prev) => ({ ...prev, [key]: !next }));
      const msg =
        err instanceof ApiError
          ? err.message
          : NOTIF_PREFS_LABELS.errorGeneric;
      toast(msg, "error");
    } finally {
      setBusyKey((k) => (k === key ? null : k));
    }
  };

  const renderRow = (cfg: ToggleConfig) => (
    <div
      key={cfg.key}
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4"
    >
      <div className="flex-1">
        <p className="text-sm font-semibold text-primary">{cfg.label}</p>
        <p className="text-xs text-muted-foreground">{cfg.helper}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-xs font-medium text-green-600 transition-opacity duration-300",
            pulseKey === cfg.key ? "opacity-100" : "opacity-0",
          )}
          aria-live="polite"
        >
          {NOTIF_PREFS_LABELS.savedPulse}
        </span>
        <Toggle
          checked={state[cfg.key]}
          onChange={(next) => handleFlip(cfg.key, next)}
          disabled={busyKey === cfg.key}
          aria-label={cfg.label}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Group 1 — Mes cagnottes (gift, green) */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-headings text-base font-bold text-primary">
          <Gift size={18} className="text-green-600" aria-hidden />
          {NOTIF_PREFS_LABELS.group1}
        </h3>
        <div className="flex flex-col gap-3">{GROUP_1.map(renderRow)}</div>
      </section>

      {/* Group 2 — Mes participations (heart, pink) */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-headings text-base font-bold text-primary">
          <Heart size={18} className="text-pink-500" aria-hidden />
          {NOTIF_PREFS_LABELS.group2}
        </h3>
        <div className="flex flex-col gap-3">{GROUP_2.map(renderRow)}</div>
      </section>

      {/* Group 3 — Communications (mail, blue) */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-headings text-base font-bold text-primary">
          <Mail size={18} className="text-blue-500" aria-hidden />
          {NOTIF_PREFS_LABELS.group3}
        </h3>
        <div className="flex flex-col gap-3">{GROUP_3.map(renderRow)}</div>
      </section>
    </div>
  );
}
