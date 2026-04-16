"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { Button, Input, RadioCard, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { BANK_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /profil/coordonnees-bancaires client island.
//
// D-22: Wave + Orange Money only — Free Money is NOT rendered as a RadioCard
// because Bictorys payouts reject it (routes/withdrawals.ts:42).
// D-18: Single payout record lives on Seller.payout*; PUT to /api/sellers/profile.
// D-28: writes use /api/sellers/profile (PUT), not /api/sellers/me.
// ─────────────────────────────────────────────────────────────────────────

type Provider = "wave_money" | "orange_money";

interface BankFormInitial {
  payoutProvider: Provider | null;
  payoutPhone: string;
  payoutName: string;
}

function normalizePhone(raw: string): string {
  // Store digits only; strip +221/221 prefix so we display the 9-digit
  // national number in the input and send a 9-digit value to the backend.
  // The backend (cleanPhoneForStorage) will prefix +221 if missing.
  return raw.replace(/\D/g, "").replace(/^221/, "").slice(0, 9);
}

export function BankForm({ initial }: { initial: BankFormInitial }) {
  const router = useRouter();
  const { toast } = useToast();

  const [provider, setProvider] = React.useState<Provider>(
    initial.payoutProvider ?? "wave_money",
  );
  const [phone, setPhone] = React.useState<string>(
    normalizePhone(initial.payoutPhone || ""),
  );
  const [name, setName] = React.useState<string>(initial.payoutName || "");
  const [saving, setSaving] = React.useState(false);

  const canSubmit = phone.length === 9 && name.trim().length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api("/api/sellers/profile", {
        method: "PUT",
        body: {
          payoutProvider: provider,
          payoutPhone: `+221${phone}`,
          payoutName: name.trim(),
          payoutCountry: "SN",
        },
      });
      toast(BANK_LABELS.saved, "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : BANK_LABELS.errorGeneric;
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Provider picker — Wave + Orange ONLY (D-22). No fieldset
          wrapper: the legend was rendered like a section heading and the
          extra nesting was adding perceived padding on mobile. */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">
          {BANK_LABELS.providerLabel}
        </p>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          <RadioCard
            name="bank-provider"
            value="wave_money"
            checked={provider === "wave_money"}
            onChange={(v) => setProvider(v as Provider)}
            title={BANK_LABELS.providerWave}
            description={BANK_LABELS.providerWaveHelper}
            icon={
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border">
                <Image
                  src="/wave.png"
                  alt="Wave"
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain"
                />
              </span>
            }
          />
          <RadioCard
            name="bank-provider"
            value="orange_money"
            checked={provider === "orange_money"}
            onChange={(v) => setProvider(v as Provider)}
            title={BANK_LABELS.providerOrange}
            description={BANK_LABELS.providerOrangeHelper}
            icon={
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border">
                <Image
                  src="/orange-money.png"
                  alt="Orange Money"
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain"
                />
              </span>
            }
          />
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
          {BANK_LABELS.noFreeMoneyNotice}
        </p>
      </div>

      {/* Phone with +221 prefix badge */}
      <div className="flex w-full flex-col gap-1.5">
        <label
          htmlFor="bank-phone"
          className="text-sm font-medium text-primary"
        >
          {BANK_LABELS.phoneLabel}
        </label>
        <div className="flex items-center gap-2">
          <span className="flex h-12 flex-shrink-0 items-center rounded-lg border border-border bg-muted px-3 text-sm font-medium text-primary">
            +221
          </span>
          <input
            id="bank-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={9}
            value={phone}
            onChange={(e) => setPhone(normalizePhone(e.target.value))}
            placeholder="77 123 45 67"
            className={cn(
              "min-h-12 w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-4 py-3 text-base text-primary placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">{BANK_LABELS.phoneHelper}</p>
      </div>

      {/* Name */}
      <Input
        label={BANK_LABELS.nameLabel}
        helper={BANK_LABELS.nameHelper}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        required
        autoComplete="name"
      />

      {/* Security notice — compact inline caption (no more nested
          padded box inside a padded card inside a padded shell). */}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
        <span>{BANK_LABELS.securityNoticeBody}</span>
      </p>

      <div className="flex flex-col items-end gap-1.5 pt-1">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          disabled={!canSubmit}
        >
          {saving ? BANK_LABELS.saving : BANK_LABELS.save}
        </Button>
        {!canSubmit && !saving && (
          <p className="text-xs text-muted-foreground">
            {phone.length < 9
              ? "Numéro à 9 chiffres requis"
              : name.trim().length === 0
                ? "Nom du titulaire requis"
                : ""}
          </p>
        )}
      </div>
    </form>
  );
}
