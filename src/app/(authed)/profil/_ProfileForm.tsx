"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Lock } from "lucide-react";
import { Avatar, Button, Input, useToast } from "@/components/ui";
import { api, ApiError, BACKEND_URL } from "@/lib/api";
import { PROFILE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — /profil client island.
//
// Uses the D-09 firstName/lastName split UX but merges into a single
// displayName on PUT. Avatar upload via multipart POST /api/upload then
// PUT /api/sellers/profile { avatarUrl }. Toast on success/error.
//
// NO birthDate (D-25). NO city.
// ─────────────────────────────────────────────────────────────────────────

interface ProfileFormInitial {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
}

function splitDisplayName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  const [first, ...rest] = parts;
  return { firstName: first ?? "", lastName: rest.join(" ") };
}

function readCsrfToken(): string {
  if (typeof window === "undefined") return "";
  const fromStorage = localStorage.getItem("izy-csrf");
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|;\s*)izy-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function ProfileForm({ initial }: { initial: ProfileFormInitial }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const initialSplit = splitDisplayName(initial.displayName);
  const [firstName, setFirstName] = React.useState(initialSplit.firstName);
  const [lastName, setLastName] = React.useState(initialSplit.lastName);
  const [phone, setPhone] = React.useState(initial.phone ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(
    initial.avatarUrl,
  );
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const csrf = readCsrfToken();
      // Direct backend URL for multipart — same pattern as _uploadCover.
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: csrf ? { "x-csrf-token": csrf } : undefined,
      });
      if (!res.ok) throw new Error("upload-failed");
      const data = (await res.json()) as { url: string };
      // Persist on the seller record
      await api("/api/sellers/profile", {
        method: "PUT",
        body: { avatarUrl: data.url },
      });
      setAvatarUrl(data.url);
      toast(PROFILE_LABELS.saved, "success");
      router.refresh();
    } catch (err) {
      console.error("[profile] avatar upload failed", err);
      toast(PROFILE_LABELS.errorAvatar, "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const merged = `${firstName.trim()} ${lastName.trim()}`.trim();
      await api("/api/sellers/profile", {
        method: "PUT",
        body: {
          displayName: merged,
          phone: phone.trim() ? phone.trim() : null,
        },
      });
      toast(PROFILE_LABELS.saved, "success");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : PROFILE_LABELS.errorGeneric;
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Avatar edit row */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar
            name={`${firstName} ${lastName}`.trim() || "?"}
            src={avatarUrl}
            size="xl"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              "disabled:opacity-50",
            )}
            aria-label="Modifier la photo"
          >
            <Camera size={16} aria-hidden />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarUpload}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {PROFILE_LABELS.avatarHint}
        </p>
      </div>

      {/* Name grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label={PROFILE_LABELS.firstName}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          maxLength={50}
          autoComplete="given-name"
        />
        <Input
          label={PROFILE_LABELS.lastName}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          maxLength={50}
          autoComplete="family-name"
        />
      </div>

      {/* Email (readonly) */}
      <Input
        label={PROFILE_LABELS.email}
        value={initial.email}
        disabled
        readOnly
        helper={PROFILE_LABELS.emailHelper}
        icon={<Lock size={16} aria-hidden />}
        autoComplete="email"
      />

      {/* Phone with +221 prefix badge */}
      <div className="flex w-full flex-col gap-1.5">
        <label
          htmlFor="profile-phone"
          className="text-sm font-medium text-primary"
        >
          {PROFILE_LABELS.phone}
        </label>
        <div className="flex items-center gap-2">
          <span className="flex h-12 items-center rounded-lg border border-border bg-muted px-3 text-sm font-medium text-primary">
            +221
          </span>
          <input
            id="profile-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={9}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder={PROFILE_LABELS.phonePlaceholder}
            className={cn(
              "min-h-12 flex-1 rounded-lg border border-border bg-background px-4 py-3 text-base text-primary placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" variant="primary" size="lg" loading={saving}>
          {saving ? PROFILE_LABELS.saving : PROFILE_LABELS.save}
        </Button>
      </div>
    </form>
  );
}
