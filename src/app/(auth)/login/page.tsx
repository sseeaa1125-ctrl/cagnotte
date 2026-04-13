"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError, storeCsrfToken } from "@/lib/api";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { ArrowRight, Mail, Check, Loader2, Edit2 } from "lucide-react";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

const TEXTS = {
  // Start view
  startTitle: "Bienvenue sur Izy",
  startSubtitle: "Ton lien en bio pour regrouper toute ton offre.",
  emailLabel: "Adresse email",
  emailPlaceholder: "toi@email.com",
  continueEmail: "Continuer avec l'email",
  continueGoogle: "Continuer avec Google",
  
  // Login view
  loginTitle: "Bon retour",
  loginSubtitle: "Accède à ton tableau de bord et suis tes visites.",
  passwordLabel: "Mot de passe",
  passwordPlaceholder: "Ton mot de passe secret",
  loginCta: "Se connecter",
  forgotLink: "Mot de passe oublié ?",

  // Signup view
  signupTitle: "Crée ta page",
  signupSubtitle: "Quelques infos pour générer ton lien Izy.",
  nameLabel: "Ton nom affiché",
  namePlaceholder: "Ex : Awa Concept",
  slugLabel: "Le lien de ta page",
  slugPlaceholder: "Ex : awa-concept",
  slugHint: "izy.store/",
  signupPasswordLabel: "Choisis un mot de passe",
  signupPasswordPlaceholder: "Minimum 8 caractères",
  signupCta: "Créer ma page",

  // Verify
  verifyTitle: "Vérifie ton email",
  verifySubtitle: "Entre le code à 6 chiffres envoyé à",
  verifyCodeLabel: "Code de vérification",
  verifyCodePlaceholder: "123456",
  verifyCta: "Valider mon compte",

  // Forgot / Reset
  forgotTitle: "Mot de passe oublié ?",
  forgotSubtitle: "On t'envoie un code pour le réinitialiser.",
  forgotCta: "Envoyer le code",
  resetTitle: "Nouveau mot de passe",
  resetSubtitle: "Vérifie tes emails et entre le code reçu",
  resetCodeLabel: "Code de sécurité",
  resetCodePlaceholder: "123456",
  resetNewPwLabel: "Nouveau mot de passe",
  resetNewPwPlaceholder: "Nouveau (min 8 car.)",
  resetCta: "Mettre à jour",
  resetSuccess: "Mot de passe modifié !",
  backToLogin: "Retour à la connexion",
  
  // Google 
  pickSlugTitle: "Dernière étape",
  pickSlugSubtitle: "Choisis le lien de ta future page.",
};

function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const level = score <= 1 ? "Faible" : score <= 3 ? "Moyen" : "Fort";
  const color = score <= 1 ? "bg-red-400" : score <= 3 ? "bg-amber-400" : "bg-green-500";
  const textColor = score <= 1 ? "text-red-500" : score <= 3 ? "text-amber-500" : "text-green-600";
  const width = `${Math.min((score / 5) * 100, 100)}%`;

  return (
    <span className="flex items-center gap-2">
      <span className="relative h-1 w-20 rounded-full bg-gray-200 overflow-hidden">
        <span className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${color}`} style={{ width }} />
      </span>
      <span className={`text-[11px] font-semibold ${textColor}`}>{level}</span>
    </span>
  );
}

type AuthView = "start" | "login" | "signup" | "verify" | "forgot" | "reset" | "pick-slug" | "reset-success";

export default function UnifiedAuthPage() {
  const [view, setView] = useState<AuthView>("start");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [resendCooldown, setResendCooldown] = useState(0);

  // Slug availability check
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    if (!slug || slug.length < 3 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const res = await api<{ available: boolean }>(`/api/auth/check-slug?slug=${encodeURIComponent(slug)}`);
        setSlugStatus(res.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 500);
    return () => { if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current); };
  }, [slug]);

  // Google OAuth state
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  async function handleGoogleCode(gCode: string) {
    setError("");
    setLoading(true);
    try {
      const res = await api<{
        isNewUser?: boolean;
        csrfToken?: string;
        seller?: { onboardingCompleted?: boolean };
      }>("/api/auth/google", {
        method: "POST",
        body: { code: gCode },
      });

      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      if (res.seller) {
        window.location.href = res.seller.onboardingCompleted === false ? "/onboarding" : "/dashboard/blocks";
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === "SLUG_REQUIRED" || err.message === "Choisis un nom de page pour continuer") {
          const gToken = err.body?.googleToken as string | undefined;
          if (!gToken) {
            setError("Erreur d'authentification Google. Réessaye.");
            return;
          }
          setGoogleIdToken(gToken);
          const gName = (err.body?.googleName as string) || "";
          if (gName) setDisplayName(gName);
          setView("pick-slug");
        } else {
          setError(err.message);
        }
      } else {
        setError("Erreur réseau. Réessaye.");
      }
    } finally {
      setLoading(false);
    }
  }

  const { trigger: triggerGoogleFlow } = useGoogleAuth({
    onCode: handleGoogleCode,
    onError: (msg) => setError(msg),
  });

  // Flow Handlers
  async function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("L'email est requis");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Format d'email invalide");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api<{ exists: boolean; authType?: "google" | "email" }>("/api/auth/check-email", {
        method: "POST",
        body: { email: trimmedEmail.toLowerCase() },
      });
      
      if (res.exists) {
        if (res.authType === "google") {
          setError("Ce compte est lié à Google. Clique sur 'Continuer avec Google' ci-dessus.");
          return;
        }
        setView("login");
      } else {
        // Prepare displayName based on email local part if empty
        if (!displayName) {
          const localPart = trimmedEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ");
          setDisplayName(localPart.charAt(0).toUpperCase() + localPart.slice(1));
        }
        setView("signup");
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau. Réessaye.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Le mot de passe est requis");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await api<{ seller: { onboardingCompleted?: boolean }; csrfToken?: string }>("/api/auth/login", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), password },
      });
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      window.location.href = res.seller.onboardingCompleted === false ? "/onboarding" : "/dashboard/blocks";
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau. Réessaye.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus === "taken") {
      setError("Ce nom de page est déjà pris");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire minimum 8 caractères");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await api("/api/auth/signup", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          password,
          displayName: displayName.trim(),
          slug,
        },
      });
      setView("verify");
      setCode("");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau. Réessaye.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api<{ csrfToken?: string }>("/api/auth/verify-email", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), code },
      });
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      window.location.href = "/onboarding";
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau. Réessaye.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);

    try {
      await api("/api/auth/resend-code", {
        method: "POST",
        body: { email: email.trim().toLowerCase() },
      });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  async function handleGoogleSlugSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!googleIdToken || !slug) return;
    setError("");
    setLoading(true);

    try {
      const res = await api<{
        csrfToken?: string;
        seller: { onboardingCompleted?: boolean };
      }>("/api/auth/google", {
        method: "POST",
        body: {
          googleToken: googleIdToken,
          slug,
          displayName: displayName || undefined,
        },
      });
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      window.location.href = res.seller.onboardingCompleted === false ? "/onboarding" : "/dashboard/blocks";
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim().toLowerCase() },
      });
      setView("reset");
      setCode(""); // reset code field
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau. Réessaye.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), code, newPassword },
      });
      setView("reset-success");
      setPassword(""); // clear pw to require fresh login
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau. Réessaye.");
    } finally {
      setLoading(false);
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30));
  }

  function goBackToStart() {
    setView("start");
    setError("");
    setPassword("");
    setSlug("");
    setCode("");
  }

  // Common Header
  const title = {
    start: TEXTS.startTitle,
    login: TEXTS.loginTitle,
    signup: TEXTS.signupTitle,
    verify: TEXTS.verifyTitle,
    forgot: TEXTS.forgotTitle,
    reset: TEXTS.resetTitle,
    "pick-slug": TEXTS.pickSlugTitle,
    "reset-success": TEXTS.resetSuccess,
  }[view];

  const subtitle = {
    start: TEXTS.startSubtitle,
    login: TEXTS.loginSubtitle,
    signup: TEXTS.signupSubtitle,
    verify: <>{TEXTS.verifySubtitle} <strong className="text-gray-900">{email}</strong></>,
    forgot: TEXTS.forgotSubtitle,
    reset: TEXTS.resetSubtitle,
    "pick-slug": TEXTS.pickSlugSubtitle,
    "reset-success": "Tu peux maintenant te connecter avec ton nouveau mot de passe.",
  }[view];

  return (
    <div>
      {/* Dynamic Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-gray-500 font-medium">{subtitle}</p>
      </div>

      {error && <div className="mb-6 p-3 rounded-xl bg-red-50 text-red-600 text-[13px] font-bold text-center border border-red-100">{error}</div>}

      {/* START VIEW */}
      {view === "start" && (
        <div className="space-y-4">
          <AuthButton type="button" variant="secondary" onClick={triggerGoogleFlow} icon={<GoogleIcon className="w-5 h-5" />}>
            {TEXTS.continueGoogle}
          </AuthButton>
          
          <div className="relative py-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative bg-white px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">ou</div>
          </div>

          <form onSubmit={handleCheckEmail} noValidate className="space-y-5">
            <AuthInput
              label={TEXTS.emailLabel}
              type="email"
              placeholder={TEXTS.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
            <AuthButton type="submit" variant="teal" disabled={loading || !email} loading={loading} loadingText="Recherche..." className="mt-2 text-[15px]">
              {TEXTS.continueEmail}
              <ArrowRight size={16} />
            </AuthButton>
          </form>
        </div>
      )}

      {/* LOGIN VIEW */}
      {view === "login" && (
        <form onSubmit={handleLogin} noValidate className="space-y-5">
          {/* Email badge */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
             <div className="flex items-center gap-3">
               <div className="bg-white p-1.5 rounded-lg shadow-sm border border-gray-100">
                 <Mail size={16} className="text-gray-400" />
               </div>
               <span className="text-sm font-bold text-gray-900">{email}</span>
             </div>
             <button type="button" onClick={goBackToStart} className="text-[11px] font-bold text-teal-600 hover:text-teal-700 uppercase tracking-wider">
               Modifier
             </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-gray-700">{TEXTS.passwordLabel}</label>
              <button
                type="button"
                onClick={() => { setView("forgot"); setError(""); }}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700"
              >
                {TEXTS.forgotLink}
              </button>
            </div>
            <AuthInput
              label=""
              type="password"
              placeholder={TEXTS.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
            />
          </div>
          
          <AuthButton type="submit" variant="teal" disabled={loading || !password} loading={loading} loadingText="Connexion..." className="mt-2 text-[15px]">
            {TEXTS.loginCta}
            <ArrowRight size={16} />
          </AuthButton>
        </form>
      )}

      {/* SIGNUP VIEW */}
      {view === "signup" && (
        <form onSubmit={handleSignup} noValidate className="space-y-4">
          {/* Email badge */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-bold text-gray-700">Ton email</span>
            <button type="button" onClick={goBackToStart} className="text-[11px] font-bold text-teal-600 flex items-center gap-1 hover:text-teal-700">
              <Edit2 size={12} /> Modifier
            </button>
          </div>
          <AuthInput
            label=""
            type="email"
            value={email}
            disabled
            className="text-gray-500 bg-gray-50"
          />

          <AuthInput
            label={TEXTS.nameLabel}
            type="text"
            placeholder={TEXTS.namePlaceholder}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
          />

          <AuthInput
            label={TEXTS.slugLabel}
            type="text"
            placeholder={TEXTS.slugPlaceholder}
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            maxLength={30}
            leftIcon={<span className="text-gray-400 font-medium">{TEXTS.slugHint}</span>}
            className="font-medium text-teal-700 lowercase"
            error={slugStatus === "taken" ? "Ce nom est déjà pris" : undefined}
            hint={
              slug ? (
                <span className="flex items-center gap-1.5">
                  {slugStatus === "checking" && <><Loader2 size={12} className="animate-spin text-gray-400" /><span className="text-gray-400">Vérification...</span></>}
                  {slugStatus === "available" && <><Check size={12} className="text-green-600" /><span className="text-green-600 font-semibold">Disponible</span></>}
                  {slugStatus === "idle" && slug.length >= 3 && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) && <span className="text-amber-600">Lettres minuscules, chiffres, tirets</span>}
                  {(slugStatus === "idle" || slugStatus === "available" || slugStatus === "checking") && <span className="truncate text-gray-500">{TEXTS.slugHint}{slug}</span>}
                </span>
              ) : undefined
            }
          />

          <AuthInput
            label={TEXTS.signupPasswordLabel}
            type="password"
            placeholder={TEXTS.signupPasswordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            hint={password.length > 0 ? <PasswordStrength password={password} /> : undefined}
          />
          
          <AuthButton type="submit" variant="primary" disabled={loading || slugStatus === "taken" || !displayName || !password || !slug} loading={loading} loadingText="Création..." className="mt-4 text-[15px]">
            {TEXTS.signupCta}
            <ArrowRight size={16} />
          </AuthButton>
        </form>
      )}

      {/* VERIFY VIEW */}
      {view === "verify" && (
        <div>
          <form onSubmit={handleVerify} className="space-y-5">
            <AuthInput
              label={TEXTS.verifyCodeLabel}
              type="text"
              placeholder={TEXTS.verifyCodePlaceholder}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              className="font-mono text-center tracking-widest text-lg"
            />
            <AuthButton type="submit" variant="teal" disabled={loading || code.length !== 6} loading={loading} loadingText="Validation...">
              {TEXTS.verifyCta}
            </AuthButton>
          </form>

          <button onClick={handleResendCode} disabled={resendCooldown > 0} className="mt-6 w-full text-center text-xs font-bold text-teal-600 hover:text-teal-700 disabled:text-gray-400 transition-colors">
            {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : "Renvoyer le code"}
          </button>

          <button onClick={goBackToStart} className="mt-4 block w-full text-center text-xs font-bold text-gray-500 transition-colors hover:text-gray-900">
            Annuler
          </button>
        </div>
      )}

      {/* FORGOT PASSWORD */}
      {view === "forgot" && (
        <form onSubmit={handleForgot} className="space-y-5">
           <AuthInput
             label={TEXTS.emailLabel}
             type="email"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             required
             autoFocus
           />
           <AuthButton type="submit" variant="teal" disabled={loading || !email} loading={loading} loadingText="Envoi...">
             {TEXTS.forgotCta}
           </AuthButton>
           <button type="button" onClick={() => setView("login")} className="mt-4 block w-full text-center text-xs font-bold text-gray-500 transition-colors hover:text-gray-900">
             Annuler
           </button>
        </form>
      )}

      {/* RESET PASSWORD */}
      {view === "reset" && (
        <form onSubmit={handleReset} className="space-y-5">
          <AuthInput
            label={TEXTS.resetCodeLabel}
            type="text"
            placeholder={TEXTS.resetCodePlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            autoFocus
            className="font-mono text-center tracking-widest text-lg"
          />
          <AuthInput
            label={TEXTS.resetNewPwLabel}
            type="password"
            placeholder={TEXTS.resetNewPwPlaceholder}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <AuthButton type="submit" variant="teal" disabled={loading || code.length !== 6 || newPassword.length < 8} loading={loading} loadingText="Mise à jour...">
            {TEXTS.resetCta}
          </AuthButton>
        </form>
      )}

      {/* RESET SUCCESS */}
      {view === "reset-success" && (
         <AuthButton variant="teal" onClick={() => setView("login")}>
           {TEXTS.backToLogin}
         </AuthButton>
      )}

      {/* GOOGLE PICK SLUG */}
      {view === "pick-slug" && (
        <form onSubmit={handleGoogleSlugSubmit} className="space-y-4">
          <AuthInput
            label={TEXTS.nameLabel}
            type="text"
            placeholder={TEXTS.namePlaceholder}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <AuthInput
            label={TEXTS.slugLabel}
            type="text"
            placeholder={TEXTS.slugPlaceholder}
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            autoFocus
            maxLength={30}
            leftIcon={<span className="text-gray-400 font-medium">{TEXTS.slugHint}</span>}
            className="font-medium text-teal-700 lowercase"
            error={slugStatus === "taken" ? "Ce nom est déjà pris" : undefined}
            hint={
              slug ? (
                <span className="flex items-center gap-1.5">
                  {slugStatus === "checking" && <><Loader2 size={12} className="animate-spin text-gray-400" /><span className="text-gray-400">Vérification...</span></>}
                  {slugStatus === "available" && <><Check size={12} className="text-green-600" /><span className="text-green-600 font-semibold">Disponible</span></>}
                  {slugStatus === "idle" && slug.length >= 3 && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) && <span className="text-amber-600">Lettres minuscules, chiffres, tirets</span>}
                  {(slugStatus === "idle" || slugStatus === "available" || slugStatus === "checking") && <span className="truncate text-gray-500">{TEXTS.slugHint}{slug}</span>}
                </span>
              ) : undefined
            }
          />
          <AuthButton type="submit" variant="teal" disabled={loading || slug.length < 3 || slugStatus === "taken"} loading={loading} loadingText="Création..." className="mt-2">
            Créer mon compte
            <ArrowRight size={16} />
          </AuthButton>
          <button type="button" onClick={() => { setView("start"); setGoogleIdToken(null); setError(""); }} className="mt-6 block w-full text-center text-xs font-bold text-gray-500 transition-colors hover:text-gray-900">
            Annuler
          </button>
        </form>
      )}

    </div>
  );
}
