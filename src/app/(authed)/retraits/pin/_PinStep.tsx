"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { WITHDRAWAL_LABELS } from "@/lib/constants";
import { useWithdrawalDraft } from "@/hooks/useWithdrawalDraft";
import {
  PIN_LENGTH,
  isCompleteDraft,
  validatePin,
} from "@/lib/withdrawal/schema";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /retraits/pin client island.
//
// Reads the draft from useWithdrawalDraft. If the draft is incomplete
// (missing amount/provider/phone/recipientName) → router.replace("/retraits").
// Otherwise shows a 4-box PIN input; on complete PIN → setDraft({ pin })
// → router.push("/retraits/confirmation").
// ─────────────────────────────────────────────────────────────────────────

export function PinStep() {
  const router = useRouter();
  const { draft, setDraft, isReady } = useWithdrawalDraft();
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const [pin, setPin] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  // Guard: incomplete draft → bounce to step 1.
  React.useEffect(() => {
    if (!isReady) return;
    if (!isCompleteDraft(draft)) {
      router.replace("/retraits");
    }
  }, [isReady, draft, router]);

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = pin.padEnd(PIN_LENGTH, " ").split("");
    arr[index] = char || " ";
    const next = arr.join("").replace(/\s/g, "");
    setPin(next);
    if (char && index < PIN_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
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
    setPin(paste);
    const last = Math.min(paste.length - 1, PIN_LENGTH - 1);
    inputsRef.current[last]?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePin(pin)) {
      setError("Le code doit contenir 4 chiffres");
      return;
    }
    setError(null);
    setDraft({ pin });
    router.push("/retraits/confirmation");
  }

  if (!isReady) {
    return (
      <div className="mx-auto max-w-md text-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  const digits = pin.padEnd(PIN_LENGTH, " ").split("").slice(0, PIN_LENGTH);

  return (
    <div className="mx-auto max-w-md">
      <button
        type="button"
        onClick={() => router.replace("/retraits")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ArrowLeft size={14} aria-hidden />
        {WITHDRAWAL_LABELS.back}
      </button>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-sm md:p-10"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink text-primary">
            <Lock size={28} aria-hidden />
          </div>
          <h2 className="mb-2 font-headings text-xl font-bold text-primary md:text-2xl">
            {WITHDRAWAL_LABELS.pinTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {WITHDRAWAL_LABELS.pinHelper}
          </p>
        </div>

        <div className="flex justify-center gap-3">
          {Array.from({ length: PIN_LENGTH }).map((_, index) => {
            const ch = digits[index]?.trim() ?? "";
            return (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
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
                  "h-16 w-14 rounded-lg border bg-background text-center font-mono text-3xl text-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  error ? "border-red-500" : "border-border",
                )}
              />
            );
          })}
        </div>

        {error ? (
          <p className="text-center text-sm text-red-500" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!validatePin(pin)}
        >
          {WITHDRAWAL_LABELS.pinContinue}
        </Button>
      </form>
    </div>
  );
}
