# Izy.store — Design System & Guidelines (v2 - Cinematic)

Ce document décrit le nouveau design system basé sur la refonte de la Landing Page "Cinematic".

## Couleurs principales
- **Primaire (Teal)** : `teal-600` (#0D9488) pour les fonds principaux, les accents, les boutons d'action secondaire/primaire en dehors du Hero.
- **Accent/Action (Amber)** : `amber-400` (#FBBF24) pour les boutons principaux d'appel à l'action (CTA) sur fond foncé, les badges "Nouveau", le texte mis en avant.
- **Neutres** : `gray-50` pour les fonds de section clairs, `gray-900` pour le texte principal, `gray-500` pour le texte secondaire.

## Typographie
- **Font** : Inter (sans-serif par défaut Tailwind).
- **Titres (H1, H2)** : `font-extrabold`, `tracking-tight` (très serré), `leading-[1.1]` (très compact).
- **Sous-titres** : `font-medium`, `text-gray-500` ou `text-teal-50` (sur fond foncé).

## Formes & Ombres (Card UI)
- **Boutons principaux (CTA)** : `rounded-full` (capsule).
- **Cartes & Conteneurs (Bento)** : `rounded-[2rem]` à `rounded-[3rem]` (très arrondis, style iOS/Apple).
- **Ombres (Shadows)** : 
  - Cartes : `shadow-xl border border-gray-100` (ou `gray-200`).
  - Boutons CTA : Ombres colorées `shadow-lg shadow-teal-600/20` ou `shadow-amber-400/20`.

## Animations "Cinematic" (Keyframes CSS)
Toutes les animations clés sont définies en CSS (Tailwind inline ou dans le fichier global).

### 1. Bouton "Pulse & Shine" (CTA)
Utilisé pour attirer l'œil sur les boutons d'inscription. Combine un pulse externe et un balayage interne.
```css
/* Pulse doré (Hero) */
@keyframes pulse-gold {
  0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
}
/* Pulse vert (Autres CTA) */
@keyframes pulse-teal {
  0% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(13, 148, 136, 0); }
  100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0); }
}
/* Balayage brillant (Shine) */
@keyframes shine {
  0% { transform: translateX(-150%) skewX(-15deg); }
  50% { transform: translateX(150%) skewX(-15deg); }
  100% { transform: translateX(150%) skewX(-15deg); }
}
```
**Classes Tailwind :** `animate-pulse-gold`, `animate-pulse-teal`, `animate-shine`.

### 2. Flamme qui vacille
Pour l'icône de la section "Arrête de brûler ton argent".
```css
@keyframes flicker {
  0%, 100% { transform: scale(1) rotate(-1deg); opacity: 1; }
  25% { transform: scale(1.05) rotate(2deg); opacity: 0.9; }
  50% { transform: scale(0.95) rotate(-2deg); opacity: 1; }
  75% { transform: scale(1.02) rotate(1deg); opacity: 0.95; }
}
```
**Classe Tailwind :** `animate-flicker` avec `transform-origin: bottom center;`

### 3. Effet "dessin à la main" (SVG Underline)
```css
@keyframes draw {
  0% { stroke-dasharray: 200; stroke-dashoffset: 200; }
  50% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
```
**Classe Tailwind :** `animate-draw`

## Formulaires (Auth & Inputs)
- **Style des inputs** : `rounded-xl`, fond `bg-gray-50/50`, bordure `border-gray-200`.
- **Focus state** : `focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10`.
- **Labels** : `text-xs font-bold text-gray-700`.
- **Layout Auth** : Fond gris clair (`bg-gray-50/80`) avec des blobs floutés en arrière-plan (`blur-[100px]`). Le formulaire est dans une carte blanche ultra-arrondie (`rounded-[2rem]`) et centré.

## Bonnes pratiques UI/UX
- **Mobile First** : Toujours utiliser `w-full` et `max-w-md` ou similaires pour les formulaires.
- **Séparation visuelle (Toggle Email/Google)** : Utiliser un diviseur avec "OU" centré.
- **Bouton secondaire (Google)** : Fond blanc, bordure grise, icône, `text-gray-700`, hover sur `bg-gray-50`.
- **Micro-interactions** : Tous les clics (boutons, inputs) doivent avoir `transition-all active:scale-95`.
- **Attente (Loading)** : Remplacer le texte du CTA par "Validation..." ou "Création..." pendant le chargement. Empêcher le clic multiple (`disabled={loading}`).

---

## Dashboard — Conventions UI (v2)

### Navigation mobile (BottomTabBar)
- **5 onglets max** : Accueil, Ma Page, Ventes, Revenus, Plus
- **Touch targets** : ≥ 48×48px (`min-w-[48px] min-h-[48px]`)
- **Onglet actif** : `text-teal-600`
- **Onglet inactif** : `text-gray-400`
- **Icônes** : `size={22}`, labels `text-[10px] font-medium`
- **BottomSheet "Plus"** : grille 2×2 ou 2×3, icônes `h-10 w-10` dans cercles colorés (`rounded-xl bg-{color}-50`), labels `text-xs font-semibold`
- **Jamais masqué** sauf dans les formulaires de création/édition

### Sidebar desktop
- **Sections avec séparateurs** : items principaux en haut, outils au milieu, réglages en bas
- **Séparateur** : `<div className="my-2 border-t border-gray-100" />`
- **Label de section** : `text-[10px] uppercase tracking-wider text-gray-400 px-3 mb-1`
- **7 items max** (au lieu de 10)

### Cards métriques
- Container : `rounded-2xl border border-gray-200 bg-white p-4`
- Icône dans cercle : `flex h-8 w-8 items-center justify-center rounded-lg bg-{color}-50`
- Valeur principale : `text-xl font-extrabold text-gray-900`
- Label : `text-xs font-medium text-gray-500`
- Sur l'accueil : **2 cards max** (Aujourd'hui + Ce mois)

### Listes / Feeds
- Chaque item : `rounded-2xl border border-gray-200 bg-white p-4`
- Hover desktop : `hover:border-gray-300 hover:shadow-sm`
- Active mobile : `active:scale-[0.99]`
- Espacement : `space-y-2` (pas de divider lines)

### Onglets internes (Pill tabs)
- Container : `flex gap-2 overflow-x-auto`
- Actif : `bg-teal-600 text-white rounded-full px-4 py-2 text-xs font-semibold`
- Inactif : `bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full px-4 py-2 text-xs font-semibold`
- Touch target : `py-2` minimum (40px hauteur)

### Empty States (composant `EmptyState`)
- Icône centrée : `size={40} className="text-gray-300"`
- Titre : `text-sm font-medium text-gray-900`
- Description : `text-xs text-gray-500 max-w-xs mx-auto`
- CTA primaire : `Button` ou `Link` teal-600

### Bouton flottant (FAB)
- Position : `fixed bottom-24 right-4 z-30` (mobile only, `lg:hidden`)
- Style : `h-12 w-12 rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/20`
- Animation : `transition-transform active:scale-90`
- Icône : centrée, `size={20}`

### Partage
- **Mobile** : toujours utiliser `navigator.share()` (API Web Share native)
- **Desktop** : fallback `navigator.clipboard.writeText(url)`
- **WhatsApp** : `bg-green-500 text-white rounded-full` avec lien `wa.me/?text=...`
- **UTM tracking** : ajouter `?utm_source={platform}&utm_medium=share` automatiquement

### Onboarding Checklist
- Container : `rounded-2xl border border-gray-200 bg-white p-4`
- Progress bar : `h-2 rounded-full bg-gray-100` avec fill `bg-teal-600 rounded-full transition-all`
- Item complété : icône `CheckCircle` `text-teal-600`, texte `line-through text-gray-400`
- Item incomplet : cercle vide `border-2 border-gray-300 rounded-full`, texte `text-gray-900 font-semibold`, cliquable
- Disparaît quand 4/4 complétées + user ferme (localStorage)

### Drag & Drop (blocs)
- Handle visible : icône `GripVertical` `text-gray-300` à gauche de chaque bloc
- Dragging state : `shadow-lg scale-[1.02] opacity-90 bg-white`
- Drop target : `border-2 border-dashed border-teal-300`

### Page Titres
- H1 page : `text-xl font-bold text-gray-900` (compact, pas text-2xl sauf accueil)
- Sous-titre : `mt-1 text-sm text-gray-500`
- Accueil greeting : `text-2xl font-extrabold text-gray-900` (exception)
