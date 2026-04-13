"use client";

import { useState } from "react";
import { Trash2, Plus, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { ProductFormData } from "./types";

// ── Withdrawal Info Alert ──
export function WithdrawalAlert() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100/50">
          <Info size={18} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Information importante</p>
          <p className="text-sm text-amber-800 leading-relaxed font-medium">
            Les retraits sont actuellement accessibles uniquement aux utilisateurs ayant un numéro sénégalais (Orange Money, Wave). Les autres pays arrivent bientôt.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Section header ──
export function SectionHeader({ n, label }: { n: number; label: string }) {
  return <p className="mb-2 text-sm font-bold text-gray-900">{n} &middot; {label}</p>;
}

// ── Reusable field with counter ──
export function FormField({ label, value, max, onChange, placeholder }: {
  label: string; value: string; max: number; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-400">{value.length}/{max}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
      />
    </div>
  );
}

// ── Reusable ctaStyle selector ──
export function CtaStyleSelector({ form, set, step }: {
  form: ProductFormData;
  set: <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void;
  step: number;
}) {
  return (
    <div>
      <SectionHeader n={step} label="Style de miniature" />
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        {/* Bouton — compact row with button */}
        <button
          onClick={() => set("ctaStyle", "button")}
          className={`group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border-2 p-2 sm:p-3 pb-2 sm:pb-2.5 transition-all ${
            form.ctaStyle === "button"
              ? "border-teal-600 bg-teal-50/60 shadow-sm shadow-teal-100"
              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
          }`}
        >
          <div className={`w-full rounded-lg p-2 ${form.ctaStyle === "button" ? "bg-white" : "bg-gray-50"}`}>
            <div className="space-y-1.5">
              <div className={`h-1.5 w-10 rounded-full ${form.ctaStyle === "button" ? "bg-teal-300" : "bg-gray-300"}`} />
              <div className={`h-1 w-7 rounded-full ${form.ctaStyle === "button" ? "bg-teal-200" : "bg-gray-200"}`} />
              <div className={`mt-1.5 h-4 w-full rounded-md ${form.ctaStyle === "button" ? "bg-teal-500" : "bg-gray-300"}`} />
            </div>
          </div>
          <span className={`text-[11px] font-semibold ${form.ctaStyle === "button" ? "text-teal-700" : "text-gray-500"}`}>
            Bouton
          </span>
        </button>

        {/* Encart — side-by-side: image LEFT + text RIGHT + CTA bottom */}
        <button
          onClick={() => set("ctaStyle", "callout")}
          className={`group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border-2 p-2 sm:p-3 pb-2 sm:pb-2.5 transition-all ${
            form.ctaStyle === "callout"
              ? "border-teal-600 bg-teal-50/60 shadow-sm shadow-teal-100"
              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
          }`}
        >
          <div className={`w-full rounded-lg overflow-hidden p-1.5 ${form.ctaStyle === "callout" ? "bg-white" : "bg-gray-50"}`}>
            <div className="flex gap-1.5">
              <div className={`h-8 w-8 shrink-0 rounded ${form.ctaStyle === "callout" ? "bg-teal-200" : "bg-gray-200"}`} />
              <div className="flex-1 space-y-1 pt-0.5">
                <div className={`h-1.5 w-full rounded-full ${form.ctaStyle === "callout" ? "bg-teal-300" : "bg-gray-300"}`} />
                <div className={`h-1 w-3/4 rounded-full ${form.ctaStyle === "callout" ? "bg-teal-200" : "bg-gray-200"}`} />
                <div className={`h-1 w-1/2 rounded-full ${form.ctaStyle === "callout" ? "bg-teal-400" : "bg-gray-300"}`} />
              </div>
            </div>
            <div className={`mt-1.5 h-3 w-full rounded-sm ${form.ctaStyle === "callout" ? "bg-teal-500" : "bg-gray-300"}`} />
          </div>
          <span className={`text-[11px] font-semibold ${form.ctaStyle === "callout" ? "text-teal-700" : "text-gray-500"}`}>
            Encart
          </span>
        </button>

        {/* Aperçu — full preview with large image, text, and price */}
        <button
          onClick={() => set("ctaStyle", "preview")}
          className={`group relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border-2 p-2 sm:p-3 pb-2 sm:pb-2.5 transition-all ${
            form.ctaStyle === "preview"
              ? "border-teal-600 bg-teal-50/60 shadow-sm shadow-teal-100"
              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
          }`}
        >
          <div className={`w-full rounded-lg overflow-hidden ${form.ctaStyle === "preview" ? "bg-white" : "bg-gray-50"}`}>
            <div className={`h-9 w-full ${form.ctaStyle === "preview" ? "bg-teal-200" : "bg-gray-200"}`} />
            <div className="p-1.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className={`h-1.5 w-6 rounded-full ${form.ctaStyle === "preview" ? "bg-teal-300" : "bg-gray-300"}`} />
                <div className={`h-1.5 w-4 rounded-full ${form.ctaStyle === "preview" ? "bg-teal-400" : "bg-gray-300"}`} />
              </div>
              <div className={`h-1 w-9 rounded-full ${form.ctaStyle === "preview" ? "bg-teal-200" : "bg-gray-200"}`} />
            </div>
          </div>
          <span className={`text-[11px] font-semibold ${form.ctaStyle === "preview" ? "text-teal-700" : "text-gray-500"}`}>
            Aperçu
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Suggested amounts chip editor for PAYMENT / DONATION ──
export function SuggestedAmountsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const amounts = value.split(",").map((s) => s.trim()).filter((s) => s && !isNaN(Number(s))).map(Number);
  const [newAmount, setNewAmount] = useState("");

  function addAmount() {
    const n = parseInt(newAmount);
    if (isNaN(n) || n < 500) return;
    if (amounts.includes(n)) return;
    const updated = [...amounts, n].sort((a, b) => a - b);
    onChange(updated.join(","));
    setNewAmount("");
  }

  function removeAmount(n: number) {
    onChange(amounts.filter((a) => a !== n).join(","));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {amounts.map((n) => (
          <div key={n} className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5">
            <span className="text-xs font-semibold text-teal-700">{n.toLocaleString("fr-FR")} FCFA</span>
            <button type="button" onClick={() => removeAmount(n)} className="text-teal-400 hover:text-red-500" aria-label="Supprimer">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {amounts.length === 0 && <p className="text-xs text-gray-400">Aucun montant suggéré</p>}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          placeholder="Ex : 5000"
          min={500}
          className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAmount(); } }}
        />
        <button type="button" onClick={addAmount} className="flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-teal-700">
          <Plus size={14} />
          Ajouter
        </button>
      </div>
    </div>
  );
}

// ── Collapsible section ──
export function CollapsibleSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-bold text-gray-900">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}
