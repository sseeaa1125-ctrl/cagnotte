import { ChevronRight, Link2 } from "lucide-react";
import { PICKER_TYPES } from "@/lib/productTypes";
import { SUGGESTED_SOCIALS, SIDEBAR_CATEGORIES, TYPE_CATEGORIES } from "./constants";
import { WithdrawalAlert } from "../ProductForm/FormHelpers";

interface PickerContentProps {
  activeCategory: string;
  search: string;
  onSelectType: (type: string, label: string) => void;
  onSelectSocial: (label: string) => void;
}

export function PickerContent({ activeCategory, search, onSelectType, onSelectSocial }: PickerContentProps) {
  return (
    <>
      {/* Global alert about withdrawals */}
      {!search && <WithdrawalAlert />}

      {/* Suggested: type grid */}
      {activeCategory === "suggested" && !search && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Types de blocs</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PICKER_TYPES.slice(0, 6).map((pt, idx) => (
              <button
                key={`grid-${idx}`}
                onClick={() => onSelectType(pt.type, pt.label)}
                className="flex flex-col items-start gap-2.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all text-left"
              >
                <div className="h-10 w-10 flex items-center justify-center rounded-xl text-xl" style={{ backgroundColor: pt.bgColor }}>
                  {pt.icon.startsWith("/") ? <img src={pt.icon} alt={pt.label} className="h-6 w-6 rounded" /> : pt.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">{pt.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">{pt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Socials list — suggested + social tabs */}
      {(activeCategory === "suggested" || activeCategory === "social") &&
        (!search || "instagram tiktok youtube spotify facebook telegram".includes(search.toLowerCase())) && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            {activeCategory === "social" ? "Réseaux populaires" : "Réseaux sociaux"}
          </p>
          <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {SUGGESTED_SOCIALS.map((social) => (
              <button
                key={social.id}
                onClick={() => onSelectSocial(social.label)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: social.bgColor }}>
                    {social.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-bold text-gray-900">{social.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{social.desc}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
            {activeCategory === "social" && !search && (
              <button
                onClick={() => onSelectSocial("Lien personnalisé")}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shrink-0">
                    <Link2 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-bold text-gray-900">Autre lien</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ajouter une URL personnalisée</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category-specific types (ecommerce, media, contact) */}
      {activeCategory !== "suggested" && activeCategory !== "all" && activeCategory !== "social" && !search && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            {SIDEBAR_CATEGORIES.find(c => c.id === activeCategory)?.label}
          </p>
          <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {PICKER_TYPES.filter(pt => TYPE_CATEGORIES[activeCategory]?.includes(pt.type)).map((pt, idx) => (
              <TypeListRow key={`list-cat-${idx}`} pt={pt} onSelect={onSelectType} />
            ))}
          </div>
        </div>
      )}

      {/* Social tab: also show block types */}
      {activeCategory === "social" && !search && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Autres outils</p>
          <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {PICKER_TYPES.filter(pt => TYPE_CATEGORIES["social"]?.includes(pt.type)).map((pt, idx) => (
              <TypeListRow key={`social-type-${idx}`} pt={pt} onSelect={onSelectType} />
            ))}
          </div>
        </div>
      )}

      {/* All types / search results */}
      {(activeCategory === "all" || search) && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            {search ? "Résultats" : "Tous les blocs"}
          </p>
          <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {PICKER_TYPES
              .filter(pt => pt.label.toLowerCase().includes(search.toLowerCase()) || pt.description.toLowerCase().includes(search.toLowerCase()))
              .map((pt, idx) => (
                <TypeListRow key={`list-all-${idx}`} pt={pt} onSelect={onSelectType} />
              ))
            }
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared row component ──────────────────────────────────────────
interface TypeListRowProps {
  pt: (typeof PICKER_TYPES)[number];
  onSelect: (type: string, label: string) => void;
}

function TypeListRow({ pt, onSelect }: TypeListRowProps) {
  return (
    <button
      onClick={() => onSelect(pt.type, pt.label)}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-center gap-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl shrink-0" style={{ backgroundColor: pt.bgColor }}>
          {pt.icon.startsWith("/") ? <img src={pt.icon} alt={pt.label} className="h-6 w-6 rounded" /> : pt.icon}
        </div>
        <div className="text-left">
          <p className="text-[14px] font-bold text-gray-900">{pt.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pt.description}</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
