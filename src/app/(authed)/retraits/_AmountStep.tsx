"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Plus } from "lucide-react";
import { Button, Input, useToast } from "@/components/ui";
import { WITHDRAW_LABELS, WITHDRAWAL_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { useWithdrawalDraft } from "@/hooks/useWithdrawalDraft";
import {
  validateWithdrawalDraft,
  type PayoutProvider,
  type WithdrawalDraft,
} from "@/lib/withdrawal/schema";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /retraits step 1 client island.
//
// Banani screen "withdrawal" minus the per-cagnotte strip (D-20). UX: big
// navy card with balance, large amount input + Max chip, two RadioCards
// for destination (Wave / Orange — D-22, no Free Money), phone + name
// editable pre-fills, Continuer → setDraft() → /retraits/pin.
// ─────────────────────────────────────────────────────────────────────────

interface AmountStepProps {
  balance: number;
  initial: {
    provider: PayoutProvider;
    phone: string;
    recipientName: string;
  };
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^221/, "").slice(0, 9);
}

export function AmountStep({ balance, initial }: AmountStepProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { draft, setDraft, isReady } = useWithdrawalDraft();

  const [amount, setAmount] = React.useState<string>("");
  const [provider, setProvider] = React.useState<PayoutProvider>(
    initial.provider,
  );
  const [phone, setPhone] = React.useState<string>(normalizePhone(initial.phone));
  const [name, setName] = React.useState<string>(initial.recipientName);

  // Hydrate form from draft once sessionStorage is ready.
  React.useEffect(() => {
    if (!isReady) return;
    if (draft.amount !== undefined) setAmount(String(draft.amount));
    if (draft.provider === "wave_money" || draft.provider === "orange_money") {
      setProvider(draft.provider);
    }
    if (draft.phone !== undefined) setPhone(normalizePhone(draft.phone));
    if (draft.recipientName !== undefined) setName(draft.recipientName);
    // Intentionally dep only on isReady: hydrate once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  function handleMax() {
    setAmount(String(Math.max(0, balance)));
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(amount, 10);
    const candidate: Partial<WithdrawalDraft> = {
      amount: Number.isFinite(parsed) ? parsed : 0,
      provider,
      phone: phone ? `+221${phone}` : "",
      recipientName: name.trim(),
    };
    const err = validateWithdrawalDraft(candidate, balance);
    if (err) {
      toast(err, "error");
      return;
    }
    setDraft(candidate);
    router.push("/retraits/pin");
  }

  const parsedAmount = Number.parseInt(amount, 10);
  const displayAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <form
        onSubmit={handleContinue}
        className="flex flex-col gap-6 overflow-hidden rounded-3xl bg-white shadow-sm"
      >
        {/* Dark-navy hero header — Banani WithdrawFundsForm */}
        <header className="bg-primary px-6 py-8 text-white md:px-10 md:py-10">
          <h1 className="font-headings text-2xl font-black md:text-3xl">
            {WITHDRAW_LABELS.pageTitle}
          </h1>
          <p className="mt-2 max-w-md text-sm font-medium text-blue-100">
            {WITHDRAW_LABELS.pageHelper}
          </p>
        </header>

        <div className="flex flex-col gap-8 px-6 pb-6 md:px-10 md:pb-10">
          {/* Balance card */}
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {WITHDRAWAL_LABELS.balanceLabel}
              </p>
              <p className="text-xs text-gray-500">
                {WITHDRAWAL_LABELS.balanceHelper}
              </p>
            </div>
            <p className="font-headings text-2xl font-black text-primary md:text-3xl">
              {formatPrice(balance)}
            </p>
          </div>

          {/* Step 1 — Montant à retirer */}
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-3 font-headings text-xl font-black text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                1
              </span>
              {WITHDRAW_LABELS.step1Title}
            </h2>
            <div
              className={cn(
                "flex items-center gap-2 rounded-2xl border-2 border-primary bg-blue-50/30 px-4 py-4 md:px-6",
              )}
            >
              <input
                id="withdrawal-amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/\D/g, "").slice(0, 7))
                }
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent font-headings text-2xl font-black text-primary placeholder:text-primary/30 focus:outline-none md:text-3xl"
                aria-describedby="withdrawal-amount-helper"
              />
              <span className="font-headings text-lg font-bold text-primary md:text-xl">
                FCFA
              </span>
              <button
                type="button"
                onClick={handleMax}
                className="inline-flex min-h-10 items-center rounded-full bg-blue-100 px-4 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {WITHDRAW_LABELS.maxChip}
              </button>
            </div>
            <p
              id="withdrawal-amount-helper"
              className="text-xs text-gray-500"
            >
              {WITHDRAWAL_LABELS.amountMin}
            </p>
          </section>

          {/* Step 2 — Où envoyer l'argent ? */}
          <section className="flex flex-col gap-4">
            <h2 className="flex items-center gap-3 font-headings text-xl font-black text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                2
              </span>
              {WITHDRAW_LABELS.step2Title}
            </h2>
            <fieldset
              className="flex flex-col gap-3"
              role="radiogroup"
              aria-label={WITHDRAW_LABELS.step2Title}
            >
              <legend className="sr-only">
                {WITHDRAW_LABELS.step2Title}
              </legend>
              <OperatorTile
                name="withdrawal-provider"
                value="wave_money"
                checked={provider === "wave_money"}
                onChange={(v) => setProvider(v as PayoutProvider)}
                brand="wave"
                title="Wave Sénégal"
                subtitle={
                  phone ? `+221 ${phone}` : WITHDRAWAL_LABELS.phoneLabel
                }
                instant
              />
              <OperatorTile
                name="withdrawal-provider"
                value="orange_money"
                checked={provider === "orange_money"}
                onChange={(v) => setProvider(v as PayoutProvider)}
                brand="orange"
                title="Orange Money"
                subtitle={
                  phone ? `+221 ${phone}` : WITHDRAWAL_LABELS.phoneLabel
                }
                instant
              />
            </fieldset>

            <Link
              href="/profil/coordonnees-bancaires"
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-4 text-sm font-bold text-gray-500 transition-colors hover:border-primary hover:text-primary"
            >
              <Plus size={16} aria-hidden />
              {WITHDRAW_LABELS.addAccountCta}
            </Link>
          </section>

          {/* Phone (editable fallback for account pre-fill) */}
          <div className="flex w-full flex-col gap-1.5">
            <label
              htmlFor="withdrawal-phone"
              className="text-sm font-medium text-primary"
            >
              {WITHDRAWAL_LABELS.phoneLabel}
            </label>
            <div className="flex items-center gap-2">
              <span className="flex h-12 items-center rounded-lg border border-border bg-muted px-3 text-sm font-medium text-primary">
                +221
              </span>
              <input
                id="withdrawal-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={9}
                value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value))}
                placeholder="77 123 45 67"
                className={cn(
                  "min-h-12 flex-1 rounded-lg border border-border bg-background px-4 py-3 text-base text-primary placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                )}
              />
            </div>
          </div>

          {/* Recipient name */}
          <Input
            label={WITHDRAWAL_LABELS.nameLabel}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            autoComplete="name"
          />

          {/* Summary */}
          <section className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {WITHDRAW_LABELS.summaryLabel}
            </p>
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-500">
                  {WITHDRAW_LABELS.summaryAmount}
                </span>
                <span className="font-headings text-base font-bold text-primary">
                  {formatPrice(displayAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-500">
                  {WITHDRAW_LABELS.summaryFees}
                </span>
                <span className="text-sm font-semibold text-green-600">
                  {WITHDRAW_LABELS.summaryFeesFree}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-3">
                <span className="text-sm font-semibold text-primary">
                  {WITHDRAW_LABELS.summaryNet}
                </span>
                <span className="font-headings text-xl font-black text-green-600">
                  {formatPrice(displayAmount)}
                </span>
              </div>
            </div>
          </section>

          {/* Confirm CTA */}
          <div className="flex flex-col items-stretch gap-3 pt-2">
            <Button type="submit" variant="primary" size="lg">
              {WITHDRAW_LABELS.confirmCta}
            </Button>
            <p className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Lock size={14} aria-hidden />
              {WITHDRAW_LABELS.securedFooter}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// OperatorTile — Banani WithdrawFundsForm operator radio card.
// Local to this file (not worth lifting to a primitive for a single
// usage; the shared Phase 3 RadioCard has a different icon contract).
// ─────────────────────────────────────────────────────────────────────────
interface OperatorTileProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  brand: "wave" | "orange";
  title: string;
  subtitle: string;
  instant?: boolean;
}

function OperatorTile({
  name,
  value,
  checked,
  onChange,
  brand,
  title,
  subtitle,
  instant,
}: OperatorTileProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-4 transition-colors",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        checked
          ? "border-primary bg-blue-50/30"
          : "border-gray-100 bg-white hover:border-primary",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
            checked ? "border-primary" : "border-gray-300",
          )}
        >
          {checked ? (
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          ) : null}
        </span>
        <span
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl font-headings text-xl font-black text-white shadow-sm",
            brand === "wave" ? "bg-[#3374FF]" : "bg-[#FF6600]",
          )}
        >
          {brand === "wave" ? "W" : "O"}
        </span>
        <div className="min-w-0">
          <p className="truncate font-headings text-base font-bold text-primary">
            {title}
          </p>
          <p className="truncate text-sm font-medium text-gray-500">
            {subtitle}
          </p>
        </div>
      </div>
      {instant ? (
        <span className="hidden rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600 sm:inline-flex">
          {WITHDRAW_LABELS.instantBadge}
        </span>
      ) : null}
    </label>
  );
}
