"use client";

import * as React from "react";
import { Button, Input, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { SECURITY_LABELS } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — Password change form.
//
// CRITICAL: verb is PUT, not POST (backend/src/routes/auth.ts:702).
// Backend returns 403 on wrong current password, 400 on zod failure.
// ─────────────────────────────────────────────────────────────────────────

export function PasswordForm() {
  const { toast } = useToast();

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    confirm.length > 0 &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (next.length < 8) {
      setFieldError(SECURITY_LABELS.passwordTooShort);
      return;
    }
    if (next !== confirm) {
      setFieldError(SECURITY_LABELS.passwordMismatch);
      return;
    }
    setSubmitting(true);
    try {
      // VERB IS PUT (not POST) — see CLAUDE.md and backend contract.
      await api("/api/auth/change-password", {
        method: "PUT",
        body: { currentPassword: current, newPassword: next },
      });
      toast(SECURITY_LABELS.passwordSuccess, "success");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        toast(SECURITY_LABELS.passwordError, "error");
      } else if (err instanceof ApiError && err.status === 400) {
        toast(err.message || SECURITY_LABELS.passwordError, "error");
      } else {
        toast(SECURITY_LABELS.passwordError, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label={SECURITY_LABELS.currentPassword}
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        required
        showPasswordToggle
      />
      <Input
        label={SECURITY_LABELS.newPassword}
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        minLength={8}
        required
        showPasswordToggle
      />
      <Input
        label={SECURITY_LABELS.confirmPassword}
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        minLength={8}
        required
        showPasswordToggle
        error={fieldError ?? undefined}
      />
      <div className="flex items-center justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!canSubmit}
        >
          {submitting
            ? SECURITY_LABELS.passwordSaving
            : SECURITY_LABELS.passwordSave}
        </Button>
      </div>
    </form>
  );
}
