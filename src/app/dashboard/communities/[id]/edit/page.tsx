"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Users, AlertCircle } from "lucide-react";
import { Button, Input, Spinner, FileUploadButton } from "@/components/ui";
import { LeadFieldEditor } from "@/components/dashboard/LeadFieldEditor";
import { CommunityPreview } from "@/components/dashboard/CommunityPreview";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { revalidateStore } from "@/app/actions";
import type { LeadField } from "@/types";

interface CommunityData {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  priceAmount: number;
  billingPeriod: string;
  subscribeFields: LeadField[] | null;
  isActive: boolean;
  memberCount: number;
  telegramChatTitle: string | null;
  telegramBot?: { botUsername: string };
  activeMembers?: number;
}

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: "par semaine",
  BIWEEKLY: "par 15 jours",
  MONTHLY: "par mois",
  QUARTERLY: "par trimestre",
  YEARLY: "par an",
};

export default function EditCommunityPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params.id as string;
  const { toast } = useToast();
  const { seller } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [price, setPrice] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("MONTHLY");
  const [subscribeFields, setSubscribeFields] = useState<LeadField[]>([]);
  const [isActive, setIsActive] = useState(true);

  const themeConfig = seller ? { themeId: seller.themeId, themeFont: seller.themeFont, themeColors: seller.themeColors } : undefined;

  const fetchCommunity = useCallback(async () => {
    try {
      const res = await api<{ community: CommunityData }>(`/api/communities/${communityId}`);
      const c = res.community;
      setCommunity(c);
      setTitle(c.title);
      setDescription(c.description || "");
      setCoverUrl(c.coverUrl || "");
      setPrice(String(c.priceAmount));
      setBillingPeriod(c.billingPeriod || "MONTHLY");
      setSubscribeFields(c.subscribeFields || []);
      setIsActive(c.isActive);
    } catch {
      setError("Impossible de charger la communauté");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  async function handleSave() {
    if (!title.trim()) { setError("Le titre est obligatoire"); return; }
    const priceNum = parseInt(price);
    if (!price || isNaN(priceNum) || priceNum < 500) {
      setError("Le prix doit être d'au moins 500 FCFA");
      return;
    }
    setError("");
    setSaving(true);

    try {
      await api(`/api/communities/${communityId}`, {
        method: "PATCH",
        body: {
          title: title.trim(),
          description: description.trim() || null,
          coverUrl: coverUrl.trim() || null,
          priceAmount: priceNum,
          billingPeriod,
          subscribeFields: subscribeFields.length > 0 ? subscribeFields : null,
          isActive,
        },
      });
      if (seller?.slug) revalidateStore(seller.slug);
      toast("Communauté mise à jour !");
      router.push("/dashboard/blocks");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur réseau";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-gray-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-gray-100 h-16" />
            ))}
          </div>
          <div className="hidden lg:block w-[360px] shrink-0">
            <div className="animate-pulse rounded-2xl bg-gray-100 h-[400px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">{error || "Communauté introuvable"}</p>
        <button
          onClick={() => router.push("/dashboard/communities")}
          className="mt-4 text-sm font-medium text-teal-600 hover:underline"
        >
          Retour aux communautés
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <button
        onClick={() => router.push("/dashboard/communities")}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ChevronLeft size={16} />
        Communautés
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
          <Users size={20} className="text-teal-600" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-gray-900">
            Modifier — {community.title}
          </h1>
          <p className="text-xs text-gray-500">Communauté Telegram payante</p>
        </div>
      </div>

      {/* Split layout: form left + preview right */}
      <div className="flex flex-col lg:flex-row gap-8 items-start pb-32 lg:pb-0 relative">
        {/* Form column */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          {/* Telegram info */}
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
              <Users size={20} className="text-teal-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {community.telegramChatTitle || "Groupe / Canal Telegram"}
              </p>
              <p className="text-xs text-gray-400">
                {community.telegramBot?.botUsername && `@${community.telegramBot.botUsername} · `}
                {community.activeMembers ?? community.memberCount} membre{(community.activeMembers ?? community.memberCount) !== 1 ? "s" : ""} actif{(community.activeMembers ?? community.memberCount) !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-teal-100 text-teal-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {isActive ? "Actif" : "Inactif"}
            </button>
          </div>

          {/* Cover image */}
          <FileUploadButton
            label="Image de couverture"
            accept="image/*"
            variant="image"
            maxSizeMB={5}
            onUpload={(url) => setCoverUrl(url)}
            currentUrl={coverUrl || null}
          />

          {/* Title */}
          <Input
            label="Titre affiché sur ta page"
            placeholder="Communauté VIP Fitness"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(""); }}
          />

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description (courte)
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-teal-600"
              rows={2}
              placeholder="Coaching quotidien + motivation"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Billing period */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Durée de l&apos;abonnement
            </label>
            <select
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-teal-600"
            >
              <option value="WEEKLY">1 semaine</option>
              <option value="BIWEEKLY">15 jours</option>
              <option value="MONTHLY">1 mois</option>
              <option value="QUARTERLY">3 mois</option>
              <option value="YEARLY">1 an</option>
            </select>
          </div>

          {/* Price */}
          <Input
            label={`Prix ${PERIOD_LABELS[billingPeriod] || "par mois"} (FCFA)`}
            type="number"
            placeholder="5000"
            value={price}
            onChange={(e) => { setPrice(e.target.value); setError(""); }}
            inputMode="numeric"
          />

          {/* Subscribe fields */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Champs du formulaire d&apos;inscription
            </label>
            <LeadFieldEditor
              fields={subscribeFields}
              onChange={setSubscribeFields}
              defaultFields={[
                { id: "f-name", type: "name", label: "Nom", placeholder: "Ton nom", required: true },
                { id: "f-phone", type: "phone", label: "Téléphone", placeholder: "+221 77 000 00 00", required: true },
              ]}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Desktop save actions */}
          <div className="hidden lg:flex gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/dashboard/communities")}
            >
              Annuler
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Spinner size="sm" /> : "Enregistrer"}
            </Button>
          </div>
        </div>

        {/* Desktop preview panel */}
        <div className="hidden lg:block w-[360px] shrink-0 sticky top-[calc(64px+1.5rem)] max-h-[calc(100vh-64px-3rem)] overflow-y-auto pb-6 scrollbar-hide">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 shadow-sm overflow-hidden p-2.5">
            <CommunityPreview
              title={title}
              description={description}
              coverUrl={coverUrl}
              priceAmount={parseInt(price) || 0}
              billingPeriod={billingPeriod}
              subscribeFields={subscribeFields}
              themeConfig={themeConfig}
              imageStyle={seller?.imageStyle}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [transform:translate3d(0,0,0)]">
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/dashboard/communities")}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? <Spinner size="sm" /> : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
