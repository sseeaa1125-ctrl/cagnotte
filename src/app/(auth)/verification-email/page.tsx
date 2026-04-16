"use client";

// Phase 5 plan 05-01 — /verification-email (gap screen, we design in Banani
// visual language). Backend sends a 6-digit code via email (generateVerificationCode
// at backend/src/routes/auth.ts:186). User types it manually — NO URL token.
//
// Design: navy heading + 6 separate single-char inputs with auto-advance on
// type + auto-backspace + paste-split + 60s resend cooldown. On success:
// storeCsrfToken + refreshSeller + redirect /tableau-de-bord (which 404s
// until plan 05-02 ships — cookies are still set so the next nav works).

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { api, ApiError, storeCsrfToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { VERIFY_EMAIL_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface VerifyResponse {
  seller: {
    id: string;
    email: string;
    slug: string;
    displayName: string;
    onboardingCompleted: boolean;
    plan: string;
  };
  csrfToken: string;
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSeller } = useAuth();
  const toast = useToast();

  const email = searchParams.get("email") || "";

  const [digits, setDigits] = React.useState<string[]>(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

  // Redirect if email query param missing.
  React.useEffect(() => {
    if (!email) {
      router.replace("/inscription");
    }
  }, [email, router]);

  // Cooldown countdown.
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const code = digits.join("");

  function setDigitAt(index: number, value: string) {
    if (value && !/^[0-9]$/.test(value)) return;
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Handle paste inside an already-focused first input — useEffect paste
    // handler catches most cases, but a long value can still land here.
    if (raw.length > 1) {
      const chars = raw.replace(/\D/g, "").slice(0, 6).split("");
      const filled = ["", "", "", "", "", ""];
      chars.forEach((c, i) => {
        filled[i] = c;
      });
      setDigits(filled);
      const last = Math.min(chars.length - 1, 5);
      inputsRef.current[last]?.focus();
      return;
    }
    setDigitAt(index, raw);
    if (raw && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!paste) return;
    e.preventDefault();
    const filled = ["", "", "", "", "", ""];
    paste.split("").forEach((c, i) => {
      filled[i] = c;
    });
    setDigits(filled);
    const last = Math.min(paste.length - 1, 5);
    inputsRef.current[last]?.focus();
  }

  function clearDigits() {
    setDigits(["", "", "", "", "", ""]);
    inputsRef.current[0]?.focus();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError(VERIFY_EMAIL_LABELS.errorInvalid);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<VerifyResponse>("/api/auth/verify-email", {
        method: "POST",
        body: { email, code },
      });
      storeCsrfToken(res.csrfToken);
      await refreshSeller();
      router.replace("/tableau-de-bord");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setError(VERIFY_EMAIL_LABELS.errorInvalid);
          clearDigits();
        } else if (err.status === 429) {
          setError(VERIFY_EMAIL_LABELS.errorRateLimit);
        } else {
          setError(err.message || VERIFY_EMAIL_LABELS.errorInvalid);
        }
      } else {
        setError(VERIFY_EMAIL_LABELS.errorInvalid);
      }
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (cooldown > 0) return;
    try {
      await api("/api/auth/resend-code", {
        method: "POST",
        body: { email },
      });
      toast.toast(VERIFY_EMAIL_LABELS.resendSuccessToast, "success");
      setCooldown(60);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : VERIFY_EMAIL_LABELS.errorInvalid;
      toast.toast(msg, "error");
    }
  }

  if (!email) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
        {VERIFY_EMAIL_LABELS.missingEmailRedirect}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] w-full max-w-md flex-col justify-center px-4 py-8 md:py-16">
      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink">
            <Mail className="h-8 w-8 text-primary" aria-hidden />
          </div>
        </div>

        <h1 className="mb-2 text-center font-headings text-3xl font-bold text-primary">
          {VERIFY_EMAIL_LABELS.title}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {VERIFY_EMAIL_LABELS.subtitlePrefix}
          <strong className="font-semibold text-primary">{email}</strong>
          {VERIFY_EMAIL_LABELS.subtitleSuffix}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-primary">
              {VERIFY_EMAIL_LABELS.codeLabel}
            </legend>
            <div className="flex justify-center gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={6}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  value={digit}
                  onChange={(e) => handleChange(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  aria-label={`Chiffre ${index + 1} sur 6`}
                  className={cn(
                    "h-14 w-11 rounded-lg border bg-background text-center font-mono text-2xl text-primary",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    error ? "border-red-500" : "border-border",
                  )}
                />
              ))}
            </div>
          </fieldset>

          {error ? (
            <p className="text-center text-sm text-red-500" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={code.length !== 6 || submitting}
          >
            {submitting
              ? VERIFY_EMAIL_LABELS.verifyLoading
              : VERIFY_EMAIL_LABELS.verifyCta}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            disabled={cooldown > 0}
            onClick={onResend}
            aria-live="polite"
          >
            {cooldown > 0
              ? VERIFY_EMAIL_LABELS.resendCooldown.replace(
                  "{s}",
                  String(cooldown),
                )
              : VERIFY_EMAIL_LABELS.resendCta}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/inscription"
            className="text-primary hover:underline"
          >
            {VERIFY_EMAIL_LABELS.backToSignup}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerificationEmailPage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyEmailForm />
    </React.Suspense>
  );
}
