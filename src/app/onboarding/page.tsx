"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import useEmblaCarousel from "embla-carousel-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink,
  Copy,
  X,
  Globe,
} from "lucide-react";
import { PhoneInput } from "@/components/ui";
import { AuthButton } from "@/components/auth/AuthButton";
import { THEMES } from "@/types";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
import { 
  FaTiktok, 
  FaInstagram, 
  FaFacebook, 
  FaGoogle, 
  FaUserGroup, 
  FaLightbulb,
  FaDumbbell,
  FaPalette,
  FaBriefcase,
  FaStore,
  FaGraduationCap,
  FaStar
} from "react-icons/fa6";

/* ─────────────────── DATA ─────────────────── */
const REFERRAL_SOURCES = [
  { id: "tiktok",    label: "TikTok", icon: FaTiktok },
  { id: "instagram", label: "Instagram", icon: FaInstagram },
  { id: "facebook",  label: "Facebook", icon: FaFacebook },
  { id: "friend",    label: "Bouche à oreille", icon: FaUserGroup },
  { id: "google",    label: "Google / web", icon: FaGoogle },
  { id: "other",     label: "Autre", icon: FaLightbulb },
];

const ACTIVITIES = [
  { id: "coach",    label: "Coach / Formateur", icon: FaDumbbell },
  { id: "creator",  label: "Créateur de contenu", icon: FaPalette },
  { id: "freelance",label: "Freelance / Consultant", icon: FaBriefcase },
  { id: "seller",   label: "Vendeur en ligne", icon: FaStore },
  { id: "teacher",  label: "Prof / Enseignant", icon: FaGraduationCap },
  { id: "other",    label: "Autre", icon: FaStar },
];

const TEXTS = {
  step1Title: "Ton lien unique",
  step1Subtitle: "L'adresse de ta page — modifiable après",
  step1aTitle: "Quelle est ton activité ?",
  step1aSubtitle: "On personnalise ton expérience",
  step1ActivityLabel: "Quelle est ton activité principale ?",
  step1bTitle: "Ton numéro",
  step1bSubtitle: "Pour sécuriser ton compte — jamais affiché",
  step1cTitle: "Comment tu nous as trouvé ?",
  step1cSubtitle: "Ça nous aide beaucoup 🙏",
  step1PhoneLabel: "Ton numéro WhatsApp / téléphone",
  step1PhonePlaceholder: "77 123 45 67",
  step1PhoneHint: "Pas partagé publiquement",
  step2Title: "Choisis ton style",
  step2Subtitle: "Tu pourras tout changer après",
  step3Title: "Tes réseaux sociaux",
  step3Subtitle: "Pour que tes visiteurs te retrouvent",
  step3Skip: "Plus tard",
  successTitle: "C'est parti ! 🎉",
  successSubtitle: "Ta page est en ligne — partage-la !",
  next: "Continuer",
  finish: "Aller au dashboard",
  copied: "Copié !",
  shareLink: "Copier mon lien",
};

const STEP_LABELS = ["Lien", "Activité", "Contact", "Source", "Design", "Réseaux"];
const STEP_ICONS = ["🔗", "🎯", "📱", "👋", "🎨", "🌐"];

/* ─────────────────── THEMES ─────────────────── */
const THEME_PREVIEWS = THEMES.map((t) => ({
  id: t.id,
  name: t.name,
  primary: t.primary,
  bg: t.background,
  accent: t.cardBg,
}));

type ThemePreview = (typeof THEME_PREVIEWS)[number];
type Step = 1 | "1a" | "1b" | "1c" | 2 | 3 | "success";

function ThemeGrid({ themes, selectedTheme, onSelect }: {
  themes: ThemePreview[];
  selectedTheme: string;
  onSelect: (id: string) => void;
}) {
  const initialIdx = useRef(Math.max(0, themes.findIndex((t) => t.id === selectedTheme)));
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    startIndex: initialIdx.current,
    dragFree: false,
    duration: 25,
    containScroll: "trimSnaps",
  });
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onScroll = () => setScrollProgress(Math.max(0, Math.min(1, emblaApi.scrollProgress())));
    emblaApi.on("scroll", onScroll);
    onScroll();
    return () => { emblaApi.off("scroll", onScroll); };
  }, [emblaApi]);

  return (
    <>
      {/* Mobile: Embla carousel */}
      <div className="sm:hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-2 py-1">
            {themes.map((theme) => (
              <div key={theme.id} className="flex-[0_0_32%] min-w-0">
                <ThemeCard theme={theme} isSelected={selectedTheme === theme.id} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 mx-auto w-16 h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-transform duration-100"
            style={{ width: "40%", transform: `translateX(${scrollProgress * 150}%)` }}
          />
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-2.5">
        {themes.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} isSelected={selectedTheme === theme.id} onSelect={onSelect} />
        ))}
      </div>
    </>
  );
}

function ThemeCard({ theme, isSelected, onSelect }: {
  theme: ThemePreview;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`relative rounded-2xl border-2 p-2.5 transition-all duration-300 hover:scale-[1.05] active:scale-95 ${
        isSelected
          ? "border-teal-500 shadow-lg shadow-teal-500/15"
          : "border-gray-100 hover:border-gray-200"
      }`}
    >
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 z-10 shadow-sm">
          <Check size={11} strokeWidth={3} className="text-white" />
        </div>
      )}
      <div
        className="rounded-xl p-3 h-24 sm:h-20 flex flex-col items-center justify-center gap-1.5"
        style={{ backgroundColor: theme.bg }}
      >
        <div className="h-7 w-7 rounded-full" style={{ backgroundColor: theme.accent, border: `2px solid ${theme.primary}` }} />
        <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: theme.primary, opacity: 0.6 }} />
        <div className="h-1 w-7 rounded-full" style={{ backgroundColor: theme.primary, opacity: 0.3 }} />
      </div>
      <p className="mt-2 text-[10px] font-bold text-gray-600 text-center">{theme.name}</p>
    </button>
  );
}

/* ─────────────────── COMPOSANT PRINCIPAL ─────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const { seller, loading: authLoading, refreshSeller } = useAuth();
  const [step, setStep] = useState<Step>(1);

  const [activity, setActivity] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(true);
  const [checkingSlug, setCheckingSlug] = useState(false);

  useEffect(() => {
    if (seller?.slug && !slug) setSlug(seller.slug);
  }, [seller?.slug]);

  useEffect(() => {
    if (!slug || slug.length < 3) { setSlugAvailable(null); return; }
    if (slug === seller?.slug) { setSlugAvailable(true); return; }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const data = (await api(`/api/auth/check-slug?slug=${slug}`)) as { available: boolean };
        setSlugAvailable(data.available);
      } catch {
        setSlugAvailable(false);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, seller?.slug]);
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [socials, setSocials] = useState({
    instagramUrl: seller?.instagramUrl || "",
    tiktokUrl: seller?.tiktokUrl || "",
    youtubeUrl: seller?.youtubeUrl || "",
    whatsappNumber: seller?.whatsappNumber || "",
    websiteUrl: seller?.websiteUrl || "",
  });

  const [referralSource, setReferralSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const directionRef = useRef<"forward" | "back">("forward");
  const socialsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSocials = useCallback((data: typeof socials) => {
    if (socialsDebounceRef.current) clearTimeout(socialsDebounceRef.current);
    socialsDebounceRef.current = setTimeout(async () => {
      const body: Record<string, string> = {};
      if (data.instagramUrl.trim()) body.instagramUrl = data.instagramUrl.trim();
      if (data.tiktokUrl.trim()) body.tiktokUrl = data.tiktokUrl.trim();
      if (data.youtubeUrl.trim()) body.youtubeUrl = data.youtubeUrl.trim();
      if (data.whatsappNumber.trim()) body.whatsappNumber = data.whatsappNumber.trim();
      if (data.websiteUrl.trim()) body.websiteUrl = data.websiteUrl.trim();
      if (Object.keys(body).length === 0) return;
      try { await api("/api/sellers/profile", { method: "PUT", body }); } catch { /* silent */ }
    }, 1500);
  }, []);

  useEffect(() => {
    return () => { if (socialsDebounceRef.current) clearTimeout(socialsDebounceRef.current); };
  }, []);

  function handleSocialChange(key: keyof typeof socials, value: string) {
    const updated = { ...socials, [key]: value };
    setSocials(updated);
    saveSocials(updated);
  }

  useEffect(() => {
    // We explicitly do NOT redirect on onboardingCompleted here anymore,
    // so the user can see the final "success" Step with the confetti.
    // If they refresh the page, the layout/middleware will handle redirection.
  }, [seller, router]);

  useEffect(() => {
    function handlePopState() {
      if (step === "1a") { directionRef.current = "back"; setStep(1); setError(""); window.history.pushState(null, ""); }
      else if (step === "1b") { directionRef.current = "back"; setStep("1a"); setError(""); window.history.pushState(null, ""); }
      else if (step === "1c") { directionRef.current = "back"; setStep("1b"); setError(""); window.history.pushState(null, ""); }
      else if (step === 2) { directionRef.current = "back"; setStep("1c"); setError(""); window.history.pushState(null, ""); }
      else if (step === 3) { directionRef.current = "back"; setStep(2); setError(""); window.history.pushState(null, ""); }
      else if (step === "success") window.history.pushState(null, "");
    }
    window.history.pushState(null, "");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [step]);

  /* ─────── CONFETTI ON SUCCESS ─────── */
  useEffect(() => {
    if (step !== "success") return;
    
    // Multiple bursts for a "wow" effect
    const timer = setTimeout(() => {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: ReturnType<typeof setInterval> = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      // Initial big bursts from corners — FORCE HIGH Z-INDEX
      confetti({ ...defaults, particleCount: 150, spread: 70, origin: { x: 0, y: 1 }, colors: ["#14b8a6", "#fbbf24", "#f472b6", "#818cf8"] });
      confetti({ ...defaults, particleCount: 150, spread: 70, origin: { x: 1, y: 1 }, colors: ["#14b8a6", "#fbbf24", "#f472b6", "#818cf8"] });
      
      return () => clearInterval(interval);
    }, 500);

    return () => clearTimeout(timer);
  }, [step]);

  /* ─────── AUTO-FOCUS INPUTS ON STEP CHANGE ─────── */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 1) {
        (document.querySelector('input[placeholder="ton-entreprise"]') as HTMLInputElement)?.focus();
      } else if (step === "1b") {
        (document.querySelector('input[type="tel"]') as HTMLInputElement)?.focus();
      } else if (step === 3) {
        const firstEmpty = document.querySelector('.social-input:not([data-filled])') as HTMLInputElement;
        firstEmpty?.focus();
      }
    }, 450); // wait for step transition animation
    return () => clearTimeout(timer);
  }, [step]);

  if (authLoading || !seller) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="w-full max-w-md space-y-6 px-4">
          <div className="h-1 w-full rounded-full bg-gray-100 animate-pulse" />
          <div className="space-y-3">
            <div className="h-7 w-48 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-4 w-64 rounded-xl bg-gray-100 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─────── HANDLERS ─────── */
  async function handleStep1Next() {
    if (!slug || slug.length < 3) { setError("Choisis un lien valide pour continuer"); return; }
    if (slugAvailable === false) { setError("Ce lien n'est pas disponible"); return; }
    setError("");
    directionRef.current = "forward";
    setStep("1a");
    // Save in background
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Dakar";
    api("/api/sellers/profile", { method: "PUT", body: { timezone: detectedTimezone, slug } })
      .then(() => refreshSeller())
      .catch(() => { /* silent — will retry on next save */ });
  }

  async function handleStep1aNext() {
    if (!activity) { setError("Choisis ton activité pour continuer"); return; }
    setError("");
    directionRef.current = "forward";
    setStep("1b");
    // Save in background
    api("/api/sellers/profile", { method: "PUT", body: { activity } })
      .then(() => refreshSeller())
      .catch(() => { /* silent */ });
  }

  async function handleStep1bNext() {
    if (!phone || !phone.trim()) {
      setError("Renseigne un numéro pour continuer");
      return;
    }
    // Validate with libphonenumber-js (Google standard)
    try {
      const raw = phone.trim();
      const parsed = parsePhoneNumber(raw);
      if (!parsed || !parsed.isValid()) {
        setError("Ce numéro de téléphone n'est pas valide");
        return;
      }
    } catch {
      // Try with country hint if raw parse fails (e.g. local format without +)
      const valid = phoneCountry ? isValidPhoneNumber(phone.trim(), phoneCountry as Parameters<typeof isValidPhoneNumber>[1]) : false;
      if (!valid) {
        setError("Ce numéro de téléphone n'est pas valide");
        return;
      }
    }
    setError("");
    directionRef.current = "forward";
    setStep("1c");
    // Save in background
    api("/api/sellers/profile", { method: "PUT", body: { phone: phone.trim(), phoneCountry: phoneCountry || undefined } })
      .catch(() => { /* silent */ });
  }

  async function handleStep1cNext() {
    directionRef.current = "forward";
    // save silently — field ignored by backend until schema is updated
    try {
      if (referralSource) {
        await api("/api/sellers/profile", { method: "PUT", body: { referralSource } });
      }
    } catch { /* silent */ }
    setStep(2);
  }

  async function handleStep2Next() {
    setError("");
    directionRef.current = "forward";
    setStep(3);
    // Save in background
    api("/api/sellers/profile", { method: "PUT", body: { themeId: selectedTheme } })
      .then(() => refreshSeller())
      .catch(() => { /* silent */ });
  }

  async function handleStep3Next() {
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = { onboardingCompleted: true };

      // Normalize Instagram: @handle → full URL
      const ig = socials.instagramUrl.trim();
      if (ig) {
        if (ig.includes("instagram.com")) body.instagramUrl = ig.startsWith("http") ? ig : `https://${ig}`;
        else body.instagramUrl = `https://instagram.com/${ig.replace(/^@/, "")}`;
      }

      // Normalize TikTok: @handle → full URL
      const tk = socials.tiktokUrl.trim();
      if (tk) {
        if (tk.includes("tiktok.com")) body.tiktokUrl = tk.startsWith("http") ? tk : `https://${tk}`;
        else body.tiktokUrl = `https://tiktok.com/@${tk.replace(/^@/, "")}`;
      }

      // Normalize YouTube: ensure https://
      const yt = socials.youtubeUrl.trim();
      if (yt) {
        body.youtubeUrl = yt.startsWith("http") ? yt : `https://${yt}`;
      }

      // Normalize WhatsApp: strip spaces/dashes, keep + and digits
      const wa = socials.whatsappNumber.trim();
      if (wa) {
        body.whatsappNumber = wa.replace(/[\s\-().]/g, "");
      }

      // Normalize Website: ensure https://
      const web = socials.websiteUrl.trim();
      if (web) {
        body.websiteUrl = web.startsWith("http") ? web : `https://${web}`;
      }

      await api("/api/sellers/profile", { method: "PUT", body });
      await refreshSeller();
      setStep("success");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau. Réessaye.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipStep3() {
    setLoading(true);
    try {
      await api("/api/sellers/profile", { method: "PUT", body: { onboardingCompleted: true } });
      await refreshSeller();
      setStep("success");
    } catch {
      setStep("success");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/${seller?.slug || ""}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ─────── STEP INDICATOR ─────── */
  const stepNum = 
    step === 1 ? 1 : 
    step === "1a" ? 2 :
    step === "1b" ? 3 : 
    step === "1c" ? 4 : 
    step === 2 ? 5 : 
    6; // 3 or success

  const totalSteps = 6;
  const STEP_NAMES = ["Ton lien", "Activité", "Contact", "Source", "Style", "Réseaux"];

  const StepBar = (
    <div className="w-full max-w-sm mx-auto pt-6 mb-12 px-6">
      <div className="flex items-center gap-1 w-full">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const s = i + 1;
          const isCompleted = s < stepNum;
          const isCurrent = s === stepNum;
          const isActive = isCurrent || isCompleted;
          return (
            <div
              key={s}
              className={`h-1 flex-1 transition-colors duration-500 ease-out ${
                isActive ? "bg-teal-500" : "bg-gray-200"
              }`}
            />
          );
        })}
      </div>
    </div>
  );

  /* ─────── SHARED STYLES ─────── */
  const stepAnim = directionRef.current === "back" ? "animate-step-enter-back" : "animate-step-enter";
  const card = "w-full max-w-lg mx-auto sm:px-0 px-2";
  const fixedBar = "fixed sm:hidden bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]";
  const backBtn = "mb-6 inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors";
  const errorBanner = "mb-4 flex items-center gap-2 p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold border border-red-100";

  /* ─────── SOCIAL FIELD ICONS ─────── */
  const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.8a4.84 4.84 0 01-1-.11z"/>
    </svg>
  );
  const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
  const socialFields: { key: keyof typeof socials; label: string; icon: React.ReactNode; iconBg: string; placeholder: string; inputType?: string; inputMode?: "text" | "tel" | "url"; }[] = [
    { key: "instagramUrl", label: "Instagram", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>, iconBg: "bg-pink-500", placeholder: "@toncompte" },
    { key: "tiktokUrl", label: "TikTok", icon: <TikTokIcon />, iconBg: "bg-gray-900", placeholder: "@toncompte" },
    { key: "youtubeUrl", label: "YouTube", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>, iconBg: "bg-red-500", placeholder: "youtube.com/c/tachaîne", inputType: "url", inputMode: "url" },
    { key: "whatsappNumber", label: "WhatsApp", icon: <WhatsAppIcon />, iconBg: "bg-green-500", placeholder: "+221 77 123 45 67", inputType: "tel", inputMode: "tel" },
    { key: "websiteUrl", label: "Site web", icon: <Globe size={16} />, iconBg: "bg-gray-500", placeholder: "https://tonsite.com", inputType: "url", inputMode: "url" },
  ];

  function isSocialValid(key: keyof typeof socials, val: string): boolean {
    const v = val.trim();
    if (!v) return false;
    switch (key) {
      case "instagramUrl":
        return v.includes("instagram.com/") || /^@?[a-zA-Z0-9_.]{2,}$/.test(v);
      case "tiktokUrl":
        return v.includes("tiktok.com/") || /^@?[a-zA-Z0-9_.]{2,}$/.test(v);
      case "youtubeUrl":
        return v.includes("youtube.com") || v.includes("youtu.be");
      case "whatsappNumber":
        return /\+?\d[\d\s\-()]{6,}/.test(v);
      case "websiteUrl":
        return /^(https?:\/\/)?.+\..{2,}/.test(v);
      default:
        return v.length > 0;
    }
  }

  const filledCount = Object.entries(socials).filter(([k, v]) => isSocialValid(k as keyof typeof socials, v)).length;
  const storeUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${seller.slug}`;

  /* ─────── STEP CONTENT + MOBILE BUTTONS ─────── */
  let stepContent: React.ReactNode;
  let mobileButtons: React.ReactNode = null;

  if (step === "success") {
    const successBtns = (<>
      <AuthButton
        onClick={() => router.push("/dashboard/blocks")}
        variant="teal"
      >
        {TEXTS.finish}
      </AuthButton>
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-teal-700 bg-teal-50 border border-teal-100 transition-all hover:bg-teal-100 active:scale-[0.98]"
      >
        <ExternalLink size={14} />
        Voir mon store
      </a>
    </>);
    stepContent = (
      <div className="flex flex-col items-center text-center px-2">
        {/* Animated icon */}
        <div className="relative mb-6" style={{ animation: "fade-in-up 0.6s ease-out both" }}>
          <div className="h-24 w-24 rounded-full bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/25">
            <Check size={44} strokeWidth={3} className="text-white" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-teal-400/30 animate-ping" style={{ animationDuration: "2s" }} />
        </div>

        {/* Title */}
        <div style={{ animation: "fade-in-up 0.6s ease-out 0.15s both" }}>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {seller?.displayName ? `C'est parti ${seller.displayName.split(" ")[0]} ! 🎉` : TEXTS.successTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-medium max-w-[280px] mx-auto leading-relaxed">{TEXTS.successSubtitle}</p>
        </div>

        {/* Store URL card */}
        <div className="w-full mt-8 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm" style={{ animation: "fade-in-up 0.6s ease-out 0.3s both" }}>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Ton lien</p>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black text-teal-600 truncate flex-1">{storeUrl}</span>
            <button
               onClick={handleCopyLink}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                copied
                  ? "bg-teal-50 text-teal-600 border border-teal-200"
                  : "bg-gray-900 text-white hover:bg-teal-600"
              }`}
            >
              {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
              {copied ? TEXTS.copied : TEXTS.shareLink}
            </button>
          </div>
        </div>

        {/* Desktop buttons */}
        <div className="hidden sm:flex flex-col gap-2.5 w-full mt-6" style={{ animation: "fade-in-up 0.6s ease-out 0.45s both" }}>
          {successBtns}
        </div>
      </div>
    );
    mobileButtons = successBtns;
  } else if (step === 3) {
    const step3Btns = (<>
      <AuthButton
        onClick={handleStep3Next}
        disabled={loading}
        loading={loading}
        loadingText="Enregistrement..."
        variant="teal"
      >
        {filledCount > 0 ? "Continue" : "Continue sans liens"}
      </AuthButton>
      <button onClick={handleSkipStep3} disabled={loading} className="block w-full text-center text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50">{TEXTS.step3Skip}</button>
    </>);
    stepContent = (
      <div className={card}>
        <button onClick={() => { directionRef.current = "back"; setStep(2); setError(""); }} className={backBtn}><ArrowLeft size={13} /> Retour</button>
        <div className="mb-5 text-center"><h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">{TEXTS.step3Title}</h1><p className="mt-1 text-[13px] text-gray-500 font-medium max-w-xs mx-auto">{TEXTS.step3Subtitle}</p></div>
        {error && <div className={errorBanner}><X size={13} className="shrink-0" />{error}</div>}
        <div className="space-y-4">
          <h2 className="text-center font-bold text-[15px] mb-2 h-px" />
          {socialFields.map((field) => (
            <div key={field.key} className="flex items-center gap-4">
              <div className={`${field.iconBg} flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl text-white`}>
                <div className="scale-[1.6]">{field.icon}</div>
              </div>
              <div className="flex-1 flex flex-col justify-center rounded-xl border-2 border-gray-200 px-3 py-1.5 focus-within:border-black transition-colors bg-white relative">
                <span className="text-[10px] font-bold text-gray-500 mb-0.5">{field.label} url</span>
                <div className="flex items-center gap-2">
                  <input type={field.inputType || "text"} inputMode={field.inputMode} value={socials[field.key]} onChange={(e) => handleSocialChange(field.key, e.target.value)} placeholder={field.placeholder} className="social-input flex-1 bg-transparent text-base mb-0.5 text-gray-900 outline-none placeholder:text-gray-400 min-w-0" {...(socials[field.key].trim() ? { "data-filled": "" } : {})} />
                  {socials[field.key].trim() && (
                    isSocialValid(field.key, socials[field.key])
                      ? <Check size={16} className="shrink-0 text-teal-500" strokeWidth={3} />
                      : <div className="shrink-0 h-2 w-2 rounded-full bg-amber-400 mr-2" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-gray-400 font-medium">Remplis ce que tu veux — modifiable plus tard</p>
        <div className="hidden sm:block space-y-2.5 mt-6">{step3Btns}</div>
      </div>
    );
    mobileButtons = step3Btns;
  } else if (step === "1a") {
    const btn = (<AuthButton onClick={handleStep1aNext} disabled={loading || !activity} loading={loading} loadingText="Enregistrement..." variant="teal">{TEXTS.next}</AuthButton>);
    stepContent = (
      <div className={card}>
        <button onClick={() => { directionRef.current = "back"; setStep(1); setError(""); }} className={backBtn}><ArrowLeft size={13} /> Retour</button>
        <div className="mb-5 text-center"><h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">{TEXTS.step1aTitle}</h1><p className="mt-1 text-[13px] text-gray-500 font-medium max-w-xs mx-auto">{TEXTS.step1aSubtitle}</p></div>
        {error && <div className={errorBanner}><X size={13} className="shrink-0" />{error}</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACTIVITIES.map((a) => { const sel = activity === a.id; return (
            <button 
              key={a.id} 
              onClick={() => { setActivity(a.id); setError(""); }} 
              className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-6 text-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${sel ? "border-teal-500 bg-white shadow-sm ring-1 ring-teal-500" : "border-gray-200 bg-white hover:border-gray-300"}`}
            >
              {sel && <div className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500"><Check size={9} strokeWidth={4} className="text-white" /></div>}
              <span className={`text-[32px] mb-1.5 ${sel ? "text-teal-500" : "text-gray-900"}`}><a.icon /></span>
              <span className="text-[13px] font-bold text-gray-900">{a.label}</span>
            </button>
          );})}
        </div>
        <div className="hidden sm:block mt-6">{btn}</div>
      </div>
    );
    mobileButtons = btn;
  } else if (step === "1b") {
    const btn = (<AuthButton onClick={handleStep1bNext} disabled={loading || !phoneValid} loading={loading} loadingText="Enregistrement..." variant="teal">{TEXTS.next}</AuthButton>);
    stepContent = (
      <div className={card}>
        <button onClick={() => { directionRef.current = "back"; setStep("1a"); setError(""); }} className={backBtn}><ArrowLeft size={13} /> Retour</button>
        <div className="mb-5 text-center"><h1 className="text-lg sm:text-xl text-gray-900 tracking-tight">{TEXTS.step1bTitle}</h1><p className="mt-1 text-[13px] text-gray-500 font-medium max-w-xs mx-auto">{TEXTS.step1bSubtitle}</p></div>
        {error && <div className={errorBanner}><X size={13} className="shrink-0" />{error}</div>}
        <PhoneInput label={TEXTS.step1PhoneLabel} value={phone} onChange={(fullNumber, _rawDigits, countryCode) => {
          setPhone(fullNumber);
          setPhoneCountry(countryCode);
          try {
            if (!fullNumber.trim()) { setPhoneValid(false); return; }
            const parsed = parsePhoneNumber(fullNumber.trim());
            setPhoneValid(!!parsed && parsed.isValid());
          } catch {
            setPhoneValid(isValidPhoneNumber(fullNumber.trim(), countryCode as Parameters<typeof isValidPhoneNumber>[1]));
          }
        }} hint={TEXTS.step1PhoneHint} />
        <div className="hidden sm:block mt-7">{btn}</div>
      </div>
    );
    mobileButtons = btn;
  } else if (step === "1c") {
    const btn = (<AuthButton onClick={handleStep1cNext} disabled={loading || !referralSource} loading={loading} loadingText="Enregistrement..." variant="teal">{TEXTS.next}</AuthButton>);
    stepContent = (
      <div className={card}>
        <button onClick={() => { directionRef.current = "back"; setStep("1b"); setError(""); }} className={backBtn}><ArrowLeft size={13} /> Retour</button>
        <div className="mb-5 text-center"><h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">{TEXTS.step1cTitle}</h1><p className="mt-1 text-[13px] text-gray-500 font-medium max-w-xs mx-auto">{TEXTS.step1cSubtitle}</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {REFERRAL_SOURCES.map((src) => { const sel = referralSource === src.id; return (
            <button 
              key={src.id} 
              onClick={() => setReferralSource(src.id)} 
              className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-6 text-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${sel ? "border-teal-500 bg-white shadow-sm ring-1 ring-teal-500" : "border-gray-200 bg-white hover:border-gray-300"}`}
            >
              {sel && <div className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500"><Check size={9} strokeWidth={4} className="text-white" /></div>}
              <span className={`text-[32px] mb-1.5 ${sel ? "text-teal-500" : "text-gray-900"}`}><src.icon /></span>
              <span className="text-[13px] font-bold text-gray-900">{src.label}</span>
            </button>
          );})}
        </div>
        <div className="hidden sm:block mt-6">{btn}</div>
      </div>
    );
    mobileButtons = btn;
  } else if (step === 2) {
    const btn = (<AuthButton onClick={handleStep2Next} disabled={loading} loading={loading} loadingText="Enregistrement..." variant="teal">{TEXTS.next}</AuthButton>);
    stepContent = (
      <div className={card}>
        <button onClick={() => { directionRef.current = "back"; setStep("1c"); setError(""); }} className={backBtn}><ArrowLeft size={13} /> Retour</button>
        <div className="mb-5 text-center"><h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">{TEXTS.step2Title}</h1><p className="mt-1 text-[13px] text-gray-500 font-medium max-w-xs mx-auto">{TEXTS.step2Subtitle}</p></div>
        {error && <div className={errorBanner}><X size={13} className="shrink-0" />{error}</div>}
        <ThemeGrid themes={THEME_PREVIEWS} selectedTheme={selectedTheme} onSelect={setSelectedTheme} />
        <div className="hidden sm:block mt-7">{btn}</div>
      </div>
    );
    mobileButtons = btn;
  } else {
    const btn = (
      <AuthButton 
        onClick={handleStep1Next} 
        disabled={loading || checkingSlug || slugAvailable === false || slug.length < 3} 
        loading={loading} 
        loadingText="Enregistrement..." 
        variant="teal"
      >
        {TEXTS.next}
      </AuthButton>
    );
    stepContent = (
      <div className={card}>
        <div className="mb-5 text-center">
          <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
            {seller?.displayName ? `Hey ${seller.displayName.split(" ")[0]} 👋` : TEXTS.step1Title}
          </h1>
          <p className="mt-1 text-[13px] text-gray-500 font-medium max-w-xs mx-auto">{TEXTS.step1Subtitle}</p>
        </div>
        {error && <div className={errorBanner}><X size={13} className="shrink-0" />{error}</div>}
        <div className="mb-7 text-left">
          <div className={`flex items-center w-full bg-white border-2 transition-all duration-300 rounded-2xl sm:rounded-full p-1.5 group ${
            slugAvailable === false 
              ? "border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]" 
              : slugAvailable === true && slug.length >= 3 && slug !== seller?.slug
                ? "border-teal-500 shadow-[0_0_0_6px_rgba(13,148,136,0.08)]"
                : "border-gray-200 focus-within:border-teal-500 focus-within:shadow-[0_0_0_6px_rgba(13,148,136,0.08)]"
          }`}>
            <div className="flex items-center flex-1 min-w-0 px-3 sm:px-4">
              <span className={`font-medium whitespace-nowrap text-[15px] sm:text-base transition-colors ${
                slugAvailable === false ? "text-red-400" : "text-gray-400 group-focus-within:text-teal-600"
              }`}>
                izy.store/
              </span>
              <input 
                type="text" 
                value={slug} 
                onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setError(""); }} 
                placeholder="ton-nom" 
                className="w-full py-3 bg-transparent outline-none text-gray-900 font-bold text-[15px] sm:text-base placeholder:text-gray-300 placeholder:font-medium min-w-0" 
              />
              {checkingSlug ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black shrink-0 mx-2" />
              ) : slugAvailable === true && slug.length >= 3 ? (
                <Check size={16} className="text-teal-500 shrink-0 mx-2" strokeWidth={3} />
              ) : slugAvailable === false ? (
                <X size={16} className="text-red-500 shrink-0 mx-2" strokeWidth={3} />
              ) : null}
            </div>
            
            {/* Desktop-only button inside the pill */}
            <div className="hidden sm:block shrink-0">
              <AuthButton 
                onClick={handleStep1Next} 
                disabled={loading || checkingSlug || slugAvailable === false || slug.length < 3} 
                loading={loading} 
                loadingText=""
                variant="teal"
                className="w-auto py-3 px-6 rounded-full text-sm font-black whitespace-nowrap h-full"
              >
                {TEXTS.next}
                <ArrowRight size={16} />
              </AuthButton>
            </div>
          </div>
          {slugAvailable === false && <p className="mt-2 ml-4 text-xs font-bold text-red-500">Ce lien est déjà pris ou invalide.</p>}
        </div>
      </div>
    );
    mobileButtons = btn;
  }

  /* ─────── SINGLE RETURN — StepBar persists, content animates ─────── */
  return (
    <>
      {StepBar}
      <div key={String(step)} className={`mb-24 sm:mb-0 ${stepAnim}`}>
        {stepContent}
      </div>
      {mobileButtons && <div className={fixedBar}>{mobileButtons}</div>}
    </>
  );
}

