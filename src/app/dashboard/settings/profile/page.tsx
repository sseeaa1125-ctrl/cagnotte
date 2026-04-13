"use client";

import { useEffect, useState } from "react";
import { Button, Input, SettingsSkeleton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { revalidateStore } from "@/app/actions";
import { SettingsSubPage, SellerProfile } from "../_shared";

export default function ProfileSettingsPage() {
  const { toast } = useToast();
  const { refreshSeller } = useAuth();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    api<{ seller: SellerProfile }>("/api/auth/me")
      .then((res) => {
        setSeller(res.seller);
        setDisplayName(res.seller.displayName);
        setSlug(res.seller.slug);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSaving(true);

    try {
      const oldSlug = seller?.slug;
      await api("/api/sellers/profile", {
        method: "PUT",
        body: { displayName, slug },
      });
      refreshSeller();
      if (oldSlug) revalidateStore(oldSlug);
      if (slug && slug !== oldSlug) revalidateStore(slug);
      toast("Profil mis à jour !");
    } catch (err) {
      if (err instanceof ApiError) setProfileError(err.message);
      else setProfileError("Erreur réseau");
    } finally {
      setProfileSaving(false);
    }
  }

  if (loading) return <SettingsSkeleton />;

  return (
    <SettingsSubPage title="Profil">
      <form onSubmit={handleSaveProfile} className="space-y-4">
        <Input
          label="Nom affiché"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <Input
          label="Nom de page"
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
          }
          required
        />
        {slug && (
          <p className="-mt-2 text-xs text-gray-400">
            Ta page : <span className="font-semibold text-teal-600">izy.store/{slug}</span>
          </p>
        )}

        <Input label="Email" value={seller?.email || ""} disabled />

        <Input
          label="Plan"
          value={seller?.plan === "PRO" ? "Pro" : "Gratuit"}
          disabled
        />

        {profileError && <p className="text-sm text-red-600">{profileError}</p>}

        <Button type="submit" loading={profileSaving}>
          Mettre à jour
        </Button>
      </form>
    </SettingsSubPage>
  );
}
