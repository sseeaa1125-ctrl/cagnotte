"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import type { TabProps } from "./types";
import { SectionHeader, FormField, CtaStyleSelector } from "./FormHelpers";

export function ThumbnailTab({ productType, form, set }: TabProps) {
  // Auto-fetch OG image for LINK blocks when URL changes
  const [ogLoading, setOgLoading] = useState(false);
  const [manualCover, setManualCover] = useState(false);
  const ogAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (productType.type !== "LINK") return;
    if (manualCover) return;
    if (!form.url || !form.url.startsWith("http")) return;

    const timer = setTimeout(async () => {
      ogAbortRef.current?.abort();
      const controller = new AbortController();
      ogAbortRef.current = controller;
      setOgLoading(true);
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(form.url)}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok || controller.signal.aborted) return;
        const data = await res.json() as { ogImage: string | null; ogTitle: string | null };
        if (controller.signal.aborted) return;
        if (data.ogImage && !manualCover) {
          set("coverUrl", data.ogImage);
        }
        if (data.ogTitle && !form.title.trim()) {
          set("title", data.ogTitle);
        }
      } catch {
        // Ignore — network error or abort
      } finally {
        if (!controller.signal.aborted) setOgLoading(false);
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      ogAbortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, productType.type, manualCover]);

  let step = 1;

  // ── LINK: style + image + titre + URL ──
  if (productType.type === "LINK") {
    return (
      <div className="space-y-5">
        <CtaStyleSelector form={form} set={set} step={step++} />

        <div>
          <SectionHeader n={step++} label="Image (optionnel)" />
          <FileUploadButton
            label="Ajouter une image"
            accept="image/*"
            maxSizeMB={3}
            variant="image"
            currentUrl={form.coverUrl || null}
            onUpload={(url) => {
              setManualCover(!!url);
              set("coverUrl", url);
            }}
          />
          {ogLoading && (
            <p className="mt-1 text-xs text-gray-400">Récupération de l&apos;image du site...</p>
          )}
        </div>

        <SectionHeader n={step++} label="Textes" />
        <div className="space-y-3">
          <FormField label="Titre" value={form.title} max={50} onChange={(v) => set("title", v)} placeholder="Ex : Mon Instagram" />
          <Input
            label="URL de destination"
            type="url"
            value={form.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="https://..."
            required
          />
        </div>
      </div>
    );
  }

  // ── PAYMENT: style + image + titre + description ──
  if (productType.type === "PAYMENT") {
    return (
      <div className="space-y-5">
        <CtaStyleSelector form={form} set={set} step={step++} />

        <div>
          <SectionHeader n={step++} label="Image de couverture" />
          <FileUploadButton
            label="Ajouter une image"
            accept="image/*"
            maxSizeMB={3}
            variant="image"
            currentUrl={form.coverUrl || null}
            onUpload={(url) => set("coverUrl", url)}
          />
        </div>

        <SectionHeader n={step++} label="Textes" />
        <div className="space-y-3">
          <FormField label="Titre" value={form.title} max={50} onChange={(v) => set("title", v)} placeholder="Ex : Paiement consultation" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Décris ce à quoi servira le paiement : prestation, facture, service..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
          <FormField label="Texte du bouton" value={form.buttonText} max={30} onChange={(v) => set("buttonText", v)} placeholder={productType.defaultButtonText} />
        </div>
      </div>
    );
  }

  // ── DONATION: style + image + titre + description + message de remerciement ──
  if (productType.type === "DONATION") {
    return (
      <div className="space-y-5">
        <CtaStyleSelector form={form} set={set} step={step++} />

        <div>
          <SectionHeader n={step++} label="Image de couverture" />
          <FileUploadButton
            label="Ajouter une image"
            accept="image/*"
            maxSizeMB={3}
            variant="image"
            currentUrl={form.coverUrl || null}
            onUpload={(url) => set("coverUrl", url)}
          />
        </div>

        <SectionHeader n={step++} label="Textes" />
        <div className="space-y-3">
          <FormField label="Titre" value={form.title} max={50} onChange={(v) => set("title", v)} placeholder="Ex : Soutiens mon travail" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Explique pourquoi tu as besoin de soutien, à quoi serviront les dons..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
          <FormField label="Texte du bouton" value={form.buttonText} max={30} onChange={(v) => set("buttonText", v)} placeholder={productType.defaultButtonText} />
        </div>
      </div>
    );
  }

  // ── BOOKING: style + image + titre + bouton ──
  if (productType.type === "BOOKING") {
    return (
      <div className="space-y-5">
        <CtaStyleSelector form={form} set={set} step={step++} />

        <div>
          <SectionHeader n={step++} label="Image de couverture" />
          <FileUploadButton
            label="Ajouter une image"
            accept="image/*"
            maxSizeMB={3}
            variant="image"
            currentUrl={form.coverUrl || null}
            onUpload={(url) => set("coverUrl", url)}
          />
        </div>

        <SectionHeader n={step++} label="Textes" />
        <div className="space-y-3">
          <FormField label="Titre" value={form.title} max={50} onChange={(v) => set("title", v)} placeholder="Ex : Séance de coaching 1h" />
          <FormField label="Texte du bouton" value={form.buttonText} max={30} onChange={(v) => set("buttonText", v)} placeholder={productType.defaultButtonText} />
        </div>
      </div>
    );
  }

  // ── PARTNERSHIP: style + image + description + bouton ──
  if (productType.type === "PARTNERSHIP") {
    return (
      <div className="space-y-5">
        <CtaStyleSelector form={form} set={set} step={step++} />

        <div>
          <SectionHeader n={step++} label="Image de couverture" />
          <FileUploadButton
            label="Ajouter une image"
            accept="image/*"
            maxSizeMB={3}
            variant="image"
            currentUrl={form.coverUrl || null}
            onUpload={(url) => set("coverUrl", url)}
          />
        </div>

        <div>
          <SectionHeader n={step++} label="Textes" />
          <div className="space-y-3">
            <FormField label="Titre" value={form.title} max={50} onChange={(v) => set("title", v)} placeholder="Ex : Collaborons ensemble" />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Décris les types de partenariats recherchés..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
            <FormField label="Texte du bouton" value={form.buttonText} max={30} onChange={(v) => set("buttonText", v)} placeholder={productType.defaultButtonText} />
          </div>
        </div>
      </div>
    );
  }

  // ── WAITING_LIST thumbnail: style + image + textes ──
  if (productType.type === "WAITING_LIST") {
    return (
      <div className="space-y-5">
        <CtaStyleSelector form={form} set={set} step={step++} />

        <div>
          <SectionHeader n={step++} label="Image de couverture" />
          <FileUploadButton
            label="Ajouter une image"
            accept="image/*"
            maxSizeMB={3}
            variant="image"
            currentUrl={form.coverUrl || null}
            onUpload={(url) => set("coverUrl", url)}
          />
        </div>

        <div>
          <SectionHeader n={step++} label="Textes" />
          <div className="space-y-3">
            <FormField label="Titre" value={form.title} max={50} onChange={(v) => set("title", v)} placeholder="Ex : Liste d'attente — Nouveau produit" />
            <FormField label="Sous-titre" value={form.subtitle} max={100} onChange={(v) => set("subtitle", v)} placeholder="Description courte sous le titre" />
            <FormField label="Texte du bouton" value={form.buttonText} max={30} onChange={(v) => set("buttonText", v)} placeholder={productType.defaultButtonText} />
          </div>
        </div>
      </div>
    );
  }

  // ── SALE / LEAD_MAGNET: style + image + textes ──
  return (
    <div className="space-y-5">
      <CtaStyleSelector form={form} set={set} step={step++} />

      <div>
        <SectionHeader n={step++} label="Image de couverture" />
        <FileUploadButton
          label="Ajouter une image"
          accept="image/*"
          maxSizeMB={3}
          variant="image"
          currentUrl={form.coverUrl || null}
          onUpload={(url) => set("coverUrl", url)}
        />
      </div>

      <div>
        <SectionHeader n={step++} label="Textes" />
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <FormField label="Titre" value={form.title} max={50} onChange={(v) => set("title", v)} placeholder={productType.type === "LEAD_MAGNET" ? "Ex : Guide gratuit SEO" : "Ex : Mon guide PDF"} />
            </div>
            <div className="flex-1">
              <FormField label="Sous-titre" value={form.subtitle} max={100} onChange={(v) => set("subtitle", v)} placeholder="Description courte sous le titre" />
            </div>
          </div>
          <FormField label="Texte du bouton" value={form.buttonText} max={30} onChange={(v) => set("buttonText", v)} placeholder={productType.defaultButtonText} />
        </div>
      </div>
    </div>
  );
}
