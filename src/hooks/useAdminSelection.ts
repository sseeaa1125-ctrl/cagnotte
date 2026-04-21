"use client";

import * as React from "react";

/**
 * Sélection multiple pour les tables admin — pattern identique entre toutes
 * les pages liste (KYC, retraits, sellers, cagnottes, utilisateurs).
 *
 * Le `resetKey` permet de remettre la sélection à zéro quand la source de
 * données change (filtre, recherche, pagination) — sinon un utilisateur
 * pourrait sélectionner des items sur page 1 puis changer de page et
 * continuer à "avoir" ces IDs dans le Set sans les voir.
 */
export function useAdminSelection(resetKey?: string | number) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setSelected(new Set());
  }, [resetKey]);

  const toggleOne = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = React.useCallback((ids: string[]) => {
    setSelected((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) {
        // Désélectionne uniquement les IDs de la page courante, pas ceux
        // éventuellement sélectionnés sur une autre page (edge case : il
        // n'y a pas de multi-page selection avec resetKey, donc en pratique
        // équivaut à new Set()).
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clear = React.useCallback(() => setSelected(new Set()), []);

  const selectedIds = React.useMemo(() => Array.from(selected), [selected]);

  return {
    selected,
    selectedIds,
    selectedCount: selected.size,
    toggleOne,
    toggleAll,
    clear,
    isSelected: (id: string) => selected.has(id),
  };
}
