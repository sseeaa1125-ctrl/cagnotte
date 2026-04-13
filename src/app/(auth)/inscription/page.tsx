"use client";

// Phase 5 plan 05-01 — /inscription signup page (Banani screen 3).
// Backend contract: POST /api/auth/signup expects { email, password, displayName, slug }.
// We merge Prénom + Nom -> displayName client-side (D-09) and auto-generate a
// seller slug via src/lib/slug.ts (D-09). NEVER send firstName/lastName/tosAccepted.
// Social CTAs are retained in JSX behind FEATURE_SOCIAL_AUTH (D-08) — hidden in v1.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift, ArrowRight } from "lucide-react";
import { Input, Button, Checkbox, useToast } from "@/components/ui";
import { api, ApiError, BACKEND_URL } from "@/lib/api";
import {
  slugifySellerName,
  ensureAvailableSellerSlug,
  RESERVED_SELLER_SLUGS,
} from "@/lib/slug";
import { FEATURE_SOCIAL_AUTH } from "@/lib/features";
import { AUTH_LABELS } from "@/lib/constants";

interface SignupResponse {
  seller: {
    id: string;
    email: string;
    slug: string;
    displayName: string;
    emailVerified: boolean;
  };
  message: string;
  emailSent: boolean;
}

function InscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [tosAccepted, setTosAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [slugPreview, setSlugPreview] = React.useState("");

  // Phase 8 fixpack — surface Google OAuth error query params as toasts.
  React.useEffect(() => {
    const err = searchParams.get("error");
    if (err === "google_failed") {
      toast.toast(
        "La connexion Google a échoué. Réessaie ou utilise ton email.",
        "error",
      );
    } else if (err === "email_in_use") {
      toast.toast(
        "Cet email est déjà lié à un autre compte. Connecte-toi avec ton mot de passe.",
        "error",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGoogleSignup() {
    window.location.href = `${BACKEND_URL}/api/auth/google/authorize`;
  }

  // Debounced slug preview (no network call — just local slugify).
  React.useEffect(() => {
    const merged = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!merged) {
      setSlugPreview("");
      return;
    }
    const timer = setTimeout(() => {
      setSlugPreview(slugifySellerName(merged));
    }, 300);
    return () => clearTimeout(timer);
  }, [firstName, lastName]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!tosAccepted) {
      setError(AUTH_LABELS.tosError);
      return;
    }

    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (displayName.length < 2) {
      setError(AUTH_LABELS.errorDisplayNameTooShort);
      return;
    }

    let base = slugifySellerName(displayName);
    if (!base) {
      setError(AUTH_LABELS.errorDisplayNameTooShort);
      return;
    }
    if (RESERVED_SELLER_SLUGS.has(base)) {
      base = `createur-${base}`.slice(0, 30);
    }

    setSubmitting(true);
    try {
      let slug: string;
      try {
        slug = await ensureAvailableSellerSlug(base);
      } catch {
        setError(AUTH_LABELS.errorSlugUnavailable);
        setSubmitting(false);
        return;
      }

      try {
        await api<SignupResponse>("/api/auth/signup", {
          method: "POST",
          body: { email, password, displayName, slug },
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const msg = err.message.toLowerCase();
          if (msg.includes("email")) {
            setError(AUTH_LABELS.errorEmailTaken);
            setSubmitting(false);
            return;
          }
          // Slug taken mid-flight — try ONE more suffix then bail.
          try {
            const fallbackSlug = await ensureAvailableSellerSlug(`${base}-2`);
            await api<SignupResponse>("/api/auth/signup", {
              method: "POST",
              body: { email, password, displayName, slug: fallbackSlug },
            });
          } catch {
            setError(AUTH_LABELS.errorSlugTaken);
            setSubmitting(false);
            return;
          }
        } else if (err instanceof ApiError && err.status === 429) {
          setError(AUTH_LABELS.errorRateLimit);
          setSubmitting(false);
          return;
        } else if (err instanceof ApiError) {
          setError(err.message || AUTH_LABELS.errorGeneric);
          setSubmitting(false);
          return;
        } else {
          setError(AUTH_LABELS.errorGeneric);
          setSubmitting(false);
          return;
        }
      }

      router.push(
        `/verification-email?email=${encodeURIComponent(email)}`,
      );
    } catch {
      setError(AUTH_LABELS.errorGeneric);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] w-full max-w-md flex-col justify-center px-4 py-8 md:py-16">
      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
        {/* Icon badge */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink">
            <Gift className="h-8 w-8 text-primary" aria-hidden />
          </div>
        </div>

        <h1 className="mb-2 text-center font-headings text-3xl font-bold text-primary">
          {AUTH_LABELS.signupTitle}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {AUTH_LABELS.signupSubtitle}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={AUTH_LABELS.firstNameLabel}
              placeholder={AUTH_LABELS.firstNamePlaceholder}
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label={AUTH_LABELS.lastNameLabel}
              placeholder={AUTH_LABELS.lastNamePlaceholder}
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            label={AUTH_LABELS.emailLabel}
            type="email"
            placeholder={AUTH_LABELS.emailPlaceholder}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label={AUTH_LABELS.passwordLabel}
            type="password"
            placeholder={AUTH_LABELS.passwordPlaceholder}
            autoComplete="new-password"
            minLength={8}
            helper={AUTH_LABELS.passwordHint}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {slugPreview ? (
            <p className="text-xs text-muted-foreground">
              {AUTH_LABELS.slugPreviewLabel}{" "}
              <span className="font-mono text-primary">
                cagnotte.sn/{slugPreview}
              </span>
            </p>
          ) : null}

          <Checkbox
            checked={tosAccepted}
            onChange={setTosAccepted}
            label={
              <span>
                {AUTH_LABELS.tosLabel.replace(
                  "conditions générales d'utilisation de cagnotte.sn",
                  "",
                )}
                <Link
                  href="/cgu"
                  className="underline hover:text-primary-hover"
                >
                  conditions générales d{"'"}utilisation
                </Link>{" "}
                de cagnotte.sn
              </span>
            }
            error={
              error === AUTH_LABELS.tosError ? AUTH_LABELS.tosError : undefined
            }
          />

          {error && error !== AUTH_LABELS.tosError ? (
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
            disabled={!tosAccepted || submitting}
            iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}
          >
            {submitting ? AUTH_LABELS.signupLoading : AUTH_LABELS.signupCta}
          </Button>
        </form>

        {/* Social login CTAs — D-08: retained in JSX behind feature flag.
            v1 never renders these (FEATURE_SOCIAL_AUTH = false). */}
        {FEATURE_SOCIAL_AUTH ? (
          <div className="mt-6">
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-border" />
              <span className="mx-4 text-xs text-muted-foreground">
                {AUTH_LABELS.orContinueWith}
              </span>
              <div className="flex-grow border-t border-border" />
            </div>
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="social"
                socialProvider="google"
                fullWidth
                onClick={handleGoogleSignup}
              >
                {AUTH_LABELS.socialGoogleLabel}
              </Button>
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/connexion"
            className="text-primary hover:underline"
          >
            {AUTH_LABELS.alreadyAccount}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <React.Suspense fallback={null}>
      <InscriptionForm />
    </React.Suspense>
  );
}
