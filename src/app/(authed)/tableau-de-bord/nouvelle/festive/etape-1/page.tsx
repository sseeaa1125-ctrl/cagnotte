"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button, Combobox, Input } from "@/components/ui";
import { WIZARD_FIELDS, WIZARD_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import {
  useWizardDraft,
  type FestiveDraft,
  type FestiveOccasion,
} from "@/hooks/useWizardDraft";
import {
  StepIndicator,
  WizardHeader,
} from "../../_StepIndicator";

// Phase 7 plan 07-03 — Banani festive occasion Combobox options.
// Emoji is rendered inside a <span> so the ReactNode icon prop of Combobox
// is happy (hands us full control over sizing / alignment).
const OCCASION_OPTIONS = [
  {
    value: "anniversaire",
    label: WIZARD_FIELDS.occasionOptions.anniversaire,
    icon: <span className="text-2xl">🎂</span>,
  },
  {
    value: "pot_de_depart",
    label: WIZARD_FIELDS.occasionOptions.pot_de_depart,
    icon: <span className="text-2xl">👋</span>,
  },
  {
    value: "cadeau_commun",
    label: WIZARD_FIELDS.occasionOptions.cadeau_commun,
    icon: <span className="text-2xl">🎁</span>,
  },
  {
    value: "mariage_pacs",
    label: WIZARD_FIELDS.occasionOptions.mariage_pacs,
    icon: <span className="text-2xl">💍</span>,
  },
  {
    value: "naissance",
    label: WIZARD_FIELDS.occasionOptions.naissance,
    icon: <span className="text-2xl">👶</span>,
  },
  {
    value: "voyage",
    label: WIZARD_FIELDS.occasionOptions.voyage,
    icon: <span className="text-2xl">✈️</span>,
  },
  {
    value: "autre",
    label: WIZARD_FIELDS.occasionOptions.autre,
    icon: <span className="text-2xl">✨</span>,
    separatorBefore: true,
  },
];

export default function FestiveStep1Page() {
  const router = useRouter();
  const { draft, setDraft, isReady } = useWizardDraft<FestiveDraft>("festive");

  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState<FestiveOccasion | "">("");
  const [goalAmount, setGoalAmount] = useState<string>("");
  const [errors, setErrors] = useState<{
    title?: string;
    occasion?: string;
    goalAmount?: string;
  }>({});

  // Hydrate local state once the draft loads from sessionStorage.
  useEffect(() => {
    if (!isReady) return;
    if (draft.title) setTitle(draft.title);
    if (draft.occasion) setOccasion(draft.occasion);
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
    if (!occasion) {
      nextErrors.occasion = WIZARD_FIELDS.errorOccasionRequired;
    }
    if (!Number.isFinite(goal) || goal < 1000) {
      nextErrors.goalAmount = WIZARD_FIELDS.errorGoalMin;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setDraft({
      title: title.trim(),
      occasion: occasion as FestiveOccasion,
      goalAmount: Math.floor(goal),
      step: 2,
    });
    router.push("/tableau-de-bord/nouvelle/festive/etape-2");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <StepIndicator
        current={1}
        onBack={() => router.push("/tableau-de-bord/nouvelle")}
      />
      <WizardHeader
        variant="festive"
        title={WIZARD_LABELS.step1TitleFestive}
        subtitle={WIZARD_LABELS.step1SubtitleFestive}
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
          placeholder={WIZARD_FIELDS.titlePlaceholderFestive}
          helper={WIZARD_FIELDS.titleHelp}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          error={errors.title}
          required
        />
        <Combobox
          label={WIZARD_FIELDS.occasionLabel}
          placeholder={WIZARD_FIELDS.occasionPlaceholder}
          options={OCCASION_OPTIONS}
          value={occasion}
          onChange={(v) => setOccasion(v as FestiveOccasion)}
          error={errors.occasion}
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
