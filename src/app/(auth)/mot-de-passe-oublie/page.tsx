"use client";

// Phase 5 plan 05-01 — /mot-de-passe-oublie (gap screen, we design in Banani
// visual language). Backend POST /api/auth/forgot-password always returns 200
// to avoid email enumeration (auth.ts:573-626), so we treat a successful
// submission as "done" and show a confirmation screen that links to the
// reset-password step.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { FORGOT_PASSWORD_LABELS } from "@/lib/constants";

export default function MotDePasseOubliePage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      // Redirect directly to code entry page
      router.push(
        `/mot-de-passe-reinitialiser?email=${encodeURIComponent(email.trim())}`,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : FORGOT_PASSWORD_LABELS.errorGeneric;
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] w-full max-w-md flex-col justify-center px-4 py-8 md:py-16">
      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink">
            {submitted ? (
              <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden />
            ) : (
              <KeyRound className="h-8 w-8 text-primary" aria-hidden />
            )}
          </div>
        </div>

        {!submitted ? (
          <>
            <h1 className="mb-2 text-center font-headings text-3xl font-bold text-primary">
              {FORGOT_PASSWORD_LABELS.title}
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {FORGOT_PASSWORD_LABELS.subtitle}
            </p>

            <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
              <Input
                label={FORGOT_PASSWORD_LABELS.emailLabel}
                type="email"
                placeholder={FORGOT_PASSWORD_LABELS.emailPlaceholder}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error || undefined}
                required
              />

              {error ? (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={submitting}
                disabled={submitting}
              >
                {submitting
                  ? FORGOT_PASSWORD_LABELS.submitLoading
                  : FORGOT_PASSWORD_LABELS.submitCta}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-center font-headings text-3xl font-bold text-primary">
              {FORGOT_PASSWORD_LABELS.successTitle}
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {FORGOT_PASSWORD_LABELS.successBody}
            </p>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                onClick={() =>
                  router.push(
                    `/mot-de-passe-reinitialiser?email=${encodeURIComponent(email)}`,
                  )
                }
              >
                {FORGOT_PASSWORD_LABELS.enterCodeCta}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => router.push("/connexion")}
              >
                {FORGOT_PASSWORD_LABELS.backToLoginCta}
              </Button>
            </div>
          </>
        )}

        {!submitted ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/connexion"
              className="text-primary hover:underline"
            >
              {FORGOT_PASSWORD_LABELS.backToLoginCta}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
