"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Lock } from "lucide-react";
import { Button, Checkbox, Toggle, VisibilityCard } from "@/components/ui";
import {
  VISIBILITY_LABELS,
  WIZARD_EXTRA_LABELS,
  WIZARD_FIELDS,
  WIZARD_LABELS,
} from "@/lib/constants";
import {
  useWizardDraft,
  type SolidaireDraft,
  type Visibility,
} from "@/hooks/useWizardDraft";
import { api, ApiError } from "@/lib/api";
import { StepIndicator, WizardHeader } from "../../_StepIndicator";

export default function SolidaireStep3Page() {
  const router = useRouter();
  const { draft, setDraft, isReady } =
    useWizardDraft<SolidaireDraft>("solidaire");

  // Solidaire defaults to Publique (opposite of festive).
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [hideAmount, setHideAmount] = useState(false);
  const [hideDonors, setHideDonors] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (
      !draft.title ||
      !draft.cause ||
      !draft.beneficiary ||
      !draft.goalAmount
    ) {
      setRedirecting(true);
      router.replace("/tableau-de-bord/nouvelle/solidaire/etape-1");
      return;
    }
    if (draft.visibility) setVisibility(draft.visibility);
    if (typeof draft.hideAmount === "boolean") setHideAmount(draft.hideAmount);
    if (typeof draft.hideDonors === "boolean") setHideDonors(draft.hideDonors);
    if (typeof draft.tosAccepted === "boolean")
      setTosAccepted(draft.tosAccepted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  async function handlePublish() {
    if (submitting) return;
    setError(null);
    if (!tosAccepted) {
      setError(WIZARD_FIELDS.tosError);
      return;
    }
    if (
      !draft.title ||
      !draft.cause ||
      !draft.beneficiary ||
      !draft.goalAmount
    ) {
      router.replace("/tableau-de-bord/nouvelle/solidaire/etape-1");
      return;
    }

    setDraft({ visibility, hideAmount, hideDonors, tosAccepted });

    setSubmitting(true);
    try {
      const res = await api<{ block: { id: string; slug: string | null } }>(
        "/api/blocks",
        {
          method: "POST",
          body: {
            type: "FUNDRAISER",
            title: draft.title,
            config: {
              title: draft.title,
              description: draft.description ?? "",
              goalAmount: draft.goalAmount,
              endDate: draft.endDate ?? null,
              coverUrl: draft.coverUrl ?? null,
              thankYouMessage: draft.thankYouMessage ?? "",
              subtype: "solidaire",
              // CRITICAL — backend superRefine rejects non-null occasion
              // when subtype === "solidaire".
              occasion: null,
              cause: draft.cause,
              beneficiary: draft.beneficiary,
              visibility,
              hideAmount,
              hideDonors,
            },
          },
        },
      );
      const newSlug = res.block.slug;
      if (!newSlug) {
        setError(WIZARD_FIELDS.errorGeneric);
        setSubmitting(false);
        return;
      }
      router.replace(
        `/tableau-de-bord/nouvelle/succes?slug=${encodeURIComponent(newSlug)}`,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? ((err.body as { error?: string })?.error ?? err.message)
          : WIZARD_FIELDS.errorGeneric;
      setError(msg);
      setSubmitting(false);
    }
  }

  if (redirecting) {
    return (
      <div className="mx-auto max-w-2xl py-8 text-center text-sm text-muted-foreground">
        {WIZARD_FIELDS.errorMissingStep1}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <StepIndicator current={3} onBack={() => router.back()} />
      <WizardHeader
        variant="solidaire"
        title={WIZARD_LABELS.step3Title}
        subtitle={WIZARD_LABELS.step3SubtitleSolidaire}
      />

      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          handlePublish();
        }}
      >
        <fieldset
          className="flex flex-col gap-4"
          role="radiogroup"
          aria-label={VISIBILITY_LABELS.sectionLabel}
        >
          <legend className="mb-2 text-base font-bold text-primary">
            {VISIBILITY_LABELS.sectionLabel}
          </legend>
          <VisibilityCard
            value="public"
            checked={visibility === "public"}
            onChange={(v) => setVisibility(v as Visibility)}
            icon={<Globe size={18} />}
            title={VISIBILITY_LABELS.publicTitle}
            description={VISIBILITY_LABELS.publicDescription}
          />
          <VisibilityCard
            value="private"
            checked={visibility === "private"}
            onChange={(v) => setVisibility(v as Visibility)}
            icon={<Lock size={18} />}
            title={VISIBILITY_LABELS.privateTitle}
            description={VISIBILITY_LABELS.privateDescription}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4 border-t border-border pt-6">
          <legend className="text-sm font-semibold text-primary">
            {WIZARD_EXTRA_LABELS.displayOptionsLegend}
          </legend>
          <Toggle
            checked={hideAmount}
            onChange={setHideAmount}
            label={WIZARD_FIELDS.hideAmountLabel}
            description={WIZARD_FIELDS.hideAmountHelp}
          />
          <Toggle
            checked={hideDonors}
            onChange={setHideDonors}
            label={WIZARD_FIELDS.hideDonorsLabel}
            description={WIZARD_FIELDS.hideDonorsHelp}
          />
        </fieldset>

        <div className="border-t border-border pt-6">
          <Checkbox
            checked={tosAccepted}
            onChange={setTosAccepted}
            label={WIZARD_FIELDS.tosLabelSolidaire}
            error={error ?? undefined}
          />
        </div>

        {error && !error.includes(WIZARD_FIELDS.tosError) ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end border-t border-border pt-6">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            iconRight={!submitting ? <Check size={18} /> : undefined}
            disabled={submitting}
          >
            {submitting
              ? WIZARD_LABELS.publishing
              : WIZARD_LABELS.publishCta}
          </Button>
        </div>
      </form>
    </div>
  );
}
