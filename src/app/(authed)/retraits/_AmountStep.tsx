"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button, Input, RadioCard, useToast } from "@/components/ui";
import { WITHDRAWAL_LABELS } from "@/lib/constants";
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

  return (
    <div className="mx-auto max-w-3xl">
      <form
        onSubmit={handleContinue}
        className="flex flex-col gap-6 rounded-3xl bg-white shadow-sm"
      >
        {/* Navy header banner */}
        <div className="rounded-t-3xl bg-primary px-6 py-8 text-primary-foreground md:px-10">
          <h1 className="font-headings text-2xl font-bold md:text-3xl">
            {WITHDRAWAL_LABELS.h1}
          </h1>
          <p className="mt-2 max-w-md text-sm text-primary-foreground/80">
            {WITHDRAWAL_LABELS.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-6 px-6 pb-6 md:px-10 md:pb-10">
          {/* Balance card */}
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {WITHDRAWAL_LABELS.balanceLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {WITHDRAWAL_LABELS.balanceHelper}
              </p>
            </div>
            <p className="font-headings text-2xl font-black text-primary md:text-3xl">
              {formatPrice(balance)}
            </p>
          </div>

          {/* Amount input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="withdrawal-amount"
              className="text-sm font-medium text-primary"
            >
              {WITHDRAWAL_LABELS.amountLabel}
            </label>
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
                {WITHDRAWAL_LABELS.maxChip}
              </button>
            </div>
            <p
              id="withdrawal-amount-helper"
              className="text-xs text-muted-foreground"
            >
              {WITHDRAWAL_LABELS.amountMin}
            </p>
          </div>

          {/* Destination */}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium text-primary">
              {WITHDRAWAL_LABELS.destLabel}
            </legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <RadioCard
                name="withdrawal-provider"
                value="wave_money"
                checked={provider === "wave_money"}
                onChange={(v) => setProvider(v as PayoutProvider)}
                title="Wave Sénégal"
                description="Transfert instantané"
                icon={
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3374FF] font-headings text-lg font-black text-white">
                    W
                  </span>
                }
              />
              <RadioCard
                name="withdrawal-provider"
                value="orange_money"
                checked={provider === "orange_money"}
                onChange={(v) => setProvider(v as PayoutProvider)}
                title="Orange Money"
                description="Transfert instantané"
                icon={
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6600] font-headings text-lg font-black text-white">
                    O
                  </span>
                }
              />
            </div>
          </fieldset>

          {/* Phone */}
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

          {/* Continue */}
          <div className="flex items-center justify-end pt-2">
            <Button type="submit" variant="primary" size="lg">
              {WITHDRAWAL_LABELS.continue}
            </Button>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock size={12} aria-hidden />
            {WITHDRAWAL_LABELS.secured}
          </p>
        </div>
      </form>
    </div>
  );
}
