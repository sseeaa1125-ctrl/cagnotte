"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import type { TabProps, CheckoutSection } from "./types";
import { getVideoEmbedUrl, getVideoFormat } from "./types";
import { ReviewsEditor } from "./OptionsTab";

let _sectionIdCounter = 0;
function generateSectionId() {
  return `sec-${Date.now().toString(36)}-${(++_sectionIdCounter).toString(36)}`;
}

function ensureId(section: CheckoutSection): CheckoutSection {
  return section.id ? section : { ...section, id: generateSectionId() };
}

export function LandingTab({ form, set, productType }: TabProps) {
  const sections = form.checkoutSections;
  const [showReviews, setShowReviews] = useState(form.reviews.length > 0);

  // Ensure all sections have stable IDs (idempotent — only patches missing ones)
  const initializedRef = useRef(false);
  if (!initializedRef.current && sections.length > 0) {
    const needsIds = sections.some((s) => !s.id);
    if (needsIds) {
      set("checkoutSections", sections.map(ensureId));
    }
    initializedRef.current = true;
  }

  const hasVideo = sections.some((s) => s.type === "video");
  const hasContent = sections.length > 0 || showReviews;

  const addSection = useCallback((type: CheckoutSection["type"]) => {
    const id = generateSectionId();
    const newSection: CheckoutSection = type === "faq"
      ? { id, type: "faq", title: "", items: [{ question: "", answer: "" }] }
      : type === "features"
      ? { id, type: "features", title: "", items: [{ text: "" }] }
      : type === "video"
      ? { id, type: "video", content: "" }
      : { id, type: "text", title: "", content: "" };
    set("checkoutSections", [...sections, newSection]);
  }, [sections, set]);

  function updateSection(index: number, updates: Partial<CheckoutSection>) {
    const updated = sections.map((s, i) => (i === index ? { ...s, ...updates } : s));
    set("checkoutSections", updated);
  }

  function removeSection(index: number) {
    set("checkoutSections", sections.filter((_, i) => i !== index));
  }

  function moveSection(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    set("checkoutSections", updated);
  }

  function addFaqItem(sectionIndex: number) {
    const section = sections[sectionIndex];
    if (!section || section.type !== "faq") return;
    const items = [...(section.items || []), { question: "", answer: "" }];
    updateSection(sectionIndex, { items });
  }

  function updateFaqItem(sectionIndex: number, itemIndex: number, updates: { question?: string; answer?: string }) {
    const section = sections[sectionIndex];
    if (!section?.items) return;
    const items = section.items.map((item, i) => (i === itemIndex ? { ...item, ...updates } : item));
    updateSection(sectionIndex, { items });
  }

  function removeFaqItem(sectionIndex: number, itemIndex: number) {
    const section = sections[sectionIndex];
    if (!section?.items) return;
    updateSection(sectionIndex, { items: section.items.filter((_, i) => i !== itemIndex) });
  }

  function addFeatureItem(sectionIndex: number) {
    const section = sections[sectionIndex];
    if (!section || section.type !== "features") return;
    const items = [...(section.items || []), { text: "" }];
    updateSection(sectionIndex, { items });
  }

  function updateFeatureItem(sectionIndex: number, itemIndex: number, text: string) {
    const section = sections[sectionIndex];
    if (!section?.items) return;
    const items = section.items.map((item, i) => (i === itemIndex ? { ...item, text } : item));
    updateSection(sectionIndex, { items });
  }

  function removeFeatureItem(sectionIndex: number, itemIndex: number) {
    const section = sections[sectionIndex];
    if (!section?.items) return;
    updateSection(sectionIndex, { items: section.items.filter((_, i) => i !== itemIndex) });
  }

  const SECTION_TYPES = [
    { type: "text" as const, icon: "📝", label: "Texte", desc: "Description, explication..." },
    { type: "faq" as const, icon: "❓", label: "FAQ", desc: "Questions / réponses" },
    { type: "features" as const, icon: "✅", label: "Points forts", desc: "Liste d'avantages" },
  ];

  const SECTION_ICON: Record<string, string> = { text: "📝", faq: "❓", features: "✅", video: "🎬" };
  const SECTION_LABEL: Record<string, string> = { text: "Texte", faq: "FAQ", features: "Points forts", video: "Vidéo" };

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-sm font-bold text-gray-900">Page de vente</p>
        <p className="text-xs text-gray-500">
          Ajoute du contenu pour convaincre tes visiteurs. Au moins une section est requise.
        </p>
      </div>

      {/* Empty state with add buttons */}
      {!hasContent && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
          <p className="mb-1 text-sm font-semibold text-gray-700">Commence par ajouter une section</p>
          <p className="mb-5 text-xs text-gray-400">Choisis le type de contenu que tu veux ajouter</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SECTION_TYPES.map((st) => (
              <button
                key={st.type}
                type="button"
                onClick={() => addSection(st.type)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-teal-400 hover:shadow-md active:scale-[0.97]"
              >
                <span>{st.icon}</span>
                {st.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addSection("video")}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-teal-400 hover:shadow-md active:scale-[0.97]"
            >
              <span>🎬</span>
              Vidéo
            </button>
            {productType.hasReviews && (
              <button
                type="button"
                onClick={() => setShowReviews(true)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-teal-400 hover:shadow-md active:scale-[0.97]"
              >
                <span>⭐</span>
                Avis clients
              </button>
            )}
          </div>
        </div>
      )}

      {/* Added sections */}
      {hasContent && (
        <div className="space-y-4">
          {/* All content sections (text, faq, features, video) in unified list */}
          {sections.map((section, sIndex) => (
            <div key={section.id || `fallback-${sIndex}`} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <span>{SECTION_ICON[section.type] || "📝"}</span>
                  {SECTION_LABEL[section.type] || "Section"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSection(sIndex, "up")}
                    disabled={sIndex === 0}
                    className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                    title="Monter"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(sIndex, "down")}
                    disabled={sIndex === sections.length - 1}
                    className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                    title="Descendre"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(sIndex)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Video section */}
              {section.type === "video" && (
                <>
                  <Input
                    label=""
                    type="url"
                    value={section.content || ""}
                    onChange={(e) => updateSection(sIndex, { content: e.target.value })}
                    placeholder="Lien YouTube, Short, TikTok, Instagram Reel, Vimeo…"
                  />
                  <p className="mt-1 text-xs text-gray-400">YouTube, Shorts, TikTok, Instagram Reels, Vimeo ou Loom</p>
                  {section.content && getVideoEmbedUrl(section.content) && (
                    <div className={`mt-3 relative w-full overflow-hidden rounded-xl bg-gray-100 ${getVideoFormat(section.content) === "vertical" ? "aspect-[9/16] max-w-[280px] mx-auto" : "aspect-video"}`}>
                      <iframe
                        src={getVideoEmbedUrl(section.content)!}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </>
              )}

              {/* Title field for non-video section types */}
              {section.type !== "video" && (
                <input
                  type="text"
                  value={section.title || ""}
                  onChange={(e) => updateSection(sIndex, { title: e.target.value })}
                  placeholder="Titre de la section"
                  className="mb-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              )}

              {/* Text section — rich text editor */}
              {section.type === "text" && (
                <RichTextEditor
                  key={section.id}
                  value={section.content || ""}
                  onChange={(html) => updateSection(sIndex, { content: html })}
                  placeholder="Écris ton contenu..."
                />
              )}

              {/* FAQ section */}
              {section.type === "faq" && (
                <div className="space-y-2">
                  {(section.items || []).map((item, iIndex) => (
                    <div key={iIndex} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <input
                          type="text"
                          value={item.question || ""}
                          onChange={(e) => updateFaqItem(sIndex, iIndex, { question: e.target.value })}
                          placeholder="Question"
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeFaqItem(sIndex, iIndex)}
                          className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <textarea
                        value={item.answer || ""}
                        onChange={(e) => updateFaqItem(sIndex, iIndex, { answer: e.target.value })}
                        rows={2}
                        placeholder="Réponse"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-600 focus:outline-none"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addFaqItem(sIndex)}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    <Plus size={14} />
                    Ajouter une question
                  </button>
                </div>
              )}

              {/* Features section */}
              {section.type === "features" && (
                <div className="space-y-2">
                  {(section.items || []).map((item, iIndex) => (
                    <div key={iIndex} className="flex items-center gap-2">
                      <span className="text-teal-600">✓</span>
                      <input
                        type="text"
                        value={item.text || ""}
                        onChange={(e) => updateFeatureItem(sIndex, iIndex, e.target.value)}
                        placeholder="Ex : Accès à vie"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-teal-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeatureItem(sIndex, iIndex)}
                        className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addFeatureItem(sIndex)}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    <Plus size={14} />
                    Ajouter un point fort
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Reviews section */}
          {showReviews && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <span>⭐</span> Avis clients
                </span>
                <button
                  type="button"
                  onClick={() => { setShowReviews(false); set("reviews", []); }}
                  className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <ReviewsEditor
                reviews={form.reviews}
                onChange={(reviews) => set("reviews", reviews)}
              />
            </div>
          )}

          {/* Add more sections */}
          <div className="flex flex-wrap gap-2 pt-1">
            {SECTION_TYPES.map((st) => (
              <button
                key={st.type}
                type="button"
                onClick={() => addSection(st.type)}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-500 transition-colors hover:border-teal-400 hover:text-teal-600"
              >
                <Plus size={12} />
                {st.label}
              </button>
            ))}
            {!hasVideo && (
              <button
                type="button"
                onClick={() => addSection("video")}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-500 transition-colors hover:border-teal-400 hover:text-teal-600"
              >
                <Plus size={12} />
                Vidéo
              </button>
            )}
            {productType.hasReviews && !showReviews && (
              <button
                type="button"
                onClick={() => setShowReviews(true)}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-500 transition-colors hover:border-teal-400 hover:text-teal-600"
              >
                <Plus size={12} />
                Avis clients
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
