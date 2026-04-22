"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Eye, Lock } from "lucide-react";
import {
  Button,
  Calendar,
  GalleryBuilder,
  type GalleryItem,
  Input,
  RichTextEditor,
  Textarea,
  Toggle,
  VisibilityCard,
  useToast,
} from "@/components/ui";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { BACKEND_URL } from "@/lib/api";
import { EDIT_LABELS, WIZARD_FIELDS } from "@/lib/constants";
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

// NOTE : le cookie CSRF admin est `izy-admin-csrf` (distinct de `izy-csrf`
// des sellers). L'upload multipart ne passe pas par adminApi() qui est
// orienté JSON — on lit le token admin directement.
function readAdminCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("izy-admin-csrf");
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|;\s*)izy-admin-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function uploadCover(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const csrf = readAdminCsrfToken();
  // Admin endpoint — requireAdmin, pas requireAuth seller.
  // Backend : backend/src/routes/admin/upload.ts.
  const res = await fetch(`${BACKEND_URL}/api/admin/upload`, {
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

// Max 3 — keeps the editor in sync with the public participer form which
// only renders 3 preset pills. If you raise this, also bump
// ParticiperForm's `PRESETS = suggestedAmounts.slice(0, 3)`.
const MAX_SUGGESTED_AMOUNTS = 3;

function parseSuggestedAmounts(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n >= 500)
    .slice(0, MAX_SUGGESTED_AMOUNTS);
}

function formatSuggestedAmounts(arr: unknown): string {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((n) => (typeof n === "number" ? String(n) : ""))
    .filter(Boolean)
    .join(", ");
}

function toDateValue(iso: unknown): Date | null {
  if (typeof iso !== "string" || !iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function AdminEditForm({ initial }: { initial: EditFormInitial }) {
  const router = useRouter();
  const { toast } = useToast();

  // Slug-safe destructure — rename ignored var to match the
  // underscore-prefixed lint convention.
  // Defensive (?? {}) : si le backend renvoie config:null / undefined
  // (ancienne build déployée, bug API, etc.), on ne crash pas — on part
  // d'un objet vide et le form affiche les placeholders.
  const rawConfig = (initial.config ?? {}) as Record<string, unknown> & {
    slug?: unknown;
  };
  const { slug: _ignoredSlug, ...safeConfig } = rawConfig;
  // Reference the ignored var so TS/lint don't strip or warn.
  void _ignoredSlug;

  const [title, setTitle] = React.useState<string>(initial.title);
  const [description, setDescription] = React.useState<string>(
    typeof safeConfig.description === "string" ? safeConfig.description : "",
  );
  const [coverUrl, setCoverUrl] = React.useState<string | null>(
    typeof safeConfig.coverUrl === "string" ? safeConfig.coverUrl : null,
  );
  const [gallery, setGallery] = React.useState<GalleryItem[]>(
    Array.isArray(safeConfig.gallery)
      ? (safeConfig.gallery as GalleryItem[])
      : [],
  );
  const [goalAmount, setGoalAmount] = React.useState<string>(
    typeof safeConfig.goalAmount === "number"
      ? String(safeConfig.goalAmount)
      : "",
  );
  const [endDate, setEndDate] = React.useState<Date | null>(
    toDateValue(safeConfig.endDate),
  );
  const [visibility, setVisibility] = React.useState<"public" | "private">(
    safeConfig.visibility === "private" ? "private" : "public",
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
  // NOTE (audit-038 §3.2) : l'ancien toggle "Statut actif/clôturée" écrivait
  // dans `config.status` qui est un label cosmétique sans effet sur la
  // visibilité publique. La VRAIE activation se fait via
  // `PATCH /api/admin/cagnottes/:id/toggle-active` depuis la page détail.
  // Toggle retiré pour éviter la confusion UX.
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
    // occasion, cause, beneficiary, showDonorCount, minAmount, checkoutFields,
    // status, etc.) avec les champs éditables. `status` n'est pas édité ici
    // (cf. audit-038 §3.2) — la valeur existante est préservée via safeConfig.
    const trimmedThankYou = thankYouMessage.trim();
    const nextConfig: Record<string, unknown> = {
      ...safeConfig,
      description: description.trim() || undefined,
      coverUrl: coverUrl ?? null,
      gallery,
      goalAmount: parsedGoal,
      endDate: endDate ? endDate.toISOString() : null,
      visibility,
      thankYouMessage: trimmedThankYou.length > 0 ? trimmedThankYou : null,
      suggestedAmounts: parseSuggestedAmounts(suggestedAmounts),
      hideAmount,
      hideDonors,
    };

    // Defensive: ne jamais ship un `slug` — Block.slug @unique est géré
    // séparément par le backend.
    if ("slug" in nextConfig) {
      delete (nextConfig as { slug?: unknown }).slug;
    }

    setSaving(true);
    try {
      // Admin endpoint : PATCH /api/admin/cagnottes/:id (requireRole SUPER_ADMIN).
      // Voir audit-037 — payload partiel {title, config} merged + re-validé
      // avec fundraiserBlockConfigSchema backend-side.
      await adminApi(`/api/admin/cagnottes/${initial.id}`, {
        method: "PATCH",
        body: {
          title: title.trim(),
          config: nextConfig,
        },
      });
      toast(EDIT_LABELS.saved, "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : EDIT_LABELS.errorGeneric;
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
      {/* Note admin (audit-038 §3.2) : pour désactiver / réactiver une cagnotte,
          utiliser le bouton dédié sur la page détail `/admin/cagnottes/:id`
          qui appelle PATCH /toggle-active (modifie Block.isActive).
          L'ancien toggle `config.status` ne pilotait rien de public. */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-900/80">
        Pour activer / désactiver cette cagnotte (la retirer de la page
        publique), utilisez le bouton dédié sur la page de détail admin.
        Ce formulaire édite uniquement le contenu (texte, images, objectifs…).
      </div>

      {/* Médias — grouped section so creators immediately see where to
          edit cover + gallery (previous version had two small unlabeled
          inputs that users missed). */}
      <fieldset className="flex flex-col gap-5 rounded-2xl border-2 border-pink/60 bg-pink/10 p-5 md:p-6">
        <legend className="px-2 font-headings text-base font-black text-primary">
          Médias de la cagnotte
        </legend>

        {/* Cover */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <label className="font-headings text-sm font-bold text-primary">
              {EDIT_LABELS.coverLabel}
            </label>
            <span className="text-xs font-medium text-primary/60">
              Affichée en grand
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {coverUrl ? (
              <div className="relative h-40 w-full flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:h-32 sm:w-52">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt="Couverture"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-40 w-full flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-white text-sm text-muted-foreground sm:h-32 sm:w-52">
                Aucune photo
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  "disabled:opacity-50",
                )}
              >
                <Camera size={16} aria-hidden />
                {uploading
                  ? "Envoi…"
                  : coverUrl
                    ? "Changer la couverture"
                    : "Ajouter une couverture"}
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

        {/* Gallery — secondary images + video links */}
        <div className="flex flex-col gap-3 border-t border-pink/60 pt-5">
          <div className="flex items-baseline justify-between gap-2">
            <label className="font-headings text-sm font-bold text-primary">
              Galerie (photos & vidéos)
            </label>
            <span className="text-xs font-medium text-primary/60">
              {gallery.length}/10
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Ajoute jusqu&apos;à 10 photos supplémentaires ou colle des liens
            YouTube, Vimeo, Wistia, Loom. Les visiteurs pourront cliquer sur
            chaque vignette pour la voir en grand.
          </p>
          <GalleryBuilder
            value={gallery}
            onChange={setGallery}
            uploadImage={uploadCover}
          />
        </div>
      </fieldset>

      <Input
        label={EDIT_LABELS.titleLabel}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
      />

      <RichTextEditor
        label={EDIT_LABELS.descriptionLabel}
        value={description}
        onChange={setDescription}
        maxLength={5000}
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

      <Calendar
        label={EDIT_LABELS.endDateLabel}
        helper={EDIT_LABELS.endDateHelper}
        value={endDate}
        onChange={setEndDate}
        minDate={new Date()}
        placeholder="Sélectionnez une date…"
        clearable
      />

      {/* Phase 8 fixpack — visibility toggle (moved from non-editable). */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-bold text-primary">
          {WIZARD_FIELDS.visibilityLabel}
        </legend>
        <VisibilityCard
          value="public"
          checked={visibility === "public"}
          onChange={(v) => setVisibility(v as "public" | "private")}
          icon={<Eye size={18} aria-hidden />}
          title={WIZARD_FIELDS.visibilityPublic}
          description={WIZARD_FIELDS.visibilityPublicHelper}
        />
        <VisibilityCard
          value="private"
          checked={visibility === "private"}
          onChange={(v) => setVisibility(v as "public" | "private")}
          icon={<Lock size={18} aria-hidden />}
          title={WIZARD_FIELDS.visibilityPrivate}
          description={WIZARD_FIELDS.visibilityPrivateHelper}
        />
      </fieldset>

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
