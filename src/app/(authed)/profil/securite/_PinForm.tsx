"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { SECURITY_LABELS } from "@/lib/constants";
import { PIN_LENGTH, validatePin } from "@/lib/withdrawal/schema";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — 4-digit withdrawal PIN form.
//
// Props.hasPin toggles between "Set" mode (2 fields: new + confirm) and
// "Change" mode (3 fields: current + new + confirm).
//
// Each field is an OTP-style 4-box input with auto-advance + paste support.
// Each box uses single-char maxLength; no 6-digit input anywhere (grep
// guard in the final verification catches 4-vs-six-digit drift).
//
// Endpoint: POST /api/sellers/withdrawal-pin with { pin, currentPin? }.
// Backend accepts .length(4).regex(/^\d{4}$/).
// ─────────────────────────────────────────────────────────────────────────

interface PinBoxesProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  idPrefix: string;
}

function PinBoxes({ label, value, onChange, idPrefix }: PinBoxesProps) {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(PIN_LENGTH, " ").split("").slice(0, PIN_LENGTH);

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(PIN_LENGTH, " ").split("");
    arr[index] = char || " ";
    const joined = arr.join("").replace(/\s+$/g, "").trimStart();
    onChange(joined.replace(/\s/g, ""));
    if (char && index < PIN_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !digits[index].trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < PIN_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const paste = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, PIN_LENGTH);
    if (!paste) return;
    e.preventDefault();
    onChange(paste);
    const last = Math.min(paste.length - 1, PIN_LENGTH - 1);
    inputsRef.current[last]?.focus();
  }

  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium text-primary">
        {label}
      </legend>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, index) => {
          const ch = digits[index]?.trim() ?? "";
          return (
            <input
              key={`${idPrefix}-${index}`}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              id={`${idPrefix}-${index}`}
              type="password"
              inputMode="numeric"
              pattern="[0-9]"
              maxLength={1}
              autoComplete="off"
              value={ch}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              aria-label={`Chiffre ${index + 1}`}
              className={cn(
                "h-14 w-full min-w-0 rounded-xl border border-border bg-background text-center font-mono text-2xl text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              )}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

interface PinFormProps {
  hasPin: boolean;
}

export function PinForm({ hasPin }: PinFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = React.useState<"display" | "edit">(
    hasPin ? "display" : "edit",
  );
  const [currentPin, setCurrentPin] = React.useState("");
  const [newPin, setNewPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit =
    (!hasPin || validatePin(currentPin)) &&
    validatePin(newPin) &&
    validatePin(confirmPin) &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validatePin(newPin)) {
      setError(SECURITY_LABELS.pinInvalid);
      return;
    }
    if (newPin !== confirmPin) {
      setError(SECURITY_LABELS.pinMismatch);
      return;
    }
    setSubmitting(true);
    try {
      const body: { pin: string; currentPin?: string } = { pin: newPin };
      if (hasPin) body.currentPin = currentPin;
      await api("/api/sellers/withdrawal-pin", {
        method: "POST",
        body,
      });
      toast(SECURITY_LABELS.pinSuccess, "success");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setMode("display");
      router.refresh();
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 403 || err.status === 401)
      ) {
        setError(SECURITY_LABELS.pinError);
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message || SECURITY_LABELS.pinInvalid);
      } else {
        setError(SECURITY_LABELS.pinError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Display mode (PIN is set, no current edit) — show status + "Changer" CTA
  if (mode === "display" && hasPin) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-accent p-4 text-sm font-medium text-[#00B67A]">
          <ShieldCheck size={18} aria-hidden />
          <span>{SECURITY_LABELS.pinAlreadySet}</span>
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setMode("edit")}
          >
            {SECURITY_LABELS.pinChange}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {!hasPin ? (
        <p className="text-xs text-muted-foreground">
          {SECURITY_LABELS.pinNotSetYet}
        </p>
      ) : null}

      {hasPin ? (
        <PinBoxes
          label={SECURITY_LABELS.pinCurrent}
          value={currentPin}
          onChange={setCurrentPin}
          idPrefix="pin-current"
        />
      ) : null}

      <PinBoxes
        label={SECURITY_LABELS.pinNew}
        value={newPin}
        onChange={setNewPin}
        idPrefix="pin-new"
      />
      <PinBoxes
        label={SECURITY_LABELS.pinConfirm}
        value={confirmPin}
        onChange={setConfirmPin}
        idPrefix="pin-confirm"
      />

      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-2">
        {hasPin ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => {
              setMode("display");
              setCurrentPin("");
              setNewPin("");
              setConfirmPin("");
              setError(null);
            }}
          >
            Annuler
          </Button>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!canSubmit}
        >
          {submitting
            ? SECURITY_LABELS.pinSaving
            : hasPin
              ? SECURITY_LABELS.pinChange
              : SECURITY_LABELS.pinSet}
        </Button>
      </div>
    </form>
  );
}
