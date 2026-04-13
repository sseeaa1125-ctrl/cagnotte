"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WithdrawalDraft } from "@/lib/withdrawal/schema";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — sessionStorage-backed withdrawal draft hook.
//
// Mirrors the useWizardDraft.ts pattern from Phase 5 (D-12):
//   - sessionStorage (not localStorage) — per-tab, cleared on tab close,
//     no cross-user leak on shared browsers
//   - versioned key for future schema migrations
//   - 24h staleness window
//   - SSR-safe via isReady gate (callers MUST gate prefill rendering)
//   - persisted via setDraft / cleared on success via clear()
//
// Key: cagnotte.withdrawal.draft.v1
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "cagnotte.withdrawal.draft.v1";
const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface Envelope {
  value: Partial<WithdrawalDraft>;
  savedAt: string; // ISO
}

export interface UseWithdrawalDraftResult {
  draft: Partial<WithdrawalDraft>;
  setDraft: (patch: Partial<WithdrawalDraft>) => void;
  clear: () => void;
  isReady: boolean;
}

export function useWithdrawalDraft(): UseWithdrawalDraftResult {
  const [draft, setDraftState] = useState<Partial<WithdrawalDraft>>({});
  const [isReady, setIsReady] = useState(false);
  const keyRef = useRef(STORAGE_KEY);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(keyRef.current);
      if (!raw) {
        setIsReady(true);
        return;
      }
      const parsed = JSON.parse(raw) as Envelope;
      if (parsed && typeof parsed.savedAt === "string") {
        const age = Date.now() - new Date(parsed.savedAt).getTime();
        if (Number.isFinite(age) && age > STALE_MS) {
          window.sessionStorage.removeItem(keyRef.current);
          setIsReady(true);
          return;
        }
        setDraftState(parsed.value ?? {});
      }
    } catch {
      try {
        window.sessionStorage.removeItem(keyRef.current);
      } catch {
        // ignore
      }
    } finally {
      setIsReady(true);
    }
  }, []);

  const persist = useCallback((next: Partial<WithdrawalDraft>) => {
    if (typeof window === "undefined") return;
    try {
      const envelope: Envelope = {
        value: next,
        savedAt: new Date().toISOString(),
      };
      window.sessionStorage.setItem(keyRef.current, JSON.stringify(envelope));
    } catch {
      // Quota / private mode — silent fail, draft stays in memory.
    }
  }, []);

  const setDraft = useCallback(
    (patch: Partial<WithdrawalDraft>) => {
      setDraftState((prev) => {
        const merged = { ...prev, ...patch };
        persist(merged);
        return merged;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(keyRef.current);
      } catch {
        // ignore
      }
    }
    setDraftState({});
  }, []);

  return { draft, setDraft, clear, isReady };
}
