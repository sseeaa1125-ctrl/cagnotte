"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  Button,
  DatePicker,
  ImageUpload,
  Textarea,
  useToast,
} from "@/components/ui";
import { WIZARD_FIELDS, WIZARD_LABELS } from "@/lib/constants";
import {
  useWizardDraft,
  type SolidaireDraft,
} from "@/hooks/useWizardDraft";
import { StepIndicator, WizardHeader } from "../../_StepIndicator";
import { uploadCover } from "../../_uploadCover";

export default function SolidaireStep2Page() {
  const router = useRouter();
  const { toast } = useToast();
  const { draft, setDraft, isReady } =
    useWizardDraft<SolidaireDraft>("solidaire");

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
    if (draft.coverUrl) setCoverUrl(draft.coverUrl);
    if (draft.description) setDescription(draft.description);
    if (draft.thankYouMessage) setThankYouMessage(draft.thankYouMessage);
    if (draft.endDate) setEndDate(draft.endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  async function handleFileChange(file: File | null) {
    setUploadError(null);
    setCoverFile(file);
    if (!file) {
      setCoverUrl(null);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCover(file);
      setCoverUrl(url);
      toast("Image ajoutée", "success");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : WIZARD_FIELDS.coverUploadError;
      setUploadError(msg);
      setCoverUrl(null);
      setCoverFile(null);
    } finally {
      setUploading(false);
    }
  }

  function handleContinue() {
    setDraft({
      coverUrl,
      description: description.trim() || undefined,
      thankYouMessage: thankYouMessage.trim() || undefined,
      endDate: endDate || null,
      step: 3,
    });
    router.push("/tableau-de-bord/nouvelle/solidaire/etape-3");
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
      <StepIndicator current={2} onBack={() => router.back()} />
      <WizardHeader
        variant="solidaire"
        title={WIZARD_LABELS.step2TitleSolidaire}
        subtitle={WIZARD_LABELS.step2SubtitleSolidaire}
      />

      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <ImageUpload
          label={WIZARD_FIELDS.coverLabel}
          helper={
            uploading ? "Envoi en cours…" : WIZARD_FIELDS.coverHelp
          }
          value={coverFile || coverUrl || null}
          onChange={handleFileChange}
          onError={(msg) => {
            setUploadError(msg);
            toast(msg, "error");
          }}
          error={uploadError ?? undefined}
        />
        <Textarea
          label={WIZARD_FIELDS.descriptionLabelSolidaire}
          placeholder={WIZARD_FIELDS.descriptionPlaceholderSolidaire}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          className="min-h-40"
        />
        <Textarea
          label={WIZARD_FIELDS.thankYouMessageLabel}
          placeholder={WIZARD_FIELDS.thankYouMessagePlaceholder}
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
          maxLength={500}
        />
        <DatePicker
          label={`${WIZARD_FIELDS.endDateLabel} (${WIZARD_FIELDS.endDateOptional})`}
          helper={WIZARD_FIELDS.endDateHelpSolidaire}
          value={endDate}
          onChange={setEndDate}
          clearable
        />

        <div className="flex justify-end border-t border-border pt-6">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            iconRight={<ArrowRight size={18} />}
            disabled={uploading}
          >
            {WIZARD_LABELS.continueCta}
          </Button>
        </div>
      </form>
    </div>
  );
}
