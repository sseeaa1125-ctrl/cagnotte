"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Avatar, FileUploadButton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { PhonePreview } from "@/components/dashboard/PhonePreview";
import { revalidateStore } from "@/app/actions";
import { ArrowLeft, X } from "lucide-react";
import DOMPurify from "dompurify";
import { SOCIAL_NETWORKS, PRIMARY_SOCIAL_KEYS, extractHandle, buildUrl } from "@/lib/socialLinks";
import type { SocialNetwork } from "@/lib/socialLinks";

export default function ProfileEditPage() {
  const router = useRouter();
  const { seller, refreshSeller } = useAuth();
  const { toast } = useToast();

  // Profile edit fields
  const [editName, setEditName] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [editCoverUrl, setEditCoverUrl] = useState<string | null>(null);
  const [editShowAvatar, setEditShowAvatar] = useState(true);
  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>({});
  const [showMoreSocials, setShowMoreSocials] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch blocks for the preview
  const [blocks, setBlocks] = useState<{ id: string; type: string; title: string; isActive: boolean; config: Record<string, unknown>; product: { title: string; price: number; coverUrl?: string | null; buttonText?: string | null; ctaStyle?: string } | null; bookingService: { title: string; price: number; description?: string | null; duration?: number; location?: string | null; coverUrl?: string | null; buttonText?: string | null; ctaStyle?: string } | null; community?: { title: string; description?: string | null; coverUrl?: string | null; priceAmount: number; memberCount: number } | null }[]>([]);
  const fetchBlocks = useCallback(async () => {
    try {
      const res = await api<{ blocks: typeof blocks }>("/api/blocks");
      setBlocks(res.blocks);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  // Init from seller data
  useEffect(() => {
    if (!seller) return;
    setEditName(seller.displayName);
    setEditSubtitle((seller as unknown as Record<string, string>).subtitle || "");
    setEditBio(seller.bio || "");
    setEditAvatarUrl(seller.avatarUrl || null);
    setEditCoverUrl(seller.coverUrl || null);
    setEditShowAvatar(seller.showAvatar !== false);
    const links: Record<string, string> = {};
    for (const net of SOCIAL_NETWORKS) {
      const raw = ((seller as unknown) as Record<string, string>)?.[net.key] || "";
      links[net.key] = extractHandle(net, raw);
    }
    setEditSocialLinks(links);
  }, [seller]);

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = { displayName: editName, subtitle: editSubtitle || null, bio: editBio };
      if (editAvatarUrl !== (seller?.avatarUrl || null)) {
        body.avatarUrl = editAvatarUrl;
      }
      if (editCoverUrl !== (seller?.coverUrl || null)) {
        body.coverUrl = editCoverUrl;
      }
      body.showAvatar = editShowAvatar;
      for (const net of SOCIAL_NETWORKS) {
        const val = editSocialLinks[net.key]?.trim();
        body[net.key] = val ? buildUrl(net, val) : null;
      }
      await api("/api/sellers/profile", { method: "PUT", body });
      refreshSeller();
      if (seller?.slug) revalidateStore(seller.slug);
      toast("Profil mis à jour !");
      router.push("/dashboard/blocks");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  if (!seller) return null;

  // Build social links for preview from edit state
  const previewSocialLinks: Record<string, string | null> = {};
  for (const net of SOCIAL_NETWORKS) {
    const val = editSocialLinks[net.key]?.trim();
    previewSocialLinks[net.key] = val ? buildUrl(net, val) : null;
  }

  return (
    <div>
      {/* Breadcrumb header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/dashboard/blocks")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => router.push("/dashboard/blocks")}
            className="font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            Mon Store
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900">En-tête</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 pb-24 lg:pb-0">
        {/* Left: Form */}
        <div className="min-w-0 flex-1 max-w-lg">
          <div className="space-y-6">
            {/* Avatar upload — centered */}
            <div className="flex items-center gap-4">
              <Avatar src={editAvatarUrl} alt={editName} size="lg" />
              <FileUploadButton
                label="Photo de profil"
                accept="image/*"
                maxSizeMB={2}
                variant="image"
                currentUrl={editAvatarUrl}
                onUpload={(url) => setEditAvatarUrl(url || null)}
                className="flex-1"
              />
            </div>

            {/* Cover image */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Photo de couverture
              </label>
              {editCoverUrl ? (
                <div className="relative overflow-hidden rounded-xl">
                  <div
                    className="h-28 w-full bg-cover bg-center rounded-xl"
                    style={{ backgroundImage: `url(${editCoverUrl})` }}
                  />
                  <button
                    onClick={() => setEditCoverUrl(null)}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
                    aria-label="Supprimer la couverture"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <FileUploadButton
                  label="Ajouter une couverture"
                  accept="image/*"
                  maxSizeMB={3}
                  variant="image"
                  currentUrl={null}
                  onUpload={(url) => setEditCoverUrl(url || null)}
                  className="w-full"
                />
              )}
            </div>

            {/* Toggle show avatar */}
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
              <span className="text-sm font-medium text-gray-700">Afficher la photo de profil</span>
              <div
                role="switch"
                aria-checked={editShowAvatar}
                onClick={() => setEditShowAvatar(!editShowAvatar)}
                className={`relative h-6 w-11 rounded-full transition-colors ${editShowAvatar ? "bg-teal-600" : "bg-gray-300"}`}
              >
                <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editShowAvatar ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </label>

            {/* Display name */}
            <Input
              label="Nom affiché"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            {/* Subtitle */}
            <div>
              <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
                Sous-titre
                <span className="text-xs text-gray-400">{editSubtitle.length}/80</span>
              </label>
              <input
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
                maxLength={80}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                placeholder="Ex: Coach Business · Auteur · Formateur"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
                Bio
                <span className="text-xs text-gray-400">{editBio.length}/160</span>
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                maxLength={160}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                placeholder="Décris-toi en quelques mots..."
              />
            </div>

            {/* Social links */}
            <div>
              <h3 className="mb-3 text-sm font-bold text-gray-900">Liens sociaux (URL)</h3>
              <div className="space-y-2.5">
                {SOCIAL_NETWORKS.filter((n) => PRIMARY_SOCIAL_KEYS.includes(n.key)).map((net) => (
                  <SocialInput
                    key={net.key}
                    network={net}
                    value={editSocialLinks[net.key] || ""}
                    onChange={(v) => setEditSocialLinks((p) => ({ ...p, [net.key]: v }))}
                  />
                ))}

                {showMoreSocials && SOCIAL_NETWORKS.filter((n) => !PRIMARY_SOCIAL_KEYS.includes(n.key)).map((net) => (
                  <SocialInput
                    key={net.key}
                    network={net}
                    value={editSocialLinks[net.key] || ""}
                    onChange={(v) => setEditSocialLinks((p) => ({ ...p, [net.key]: v }))}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setShowMoreSocials(!showMoreSocials)}
                  className="text-sm font-semibold text-teal-600 hover:text-teal-700 uppercase tracking-wider"
                >
                  {showMoreSocials ? "Moins de réseaux" : "+ Plus de réseaux"}
                </button>
              </div>
            </div>

            {/* Save button (desktop only — mobile uses the sticky bar below) */}
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div className="hidden lg:block">
              <Button
                size="lg"
                className="w-full"
                onClick={handleSave}
                loading={saving}
                disabled={!editName}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile sticky save bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [transform:translate3d(0,0,0)]">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSave}
            loading={saving}
            disabled={!editName}
          >
            Enregistrer
          </Button>
        </div>

        {/* Right: Phone preview (desktop only) */}
        <PhonePreview
          displayName={editName || seller.displayName}
          subtitle={editSubtitle || null}
          slug={seller.slug}
          avatarUrl={editShowAvatar ? editAvatarUrl : null}
          coverUrl={editCoverUrl}
          bio={editBio || null}
          blocks={blocks}
          themeConfig={{
            themeId: seller.themeId || "default",
            themeFont: seller.themeFont || "inter",
            themeColors: seller.themeColors || null,
          }}
          headerLayout={seller.headerLayout || "centered"}
          imageStyle={seller.imageStyle || null}
          showAvatar={editShowAvatar}
          bgImageUrl={seller.bgImageUrl || null}
          socialLinks={previewSocialLinks as Record<string, string | null> & {
            instagramUrl?: string | null;
            tiktokUrl?: string | null;
            youtubeUrl?: string | null;
            facebookUrl?: string | null;
            whatsappNumber?: string | null;
            twitterUrl?: string | null;
            telegramUrl?: string | null;
            snapchatUrl?: string | null;
            websiteUrl?: string | null;
          }}
        />
      </div>
    </div>
  );
}

// ── Social link input with brand icon + smart prefix ──
function SocialInput({
  network,
  value,
  onChange,
}: {
  network: SocialNetwork;
  value: string;
  onChange: (value: string) => void;
}) {
  const prefix = network.inputType === "handle" ? "@" : network.inputType === "url" ? "URL" : "";

  function handleChange(raw: string) {
    if (network.inputType === "handle") {
      let cleaned = raw;
      if (cleaned.startsWith("@")) cleaned = cleaned.slice(1);
      if (cleaned.includes("://")) {
        const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?[^/]+\/(@?[\w.-]+)\/?$/);
        if (match) cleaned = match[1].replace(/^@/, "");
      }
      onChange(cleaned);
    } else if (network.inputType === "phone") {
      onChange(raw.replace(/[^0-9+\s()-]/g, ""));
    } else {
      onChange(raw);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ color: network.color }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(network.iconSvg.replace(/<svg /, `<svg width="20" height="20" `), { USE_PROFILES: { svg: true } }) }}
      />
      <div className="relative flex h-10 flex-1 items-center overflow-hidden rounded-xl border border-gray-300 bg-white focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600">
        {prefix && (
          <span className="flex h-full shrink-0 items-center border-r border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-500">
            {prefix}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={network.placeholder}
          aria-label={network.label}
          className="h-full w-full bg-transparent px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
