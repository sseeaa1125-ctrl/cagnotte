"use client";

// Phase 5 plan 05-01 — /connexion login page (Banani screens 4 + 5).
// Screen 5 (error variant) is rendered as in-component state, NOT a separate route.
// Backend contract: POST /api/auth/login returns { seller, csrfToken } + sets
// izy-token cookie. 403 "Email non vérifié" triggers auto resend-code + redirect
// to /verification-email. On success: storeCsrfToken + refreshSeller + redirect.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Input, Button, useToast } from "@/components/ui";
import { api, ApiError, BACKEND_URL, storeCsrfToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { FEATURE_SOCIAL_AUTH } from "@/lib/features";
import { AUTH_LABELS } from "@/lib/constants";

interface LoginResponse {
  seller: {
    id: string;
    email: string;
    slug: string;
    displayName: string;
    plan: string;
    onboardingCompleted: boolean;
  };
  csrfToken: string;
}

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSeller } = useAuth();
  const toast = useToast();

  const nextUrl = searchParams.get("next") || "/tableau-de-bord";
  const resetFlag = searchParams.get("reset");
  const verifiedFlag = searchParams.get("verified");
  const oauthError = searchParams.get("error");

  function handleGoogleLogin() {
    window.location.href = `${BACKEND_URL}/api/auth/google/authorize`;
  }

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Phase 11 — Google-first collapsible pattern. Email fields stay hidden
  // until the donor explicitly taps "Continuer avec Email". Short-form UX
  // for mobile (fewer fields above the fold).
  const [showEmailForm, setShowEmailForm] = React.useState(false);

  // One-shot toasts on mount based on query params.
  React.useEffect(() => {
    if (resetFlag === "1") {
      toast.toast(AUTH_LABELS.toastPasswordReset, "success");
    }
    if (verifiedFlag === "1") {
      toast.toast(AUTH_LABELS.toastVerifiedPleaseLogin, "success");
    }
    if (oauthError === "google_failed") {
      toast.toast(
        "La connexion Google a échoué. Réessaie ou utilise ton email.",
        "error",
      );
    } else if (oauthError === "email_in_use") {
      toast.toast(
        "Cet email est déjà lié à un autre compte. Connecte-toi avec ton mot de passe.",
        "error",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      storeCsrfToken(res.csrfToken);
      await refreshSeller();
      router.replace(nextUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        // 403 unverified-email branch: auto-resend + redirect to verify page.
        if (
          err.status === 403 &&
          err.message.toLowerCase().includes("email non vérifié")
        ) {
          try {
            await api("/api/auth/resend-code", {
              method: "POST",
              body: { email },
            });
          } catch {
            // swallow — user will see the form on /verification-email anyway
          }
          toast.toast(AUTH_LABELS.errorEmailUnverified, "info");
          router.push(
            `/verification-email?email=${encodeURIComponent(email)}`,
          );
          return;
        }
        if (err.status === 401) {
          setError(AUTH_LABELS.errorInvalidCredentials);
        } else if (err.status === 429) {
          setError(AUTH_LABELS.errorRateLimit);
        } else {
          setError(err.message || AUTH_LABELS.errorGeneric);
        }
      } else {
        setError(AUTH_LABELS.errorGeneric);
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-8 md:py-10">
      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-6">
        <h1 className="mb-2 text-center font-headings text-3xl font-bold text-primary">
          {AUTH_LABELS.loginTitle}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {AUTH_LABELS.loginSubtitle}
        </p>

        {/* Google button — primary CTA, always above the fold. */}
        {FEATURE_SOCIAL_AUTH ? (
          <Button
            type="button"
            variant="social"
            socialProvider="google"
            size="lg"
            fullWidth
            onClick={handleGoogleLogin}
          >
            {AUTH_LABELS.socialGoogleLabel}
          </Button>
        ) : null}

        {/* "ou" divider — only rendered when Google button is on, otherwise
            email is the only option and the divider would look stranded. */}
        {FEATURE_SOCIAL_AUTH ? (
          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-border" />
            <span className="mx-4 text-xs text-muted-foreground">
              {AUTH_LABELS.orContinueWith}
            </span>
            <div className="flex-grow border-t border-border" />
          </div>
        ) : null}

        {/* Email trigger — hidden once the form is revealed. */}
        {!showEmailForm ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={() => setShowEmailForm(true)}
            iconLeft={<Mail className="h-4 w-4" aria-hidden />}
          >
            Continuer avec Email
          </Button>
        ) : null}

        {/* Email form — conditionally rendered. */}
        {showEmailForm ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <Input
              label={AUTH_LABELS.emailLabel}
              type="email"
              placeholder={AUTH_LABELS.emailPlaceholder}
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-primary"
                >
                  {AUTH_LABELS.passwordLabel}
                </label>
                <Link
                  href="/mot-de-passe-oublie"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {AUTH_LABELS.forgotPasswordCta}
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                placeholder={AUTH_LABELS.passwordPlaceholder}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={error || undefined}
                required
              />
            </div>

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
              {submitting ? AUTH_LABELS.loginLoading : AUTH_LABELS.loginCta}
            </Button>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/inscription"
            className="text-primary hover:underline"
          >
            {AUTH_LABELS.noAccountYet}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <React.Suspense fallback={null}>
      <ConnexionForm />
    </React.Suspense>
  );
}
