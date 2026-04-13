"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { WIZARD_FIELDS, WIZARD_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import {
  useWizardDraft,
  type SolidaireDraft,
  type SolidaireCause,
  type SolidaireBeneficiary,
} from "@/hooks/useWizardDraft";
import { StepIndicator, WizardHeader } from "../../_StepIndicator";

const CAUSE_OPTIONS = [
  { value: "sante_medical", label: WIZARD_FIELDS.causeOptions.sante_medical },
  { value: "education", label: WIZARD_FIELDS.causeOptions.education },
  {
    value: "projet_solidaire",
    label: WIZARD_FIELDS.causeOptions.projet_solidaire,
  },
  { value: "urgence", label: WIZARD_FIELDS.causeOptions.urgence },
  { value: "animaux", label: WIZARD_FIELDS.causeOptions.animaux },
  { value: "autre", label: WIZARD_FIELDS.causeOptions.autre },
];

const BENEFICIARY_OPTIONS = [
  { value: "moi_meme", label: WIZARD_FIELDS.beneficiaryOptions.moi_meme },
  { value: "un_proche", label: WIZARD_FIELDS.beneficiaryOptions.un_proche },
  {
    value: "une_association",
    label: WIZARD_FIELDS.beneficiaryOptions.une_association,
  },
];

export default function SolidaireStep1Page() {
  const router = useRouter();
  const { draft, setDraft, isReady } =
    useWizardDraft<SolidaireDraft>("solidaire");

  const [title, setTitle] = useState("");
  const [cause, setCause] = useState<SolidaireCause | "">("");
  const [beneficiary, setBeneficiary] = useState<SolidaireBeneficiary | "">(
    "",
  );
  const [goalAmount, setGoalAmount] = useState<string>("");
  const [errors, setErrors] = useState<{
    title?: string;
    cause?: string;
    beneficiary?: string;
    goalAmount?: string;
  }>({});

  useEffect(() => {
    if (!isReady) return;
    if (draft.title) setTitle(draft.title);
    if (draft.cause) setCause(draft.cause);
    if (draft.beneficiary) setBeneficiary(draft.beneficiary);
    if (typeof draft.goalAmount === "number") {
      setGoalAmount(String(draft.goalAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const goal = Number(goalAmount);
  const showGoalPreview = Number.isFinite(goal) && goal >= 1000;

  function handleContinue() {
    const nextErrors: typeof errors = {};
    if (!title.trim()) {
      nextErrors.title = WIZARD_FIELDS.errorTitleRequired;
    }
    if (!cause) {
      nextErrors.cause = WIZARD_FIELDS.errorCauseRequired;
    }
    if (!beneficiary) {
      nextErrors.beneficiary = WIZARD_FIELDS.errorBeneficiaryRequired;
    }
    if (!Number.isFinite(goal) || goal < 1000) {
      nextErrors.goalAmount = WIZARD_FIELDS.errorGoalMin;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setDraft({
      title: title.trim(),
      cause: cause as SolidaireCause,
      beneficiary: beneficiary as SolidaireBeneficiary,
      goalAmount: Math.floor(goal),
      step: 2,
    });
    router.push("/tableau-de-bord/nouvelle/solidaire/etape-2");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <StepIndicator
        current={1}
        onBack={() => router.push("/tableau-de-bord/nouvelle")}
      />
      <WizardHeader
        variant="solidaire"
        title={WIZARD_LABELS.step1TitleSolidaire}
        subtitle={WIZARD_LABELS.step1SubtitleSolidaire}
      />

      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <Input
          label={WIZARD_FIELDS.titleLabel}
          placeholder={WIZARD_FIELDS.titlePlaceholderSolidaire}
          helper={WIZARD_FIELDS.titleHelp}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          error={errors.title}
          required
        />
        <Select
          label={WIZARD_FIELDS.causeLabel}
          placeholder={WIZARD_FIELDS.causePlaceholder}
          options={CAUSE_OPTIONS}
          value={cause}
          onChange={(e) => setCause(e.target.value as SolidaireCause)}
          error={errors.cause}
          required
        />
        <Select
          label={WIZARD_FIELDS.beneficiaryLabel}
          placeholder="Sélectionnez un bénéficiaire…"
          options={BENEFICIARY_OPTIONS}
          value={beneficiary}
          onChange={(e) =>
            setBeneficiary(e.target.value as SolidaireBeneficiary)
          }
          error={errors.beneficiary}
          required
        />
        <Input
          label={WIZARD_FIELDS.goalAmountLabel}
          type="number"
          inputMode="numeric"
          min={1000}
          step={1000}
          placeholder={WIZARD_FIELDS.goalAmountPlaceholder}
          helper={
            showGoalPreview
              ? `${formatPrice(Math.floor(goal))} ${WIZARD_FIELDS.goalAmountHelp}`
              : WIZARD_FIELDS.goalAmountHelp
          }
          value={goalAmount}
          onChange={(e) => setGoalAmount(e.target.value)}
          error={errors.goalAmount}
          required
        />

        <div className="flex justify-end border-t border-border pt-6">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            iconRight={<ArrowRight size={18} />}
          >
            {WIZARD_LABELS.continueCta}
          </Button>
        </div>
      </form>
    </div>
  );
}
