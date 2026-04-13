"use client";

import { Plus, X } from "lucide-react";
import type { LeadField } from "@/types";

const PREDEFINED_FIELDS: { type: LeadField["type"]; label: string; placeholder: string }[] = [
  { type: "name", label: "Prénom", placeholder: "Ton prénom" },
  { type: "email", label: "Email", placeholder: "Ton email" },
  { type: "phone", label: "Téléphone", placeholder: "+221 77 000 00 00" },
  { type: "whatsapp", label: "WhatsApp", placeholder: "+221 77 000 00 00" },
];

const DEFAULT_FIELDS: LeadField[] = [
  { id: "f-name", type: "name", label: "Prénom", placeholder: "Ton prénom", required: false },
  { id: "f-email", type: "email", label: "Email", placeholder: "Ton email", required: true },
];

interface LeadFieldEditorProps {
  fields: LeadField[];
  onChange: (fields: LeadField[]) => void;
  emailAlwaysRequired?: boolean;
  defaultFields?: LeadField[];
}

export function LeadFieldEditor({
  fields,
  onChange,
  emailAlwaysRequired = false,
  defaultFields,
}: LeadFieldEditorProps) {
  const defaults = defaultFields || DEFAULT_FIELDS;
  const currentFields: LeadField[] = fields.length > 0 ? fields : defaults;

  function addPredefined(type: LeadField["type"]) {
    const preset = PREDEFINED_FIELDS.find((f) => f.type === type);
    if (!preset) return;
    const id = `f-${type}-${crypto.randomUUID().slice(0, 8)}`;
    onChange([...currentFields, { id, type, label: preset.label, placeholder: preset.placeholder, required: false }]);
  }

  function addCustom() {
    const id = `f-custom-${crypto.randomUUID().slice(0, 8)}`;
    onChange([...currentFields, { id, type: "custom", label: "", placeholder: "", required: false }]);
  }

  function removeField(id: string) {
    onChange(currentFields.filter((f) => f.id !== id));
  }

  function updateField(id: string, updates: Partial<LeadField>) {
    onChange(currentFields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function toggleRequired(id: string) {
    const field = currentFields.find((f) => f.id === id);
    if (emailAlwaysRequired && field && field.type === "email") return;
    onChange(currentFields.map((f) => (f.id === id ? { ...f, required: !f.required } : f)));
  }

  const usedTypes = new Set(currentFields.map((f) => f.type));

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">Configure les champs que les visiteurs doivent remplir</p>

      {currentFields.map((field) => (
        <div
          key={field.id}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5"
        >
          {field.type === "custom" ? (
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              placeholder="Nom du champ..."
              className="min-w-0 flex-1 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none"
            />
          ) : (
            <span className="flex-1 text-sm font-medium text-gray-700">{field.label}</span>
          )}

          <button
            type="button"
            onClick={() => toggleRequired(field.id)}
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
              field.required || (emailAlwaysRequired && field.type === "email")
                ? "bg-teal-100 text-teal-700"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
          >
            {field.required || (emailAlwaysRequired && field.type === "email") ? "Requis" : "Optionnel"}
          </button>

          {(field.type !== "email" || !emailAlwaysRequired) && (
            <button
              type="button"
              onClick={() => removeField(field.id)}
              className="shrink-0 rounded-lg p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {PREDEFINED_FIELDS.filter((f) => !usedTypes.has(f.type)).map((f) => (
          <button
            key={f.type}
            type="button"
            onClick={() => addPredefined(f.type)}
            className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-teal-50 hover:text-teal-700"
          >
            <Plus size={12} />
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={addCustom}
          className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-[11px] font-semibold text-gray-400 transition-colors hover:border-teal-400 hover:text-teal-600"
        >
          <Plus size={12} />
          Champ personnalisé
        </button>
      </div>
    </div>
  );
}
