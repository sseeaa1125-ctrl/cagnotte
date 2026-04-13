"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Textarea,
  Toggle,
  Checkbox,
} from "@/components/ui";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { MiniCagnotteCard } from "@/components/checkout/MiniCagnotteCard";
import {
  computeCommission,
  type FundraiserSubtype,
} from "@/lib/commission";
import { PARTICIPER_LABELS } from "@/lib/constants";

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
}

export function ParticiperForm({
  cagnotte,
  slug,
  suggestedAmounts,
}: ParticiperFormProps) {
  const router = useRouter();
  const subtype = cagnotte.subtype;

  const defaultAmount = suggestedAmounts[1] ?? suggestedAmounts[0] ?? 2500;
  const [amount, setAmount] = React.useState<number>(defaultAmount);
  const [customAmount, setCustomAmount] = React.useState<string>("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [messageIsPrivate, setMessageIsPrivate] = React.useState(false);
  const [tosAccepted, setTosAccepted] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Live commission (D-04 transparency rule — see src/lib/commission.ts)
  const commissionResult = React.useMemo(() => {
    if (!Number.isInteger(amount) || amount < 0) {
      return { rate: 0, commission: 0, net: 0 };
    }
    try {
      return computeCommission(amount, subtype);
    } catch {
      return { rate: 0, commission: 0, net: 0 };
    }
  }, [amount, subtype]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!Number.isInteger(amount) || amount < 500) {
      e.amount = PARTICIPER_LABELS.errorAmountMin;
    } else if (amount > 10_000_000) {
      e.amount = PARTICIPER_LABELS.errorAmountMax;
    }
    if (!firstName.trim()) e.firstName = PARTICIPER_LABELS.errorFirstNameRequired;
    if (!lastName.trim()) e.lastName = PARTICIPER_LABELS.errorLastNameRequired;
    if (!phone.trim()) e.phone = PARTICIPER_LABELS.errorPhoneRequired;
    if (message.length > 500) e.message = PARTICIPER_LABELS.errorMessageTooLong;
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
      amount,
      customerName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      customerEmail: email.trim() || undefined,
      customerPhone: phone.trim(),
      donorMessage: message.trim() || undefined,
      isAnonymous,
      messageIsPrivate,
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
      // sessionStorage may be blocked (Safari private mode) — we still navigate;
      // the /paiement page has a fallback path that redirects back if missing.
    }
    router.push(`/c/${slug}/paiement`);
  }

  const formatSuggested = (n: number) =>
    `${n.toLocaleString("fr-FR").replace(/\u202F|\u00A0/g, " ")} FCFA`;

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      <h1 className="mb-6 font-headings text-3xl font-bold text-primary md:text-4xl">
        {PARTICIPER_LABELS.pageTitle}
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="space-y-8 lg:col-span-2"
          noValidate
        >
          {/* Section 1: Montant */}
          <section className="space-y-4">
            <h2 className="font-headings text-xl font-semibold text-primary">
              {PARTICIPER_LABELS.stepAmount}
            </h2>
            <div className="flex flex-wrap gap-2">
              {suggestedAmounts.map((a) => {
                const active = amount === a && !customAmount;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAmount(a);
                      setCustomAmount("");
                    }}
                    className={`min-h-12 rounded-full border-2 px-5 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-primary hover:bg-muted"
                    }`}
                  >
                    {formatSuggested(a)}
                  </button>
                );
              })}
            </div>
            <Input
              label={PARTICIPER_LABELS.customAmountLabel}
              type="number"
              inputMode="numeric"
              min={500}
              value={customAmount}
              placeholder={PARTICIPER_LABELS.customAmountPlaceholder}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0) setAmount(Math.floor(n));
              }}
              error={errors.amount}
            />
          </section>

          {/* Section 2: Vos informations */}
          <section className="space-y-4">
            <h2 className="font-headings text-xl font-semibold text-primary">
              {PARTICIPER_LABELS.stepInfo}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={PARTICIPER_LABELS.firstNameLabel}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.firstName}
                autoComplete="given-name"
              />
              <Input
                label={PARTICIPER_LABELS.lastNameLabel}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.lastName}
                autoComplete="family-name"
              />
            </div>
            <Input
              label={PARTICIPER_LABELS.emailLabel}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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

          {/* Section 3: Message + toggles */}
          <section className="space-y-4">
            <h2 className="font-headings text-xl font-semibold text-primary">
              {PARTICIPER_LABELS.stepMessage}
            </h2>
            <Textarea
              label={PARTICIPER_LABELS.messageLabel}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              placeholder={PARTICIPER_LABELS.messagePlaceholder}
              error={errors.message}
            />
            <Toggle
              label={PARTICIPER_LABELS.anonymousLabel}
              description={PARTICIPER_LABELS.anonymousHelp}
              checked={isAnonymous}
              onChange={setIsAnonymous}
            />
            <Toggle
              label={PARTICIPER_LABELS.privateMessageLabel}
              description={PARTICIPER_LABELS.privateMessageHelp}
              checked={messageIsPrivate}
              onChange={setMessageIsPrivate}
            />
            <Checkbox
              label={PARTICIPER_LABELS.tosLabel}
              checked={tosAccepted}
              onChange={setTosAccepted}
              error={errors.tos}
            />
          </section>

          <Button type="submit" variant="primary" size="lg" fullWidth>
            {PARTICIPER_LABELS.submitCta}
          </Button>
        </form>

        {/* Sticky order summary column */}
        <aside className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-4">
            <MiniCagnotteCard
              cagnotte={{
                title: cagnotte.title,
                coverUrl: cagnotte.coverUrl,
                raised: cagnotte.totalRaised ?? 0,
                goal: cagnotte.goalAmount ?? 0,
                subtype,
              }}
            />
            <OrderSummary
              amount={amount}
              subtype={subtype}
              commissionBp={commissionResult.rate}
              commissionAmount={commissionResult.commission}
              netAmount={commissionResult.net}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
