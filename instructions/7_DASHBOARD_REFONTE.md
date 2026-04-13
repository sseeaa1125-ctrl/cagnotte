# Izy.store — Plan de Refonte Dashboard v2

## Philosophie

Inspiré de Shopify (simplicité, focus sur l'action) et adapté au marché Afrique francophone (mobile-first, 375px, 3G, WhatsApp comme canal principal). Chaque modification suit le principe : **moins de pages, plus d'actions par page, zéro friction**.

Le concurrent LinkShop montre la bonne direction : checklist onboarding, revenus en un coup d'œil, navigation minimaliste (4 sections).

---

## PHASE 1 — Navigation & Shell (Priorité critique)

### 1.1 : Refonte BottomTabBar → 5 onglets

**Problème** : 10 items dans la sidebar, seulement 4 dans la BottomTabBar mobile. 6 pages inaccessibles sans drawer.

**Fichiers modifiés** :
- `src/components/dashboard/BottomTabBar.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/MoreSheet.tsx` (nouveau)

**Nouvelle structure BottomTabBar** :

| Position | Label | Icône | Route |
|----------|-------|-------|-------|
| 1 | Accueil | `Home` | `/dashboard` |
| 2 | Ma Page | `LayoutGrid` | `/dashboard/blocks` |
| 3 | Ventes | `ShoppingBag` | `/dashboard/sales` |
| 4 | Revenus | `DollarSign` | `/dashboard/revenue` |
| 5 | Plus | `MoreHorizontal` | Bottom sheet |

**L'onglet "Plus"** ouvre un `MoreSheet` (bottom sheet grille) :
- Statistiques → `/dashboard/statistics`
- Clients → `/dashboard/audience` (fusion clients + leads)
- Communautés → `/dashboard/communities`
- Réglages → `/dashboard/settings`

**Règles** :
- Ne PLUS masquer la BottomTabBar sur `/dashboard/blocks`. Elle reste visible partout sauf dans les formulaires de création/édition (`/create`, `/edit`, `/new`).
- Retirer `EXACT_HIDDEN = ["/dashboard/blocks"]` de BottomTabBar.tsx.
- Le `MoreSheet` utilise le composant `Modal` existant en mode bottom-sheet.

**Sidebar desktop** : Aligner sur les mêmes 5 sections + items secondaires groupés sous un séparateur "Outils".

**Vérification** : Sur mobile (375px), les 5 onglets sont visibles et touchables (≥48px). L'onglet "Plus" ouvre la grille. La navigation vers toutes les pages fonctionne.

---

### 1.2 : Ne plus masquer la BottomTabBar sur Ma Page

**Fichiers modifiés** :
- `src/components/dashboard/BottomTabBar.tsx`

**Action** : Retirer `/dashboard/blocks` de `EXACT_HIDDEN`. Garder seulement les chemins de création/édition dans `HIDDEN_ON`.

**Vérification** : Sur `/dashboard/blocks`, la BottomTabBar est visible.

---

### 1.3 : Bouton flottant "Aperçu" sur mobile

**Fichiers modifiés** :
- `src/app/dashboard/blocks/page.tsx`

**Action** : Remplacer le layout 2 colonnes (invisible sur mobile) par un FAB (Floating Action Button) "Aperçu" en bas à droite (au-dessus de la BottomTabBar, `bottom-24`). Au clic, ouvre la PhonePreview en plein écran (modal/bottom-sheet).

**Specs** :
- FAB : `h-12 w-12 rounded-full bg-teal-600 text-white shadow-lg` avec icône `Eye`
- Position : `fixed bottom-24 right-4 z-30` (mobile only, hidden lg+)
- Sur desktop : conserver le layout 2 colonnes actuel

**Vérification** : Mobile → FAB visible → clic → preview plein écran → bouton fermer.

---

## PHASE 2 — Refonte page d'accueil (Priorité critique)

### 2.1 : Simplifier l'accueil — Structure

**Problème** : Accueil actuel = 509 lignes, 5 appels API, graphiques, sources de trafic, pays. Trop pour un créateur qui ouvre l'app.

**Fichiers modifiés** :
- `src/app/dashboard/page.tsx` (refonte majeure)

**Nouvelle structure de la page d'accueil** :

```
┌─────────────────────────────────────┐
│ Salut, Amadou 👋                    │
│ izy.store/amadou  [Copier] [Partager]│
├─────────────────────────────────────┤
│ 💰 Aujourd'hui    📅 Ce mois       │
│    0 FCFA            0 FCFA         │
├─────────────────────────────────────┤
│ 🚀 Lance ta boutique    2/4 ✓      │
│ ▓▓▓▓▓▓▓▓░░░░░░░░  50%             │
│                                     │
│ ✅ Créer un produit                 │
│ ✅ Personnaliser ma page            │
│ ○  Partager mon lien                │
│ ○  Première vente                   │
├─────────────────────────────────────┤
│ Activité récente                    │
│ ┌─ Aucune activité ──────────────┐ │
│ │  Partage ta page pour recevoir │ │
│ │  tes premières ventes !        │ │
│ │  [Partager sur WhatsApp]       │ │
│ └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Sections** :

1. **Header** : Greeting + lien boutique avec boutons Copier et Partager (natif)
2. **2 metric cards** (seulement 2, pas 4) : "Aujourd'hui" et "Ce mois" en FCFA
3. **Checklist onboarding** (disparaît quand tout est coché) :
   - Créer un produit → vérifie `hasBlocks`
   - Personnaliser ma page → vérifie `themeId !== "default" || bgImageUrl !== null`
   - Partager mon lien → vérifie via analytics `viewsTotal > 0`
   - Première vente → vérifie `totalOrders > 0`
   - Barre de progression visuelle (4 steps)
4. **Activité récente** : flux chronologique unifié (dernières commandes + réservations)
   - Si vide : CTA "Partager sur WhatsApp" proéminent

**Ce qui est RETIRÉ de l'accueil** (déplacé vers Statistiques) :
- DateRangePicker
- Graphique de revenus (Recharts)
- Sources de trafic + barres de progression
- Pays avec drapeaux
- Card "Visiteurs" et "Total commandes"

**Appels API** : Réduire de 5 à 2 :
- `/api/sellers/dashboard/stats?period=30` (revenus + commandes récentes + hasBlocks)
- Un seul appel, pas de chart ni analytics sur l'accueil

**Vérification** : La page charge en < 1s sur 3G (pas de Recharts lazy-loaded). L'accueil ne fait plus que ~200 lignes max.

---

### 2.2 : Partage natif (Web Share API)

**Fichiers modifiés** :
- `src/lib/share.ts` (nouveau)
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/blocks/page.tsx`

**Nouveau helper `share.ts`** :

```typescript
export async function shareStoreLink(slug: string, displayName: string) {
  const url = `${window.location.origin}/store/${slug}`;
  const text = `Découvre ma boutique ${displayName} sur izy.store !`;

  if (navigator.share) {
    await navigator.share({ title: displayName, text, url });
  } else {
    await navigator.clipboard.writeText(url);
  }
}

export function getWhatsAppShareUrl(slug: string): string {
  const url = `${window.location.origin}/store/${slug}?utm_source=whatsapp&utm_medium=share`;
  const text = encodeURIComponent(`Découvre ma boutique : ${url}`);
  return `https://wa.me/?text=${text}`;
}
```

**Utilisation** :
- Bouton "Partager" sur l'accueil → appelle `shareStoreLink()` (bottom sheet natif sur mobile)
- Bouton "WhatsApp" dans l'empty state → ouvre WhatsApp avec le lien pré-rempli + UTM
- Bouton "Copier" → `navigator.clipboard.writeText(url)` (garde le comportement actuel)

**Vérification** : Sur mobile → bouton Partager → sheet natif iOS/Android. Sur desktop → copie dans le presse-papier.

---

## PHASE 3 — Fusion Commandes + Réservations → "Ventes"

### 3.1 : Nouvelle page unifiée `/dashboard/sales`

**Problème** : Commandes et Réservations sont deux pages séparées (623 + 670 lignes) pour des données similaires.

**Fichiers modifiés** :
- `src/app/dashboard/sales/page.tsx` (nouveau)
- `src/app/dashboard/orders/page.tsx` (garder, redirect vers /sales)
- `src/app/dashboard/bookings/page.tsx` (garder, redirect vers /sales)

**Structure de la page "Ventes"** :

```
┌─────────────────────────────────────┐
│ Ventes                    [Export]  │
│ 42 transaction(s)                   │
├─────────────────────────────────────┤
│ [Toutes] [Commandes] [Réservations] │
├─────────────────────────────────────┤
│ 🔍 Rechercher...                    │
│ [Payé] [En attente] [Échoué]       │
├─────────────────────────────────────┤
│ Quand onglet "Réservations" actif : │
│ [Calendrier] [Liste]                │
├─────────────────────────────────────┤
│ Liste de commandes/réservations     │
│ ...                                 │
└─────────────────────────────────────┘
```

**Onglets internes** :
- **Toutes** : flux chronologique unifié (commandes + réservations + paiements)
- **Commandes** : filtre `orderType !== BOOKING`
- **Réservations** : filtre `orderType === BOOKING`, affiche le toggle Calendrier/Liste

**Règles** :
- Réutiliser le code existant des deux pages (filtres, search, export CSV, calendar)
- Le calendrier n'est visible QUE dans l'onglet "Réservations"
- L'export CSV exporte les données de l'onglet actif
- Pagination identique à l'actuelle

**Redirects** : `/dashboard/orders` et `/dashboard/bookings` redirigent vers `/dashboard/sales` (pour ne pas casser les liens existants).

**Vérification** : La page Ventes affiche toutes les transactions. Le calendrier fonctionne dans l'onglet Réservations. L'export CSV fonctionne.

---

## PHASE 4 — Fusion Clients + Leads → "Audience"

### 4.1 : Nouvelle page `/dashboard/audience`

**Problème** : Clients (415 lignes) et Leads (605 lignes) sont deux pages séparées avec des interfaces quasi-identiques.

**Fichiers modifiés** :
- `src/app/dashboard/audience/page.tsx` (nouveau)
- `src/app/dashboard/customers/page.tsx` (redirect)
- `src/app/dashboard/leads/page.tsx` (redirect)

**Structure** :

```
┌─────────────────────────────────────┐
│ Audience                  [Export]  │
│ 156 contacts                        │
├─────────────────────────────────────┤
│ [Clients] [Inscrits] [Partenaires] │
├─────────────────────────────────────┤
│ 🔍 Rechercher...                    │
├─────────────────────────────────────┤
│ Stats : 42 clients · 114 inscrits   │
│         Taux de conversion : 37%    │
├─────────────────────────────────────┤
│ Liste de contacts                   │
│ ...                                 │
└─────────────────────────────────────┘
```

**Onglets** :
- **Clients** : personnes qui ont payé (ex-customers page)
- **Inscrits** : leads (lead magnets, listes d'attente, communautés)
- **Partenaires** : demandes de partenariat avec actions Accept/Reject

**Vérification** : Tous les contacts sont accessibles. Export CSV fonctionne. Recherche cross-onglets.

---

## PHASE 5 — Onboarding Progress

### 5.1 : Composant `OnboardingChecklist`

**Fichiers modifiés** :
- `src/components/dashboard/OnboardingChecklist.tsx` (nouveau)
- `src/app/dashboard/page.tsx`

**Props** :

```typescript
interface OnboardingChecklistProps {
  hasProduct: boolean;       // seller a au moins 1 bloc actif
  hasTheme: boolean;         // themeId !== "default" || bgImageUrl !== null
  hasVisitors: boolean;      // analytics viewsTotal > 0
  hasFirstSale: boolean;     // totalOrders > 0
  sellerSlug: string;
}
```

**UI** :
- Barre de progression circulaire ou linéaire (ex: `2/4 complétées`)
- 4 items avec checkbox visuelle (✅ ou ○)
- Chaque item non-coché est cliquable → redirige vers l'action correspondante
- Animation confetti quand toutes les 4 étapes sont complétées (réutiliser canvas-confetti déjà installé)
- Le composant entier disparaît (`display: none`) quand tout est coché + user a fermé le bandeau
- Stocker la préférence "masquer checklist" en localStorage

**Étapes** :

| # | Label | Condition | Action au clic |
|---|-------|-----------|----------------|
| 1 | Ajouter un produit | `hasProduct` | `/dashboard/blocks/new` |
| 2 | Personnaliser ma page | `hasTheme` | `/dashboard/blocks` + `setActiveTab("design")` |
| 3 | Partager mon lien | `hasVisitors` | `shareStoreLink()` |
| 4 | Première vente | `hasFirstSale` | `/store/{slug}` (voir sa page) |

**Vérification** : Nouveau compte → voit 0/4. Après création d'un bloc → 1/4. Etc.

---

## PHASE 6 — Améliorations UX mineures

### 6.1 : Drag handle visible sur les blocs

**Fichiers modifiés** :
- `src/app/dashboard/blocks/page.tsx` (section liste de blocs)

**Action** : Ajouter une icône `GripVertical` (lucide) sur la gauche de chaque bloc dans la liste pour indiquer visuellement qu'on peut les réordonner.

```
┌──────────────────────────────────┐
│ ⋮⋮  📦 Programme Été     [ON] ⋯ │
│ ⋮⋮  🔗 Mon Instagram     [ON] ⋯ │
│ ⋮⋮  💰 Coaching 1:1      [OFF]⋯ │
└──────────────────────────────────┘
```

**Vérification** : Le handle est visible et le drag fonctionne correctement.

---

### 6.2 : Réorganiser la Sidebar desktop

**Fichiers modifiés** :
- `src/components/dashboard/Sidebar.tsx`

**Nouvelle structure** :

```
─── PRINCIPAL ───
Accueil          (Home)
Ma Page          (LayoutGrid)
Ventes           (ShoppingBag)      ← fusion commandes + réservations
Revenus          (DollarSign)

─── séparateur ───

─── OUTILS ───
Statistiques     (BarChart3)
Audience         (Users)            ← fusion clients + leads
Communautés      (MessageSquare)

─── séparateur ───

Réglages         (Settings)
```

**Changements** :
- Retirer "Commandes", "Réservations", "Clients", "Leads" (remplacés par Ventes et Audience)
- Ajouter des séparateurs visuels (`<div className="my-2 border-t border-gray-100" />`)
- Section "Outils" en texte label discret `text-[10px] uppercase text-gray-400 px-3`
- Nombre total d'items : **7** au lieu de **10**

**Vérification** : La sidebar reflète la nouvelle structure. Tous les liens fonctionnent.

---

### 6.3 : Simplifier la page Revenus

**Fichiers modifiés** :
- `src/app/dashboard/revenue/page.tsx`

**Changements structurels** :

Réorganiser en sections claires :
1. **Grande carte Solde** : montant + CTA "Retirer" (garder tel quel, c'est bien fait)
2. **2 cards métriques** : Revenus période + Commission (au lieu de 4 cards + DateRangePicker)
3. **Onglets** : `[Retraits] [Paiements reçus]` au lieu de tout empiler
4. **Graphique** : dans un accordion collapsé par défaut ("Voir le graphique ▾")

**Ce qui ne change PAS** : La modal de retrait (multi-étapes) est excellente, ne pas toucher.

**Vérification** : La page charge plus vite. Les informations essentielles sont visibles en haut.

---

## PHASE 7 — Mise à jour Design System

### 7.1 : Nouvelles conventions Dashboard

**Fichiers modifiés** :
- `instructions/3_DESIGN_SYSTEM.md` (ajout section Dashboard)

**Ajouts au design system** :

```markdown
## Dashboard — Conventions UI

### Navigation
- **BottomTabBar** : 5 onglets max, icône 22px + label 10px
- **Touch targets** : ≥ 48x48px partout
- **Onglet actif** : `text-teal-600`, inactif : `text-gray-400`
- **BottomSheet "Plus"** : grille 2×2, icônes 40px dans cercles colorés

### Cards métriques
- Border : `rounded-2xl border border-gray-200`
- Padding : `p-4`
- Icône dans un cercle coloré : `h-8 w-8 rounded-lg bg-{color}-50`
- Valeur : `text-xl font-extrabold`
- Label : `text-xs font-medium text-gray-500`

### Listes / Feeds
- Chaque item : `rounded-2xl border border-gray-200 bg-white p-4`
- Hover : `hover:border-gray-300 hover:shadow-sm`
- Active : `active:scale-[0.99]`
- Séparation entre items : `space-y-2` (pas de divider)

### Onglets (Pill tabs)
- Container : `flex gap-2`
- Actif : `bg-teal-600 text-white rounded-full px-4 py-2 text-xs font-semibold`
- Inactif : `bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full px-4 py-2 text-xs font-semibold`

### Empty States
- Icône centrée : `size-40 text-gray-300`
- Titre : `text-sm font-medium text-gray-900`
- Description : `text-xs text-gray-500`
- CTA : `Button` ou lien teal-600

### Bouton flottant (FAB)
- Position : `fixed bottom-24 right-4 z-30` (mobile only)
- Style : `h-12 w-12 rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/20`
- Animation : `transition-transform active:scale-90`

### Partage
- Bouton "Partager" utilise toujours `navigator.share()` sur mobile
- Fallback desktop : copier dans le presse-papier
- Bouton WhatsApp : `bg-green-500 text-white` avec lien wa.me

### Onboarding Checklist
- Container : `rounded-2xl border border-gray-200 bg-white`
- Progress bar : `h-2 rounded-full bg-teal-600` sur fond `bg-gray-100`
- Item complété : `text-teal-600` avec `CheckCircle`
- Item incomplet : `text-gray-400` avec cercle vide, cliquable
```

---

## Ordre d'implémentation

| Étape | Description | Fichiers principaux | Dépendances |
|-------|-------------|--------------------|----|
| **1.1** | BottomTabBar 5 onglets + MoreSheet | `BottomTabBar.tsx`, `MoreSheet.tsx` | — |
| **1.2** | Ne plus masquer BottomTabBar sur /blocks | `BottomTabBar.tsx` | 1.1 |
| **1.3** | FAB Aperçu mobile | `blocks/page.tsx` | 1.2 |
| **2.1** | Simplifier l'accueil | `dashboard/page.tsx` | — |
| **2.2** | Partage natif | `lib/share.ts`, `page.tsx`, `blocks/page.tsx` | — |
| **5.1** | OnboardingChecklist | `OnboardingChecklist.tsx`, `page.tsx` | 2.1 |
| **6.1** | Drag handle visible | `blocks/page.tsx` | — |
| **6.2** | Réorganiser Sidebar | `Sidebar.tsx` | 3.1, 4.1 |
| **3.1** | Fusion Commandes + Réservations → Ventes | `sales/page.tsx` | — |
| **4.1** | Fusion Clients + Leads → Audience | `audience/page.tsx` | — |
| **6.3** | Simplifier Revenus | `revenue/page.tsx` | — |
| **7.1** | Mise à jour Design System doc | `3_DESIGN_SYSTEM.md` | Toutes |

**Règle** : Chaque étape doit compiler sans erreur TypeScript avant de passer à la suivante.

---

## Ce qu'on NE touche PAS

- **Page publique store** (`/store/[slug]`) — pas de modification
- **Modal de paiement** (`PaymentModal.tsx`) — déjà bien faite
- **Système de thème** (`DesignEditor.tsx`, `StoreThemeProvider.tsx`) — juste corrigé
- **Modal de retrait** (multi-étapes dans revenue) — excellente UX
- **Formulaires de création/édition de blocs** — fonctionnels
- **Backend/API** — aucune modification côté serveur
- **Système d'auth** — ne pas toucher
- **Onboarding page** — ne pas toucher
- **Landing page** — ne pas toucher

---

## Métriques de succès

| Métrique | Avant | Objectif |
|----------|-------|---------|
| Items navigation mobile | 4 (+ 6 cachés) | 5 (accès total) |
| Pages dashboard | 10 | 7 |
| Lignes page accueil | ~509 | < 250 |
| Appels API accueil | 5 | 2 |
| Temps chargement accueil (3G) | ~3s | < 1.5s |
| Lignes page revenus | ~1037 | < 700 |
