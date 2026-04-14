"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 plan 05-02 — sessionStorage-backed wizard draft hook.
//
// Why sessionStorage (not localStorage):
//   - logout-leakage: localStorage survives tab close + logout, exposing
//     draft data across users on shared browsers.
//   - sessionStorage is scoped per tab, clears on tab close. The wizard
//     is a short-lived multi-step flow — per-tab persistence is the right
//     grain.
//
// Key pattern (versioned for future schema migrations):
//   cagnotte.wizard.{subtype}.draft.v1
//
// SSR safety: `isReady` is false during SSR / before first mount. Callers
// MUST gate prefill rendering behind `isReady` to avoid hydration mismatch.
//
// Staleness: drafts older than 24h are cleared on mount.
// ─────────────────────────────────────────────────────────────────────────

export type FestiveOccasion =
  | "anniversaire"
  | "pot_de_depart"
  | "cadeau_commun"
  | "mariage_pacs"
  | "naissance"
  | "voyage"
  | "autre";

export type SolidaireCause =
  | "sante_medical"
  | "education"
  | "projet_solidaire"
  | "urgence"
  | "animaux"
  | "autre";

export type SolidaireBeneficiary = "moi_meme" | "un_proche" | "une_association";

export type Visibility = "public" | "private";

export type GalleryItemDraft = {
  kind: "image" | "youtube";
  url: string;
  videoId?: string;
};

export type FestiveDraft = {
  title?: string;
  occasion?: FestiveOccasion;
  goalAmount?: number;
  coverUrl?: string | null;
  gallery?: GalleryItemDraft[];
  description?: string;
  thankYouMessage?: string;
  endDate?: string | null;
  visibility?: Visibility;
  hideAmount?: boolean;
  hideDonors?: boolean;
  tosAccepted?: boolean;
  step?: 1 | 2 | 3;
  updatedAt?: string;
};

export type SolidaireDraft = Omit<FestiveDraft, "occasion"> & {
  cause?: SolidaireCause;
  beneficiary?: SolidaireBeneficiary;
};

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

function keyFor(subtype: "festive" | "solidaire"): string {
  return `cagnotte.wizard.${subtype}.draft.v1`;
}

export interface UseWizardDraftResult<T> {
  draft: T;
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  setDraft: (next: Partial<T>) => void;
  clear: () => void;
  isReady: boolean;
}

export function useWizardDraft<T extends FestiveDraft | SolidaireDraft>(
  subtype: "festive" | "solidaire",
): UseWizardDraftResult<T> {
  const [draft, setDraftState] = useState<T>({} as T);
  const [isReady, setIsReady] = useState(false);
  const storageKey = useRef(keyFor(subtype));

  // Hydrate from sessionStorage on first mount (client-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(storageKey.current);
      if (!raw) {
        setIsReady(true);
        return;
      }
      const parsed = JSON.parse(raw) as T;
      // Stale check
      if (
        parsed &&
        typeof parsed === "object" &&
        "updatedAt" in parsed &&
        typeof parsed.updatedAt === "string"
      ) {
        const age = Date.now() - new Date(parsed.updatedAt).getTime();
        if (Number.isFinite(age) && age > STALE_MS) {
          window.sessionStorage.removeItem(storageKey.current);
          setIsReady(true);
          return;
        }
      }
      setDraftState(parsed);
    } catch {
      // Corrupt JSON — nuke the entry.
      try {
        window.sessionStorage.removeItem(storageKey.current);
      } catch {
        // ignore
      }
    } finally {
      setIsReady(true);
    }
  }, []);

  const persist = useCallback((next: T) => {
    if (typeof window === "undefined") return;
    try {
      const stamped: T = {
        ...next,
        updatedAt: new Date().toISOString(),
      } as T;
      window.sessionStorage.setItem(
        storageKey.current,
        JSON.stringify(stamped),
      );
    } catch {
      // Quota / private mode — silent fail, draft stays in memory.
    }
  }, []);

  const setField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setDraftState((prev) => {
        const next = { ...prev, [key]: value } as T;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setDraft = useCallback(
    (next: Partial<T>) => {
      setDraftState((prev) => {
        const merged = { ...prev, ...next } as T;
        persist(merged);
        return merged;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(storageKey.current);
      } catch {
        // ignore
      }
    }
    setDraftState({} as T);
  }, []);

  return { draft, setField, setDraft, clear, isReady };
}
