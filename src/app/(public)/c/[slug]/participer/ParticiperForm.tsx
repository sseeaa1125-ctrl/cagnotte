"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Lock, Mail } from "lucide-react";
import { Checkbox, Input, Textarea } from "@/components/ui";
import { type FundraiserSubtype } from "@/lib/commission";
import { PARTICIPER_LABELS, SUBTYPE_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Cagnotte {
  slug: string;
  title: string;
  coverUrl: string | null;
  subtype: FundraiserSubtype;
  goalAmount: number | null;
  totalRaised: number | null;
  hideAmount: boolean;
  hideDonors: boolean;
  // Workflow d'approbation carte par cagnotte. Le picker /paiement n'affiche
  // l'option "Carte bancaire" que si APPROVED. Default NONE pour cagnottes legacy.
  cardEnabled: boolean;
  seller: { slug: string; displayName: string } | null;
}

interface ParticiperFormProps {
  cagnotte: Cagnotte;
  slug: string;
  suggestedAmounts: readonly number[];
}

interface StashedPayload {
  sellerSlug: string;
  cagnotteSlug: string;
  orderType: "DONATION";
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  donorMessage?: string;
  isAnonymous: boolean;
  messageIsPrivate: boolean;
  cagnotteSubtype: FundraiserSubtype;
  cagnotteTitle: string;
  cagnotteCoverUrl: string | null;
  cagnotteCardEnabled: boolean;
  voluntaryContribution: number;
  baseAmount: number;
}

// Anti-blanchiment — ≥ 50 000 FCFA → name + email obligatoires (le donateur
// peut toujours cocher anonyme : ses infos sont stockées mais non affichées).
// La borne est inclusive : 50 000 exactement déclenche l'obligation.
const HIGH_VALUE_THRESHOLD = 50_000;
// Validation email basique côté client — alignée sur z.string().email() backend
// (Zod accepte les formats RFC simples). Empêche le bouton "Participer" de
// s'activer tant que l'email n'a pas un format plausible.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Voluntary contribution = 3% of the base amount, floor favors the donor.
function computeVoluntary(base: number): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Math.floor(base * 0.03);
}

// Phase 10 v3 — Banani "Participer à la cagnotte" design.
//
// Two-column layout on lg+:
//   • Left (2/3): 3 numbered step cards — Montant / Infos / Message
//   • Right (1/3): sticky Récapitulatif card with mini cagnotte, price
//     breakdown, voluntary contribution toggle, Total, Procéder au paiement
//
// Below lg the summary moves under the form and a fixed bottom CTA bar
// surfaces Total + "Procéder au paiement" so the donor never loses the
// payment button. All animation is CSS-only (button-shine-sweep keyframe).
export function ParticiperForm({
  cagnotte,
  slug,
  suggestedAmounts,
}: ParticiperFormProps) {
  const router = useRouter();
  const subtype = cagnotte.subtype;

  const defaultAmount = suggestedAmounts[2] ?? suggestedAmounts[1] ?? 5000;
  const [baseAmount, setBaseAmount] = React.useState<number>(defaultAmount);
  const [customAmount, setCustomAmount] = React.useState<string>("");
  const [voluntaryEnabled, setVoluntaryEnabled] = React.useState<boolean>(
    true,
  );
  const [firstName, setFirstName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [messageIsPrivate, setMessageIsPrivate] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const voluntaryAmount = React.useMemo(
    () => (voluntaryEnabled ? computeVoluntary(baseAmount) : 0),
    [voluntaryEnabled, baseAmount],
  );
  const totalAmount = baseAmount + voluntaryAmount;

  // Phase 10 v3 — only the amount is required client-side. The phone
  // number is collected on the /paiement step (since that's where the
  // Mobile Money flow actually needs it). That means the stash writes
  // an EMPTY customerPhone and the paiement page backfills it before
  // POSTing to /api/orders — the backend `createOrderSchema` still
  // receives a valid `customerPhone.min(1)`.
  // Memo : seuil franchi → `requiresIdentity` true (≥ 50 000, inclusif).
  const requiresIdentity = totalAmount >= HIGH_VALUE_THRESHOLD;

  // canSubmit : vrai dès que le formulaire passe toutes les validations
  // bloquantes en l'état courant. Drive le `disabled` du bouton "Participer
  // à la cagnotte" — l'utilisateur ne peut pas tenter un submit voué à
  // échouer, et n'a donc pas à voir d'erreurs post-clic.
  const canSubmit = React.useMemo(() => {
    if (!Number.isInteger(baseAmount) || baseAmount < 500) return false;
    if (baseAmount > 10_000_000) return false;
    if (requiresIdentity) {
      const trimmedName = firstName.trim();
      const trimmedEmail = email.trim();
      if (trimmedName.length < 2) return false;
      if (!EMAIL_RE.test(trimmedEmail)) return false;
    }
    return true;
  }, [baseAmount, requiresIdentity, firstName, email]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!Number.isInteger(baseAmount) || baseAmount < 500) {
      e.amount = PARTICIPER_LABELS.errorAmountMin;
    } else if (baseAmount > 10_000_000) {
      e.amount = PARTICIPER_LABELS.errorAmountMax;
    }
    // Anti-blanchiment : ≥ 50 000 FCFA → name + email obligatoires.
    // Le donateur peut quand même cocher anonyme (ses infos sont stockées
    // en DB mais le nom est masqué publiquement par maskDonation côté backend).
    if (requiresIdentity) {
      const trimmedName = firstName.trim();
      const trimmedEmail = email.trim();
      if (trimmedName.length < 2) {
        e.firstName = "À partir de 50 000 FCFA, votre nom est obligatoire (anti-blanchiment).";
      }
      if (!EMAIL_RE.test(trimmedEmail)) {
        e.email = "À partir de 50 000 FCFA, un email valide est obligatoire (anti-blanchiment).";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    // Audit 011 D-02: guard against double-submit even though the actual
    // charge happens on /paiement — a fast double-click would otherwise
    // fire two router.push() in a row.
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);

    // Audit-039 C-2/A-8 — à partir du seuil anti-blanchiment (≥50k) on doit
    // stocker l'identité même si le donateur a coché "anonyme". Le
    // maskDonation() côté backend masque l'affichage public ; isAnonymous
    // reste source de vérité pour la UI publique. En-dessous du seuil,
    // comportement legacy : anonyme = on n'envoie pas du tout name/email
    // (privacy-by-default). `requiresIdentity` est calculé une fois au
    // niveau du composant (memo line 114) et réutilisé ici.
    const trimmedName = firstName.trim();
    const trimmedEmail = email.trim();
    const payload: StashedPayload = {
      sellerSlug: cagnotte.seller?.slug ?? "",
      cagnotteSlug: slug,
      orderType: "DONATION",
      amount: totalAmount,
      baseAmount,
      voluntaryContribution: voluntaryAmount,
      customerName: isAnonymous && !requiresIdentity ? "" : trimmedName,
      customerEmail:
        isAnonymous && !requiresIdentity
          ? undefined
          : trimmedEmail || undefined,
      // Placeholder — /paiement always overwrites this before POST.
      customerPhone: "",
      donorMessage: message.trim() || undefined,
      isAnonymous,
      messageIsPrivate,
      cagnotteSubtype: subtype,
      cagnotteTitle: cagnotte.title,
      cagnotteCoverUrl: cagnotte.coverUrl,
      cagnotteCardEnabled: cagnotte.cardEnabled,
    };

    try {
      sessionStorage.setItem(
        `cagnotte.participer.${slug}`,
        JSON.stringify(payload),
      );
    } catch {
      // sessionStorage may be blocked — /paiement handles missing data
    }
    router.push(`/c/${slug}/paiement`);
  }

  const PRESETS = suggestedAmounts.slice(0, 3);

  // Shared Tailwind class strings so desktop + mobile pay buttons stay in
  // sync without a nested component (React 19 / compiler disallows that).
  const PAY_BTN_BASE =
    "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary font-bold text-white shadow-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]";
  const STEP_H2 =
    "mb-5 flex items-center gap-3 font-headings text-base font-black text-primary sm:text-lg md:text-xl";
  const STEP_BADGE =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-dark text-xs font-black text-primary sm:text-sm";
  const SHINE_SPAN =
    "pointer-events-none absolute inset-y-0 -left-[50%] w-[50%] animate-button-shine-sweep bg-gradient-to-r from-transparent via-white/30 to-transparent";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-gray-50 pb-10 lg:pb-12"
    >
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-6 md:px-6 md:py-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          {/* ─── Left: form steps ──────────────────────────────────────── */}
          <div className="w-full space-y-6 lg:w-2/3">
            {/* Back link */}
            <Link
              href={`/c/${slug}`}
              className="inline-flex items-center gap-2 font-bold text-primary transition-colors hover:text-primary-hover"
            >
              <ArrowLeft size={20} aria-hidden />
              Retour à la cagnotte
            </Link>

            {/* ── Step 1: Montant ──────────────────────────────────── */}
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
              <h2 className={STEP_H2}>
                <span aria-hidden className={STEP_BADGE}>
                  1
                </span>
                Montant de votre participation
              </h2>

              <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
                {PRESETS.map((preset) => {
                  const active =
                    baseAmount === preset && customAmount.trim() === "";
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBaseAmount(preset);
                        setCustomAmount("");
                      }}
                      className={cn(
                        "flex min-h-14 items-center justify-center rounded-xl border-2 px-2 py-3 text-sm font-black transition-all duration-200 ease-out sm:text-base",
                        active
                          ? "border-primary bg-primary text-white shadow-md"
                          : "border-gray-200 bg-white text-primary hover:border-primary hover:bg-gray-50 active:scale-[0.98]",
                      )}
                    >
                      {formatPrice(preset)}
                    </button>
                  );
                })}
              </div>

              {/* Custom amount — auto-sized input via `field-sizing:
                  content` (Chrome 123+ / Safari 17+ / Firefox 123+, all
                  2024). The input grows/shrinks to match the typed
                  number so the `flex justify-center` truly centers the
                  "1 000 FCFA" group no matter how many digits are in
                  the input. Padding tightened from py-5 to py-4. */}
              <label className="block">
                <span className="mb-2 block text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Ou un montant libre
                </span>
                <div className="flex items-baseline justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-4 py-4 transition-colors focus-within:border-primary sm:gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      customAmount ||
                      (baseAmount > 0 ? String(baseAmount) : "")
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      setCustomAmount(raw);
                      const n = Number(raw);
                      if (Number.isFinite(n) && n >= 0) {
                        setBaseAmount(Math.floor(n));
                      }
                    }}
                    placeholder="0"
                    className="field-sizing-content min-w-[40px] max-w-full bg-transparent text-center font-headings text-3xl font-black leading-none text-primary outline-none sm:text-3xl"
                    aria-label={PARTICIPER_LABELS.customAmountLabel}
                  />
                  <span
                    aria-hidden
                    className="font-headings text-xl font-black leading-none text-primary/70 sm:text-2xl"
                  >
                    FCFA
                  </span>
                </div>
              </label>
              {errors.amount ? (
                <p
                  role="alert"
                  className="mt-2 text-xs font-medium text-red-600"
                >
                  {errors.amount}
                </p>
              ) : null}
            </section>

            {/* ── Step 2: Vos informations ────────────────────────── */}
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
              <h2 className={STEP_H2}>
                <span aria-hidden className={STEP_BADGE}>
                  2
                </span>
                Vos informations (optionnel)
              </h2>

              <div className="space-y-4">
                {/* Audit-039 A-4/A-8 — au-dessus du seuil anti-blanchiment
                    (50 000 FCFA) le bandeau d'aide est affiché en proactif
                    et les champs restent activés même si l'option anonyme
                    est cochée (l'identité est stockée mais maskDonation()
                    masque l'affichage public). En-dessous : comportement
                    legacy, fields disabled quand anonyme. */}
                {requiresIdentity ? (
                  // role=status + aria-live=polite → screen reader annonce
                  // dynamiquement quand le donateur franchit le seuil 50k
                  // (audit-039 follow-up P3).
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
                  >
                    À partir de 50 000 FCFA, votre nom et votre email sont
                    obligatoires (anti-blanchiment). Si vous restez anonyme,
                    ces informations sont stockées en privé et ne sont pas
                    affichées publiquement.
                  </div>
                ) : null}
                {(() => {
                  const fieldsDisabled = isAnonymous && !requiresIdentity;
                  return (
                    <div
                      className={cn(
                        "grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2",
                        fieldsDisabled ? "pointer-events-none opacity-50" : "",
                      )}
                      aria-hidden={fieldsDisabled || undefined}
                    >
                      <Input
                        label="Prénom"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                        placeholder="Ex : Thomas"
                        disabled={fieldsDisabled}
                        error={errors.firstName}
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="Pour votre reçu"
                        icon={<Mail size={16} aria-hidden />}
                        disabled={fieldsDisabled}
                        error={errors.email}
                      />
                    </div>
                  );
                })()}

                <div className="pt-1">
                  <Checkbox
                    label="Masquer mon identité au public"
                    checked={isAnonymous}
                    onChange={setIsAnonymous}
                  />
                </div>
              </div>
            </section>

            {/* ── Step 3: Message ──────────────────────────────────── */}
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
              <h2 className={STEP_H2}>
                <span aria-hidden className={STEP_BADGE}>
                  3
                </span>
                Un petit mot ? (Optionnel)
              </h2>

              <Textarea
                label="Votre message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Laissez un message de soutien…"
              />

              <div className="mt-3">
                <Checkbox
                  label="Garder ce message privé"
                  checked={messageIsPrivate}
                  onChange={setMessageIsPrivate}
                />
              </div>
            </section>
          </div>

          {/* ─── Right: sticky recap ──────────────────────────────────── */}
          <aside className="w-full lg:w-1/3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] sm:p-6 md:p-6 lg:sticky lg:top-24">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-wider text-gray-500">
                Récapitulatif
              </h3>

              {/* Mini cagnotte card — premium layout.
                  Cover thumbnail 72×72 with soft inset ring + drop
                  shadow, floating subtype emoji chip in the top-right
                  corner, bold title on the right, tiny "Vous participez
                  à" kicker for context. Separator below via border-b. */}
              <div className="mb-6 flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className="relative shrink-0">
                  {cagnotte.coverUrl ? (
                    <Image
                      src={cagnotte.coverUrl}
                      alt=""
                      width={72}
                      height={72}
                      sizes="72px"
                      className="h-[72px] w-[72px] rounded-2xl object-cover shadow-[0_8px_20px_rgb(23,40,102,0.15)] ring-1 ring-black/5"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-[#F4D3DE] font-headings text-xl font-black text-primary/40 shadow-[0_8px_20px_rgb(23,40,102,0.15)] ring-1 ring-black/5"
                    >
                      {cagnotte.title.slice(0, 2).toUpperCase()}
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
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Vous participez à
                  </p>
                  <h4 className="line-clamp-2 font-headings text-[15px] font-black leading-[1.2] text-primary">
                    {cagnotte.title}
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

                {/* Voluntary contribution — single-line row, premium.
                    checkbox · label (flex-1, truncates if ever tight) ·
                    amount (shrink-0 so it never gets cut). At 300-340px
                    inner the typical "Soutenir cagnotte.sn" + "+ 150
                    FCFA" pair sits on one line comfortably. */}
                <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-pink-200 bg-pink/40 p-3 transition-colors hover:border-primary hover:bg-pink/60 sm:p-4">
                  <span className="relative shrink-0">
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                        voluntaryEnabled
                          ? "border-primary bg-primary"
                          : "border-gray-300 bg-white",
                      )}
                    >
                      {voluntaryEnabled ? (
                        <Check size={14} className="text-white" />
                      ) : null}
                    </span>
                    <input
                      type="checkbox"
                      checked={voluntaryEnabled}
                      onChange={(e) => setVoluntaryEnabled(e.target.checked)}
                      className="sr-only"
                      aria-label={PARTICIPER_LABELS.voluntaryLabel}
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-bold leading-tight text-primary">
                    Soutenir cagnotte.sn
                  </span>
                  <span className="shrink-0 font-headings text-sm font-black tabular-nums text-primary">
                    +{" "}
                    {formatPrice(
                      voluntaryEnabled
                        ? voluntaryAmount
                        : computeVoluntary(baseAmount),
                    )}
                  </span>
                </label>
              </div>

              {/* Total — stacked on narrow cards so the big amount never
                  collides with the label at 375px or inside the lg:w-1/3
                  sidebar column (both ≈ 300-340px inner). */}
              <div className="mb-6 flex flex-col gap-1 border-t border-gray-100 pt-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Total à payer
                </span>
                <span className="font-headings text-[28px] font-black leading-none text-primary sm:text-3xl">
                  {formatPrice(totalAmount)}
                </span>
              </div>

              {/* Primary Pay button — compact text, generous padding.
                  Désactivé tant que le formulaire n'est pas valide (montant
                  ou identité ≥50k manquants) pour éviter un clic voué à
                  échouer. Le `aria-describedby` pointe sur l'aide contextuelle
                  affichée juste sous le bouton quand il est désactivé. */}
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                aria-describedby={
                  !canSubmit && !submitting ? "pay-btn-help" : undefined
                }
                className={cn(
                  PAY_BTN_BASE,
                  "min-h-14 px-5 py-4 text-sm sm:text-base",
                  "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:-translate-y-0 disabled:hover:bg-primary disabled:hover:shadow-lg",
                )}
              >
                <span aria-hidden className={SHINE_SPAN} />
                <span className="relative flex items-center gap-2.5 whitespace-nowrap">
                  Participer à la cagnotte
                  <Lock size={16} aria-hidden />
                </span>
              </button>
              {!canSubmit && !submitting ? (
                <p
                  id="pay-btn-help"
                  className="mt-2 text-center text-[11px] font-medium text-amber-700"
                >
                  {requiresIdentity
                    ? "Renseigne ton prénom et un email valide pour continuer."
                    : "Choisis un montant entre 500 et 10 000 000 FCFA."}
                </p>
              ) : null}

              <p className="mt-4 text-center text-[11px] font-medium text-gray-500">
                En cliquant, vous acceptez nos{" "}
                <Link href="/cgu" className="text-primary hover:underline">
                  CGU
                </Link>
                . Paiement 100 % sécurisé.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </form>
  );
}
