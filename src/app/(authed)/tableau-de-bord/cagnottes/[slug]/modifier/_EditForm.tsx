"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Button, Input, Textarea, Toggle, useToast } from "@/components/ui";
import { api, ApiError, BACKEND_URL } from "@/lib/api";
import { EDIT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /tableau-de-bord/cagnottes/[slug]/modifier client island.
//
// CRITICAL SLUG-SAFETY CONTRACT (D-24):
//   - Destructure `const { slug: _ignoredSlug, ...safeConfig } = initial.config`
//     to strip any slug that might have been nested into config.
//   - Runtime defensive guard: `if ("slug" in nextConfig) delete nextConfig.slug`.
//   - The PUT body sent to /api/blocks/:id has NO top-level `slug` key and
//     NO nested `config.slug` key.
//   - Grep guard in T7 checks this directory for the literal JSON key for
//     slug; no object literal here ships one to the API.
//
// VERB: PUT (not PATCH) per backend/src/routes/blocks.ts:450.
//
// Cover upload: multipart POST /api/upload (direct BACKEND_URL — same
// pattern as _ProfileForm / _KycForm).
// ─────────────────────────────────────────────────────────────────────────

interface EditFormInitial {
  id: string;
  title: string;
  config: Record<string, unknown>;
}

function readCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("izy-csrf");
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|;\s*)izy-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function uploadCover(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const csrf = readCsrfToken();
  const res = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: csrf ? { "x-csrf-token": csrf } : undefined,
  });
  if (!res.ok) throw new Error("upload-failed");
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("upload-failed");
  return data.url;
}

function parseSuggestedAmounts(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n >= 500)
    .slice(0, 4);
}

function formatSuggestedAmounts(arr: unknown): string {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((n) => (typeof n === "number" ? String(n) : ""))
    .filter(Boolean)
    .join(", ");
}

function toDateInputValue(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function EditForm({ initial }: { initial: EditFormInitial }) {
  const router = useRouter();
  const { toast } = useToast();

  // Slug-safe destructure — rename ignored var to match the
  // underscore-prefixed lint convention.
  const { slug: _ignoredSlug, ...safeConfig } = initial.config as Record<
    string,
    unknown
  > & { slug?: unknown };
  // Reference the ignored var so TS/lint don't strip or warn.
  void _ignoredSlug;

  const [title, setTitle] = React.useState<string>(initial.title);
  const [description, setDescription] = React.useState<string>(
    typeof safeConfig.description === "string" ? safeConfig.description : "",
  );
  const [coverUrl, setCoverUrl] = React.useState<string | null>(
    typeof safeConfig.coverUrl === "string" ? safeConfig.coverUrl : null,
  );
  const [goalAmount, setGoalAmount] = React.useState<string>(
    typeof safeConfig.goalAmount === "number"
      ? String(safeConfig.goalAmount)
      : "",
  );
  const [endDate, setEndDate] = React.useState<string>(
    toDateInputValue(safeConfig.endDate),
  );
  const [thankYouMessage, setThankYouMessage] = React.useState<string>(
    typeof safeConfig.thankYouMessage === "string"
      ? safeConfig.thankYouMessage
      : "",
  );
  const [suggestedAmounts, setSuggestedAmounts] = React.useState<string>(
    formatSuggestedAmounts(safeConfig.suggestedAmounts),
  );
  const [hideAmount, setHideAmount] = React.useState<boolean>(
    safeConfig.hideAmount === true,
  );
  const [hideDonors, setHideDonors] = React.useState<boolean>(
    safeConfig.hideDonors === true,
  );
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleCoverUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCover(file);
      setCoverUrl(url);
    } catch {
      toast("Impossible d'envoyer l'image. Réessayez.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 1) {
      toast("Le titre est requis", "error");
      return;
    }
    const parsedGoal = Number.parseInt(goalAmount, 10);
    if (!Number.isFinite(parsedGoal) || parsedGoal < 1000) {
      toast("L'objectif doit être d'au moins 1 000 FCFA", "error");
      return;
    }

    // Build the next config by MERGING the preserved safeConfig (subtype,
    // occasion, cause, beneficiary, visibility, showDonorCount, minAmount,
    // checkoutFields, etc.) with the editable fields.
    const trimmedThankYou = thankYouMessage.trim();
    const nextConfig: Record<string, unknown> = {
      ...safeConfig,
      description: description.trim() || undefined,
      coverUrl: coverUrl ?? null,
      goalAmount: parsedGoal,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      // Phase 7 plan 07-03 — PLSH-08. Explicit null clears the server-side
      // field so creators can wipe a previously-set message.
      thankYouMessage: trimmedThankYou.length > 0 ? trimmedThankYou : null,
      suggestedAmounts: parseSuggestedAmounts(suggestedAmounts),
      hideAmount,
      hideDonors,
    };

    // Defensive: never ship a `slug` key, even if one leaks in from elsewhere.
    if ("slug" in nextConfig) {
      delete (nextConfig as { slug?: unknown }).slug;
    }

    setSaving(true);
    try {
      // VERB IS PUT (not PATCH) — see blocks.ts:450 and CLAUDE.md.
      await api(`/api/blocks/${initial.id}`, {
        method: "PUT",
        body: {
          title: title.trim(),
          config: nextConfig,
        },
      });
      toast(EDIT_LABELS.saved, "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : EDIT_LABELS.errorGeneric;
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm md:p-8"
    >
      {/* Cover */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-primary">
          {EDIT_LABELS.coverLabel}
        </label>
        <div className="flex items-center gap-4">
          {coverUrl ? (
            <div className="h-24 w-40 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt="Couverture"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-24 w-40 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-xs text-muted-foreground">
              Pas d&rsquo;image
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "inline-flex min-h-12 items-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-pink/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "disabled:opacity-50",
              )}
            >
              <Camera size={16} aria-hidden />
              {uploading ? "Envoi…" : "Changer l'image"}
            </button>
            <p className="text-xs text-muted-foreground">
              {EDIT_LABELS.coverHelper}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleCoverUpload}
              hidden
            />
          </div>
        </div>
      </div>

      <Input
        label={EDIT_LABELS.titleLabel}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
      />

      <Textarea
        label={EDIT_LABELS.descriptionLabel}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={5000}
        rows={5}
      />

      <Input
        label={EDIT_LABELS.goalLabel}
        type="text"
        inputMode="numeric"
        value={goalAmount}
        onChange={(e) =>
          setGoalAmount(e.target.value.replace(/\D/g, "").slice(0, 9))
        }
        required
      />

      <Input
        label={EDIT_LABELS.endDateLabel}
        helper={EDIT_LABELS.endDateHelper}
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />

      <Textarea
        label={EDIT_LABELS.thankYouMessageLabel}
        placeholder={EDIT_LABELS.thankYouMessagePlaceholder}
        helper={EDIT_LABELS.thankYouMessageHelper}
        value={thankYouMessage}
        onChange={(e) => setThankYouMessage(e.target.value)}
        maxLength={500}
      />

      <Input
        label={EDIT_LABELS.suggestedAmountsLabel}
        helper={EDIT_LABELS.suggestedAmountsHelper}
        value={suggestedAmounts}
        onChange={(e) => setSuggestedAmounts(e.target.value)}
        placeholder="2000, 5000, 10000"
      />

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-gray-50/60 p-4">
        <Toggle
          label={EDIT_LABELS.hideAmount}
          description={EDIT_LABELS.hideAmountDescription}
          checked={hideAmount}
          onChange={setHideAmount}
        />
        <Toggle
          label={EDIT_LABELS.hideDonors}
          description={EDIT_LABELS.hideDonorsDescription}
          checked={hideDonors}
          onChange={setHideDonors}
        />
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          disabled={saving}
        >
          {saving ? EDIT_LABELS.saving : EDIT_LABELS.save}
        </Button>
      </div>
    </form>
  );
}
