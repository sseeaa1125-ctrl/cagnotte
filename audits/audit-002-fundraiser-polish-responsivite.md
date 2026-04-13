# Audit 002 — Levée de fonds : Polish + Responsivité Dashboard

**Date** : 2026-03-21
**Scope** : Orthographe, bloc picker, date de fin, intégrations manquantes, responsivité dashboard

---

## Corrections effectuées

### 1. Orthographe — "Lever de fonds" → "Levée de fonds"

| Fichier | Ligne | Corrigé |
|---------|-------|---------|
| `src/lib/productTypes.ts` | 99 | ✅ label → "Levée de fonds" |
| `src/app/store/[slug]/page.tsx` | 119 | ✅ subtitle → "Levée de fonds" |
| `src/app/dashboard/blocks/page.tsx` | 144 | ✅ TYPE_LABELS → "Levée de fonds" |

### 2. Bloc picker — FUNDRAISER visible dans "Suggérés" et "Ventes & Revenus"

| Fichier | Changement |
|---------|------------|
| `src/components/dashboard/AddBlockModal/constants.tsx` | ✅ Ajouté `FUNDRAISER` dans `TYPE_CATEGORIES.ecommerce` |
| `src/components/dashboard/AddBlockModal/PickerContent.tsx` | ✅ Grille suggérés : `slice(0,4)` → `slice(0,6)` + grid `sm:grid-cols-3` |

Résultat : FUNDRAISER apparaît dans la grille "Suggérés" (6 items : Produit, Coaching, Communauté, Dons, **Levée de fonds**, Paiement) et dans la liste "Ventes & Revenus".

### 3. Date de fin — Blocage des participations après expiration

| Couche | Fichier | Implémentation |
|--------|---------|----------------|
| **Backend** | `backend/src/routes/orders.ts` | ✅ Vérifie `endDate` du config FUNDRAISER avant création d'ordre. Retourne `400 "Cette levée de fonds est terminée"` si expiré (fin de journée : 23h59) |
| **Frontend** | `src/components/store/CheckoutCTA.tsx` | ✅ Calcule `isFundraiserExpired`. Si expiré : affiche barre de progression + message "Terminée", masque le formulaire et le bouton "Participer" |

### 4. Intégrations FUNDRAISER manquantes découvertes et corrigées

| Fichier | Problème | Fix |
|---------|----------|-----|
| `src/app/dashboard/blocks/page.tsx` | `TYPE_ICONS` manquait FUNDRAISER | ✅ Ajouté `FUNDRAISER: Heart` |
| `src/app/dashboard/blocks/page.tsx` | `TYPE_LABELS` manquait FUNDRAISER | ✅ Ajouté `FUNDRAISER: "Levée de fonds"` |
| `src/app/dashboard/blocks/page.tsx` | `getBlockSubtitle()` manquait FUNDRAISER | ✅ Ajouté case FUNDRAISER → "Levée de fonds" |
| `src/components/dashboard/ProductForm/index.tsx` | `getTabErrors` labels manquait FUNDRAISER | ✅ Ajouté "Donne un titre à ta levée de fonds" |
| `src/components/dashboard/ProductForm/index.tsx` | Landing page obligatoire pour FUNDRAISER | ✅ Ajouté FUNDRAISER aux types optionnels |

---

## Audit responsivité dashboard

### Structure globale — ✅ Bien conçue

| Composant | Mobile (< 768px) | Desktop (≥ 1024px) |
|-----------|-------------------|---------------------|
| `DashboardShell` | `flex-col h-[100dvh]` avec overflow interne | `lg:block lg:min-h-[100dvh]` |
| Sidebar | Cachée, remplacée par `MobileDrawer` + `BottomTabBar` | Sidebar fixe `lg:pl-60` (ou 68px collapsed) |
| TopBar | Visible avec burger menu | Cachée |
| Main content | `px-3 py-4` | `lg:p-6` |

### ProductForm — ✅ Responsive

| Aspect | Implementation |
|--------|---------------|
| Layout | `flex-col lg:flex-row` — empilé sur mobile, côte à côte sur desktop |
| Preview | Cachée sur mobile, bouton flottant "Aperçu" → bottom sheet |
| Actions | `lg:hidden fixed bottom-0` sticky bar sur mobile, inline sur desktop |
| Tabs | `overflow-x-auto scrollbar-hide` — scroll horizontal sur mobile, auto-scroll hint |
| Inputs | Tous `w-full` — s'adaptent à la largeur |

### CheckoutTab (tous types) — ✅ Responsive

- Les champs prix utilisent `flex gap-3` qui s'empile naturellement
- Les textareas sont `w-full` avec `rows` adaptatifs
- Le `SuggestedAmountsEditor` est en `flex flex-wrap`
- Le `CtaStyleSelector` est en `grid grid-cols-3` — adapté mobile (petites cartes)

### Blocs page (liste) — ✅ Responsive

- Les cartes utilisent des flex layouts qui s'adaptent
- Les menus contextuels (3 dots) sont accessibles sur mobile
- Le drag-and-drop est remplacé par des boutons ↑↓ sur mobile

### Pages communauté/partenariat — ✅ Responsive

- `CommunitySetupWizard` utilise `max-w-lg mx-auto` — centré sur desktop, full-width sur mobile
- Les formulaires d'édition utilisent le même `ProductForm` responsive

### Points d'attention mineurs

| Élément | Observation | Sévérité |
|---------|-------------|----------|
| Grille suggérés picker | 6 items en `grid-cols-2 sm:grid-cols-3` = 3 lignes mobile, 2 lignes tablet+ | ✅ OK |
| Bottom tab bar | 5 items, touch targets ≥ 48px | ✅ OK |
| Dashboard stats | `grid-cols-2 lg:grid-cols-4` | ✅ OK |
| Orders page | Tables scrollables horizontalement sur mobile | ✅ OK |

---

## Builds

| Cible | Status |
|-------|--------|
| Backend (`tsc`) | ✅ 0 erreur |
| Frontend (`next build`) | ✅ 0 erreur |

---

## Verdict

**Toutes les corrections sont en place.** La responsivité du dashboard est bien implémentée avec un pattern mobile-first cohérent (sidebar → drawer, preview → bottom sheet, sticky actions en bas). Aucun problème de responsivité critique détecté.
