"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { WITHDRAW_PIN_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
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
  const [activeIndex, setActiveIndex] = React.useState<number>(0);

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
      setError(WITHDRAW_PIN_LABELS.pinError);
      return;
    }
    setError(null);
    setDraft({ pin });
    router.push("/retraits/confirmation");
  }

  if (!isReady) {
    return (
      <div className="mx-auto max-w-lg text-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  const digits = pin.padEnd(PIN_LENGTH, " ").split("").slice(0, PIN_LENGTH);
  const amountLabel = formatPrice(draft.amount ?? 0);

  return (
    <div className="mx-auto max-w-lg">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-[2.5rem] bg-white p-8 shadow-sm md:p-10"
      >
        {/* Shield hero — Banani WithdrawOTP */}
        <div className="relative mb-2 mt-2 inline-flex items-center justify-center self-center">
          <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
            <ShieldCheck size={40} className="text-primary" aria-hidden />
          </div>
        </div>

        {/* Heading + persistent-PIN helper (NO phone-masked text) */}
        <div className="text-center">
          <h1 className="mb-2 font-headings text-2xl font-black text-primary md:text-3xl">
            {WITHDRAW_PIN_LABELS.pageTitle}
          </h1>
          <p className="text-sm text-gray-500 md:text-base">
            {WITHDRAW_PIN_LABELS.pageHelperPrefix}
            <strong className="font-bold text-primary">{amountLabel}</strong>
            {WITHDRAW_PIN_LABELS.pageHelperSuffix}
          </p>
        </div>

        {/* 4-cell PIN grid with animate-pulse caret */}
        <div
          className="mt-2 flex justify-center gap-3 md:gap-4"
          role="group"
          aria-label={WITHDRAW_PIN_LABELS.pageTitle}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, index) => {
            const ch = digits[index]?.trim() ?? "";
            const isActive = index === activeIndex && !ch;
            return (
              <div
                key={index}
                className={cn(
                  "relative flex h-16 w-14 items-center justify-center rounded-2xl border-2 bg-white font-mono text-3xl font-black text-primary transition-all md:h-[72px] md:w-16",
                  "focus-within:border-primary focus-within:ring-4 focus-within:ring-blue-50",
                  error
                    ? "border-red-500"
                    : isActive
                      ? "border-primary animate-pulse"
                      : "border-gray-200",
                )}
              >
                <input
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
                  onFocus={() => setActiveIndex(index)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  aria-label={`Chiffre ${index + 1}`}
                  className="absolute inset-0 h-full w-full rounded-2xl bg-transparent text-center text-3xl font-black text-primary outline-none"
                />
                {ch ? null : isActive ? (
                  <span className="pointer-events-none ml-0.5 h-8 w-0.5 animate-pulse bg-primary" />
                ) : null}
              </div>
            );
          })}
        </div>

        {error ? (
          <p
            className="text-center text-sm font-semibold text-red-500"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {/* Stacked CTAs — NO resend, NO countdown */}
        <div className="mt-2 flex flex-col gap-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!validatePin(pin)}
          >
            {WITHDRAW_PIN_LABELS.submitCta}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
          >
            {WITHDRAW_PIN_LABELS.cancelCta}
          </Button>
        </div>
      </form>
    </div>
  );
}
