"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  Button,
  Calendar,
  GalleryBuilder,
  type GalleryItem,
  ImageUpload,
  RichTextEditor,
  Textarea,
  useToast,
} from "@/components/ui";
import { WIZARD_FIELDS, WIZARD_LABELS } from "@/lib/constants";
import {
  useWizardDraft,
  type FestiveDraft,
} from "@/hooks/useWizardDraft";
import { StepIndicator, WizardHeader } from "../../_StepIndicator";
import { uploadCover } from "../../_uploadCover";

export default function FestiveStep2Page() {
  const router = useRouter();
  const { toast } = useToast();
  const { draft, setDraft, isReady } =
    useWizardDraft<FestiveDraft>("festive");

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [description, setDescription] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // Hydrate + guard: if step-1 fields are missing, bounce back.
  useEffect(() => {
    if (!isReady) return;
    if (!draft.title || !draft.occasion || !draft.goalAmount) {
      setRedirecting(true);
      router.replace("/tableau-de-bord/nouvelle/festive/etape-1");
      return;
    }
    if (draft.coverUrl) setCoverUrl(draft.coverUrl);
    if (draft.gallery) setGallery(draft.gallery);
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
      gallery,
      description: description.trim() || undefined,
      thankYouMessage: thankYouMessage.trim() || undefined,
      endDate: endDate || null,
      step: 3,
    });
    router.push("/tableau-de-bord/nouvelle/festive/etape-3");
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
        variant="festive"
        title={WIZARD_LABELS.step2TitleFestive}
        subtitle={WIZARD_LABELS.step2SubtitleFestive}
      />

      <form
        className="flex flex-col gap-5 sm:gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <ImageUpload
          label={WIZARD_FIELDS.coverLabel}
          helper={
            uploading
              ? "Envoi en cours…"
              : WIZARD_FIELDS.coverHelp
          }
          value={coverFile || coverUrl || null}
          onChange={handleFileChange}
          onError={(msg) => {
            setUploadError(msg);
            toast(msg, "error");
          }}
          error={uploadError ?? undefined}
        />
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-primary">
            {WIZARD_FIELDS.galleryLabel}
          </label>
          <GalleryBuilder
            value={gallery}
            onChange={setGallery}
            uploadImage={uploadCover}
          />
        </div>
        <RichTextEditor
          label={WIZARD_FIELDS.descriptionLabelFestive}
          placeholder={WIZARD_FIELDS.descriptionPlaceholderFestive}
          value={description}
          onChange={setDescription}
          maxLength={5000}
        />
        <Textarea
          label={WIZARD_FIELDS.thankYouMessageLabel}
          placeholder={WIZARD_FIELDS.thankYouMessagePlaceholder}
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
          maxLength={500}
        />
        <Calendar
          label={`${WIZARD_FIELDS.endDateLabel} (${WIZARD_FIELDS.endDateOptional})`}
          helper={WIZARD_FIELDS.endDateHelpFestive}
          value={endDate ? new Date(`${endDate}T00:00:00`) : null}
          onChange={(d) => {
            if (!d) {
              setEndDate("");
              return;
            }
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            setEndDate(`${y}-${m}-${day}`);
          }}
          minDate={new Date()}
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
            {WIZARD_LABELS.continueCtaStep2}
          </Button>
        </div>
      </form>
    </div>
  );
}
