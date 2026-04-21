"use client";

import * as React from "react";
import { X } from "lucide-react";

/**
 * Barre d'actions groupées — sticky bottom sur mobile, sticky top sur
 * desktop. S'affiche uniquement quand count > 0. Les actions sont passées
 * en children pour garder l'API flexible : chaque page choisit ses propres
 * boutons + leur comportement (confirm modal, raison, etc.).
 *
 * Convention visuelle :
 *   - left  : count + label ("3 sélectionné(s)")
 *   - right : actions (boutons destructive + positive)
 *   - bouton X (clear) à l'extrême droite
 */
export interface BulkActionBarProps {
  count: number;
  label?: string;
  onClear: () => void;
  children?: React.ReactNode;
}

export function BulkActionBar({
  count,
  label,
  onClear,
  children,
}: BulkActionBarProps) {
  if (count === 0) return null;

  const countLabel =
    label ??
    `${count} ${count === 1 ? "élément sélectionné" : "éléments sélectionnés"}`;

  return (
    <>
      {/* Bottom sheet sur mobile — laisse 72px d'espace pour la bottom nav */}
      <div
        role="region"
        aria-label="Actions groupées"
        className="fixed inset-x-0 bottom-16 z-40 border-t border-gray-200 bg-white px-3 py-3 shadow-lg md:static md:mb-4 md:mt-0 md:rounded-2xl md:border md:border-indigo-200 md:bg-indigo-50 md:px-5 md:py-3 md:shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-sm font-semibold text-gray-900">
            {countLabel}
          </span>
          <div className="ml-auto flex items-center gap-2 overflow-x-auto">
            {children}
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              aria-label="Effacer la sélection"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
