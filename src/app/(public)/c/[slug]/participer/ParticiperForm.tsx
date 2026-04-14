"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Info, EyeOff, Lock } from "lucide-react";
import { Button, Checkbox, Input } from "@/components/ui";
import {
  computeCommission,
  type FundraiserSubtype,
} from "@/lib/commission";
import { PARTICIPER_LABELS } from "@/lib/constants";
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
  voluntaryContribution: number;
  baseAmount: number;
}

// Voluntary contribution is 3% of the base amount, added on top.
// Math.floor so we always round DOWN in favor of the donor.
function computeVoluntary(base: number): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Math.floor(base * 0.03);
}

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
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [hideAmountFlag, setHideAmountFlag] = React.useState(false);
  const [tosAccepted, setTosAccepted] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const voluntaryAmount = React.useMemo(
    () => (voluntaryEnabled ? computeVoluntary(baseAmount) : 0),
    [voluntaryEnabled, baseAmount],
  );
  const totalAmount = baseAmount + voluntaryAmount;

  // Live commission — computed on the TOTAL so the donor sees the real
  // split. Transparency rule from D-04.
  const commissionResult = React.useMemo(() => {
    if (!Number.isInteger(totalAmount) || totalAmount < 0) {
      return { rate: 0, commission: 0, net: 0 };
    }
    try {
      return computeCommission(totalAmount, subtype);
    } catch {
      return { rate: 0, commission: 0, net: 0 };
    }
  }, [totalAmount, subtype]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!Number.isInteger(baseAmount) || baseAmount < 500) {
      e.amount = PARTICIPER_LABELS.errorAmountMin;
    } else if (baseAmount > 10_000_000) {
      e.amount = PARTICIPER_LABELS.errorAmountMax;
    }
    if (!firstName.trim()) e.firstName = PARTICIPER_LABELS.errorFirstNameRequired;
    if (!lastName.trim()) e.lastName = PARTICIPER_LABELS.errorLastNameRequired;
    if (!phone.trim()) e.phone = PARTICIPER_LABELS.errorPhoneRequired;
    if (!tosAccepted) e.tos = PARTICIPER_LABELS.errorTosRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    const payload: StashedPayload = {
      sellerSlug: cagnotte.seller?.slug ?? "",
      cagnotteSlug: slug,
      orderType: "DONATION",
      amount: totalAmount,
      baseAmount,
      voluntaryContribution: voluntaryAmount,
      customerName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      customerEmail: email.trim() || undefined,
      customerPhone: phone.trim(),
      isAnonymous,
      messageIsPrivate: false,
      cagnotteSubtype: subtype,
      cagnotteTitle: cagnotte.title,
      cagnotteCoverUrl: cagnotte.coverUrl,
    };

    try {
      sessionStorage.setItem(
        `cagnotte.participer.${slug}`,
        JSON.stringify(payload),
      );
    } catch {
      // sessionStorage may be blocked — the /paiement page handles missing data.
    }
    // Persist the hideAmount flag separately so the server-side order
    // creation can pick it up.
    try {
      sessionStorage.setItem(
        `cagnotte.participer.${slug}.hideAmount`,
        hideAmountFlag ? "1" : "0",
      );
    } catch {
      // ignore
    }
    router.push(`/c/${slug}/paiement`);
  }

  const PRESETS = React.useMemo(
    () => suggestedAmounts.slice(0, 4),
    [suggestedAmounts],
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 md:py-10">
      {/* Breadcrumb */}
      <nav
        aria-label="Fil d'Ariane"
        className="mb-6 flex items-center gap-1 text-sm text-gray-500"
      >
        <Link
          href={`/c/${slug}`}
          className="font-medium text-primary hover:underline"
        >
          {PARTICIPER_LABELS.backCta}
        </Link>
        <ChevronRight size={14} aria-hidden />
        <span className="font-semibold text-primary">
          {PARTICIPER_LABELS.breadcrumbCurrent}
        </span>
      </nav>

      {/* Cagnotte mini-card */}
      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
        {cagnotte.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cagnotte.coverUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-pink text-lg font-black text-primary/40">
            {cagnotte.title.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Participe à
          </p>
          <p className="truncate text-sm font-bold text-primary md:text-base">
            {cagnotte.title}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
        {/* Section 1: Votre participation */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headings text-xl font-black text-primary md:text-2xl">
            {PARTICIPER_LABELS.stepAmount}
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                    "flex min-h-14 items-center justify-center rounded-2xl border-2 px-3 py-3 text-sm font-bold transition-all duration-200 ease-out sm:text-base",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "border-gray-200 bg-white text-primary hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md",
                  )}
                >
                  {formatPrice(preset)}
                </button>
              );
            })}
          </div>

          <div className="relative">
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
              className="min-h-16 w-full rounded-2xl border-2 border-primary bg-white px-6 py-4 pr-20 font-headings text-3xl font-black text-primary shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/20 md:text-4xl"
              aria-label={PARTICIPER_LABELS.customAmountLabel}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 font-headings text-xl font-bold text-primary md:text-2xl"
            >
              FCFA
            </span>
          </div>
          {errors.amount ? (
            <p className="text-xs font-medium text-red-600" role="alert">
              {errors.amount}
            </p>
          ) : null}
        </section>

        <div className="h-px bg-border" />

        {/* Section 2: Contribution volontaire */}
        <section className="flex flex-col gap-3">
          <label className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm has-[:checked]:border-primary has-[:checked]:bg-pink/20 transition-colors">
            <input
              type="checkbox"
              checked={voluntaryEnabled}
              onChange={(e) => setVoluntaryEnabled(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
              aria-label={PARTICIPER_LABELS.voluntaryLabel}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-primary">
                  {PARTICIPER_LABELS.voluntaryTitle}
                </p>
                <span className="shrink-0 font-headings text-lg font-black text-primary">
                  {voluntaryEnabled
                    ? formatPrice(voluntaryAmount)
                    : formatPrice(computeVoluntary(baseAmount))}
                </span>
              </div>
              <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-gray-600">
                <Info
                  size={14}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-primary/60"
                />
                <span>{PARTICIPER_LABELS.voluntaryHelp}</span>
              </p>
            </div>
          </label>

          <button
            type="button"
            onClick={() => setVoluntaryEnabled(false)}
            className={cn(
              "self-start text-xs font-semibold underline underline-offset-2 transition-colors",
              voluntaryEnabled
                ? "text-gray-500 hover:text-primary"
                : "text-gray-400",
            )}
            disabled={!voluntaryEnabled}
          >
            {PARTICIPER_LABELS.voluntaryOptOut}
          </button>
        </section>

        <div className="h-px bg-border" />

        {/* Section 3: Mes infos de paiement */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headings text-xl font-black text-primary md:text-2xl">
            {PARTICIPER_LABELS.stepInfo}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={PARTICIPER_LABELS.firstNameLabel}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={errors.firstName}
              autoComplete="given-name"
              placeholder="Julien"
            />
            <Input
              label={PARTICIPER_LABELS.lastNameLabel}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={errors.lastName}
              autoComplete="family-name"
              placeholder="Durand"
            />
          </div>
          <Input
            label={PARTICIPER_LABELS.emailLabel}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="ex : julien@gmail.com"
          />
          <Input
            label={PARTICIPER_LABELS.phoneLabel}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={PARTICIPER_LABELS.phonePlaceholder}
            error={errors.phone}
            autoComplete="tel"
          />
        </section>

        {/* Section 4: Privacy toggles */}
        <section className="flex flex-col gap-3">
          <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 has-[:checked]:border-primary transition-colors">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
              aria-label={PARTICIPER_LABELS.hideIdentityLabel}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <EyeOff size={14} aria-hidden />
                {PARTICIPER_LABELS.hideIdentityLabel}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                {PARTICIPER_LABELS.hideIdentityHelp}
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 has-[:checked]:border-primary transition-colors">
            <input
              type="checkbox"
              checked={hideAmountFlag}
              onChange={(e) => setHideAmountFlag(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
              aria-label={PARTICIPER_LABELS.hideAmountLabel}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <Lock size={14} aria-hidden />
                {PARTICIPER_LABELS.hideAmountLabel}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                {PARTICIPER_LABELS.hideAmountHelp}
              </p>
            </div>
          </label>
        </section>

        {/* Total summary */}
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-primary/80">
          <div className="flex items-center justify-between">
            <span>Participation à la cagnotte</span>
            <span className="font-semibold text-primary">
              {formatPrice(baseAmount)}
            </span>
          </div>
          {voluntaryAmount > 0 ? (
            <div className="mt-2 flex items-center justify-between">
              <span>Contribution volontaire</span>
              <span className="font-semibold text-primary">
                +{formatPrice(voluntaryAmount)}
              </span>
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-base font-bold text-primary">
            <span>Total</span>
            <span className="font-headings text-lg">
              {formatPrice(totalAmount)}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Commission cagnottes.sn incluse ({commissionResult.rate / 100}%)
          </p>
        </div>

        <Checkbox
          label={PARTICIPER_LABELS.tosLabel}
          checked={tosAccepted}
          onChange={setTosAccepted}
          error={errors.tos}
        />

        <Button type="submit" variant="primary" size="lg" fullWidth>
          {PARTICIPER_LABELS.submitCta}
        </Button>
      </form>
    </div>
  );
}
