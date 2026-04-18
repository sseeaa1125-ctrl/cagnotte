"use client";

// Phase 5 plan 05-01 — /mot-de-passe-reinitialiser (gap screen, we design).
// Backend POST /api/auth/reset-password takes { email, code, newPassword }
// and returns 200 + a plain message. It does NOT issue cookies — the user
// must log in fresh on /connexion. We therefore do NOT persist any CSRF
// token on this page. Redirect target is /connexion?reset=1 which shows
// a success toast on mount.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Input, Button, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { RESET_PASSWORD_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const email = searchParams.get("email") || "";

  const [digits, setDigits] = React.useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const [resendCooldown, setResendCooldown] = React.useState(30);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      setResendCooldown(30);
      toast.toast("Code renvoyé — vérifie ton email.", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Impossible de renvoyer le code.");
      }
    } finally {
      setResending(false);
    }
  }

  React.useEffect(() => {
    if (!email) {
      router.replace("/mot-de-passe-oublie");
    }
  }, [email, router]);

  const code = digits.join("");

  function setDigitAt(index: number, value: string) {
    if (value && !/^[0-9]$/.test(value)) return;
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const raw = e.target.value;
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
    const paste = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
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

  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit =
    code.length === 6 &&
    newPassword.length >= 8 &&
    passwordsMatch &&
    !submitting;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError(RESET_PASSWORD_LABELS.errorInvalid);
      return;
    }
    if (newPassword.length < 8) {
      setError(RESET_PASSWORD_LABELS.errorTooShort);
      return;
    }
    if (!passwordsMatch) {
      setError(RESET_PASSWORD_LABELS.errorMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: { email: email.trim(), code, newPassword },
      });
      toast.toast(RESET_PASSWORD_LABELS.successToast, "success");
      router.replace("/connexion?reset=1");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(RESET_PASSWORD_LABELS.errorInvalid);
        clearDigits();
      } else if (err instanceof ApiError) {
        setError(err.message || RESET_PASSWORD_LABELS.errorInvalid);
      } else {
        setError(RESET_PASSWORD_LABELS.errorInvalid);
      }
      setSubmitting(false);
    }
  }

  if (!email) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] w-full max-w-md flex-col justify-center px-4 py-8 md:py-16">
      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink">
            <Lock className="h-8 w-8 text-primary" aria-hidden />
          </div>
        </div>

        <h1 className="mb-2 text-center font-headings text-3xl font-bold text-primary">
          {RESET_PASSWORD_LABELS.title}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {RESET_PASSWORD_LABELS.subtitlePrefix}
          <strong className="font-semibold text-primary">{email}</strong>
          {RESET_PASSWORD_LABELS.subtitleSuffix}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-primary">
              {RESET_PASSWORD_LABELS.codeLabel}
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

          <Input
            label={RESET_PASSWORD_LABELS.newPasswordLabel}
            type="password"
            placeholder={RESET_PASSWORD_LABELS.newPasswordPlaceholder}
            autoComplete="new-password"
            minLength={8}
            helper={RESET_PASSWORD_LABELS.newPasswordHint}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label={RESET_PASSWORD_LABELS.confirmPasswordLabel}
            type="password"
            placeholder={RESET_PASSWORD_LABELS.confirmPasswordPlaceholder}
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={
              confirmPassword && !passwordsMatch
                ? RESET_PASSWORD_LABELS.errorMismatch
                : undefined
            }
            required
          />

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
            disabled={!canSubmit}
          >
            {submitting
              ? RESET_PASSWORD_LABELS.submitLoading
              : RESET_PASSWORD_LABELS.submitCta}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            className={cn(
              "text-sm",
              resendCooldown > 0 || resending
                ? "cursor-not-allowed text-muted-foreground"
                : "text-primary hover:underline",
            )}
          >
            {resending
              ? "Envoi…"
              : resendCooldown > 0
                ? `Renvoyer le code (${resendCooldown}s)`
                : "Renvoyer le code"}
          </button>
          <Link
            href="/connexion"
            className="text-sm text-primary hover:underline"
          >
            {RESET_PASSWORD_LABELS.backToLoginCta}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MotDePasseReinitialiserPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
