"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Share2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  cn,
  isInAppBrowser,
  isTikTokBrowser,
} from "@/lib/utils";
import { openPaymentUrl } from "@/lib/redirect";
import { type FundraiserSubtype } from "@/lib/commission";
import {
  SUBTYPE_LABELS,
  PAIEMENT_LABELS,
  IN_APP_LABELS,
} from "@/lib/constants";
import { formatPrice } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────
// Phase 10 v3 — Banani "Paiement - Participer à la cagnotte" design.
//
// Two-column layout identical to the participer page:
//   • Left  (2/3): Back link → secure-payment header card → operator picker
//   • Right (1/3): Sticky Récapitulatif with mini cagnotte + price
//     breakdown + "Payer X FCFA" CTA (shine animation)
//
// cagnottes.sn v1 — single method = Mobile Money. The Carte Bancaire
// card was removed (April 2026); only Wave / Orange Money / Maxit
// are available (SN mobile money). Moov/Free Money n'est PAS opéré au
// Sénégal — ne le réintroduis pas sans décision business.
//
// Logos are served from /public (wave.png, orange-money.png, maxit.png).
//
// All the audit-008 / audit-009 TikTok + Meta WebView logic from the
// previous version is preserved: `pay()` still posts to /api/orders and,
// depending on the detected browser kind, either calls `openPaymentUrl`
// directly (normal / tiktok) or morphs the CTA into a native link the
// user must tap a second time (meta).
// ─────────────────────────────────────────────────────────────────────────

type MobileProviderId = "wave_money" | "orange_money" | "maxit";
type BrowserKind = "tiktok" | "meta" | "normal" | "unknown";

interface StashedPayload {
  sellerSlug: string;
  cagnotteSlug: string;
  orderType: "DONATION";
  amount: number;
  baseAmount?: number;
  voluntaryContribution?: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  donorMessage?: string;
  isAnonymous: boolean;
  messageIsPrivate: boolean;
  cagnotteSubtype: FundraiserSubtype;
  cagnotteTitle: string;
  cagnotteCoverUrl: string | null;
}

interface CreateOrderResponse {
  order: { id: string; reference: string };
  // Bictorys renvoie le lien de paiement dans `link` (toujours présent sur
  // un succès) et laisse `redirectUrl` vide dans le flow test et souvent en
  // prod aussi. Le frontend préfère `link`, fallback `redirectUrl`.
  link?: string;
  redirectUrl?: string;
  // Présent quand Bictorys retourne un QR code (Wave desktop scenario).
  // Affiché tel quel si préfixé par data: — sinon on préfixe avec data:image/png;base64,
  qrCode?: string;
  // Présent pour les flows USSD (Orange Money CI, MTN CI). Non utilisé en SN
  // mais gardé pour parité avec fari.store PaymentModal.
  message?: string;
}

// État de la carte d'attente (QR desktop ou in-app browser)
interface WaitingData {
  link?: string;
  qrCode?: string;
  message?: string;
  reference: string;
}
type WaitingStatus = "polling" | "paid";

interface Provider {
  id: MobileProviderId;
  label: string;
  logo: string | null; // /public path or null for text-only fallback
}

const MOBILE_PROVIDERS: readonly Provider[] = [
  { id: "wave_money", label: PAIEMENT_LABELS.methodWave, logo: "/wave.png" },
  { id: "orange_money", label: PAIEMENT_LABELS.methodOrange, logo: "/orange-money.png" },
  { id: "maxit", label: PAIEMENT_LABELS.methodMaxit, logo: "/maxit.png" },
] as const;

// 3s × 40 = 2min max polling tout comme la merci page, aligné sur le
// webhook Bictorys qui arrive en quelques secondes.
const WAIT_POLL_INTERVAL_MS = 3_000;
const WAIT_MAX_POLLS = 40;

// ─────────────────────────────────────────────────────────────────────────
// Design-system primitives — extraits au niveau module pour être réutilisés
// dans PaiementPage et WaitingCard. Strictement alignés sur le pattern
// "premium shine-sweep CTA" utilisé dans participer/page.tsx + autres pages
// Banani. Toute modification ici doit rester cohérente avec ces écrans.
// ─────────────────────────────────────────────────────────────────────────
const PAY_BTN_CLASS =
  "group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-white shadow-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:-translate-y-0 disabled:hover:bg-primary disabled:hover:shadow-lg sm:text-base";
const SHINE_SPAN_CLASS =
  "pointer-events-none absolute inset-y-0 -left-[50%] w-[50%] animate-button-shine-sweep bg-gradient-to-r from-transparent via-white/30 to-transparent";
// Outline variant — identique à Button.tsx variant="outline" pour Share/Copy
// secondaires. Hover: bg-pink/40 (Banani accent), lift + shadow.
const OUTLINE_BTN_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-background px-3 py-2.5 text-xs font-bold text-primary shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-pink/40 hover:shadow-md active:translate-y-0 active:scale-[0.98] sm:text-sm";

// Strip "+221" (with any whitespace/hyphen after it) so the input field
// shows only the local digits. The badge re-adds the prefix visually and
// `composePhone` reattaches it before POST.
function stripSnPrefix(raw: string): string {
  return raw.replace(/^\+?221[\s-]*/i, "").trim();
}

function composePhone(local: string): string {
  const cleaned = stripSnPrefix(local).replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return `+221 ${cleaned}`;
}

export default function PaiementPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [stashed, setStashed] = React.useState<StashedPayload | null>(null);
  const [stashChecked, setStashChecked] = React.useState(false);
  const [browser, setBrowser] = React.useState<BrowserKind>("unknown");
  const [provider, setProvider] =
    React.useState<MobileProviderId>("wave_money");
  const [phoneLocal, setPhoneLocal] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  // waitingData est set quand on doit rester sur la page de paiement
  // pour afficher un QR code (Wave desktop), un message USSD, ou une
  // carte "ouvrir/partager/copier le lien" (in-app browser). Le polling
  // est lancé en arrière-plan jusqu'à détection de PAID.
  const [waitingData, setWaitingData] = React.useState<WaitingData | null>(
    null,
  );
  const [waitingStatus, setWaitingStatus] =
    React.useState<WaitingStatus>("polling");
  const [waitingAttempts, setWaitingAttempts] = React.useState(0);
  const [copied, setCopied] = React.useState(false);

  // Hydrate sessionStorage. Redirect back to /participer if missing.
  React.useEffect(() => {
    if (!slug) return;
    let payload: StashedPayload | null = null;
    try {
      const raw = sessionStorage.getItem(`cagnotte.participer.${slug}`);
      if (raw) payload = JSON.parse(raw) as StashedPayload;
    } catch {
      payload = null;
    }
    if (!payload) {
      router.replace(`/c/${slug}/participer`);
      return;
    }
    setStashed(payload);
    setPhoneLocal(stripSnPrefix(payload.customerPhone));
    setStashChecked(true);
  }, [slug, router]);

  // Detect WebView client-side only (audit-009 — never SSR).
  // Branch order: TikTok first (specificity), then Meta, then normal.
  React.useEffect(() => {
    if (isTikTokBrowser()) setBrowser("tiktok");
    else if (isInAppBrowser()) setBrowser("meta");
    else setBrowser("normal");
  }, []);

  // Polling du statut de commande quand la waiting card est affichée.
  // Même cadence que la merci page (3s × 40 = 2min max). On redirige vers
  // /merci dès qu'on détecte PAID — les états FAILED/EXPIRED remontent aussi
  // sur /merci, qui sait mieux présenter les erreurs.
  React.useEffect(() => {
    if (!waitingData) return;
    if (waitingStatus !== "polling") return;
    if (waitingAttempts >= WAIT_MAX_POLLS) return;

    let cancelled = false;
    const id = window.setTimeout(async () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return; // pause pendant l'onglet inactif
      }
      try {
        const data = await api<{
          status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
        }>(`/api/orders/${waitingData.reference}/status`);
        if (cancelled) return;
        if (data.status === "PAID") {
          setWaitingStatus("paid");
          // Petite tempo pour laisser l'utilisateur voir le check mark avant
          // la redirection.
          window.setTimeout(() => {
            if (!cancelled) {
              router.push(
                `/c/${slug}/merci?ref=${encodeURIComponent(waitingData.reference)}`,
              );
            }
          }, 900);
        } else if (data.status === "FAILED" || data.status === "EXPIRED") {
          router.push(
            `/c/${slug}/merci?ref=${encodeURIComponent(waitingData.reference)}`,
          );
        } else {
          setWaitingAttempts((n) => n + 1);
        }
      } catch {
        if (!cancelled) setWaitingAttempts((n) => n + 1);
      }
    }, WAIT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [waitingData, waitingStatus, waitingAttempts, router, slug]);

  // Timeout: si le polling atteint WAIT_MAX_POLLS sans résolution, on
  // bascule quand même sur la merci page (qui a son propre polling plus
  // long et sa gestion du TIMEOUT).
  React.useEffect(() => {
    if (!waitingData) return;
    if (waitingAttempts >= WAIT_MAX_POLLS && waitingStatus === "polling") {
      router.push(
        `/c/${slug}/merci?ref=${encodeURIComponent(waitingData.reference)}`,
      );
    }
  }, [waitingAttempts, waitingStatus, waitingData, router, slug]);

  async function pay() {
    if (!stashed || pending) return;
    // Phone is ALWAYS required — backend enforces `customerPhone.min(1)`
    // for every orderType. We collect it here since /participer no
    // longer asks for it.
    if (!phoneLocal.trim()) {
      setErrors({ phone: "Numéro de téléphone requis." });
      setError(null);
      // Scroll the phone card into view to make the error visible.
      if (typeof document !== "undefined") {
        document
          .getElementById("paiement-phone")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    setErrors({});
    setError(null);
    setPending(true);

    const finalPhone = composePhone(phoneLocal);

    try {
      const body = {
        sellerSlug: stashed.sellerSlug,
        cagnotteSlug: stashed.cagnotteSlug,
        orderType: stashed.orderType,
        amount: stashed.amount,
        paymentType: provider,
        customerName: stashed.customerName,
        customerEmail: stashed.customerEmail,
        customerPhone: finalPhone,
        donorMessage: stashed.donorMessage,
        isAnonymous: stashed.isAnonymous,
        messageIsPrivate: stashed.messageIsPrivate,
      };
      const res = await api<CreateOrderResponse>("/api/orders", {
        method: "POST",
        body,
      });

      // Persist reference for /merci page (URL ?ref= remains authoritative).
      try {
        sessionStorage.setItem(
          `cagnotte.order.${stashed.cagnotteSlug}`,
          res.order.reference,
        );
      } catch {
        // ignore
      }

      // Bictorys renvoie le lien de paiement dans `link` en priorité
      // (`redirectUrl` est souvent vide — voir logs backend).
      const paymentUrl = res.link || res.redirectUrl;

      // Détection mobile pour décider entre deep-link direct et affichage QR
      // code (desktop). Exactement le même pattern que fari.store PaymentModal.
      const isMobile =
        typeof navigator !== "undefined" &&
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // Scénario 1 — in-app browser (TikTok / Meta) avec un link
      // → pas de redirection auto : on affiche la carte "ouvrir/partager/
      // copier" + polling en arrière-plan. audit-008/009.
      if (browser !== "normal" && paymentUrl) {
        setWaitingData({
          link: paymentUrl,
          reference: res.order.reference,
        });
        setWaitingStatus("polling");
        setWaitingAttempts(0);
        return;
      }

      // Scénario 2 — QR code présent (Wave) sur desktop → rester sur la page,
      // afficher le QR, poll jusqu'à PAID puis redirect merci.
      if (res.qrCode && !isMobile) {
        setWaitingData({
          qrCode: res.qrCode,
          link: paymentUrl,
          reference: res.order.reference,
        });
        setWaitingStatus("polling");
        setWaitingAttempts(0);
        return;
      }

      // Scénario 3 — message USSD (Orange Money CI, MTN CI). Non utilisé en
      // SN mais gardé pour parité fari.store + futurs élargissements WAEMU.
      if (res.message) {
        setWaitingData({
          message: res.message,
          reference: res.order.reference,
        });
        setWaitingStatus("polling");
        setWaitingAttempts(0);
        return;
      }

      // Scénario 4 — navigateur normal + pas de QR/message → redirection
      // classique via openPaymentUrl (same-window navigation).
      if (!paymentUrl) {
        setError(PAIEMENT_LABELS.errorGeneric);
        return;
      }
      await openPaymentUrl(paymentUrl);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 429) {
        setError(PAIEMENT_LABELS.errorRateLimit);
      } else if (status === 503) {
        setError(PAIEMENT_LABELS.errorCircuitBreaker);
      } else if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError(PAIEMENT_LABELS.errorGeneric);
      }
    } finally {
      setPending(false);
    }
  }

  if (!stashChecked) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        {PAIEMENT_LABELS.processingLabel}
      </p>
    );
  }
  if (!stashed) return null; // redirect kicked in

  const subtype = stashed.cagnotteSubtype;
  const baseAmount = stashed.baseAmount ?? stashed.amount;
  const voluntary = stashed.voluntaryContribution ?? 0;
  const total = stashed.amount;

  const payDisabled = pending;

  // Shared button classes — referenced from module-level constants so
  // WaitingCard reuses the exact same shine-sweep CTA pattern.
  const PAY_BTN = PAY_BTN_CLASS;
  const SHINE_SPAN = SHINE_SPAN_CLASS;

  return (
    <div className="min-h-screen bg-gray-50 pb-10 lg:pb-12">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-6 md:px-6 md:py-10 lg:px-8">
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          {/* ─── Left: methods + secure header ─────────────────────────── */}
          <div className="w-full space-y-6 lg:w-2/3">
            {/* Back link */}
            <Link
              href={`/c/${slug}/participer`}
              className="inline-flex items-center gap-2 font-bold text-primary transition-colors hover:text-primary-hover"
            >
              <ArrowLeft size={20} aria-hidden />
              Retour aux informations
            </Link>

            {/* Secure-payment header card — compact on mobile */}
            <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 sm:h-12 sm:w-12"
                >
                  <Lock size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-headings text-base font-black leading-tight text-primary sm:text-xl">
                    Paiement 100 % sécurisé
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    Données cryptées et protégées.
                  </p>
                </div>
              </div>
            </section>

            {/* Waiting card — QR code (Wave desktop) ou carte ouvrir/partager/
                copier (in-app browser). Visible uniquement après le POST
                /api/orders — cf. pay() scénarios 1/2/3. */}
            {waitingData ? (
              <WaitingCard
                data={waitingData}
                status={waitingStatus}
                provider={provider}
                copied={copied}
                setCopied={setCopied}
                attempts={waitingAttempts}
              />
            ) : null}

            {/* Form-mode sections — masquées quand la waiting card est active
                (évite le double clic et les confusions visuelles). */}
            {!waitingData ? (
              <>
            {/* Phone card — visible en mode "form". Since we stopped asking
                for the phone on /participer, this is the canonical place it
                gets collected for the Mobile Money flow.
                Backend `customerPhone.min(1)` still passes. */}
            <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <label
                htmlFor="paiement-phone"
                className="mb-2 block font-headings text-sm font-black text-primary sm:text-base"
              >
                Votre numéro de téléphone{" "}
                <span aria-hidden className="text-red-500">
                  *
                </span>
              </label>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-primary/20",
                  errors.phone ? "border-red-400" : "border-primary",
                )}
              >
                <span
                  aria-hidden
                  className="shrink-0 border-r border-gray-200 pr-3 text-sm font-bold text-primary sm:text-base"
                >
                  🇸🇳 +221
                </span>
                <input
                  id="paiement-phone"
                  type="tel"
                  value={phoneLocal}
                  onChange={(e) => {
                    setPhoneLocal(e.target.value);
                    if (errors.phone) setErrors({});
                  }}
                  placeholder="77 123 45 67"
                  className="min-w-0 flex-1 bg-transparent text-base font-bold text-primary outline-none sm:text-lg"
                  autoComplete="tel-national"
                />
              </div>
              <p className="mt-2 text-[11px] font-medium text-gray-500 sm:text-xs">
                Un code ou une notification vous sera envoyé pour confirmer
                le paiement.
              </p>
              {errors.phone ? (
                <p
                  role="alert"
                  className="mt-2 text-xs font-medium text-red-600"
                >
                  {errors.phone}
                </p>
              ) : null}
            </section>

            {/* Operator picker — Mobile Money only (v1). Wave / Orange Money
                / Maxit side by side. No outer radio group anymore since
                card was dropped. */}
            <section
              className="rounded-2xl border-2 border-primary bg-pink/40 p-4 sm:p-5"
              aria-label="Choisissez votre opérateur Mobile Money"
            >
              <div className="mb-4 flex items-center gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-headings text-base font-black text-primary sm:text-lg">
                    Mobile Money
                  </div>
                  <div className="truncate text-xs font-medium text-gray-500 sm:text-sm">
                    Wave, Orange Money, Maxit
                  </div>
                </div>
                {/* Header logos — hidden on mobile (redundant with the
                    provider picker below). */}
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/wave.png"
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-md object-cover ring-1 ring-black/5"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/orange-money.png"
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-md object-cover ring-1 ring-black/5"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/maxit.png"
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-md object-cover ring-1 ring-black/5"
                  />
                </div>
              </div>

              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Choisissez votre opérateur
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                {MOBILE_PROVIDERS.map((p) => {
                  const active = provider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-150 sm:flex-col sm:gap-1.5 sm:px-2 sm:py-3 sm:text-center",
                        active
                          ? "border-primary bg-white shadow-md"
                          : "border-gray-200 bg-white/80 hover:border-gray-300 active:scale-[0.98]",
                      )}
                      aria-pressed={active}
                      aria-label={`Payer avec ${p.label}`}
                    >
                      {p.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.logo}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 shrink-0 rounded-md object-cover sm:h-7 sm:w-7"
                        />
                      ) : null}
                      <span className="flex-1 whitespace-nowrap text-sm font-black text-primary sm:flex-none sm:text-[11px] md:text-xs">
                        {p.label}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors sm:hidden",
                          active ? "border-primary" : "border-gray-300",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full bg-primary transition-opacity",
                            active ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Browser-specific helper copy */}
            {browser === "tiktok" ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {IN_APP_LABELS.tiktokHelp}
              </p>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}
              </>
            ) : null}
          </div>

          {/* ─── Right: sticky recap + pay button ──────────────────────── */}
          <aside className="w-full lg:w-1/3">
            <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] sm:p-6 md:p-8 lg:sticky lg:top-24">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-wider text-gray-500">
                Récapitulatif
              </h3>

              {/* Premium mini cagnotte card (same as participer v3) */}
              <div className="mb-6 flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className="relative shrink-0">
                  {stashed.cagnotteCoverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={stashed.cagnotteCoverUrl}
                      alt=""
                      className="h-[72px] w-[72px] rounded-2xl object-cover shadow-[0_8px_20px_rgb(23,40,102,0.15)] ring-1 ring-black/5"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-[#F4D3DE] font-headings text-xl font-black text-primary/40 shadow-[0_8px_20px_rgb(23,40,102,0.15)] ring-1 ring-black/5"
                    >
                      {stashed.cagnotteTitle.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[13px] shadow-md ring-1 ring-black/5"
                  >
                    {subtype === "solidaire" ? "❤️" : "🎉"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Vous participez à
                  </p>
                  <h4 className="line-clamp-2 font-headings text-[15px] font-black leading-[1.2] text-primary">
                    {stashed.cagnotteTitle}
                  </h4>
                  <p className="mt-1 text-[11px] font-semibold text-gray-500">
                    {SUBTYPE_LABELS[subtype]}
                  </p>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between text-primary">
                  <span className="font-bold">Ma participation</span>
                  <span className="font-headings text-lg font-black">
                    {formatPrice(baseAmount)}
                  </span>
                </div>
                {voluntary > 0 ? (
                  <div className="flex items-center justify-between text-primary/80">
                    <span className="text-sm font-medium">
                      Soutien cagnotte.sn
                    </span>
                    <span className="font-headings text-sm font-black">
                      + {formatPrice(voluntary)}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Total (stacked layout — same pattern as participer) */}
              <div className="mb-6 flex flex-col gap-1 border-t border-gray-100 pt-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Total à payer
                </span>
                <span className="font-headings text-[28px] font-black leading-none text-primary sm:text-3xl">
                  {formatPrice(total)}
                </span>
              </div>

              {/* Primary CTA — masqué en mode waiting : la waiting card à
                  gauche prend le relais avec Ouvrir / Partager / Copier. Le
                  récap droite affiche un badge d'état cohérent avec les
                  info-boxes Banani (pink/40 + border-pink-200). */}
              {waitingData ? (
                <div className="rounded-2xl border border-pink-200 bg-pink/40 p-5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="relative flex h-3 w-3" aria-hidden>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                    </span>
                    <span className="font-headings text-sm font-black text-primary">
                      {waitingStatus === "paid"
                        ? PAIEMENT_LABELS.waitingPaidTitle
                        : PAIEMENT_LABELS.waitingPollingTitle}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] font-medium leading-relaxed text-primary/70">
                    {waitingStatus === "paid"
                      ? PAIEMENT_LABELS.waitingPaidSubtitle
                      : PAIEMENT_LABELS.waitingPollingSubtitle}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={pay}
                  disabled={payDisabled}
                  className={cn(PAY_BTN, "min-h-[60px]")}
                >
                  <span aria-hidden className={SHINE_SPAN} />
                  <span className="relative flex items-center gap-2 whitespace-nowrap">
                    {pending ? (
                      PAIEMENT_LABELS.processingLabel
                    ) : (
                      <>
                        Payer {formatPrice(total)}
                        <CheckCircle2 size={16} aria-hidden />
                      </>
                    )}
                  </span>
                </button>
              )}

              <p className="mt-4 text-center text-[11px] font-medium text-gray-400">
                Paiement 100 % sécurisé via Bictorys. En cliquant, vous
                acceptez nos{" "}
                <Link href="/cgu" className="text-primary hover:underline">
                  CGU
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// WaitingCard — affichée entre le POST /api/orders et la résolution du
// polling. Trois sous-scénarios :
//   1. data.qrCode  → QR code (Wave desktop) + lien "ouvrir dans l'app"
//   2. data.message → message USSD (Orange/MTN CI — dormant en SN)
//   3. data.link    → in-app browser (TikTok / Meta WebView) avec
//      Ouvrir / Partager / Copier
// + état "paid" : check mark avant redirection vers /merci
// Pattern aligné sur fari.store PaymentModal (cagnotte) step "waiting".
// ─────────────────────────────────────────────────────────────────────────
function WaitingCard(props: {
  data: WaitingData;
  status: WaitingStatus;
  provider: MobileProviderId;
  copied: boolean;
  setCopied: (v: boolean) => void;
  attempts: number;
}) {
  const { data, status, provider, copied, setCopied, attempts } = props;
  const providerMeta = MOBILE_PROVIDERS.find((p) => p.id === provider);
  const providerName =
    providerMeta?.label ?? PAIEMENT_LABELS.waitingQrDefaultApp;

  // PAID: halo animate-ping + Check filled circle — pattern strictement
  // aligné sur merci/page.tsx + retraits/succes (tokens #00B67A + #E6F3EE).
  if (status === "paid") {
    return (
      <section className="flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="relative mx-auto mb-5 h-24 w-24">
          <div
            className="absolute inset-0 animate-ping rounded-full bg-[#00B67A]/20"
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#E6F3EE]">
            <Check
              size={48}
              strokeWidth={3}
              className="text-[#00B67A]"
              aria-hidden
            />
          </div>
        </div>
        <h2 className="font-headings text-xl font-black text-primary sm:text-2xl">
          {PAIEMENT_LABELS.waitingPaidTitle}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {PAIEMENT_LABELS.waitingPaidSubtitle}
        </p>
      </section>
    );
  }

  async function handleShare() {
    if (!data.link) return;
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({
        title: `Paiement ${providerName}`,
        url: data.link,
      });
    } catch {
      // share sheet dismissed — no-op
    }
  }

  async function handleCopy() {
    if (!data.link) return;
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied — no-op
    }
  }

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
      {/* ── Scénario 1 : QR code (Wave desktop) ── */}
      {data.qrCode ? (
        <div className="flex flex-col items-center">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-primary/60">
            {PAIEMENT_LABELS.waitingQrHeadingPrefix} {providerName}
          </p>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_8px_20px_rgb(23,40,102,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                data.qrCode.startsWith("data:")
                  ? data.qrCode
                  : `data:image/png;base64,${data.qrCode}`
              }
              alt={`QR Code paiement ${providerName}`}
              className="h-48 w-48 object-contain sm:h-56 sm:w-56"
            />
          </div>
          {data.link ? (
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-2 transition-colors hover:text-primary-hover hover:underline"
            >
              <ExternalLink size={14} aria-hidden />
              {PAIEMENT_LABELS.waitingOpenAppPrefix} {providerName}
            </a>
          ) : null}
        </div>
      ) : null}

      {/* ── Scénario 2 : message USSD (dormant en SN) ── */}
      {!data.qrCode && data.message ? (
        <div className="flex flex-col items-center">
          <p className="mb-3 font-headings text-base font-black text-primary sm:text-lg">
            {providerName}
          </p>
          <div className="w-full rounded-xl border border-pink-200 bg-pink/40 px-4 py-4 text-center text-sm font-medium leading-relaxed text-primary">
            {data.message}
          </div>
        </div>
      ) : null}

      {/* ── Scénario 3 : in-app browser avec link seul ── */}
      {!data.qrCode && !data.message && data.link ? (
        <div className="flex flex-col">
          <p className="mb-4 text-center text-sm font-medium text-muted-foreground sm:text-left">
            {PAIEMENT_LABELS.waitingInAppHelp}
          </p>
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(PAY_BTN_CLASS, "min-h-[56px]")}
          >
            <span aria-hidden className={SHINE_SPAN_CLASS} />
            <span className="relative flex items-center gap-2 whitespace-nowrap">
              <ExternalLink size={18} aria-hidden />
              {PAIEMENT_LABELS.waitingOpenAppPrefix} {providerName}
            </span>
          </a>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {canShare ? (
              <button
                type="button"
                onClick={handleShare}
                className={OUTLINE_BTN_CLASS}
              >
                <Share2 size={14} aria-hidden />
                {PAIEMENT_LABELS.waitingShareLink}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                OUTLINE_BTN_CLASS,
                copied && "border-[#00B67A] bg-[#E6F3EE] text-[#00B67A] hover:bg-[#E6F3EE]",
                !canShare && "col-span-2",
              )}
            >
              {copied ? (
                <>
                  <Check size={14} aria-hidden />
                  {PAIEMENT_LABELS.waitingCopied}
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden />
                  {PAIEMENT_LABELS.waitingCopyLink}
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {/* Polling indicator — commun à tous les scénarios */}
      <div className="mt-6 flex items-center justify-center gap-2 border-t border-gray-100 pt-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary/60">
          {PAIEMENT_LABELS.waitingPollingTitle}
          {attempts > 0 ? ` · ${attempts + 1}/${WAIT_MAX_POLLS}` : null}
        </span>
      </div>
    </section>
  );
}
