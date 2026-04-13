# Audit 001 — Bloc FUNDRAISER (Lever de fonds)

**Date** : 2026-03-21
**Scope** : Implémentation complète du bloc FUNDRAISER
**Fichiers modifiés** : 16

---

## Résumé

| Catégorie | Status |
|-----------|--------|
| Schema Prisma | ✅ OK |
| Validation Zod backend | ✅ OK |
| Routes backend (blocks + orders) | ✅ OK |
| Types frontend | ✅ OK |
| Dashboard (formulaire vendeur) | ✅ OK |
| Store public (checkout + progress) | ⚠️ 3 problèmes mineurs |
| Cohérence globale | ⚠️ 1 bug trouvé et corrigé |

---

## Fichiers audités (16)

### Backend (6 fichiers)

| Fichier | Status | Notes |
|---------|--------|-------|
| `backend/prisma/schema.prisma` | ✅ | `FUNDRAISER` dans `BlockType`, `blockId` + relation sur `Order`, index `@@index([blockId])` |
| `backend/src/lib/blocks/schemas.ts` | ✅ | `fundraiserBlockConfigSchema` complet, enregistré dans `blockTypeToSchema` |
| `backend/src/routes/blocks.ts` | ✅ | `createBlockSchema`, `typesWithConfig`, `typesWithConfigUpdate`, route GET `/progress` |
| `backend/src/routes/orders.ts` | ✅ | `blockId` dans `createOrderSchema`, lookup `DONATION+FUNDRAISER`, `blockId` dans `select` |
| Build backend (`tsc`) | ✅ | 0 erreur |
| Migration DB (`prisma db push`) | ✅ | Appliquée |

### Frontend (10 fichiers)

| Fichier | Status | Notes |
|---------|--------|-------|
| `src/types/index.ts` | ✅ | `FUNDRAISER` dans `BlockType` |
| `src/lib/productTypes.ts` | ✅ | `ProductTypeDefinition` FUNDRAISER (icon 🎯, tabs, defaultButtonText "Participer") |
| `src/components/dashboard/ProductForm/types.ts` | ✅ | `goalAmount`, `endDate`, `showDonorCount` dans `ProductFormData` + `EMPTY_FORM` + `TAB_LABELS_BY_TYPE` |
| `src/components/dashboard/ProductForm/CheckoutTab.tsx` | ✅ | Section FUNDRAISER complète (objectif, date fin, toggle donorCount, montants, message) |
| `src/components/dashboard/ProductForm/OptionsTab.tsx` | ✅ | FUNDRAISER dans condition checkout fields + template email |
| `src/app/dashboard/blocks/create/page.tsx` | ✅ | Construction config FUNDRAISER dans `handleSave` |
| `src/app/dashboard/blocks/[id]/edit/page.tsx` | ✅ | Chargement + sauvegarde config FUNDRAISER |
| `src/components/dashboard/AddBlockModal/index.tsx` | ✅ | Construction config FUNDRAISER dans `handleFullFormSave` |
| `src/components/store/blocks/StoreCard.tsx` | ✅ | `FUNDRAISER: Target` dans `BLOCK_ICONS` |
| `src/components/store/CheckoutCTA.tsx` | ✅ | Bottom sheet FUNDRAISER avec `FundraiserProgress` |
| `src/components/store/FundraiserProgress.tsx` | ⚠️ | Nouveau composant — voir problèmes ci-dessous |
| `src/components/store/PaymentModal.tsx` | ✅ | Prop `blockId` ajoutée et transmise au body de l'API |
| `src/app/store/[slug]/page.tsx` | ✅ | Subtitle, `skipCoverOnly`, `defaultButtonText` |
| `src/app/store/[slug]/[blockId]/page.tsx` | ✅ | `defaultButtonText` |
| `src/app/dashboard/statistics/page.tsx` | ✅ | Label, icon (`Target`), couleur, `isTransactional` |

---

## Bug trouvé et corrigé

### 🔴 BUG — `AddBlockModal` envoyait `config: {}` pour FUNDRAISER

**Symptôme** : Création de bloc FUNDRAISER échoue avec `Zod validation bloc { field: 'title', msg: 'Required' }`

**Cause** : Le `AddBlockModal/index.tsx` a son propre `handleFullFormSave` (ligne 270) qui est un **flux de création distinct** de `create/page.tsx`. Ce flux gérait PAYMENT et DONATION mais **pas FUNDRAISER**, donc `body.config` restait à `{}`.

**Fix** : Ajout du bloc `if (pt.type === "FUNDRAISER") { ... }` dans `handleFullFormSave` du `AddBlockModal`.

---

## Problèmes restants (mineurs)

### ⚠️ P1 — `FundraiserProgress` : gestion d'erreur API fragile

**Fichier** : `src/components/store/FundraiserProgress.tsx:30-33`

```tsx
fetch(`/api/blocks/${blockId}/progress`)
  .then((r) => r.json())
  .then(setData)
  .catch(() => {});
```

**Problème** : Si l'API retourne un 404 JSON (`{ error: "Cagnotte introuvable" }`), `r.json()` réussit et `setData` reçoit un objet qui ne matche pas `FundraiserData`. Le composant affichera `NaN` ou `undefined`.

**Fix recommandé** :
```tsx
fetch(`/api/blocks/${blockId}/progress`)
  .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
  .then(setData)
  .catch(() => {});
```

### ⚠️ P2 — Page succès : pas de message spécifique FUNDRAISER

**Fichier** : `src/app/store/[slug]/success/page.tsx`

**Problème** : FUNDRAISER utilise `orderType: "DONATION"`, donc la page succès affiche "Don reçu — merci !" et "Merci infiniment !" au lieu de "Participation reçue" / "Merci pour ta participation !". Fonctionnel mais UX imprécise.

**Fix recommandé** : Ajouter un paramètre `blockType` dans la query string de la page succès pour différencier DONATION et FUNDRAISER.

### ⚠️ P3 — `FundraiserProgress` : `formatPrice` dupliqué

**Fichier** : `src/components/store/FundraiserProgress.tsx:15-17`

**Problème** : Le composant définit son propre `formatPrice` au lieu d'utiliser `@/lib/utils`. Incohérence mineure (format identique mais code dupliqué).

**Fix recommandé** : Remplacer par `import { formatPrice } from "@/lib/utils"`.

---

## Architecture — Décisions vérifiées

| Décision | Validé |
|----------|--------|
| FUNDRAISER réutilise `orderType: "DONATION"` (pas de nouveau OrderType) | ✅ |
| `blockId` sur `Order` permet de distinguer DONATION vs FUNDRAISER | ✅ |
| Route `/progress` est publique (pas d'auth) | ✅ |
| Progression calculée via `prisma.order.aggregate` (PAID only) | ✅ |
| Commission Fari calculée côté serveur (inchangée) | ✅ |
| Mobile-first respecté (bottom sheet, touch targets ≥ 48px) | ✅ |
| CSS transitions uniquement (pas de Framer Motion) | ✅ |
| Textes en français | ✅ |
| Tailwind CSS uniquement, pas de CSS custom | ✅ |

---

## Couverture des flux

| Flux | Testé |
|------|-------|
| Création bloc FUNDRAISER via modal (AddBlockModal) | ✅ Corrigé |
| Création bloc FUNDRAISER via page create | ✅ |
| Édition bloc FUNDRAISER | ✅ |
| Affichage sur store public (card + CTA) | ✅ |
| Bottom sheet avec barre de progression | ✅ |
| Paiement via PaymentModal (orderType DONATION + blockId) | ✅ |
| Page succès après paiement | ⚠️ Message générique DONATION |
| Statistiques dashboard | ✅ |
| Ordres dashboard (message donateur) | ✅ Implicite via orderType DONATION |

---

## Verdict

**Implémentation fonctionnelle** — Le bloc FUNDRAISER est opérationnel de bout en bout. Le bug critique (AddBlockModal) a été corrigé. Les 3 problèmes restants sont mineurs et n'empêchent pas l'utilisation.

**Priorité des corrections** :
1. **P1** (fragile fetch) — rapide à corriger, évite un bug visuel
2. **P3** (formatPrice dupliqué) — nettoyage de code
3. **P2** (message succès) — amélioration UX, non bloquant
