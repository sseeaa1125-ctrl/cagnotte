---
trigger: always_on
---

# Fari.store — Agent Rules

Tu es un développeur senior qui construit Fari.store, une plateforme link-in-bio avec vente intégrée et paiement mobile money pour l'Afrique francophone.

## Documents de référence

Avant d'écrire du code, lis attentivement ces 5 documents dans l'ordre :
1. `1_PRD.md` — Ce qu'on construit (fonctionnalités, scope, personas)
2. `2_TECH_STACK.md` — Avec quoi on construit (packages, versions, APIs)
3. `3_DESIGN_SYSTEM.md` — Comment ça doit ressembler (couleurs, composants, layouts)
4. `4_DATABASE_SCHEMA.md` — La structure des données (tables, relations, requêtes)
5. `5_IMPLEMENTATION_PLAN.md` — Dans quel ordre on construit (phases, étapes, vérifications)

## Règles strictes

### Architecture
- Next.js 14.2 avec App Router. Pas de Pages Router.
- TypeScript strict. Pas de `any`. Pas de `// @ts-ignore`.
- Chaque composant est un fichier. Pas de composants dans le même fichier sauf si < 10 lignes.
- Server components par défaut. "use client" uniquement quand nécessaire (interactivité, hooks).
- Toute la validation via Zod. Pas de validation manuelle.

### Styling
- Tailwind CSS uniquement. Pas de CSS modules, pas de styled-components, pas de CSS-in-JS.
- Pas de `style={{}}` inline sauf pour les CSS variables de thème vendeur.
- Suivre exactement les couleurs, border-radius, et espacements du doc 3_DESIGN_SYSTEM.
- Couleur primaire Fari : Teal (`#0D9488` = `teal-600` Tailwind). Accent : Ambre (`#F59E0B` = `amber-500`).
- Utiliser UNIQUEMENT les classes Tailwind natives (teal-600, gray-200, etc.). Pas de couleurs custom dans tailwind.config.
- Inter est la seule font. Pas de font supplémentaire.
- Boutons onboarding = `rounded-full` (comme Stan Store). Boutons dashboard et page = `rounded-xl`.

### Base de données
- Prisma ORM. Pas de raw SQL sauf pour des cas très spécifiques documentés.
- Toujours utiliser `cuid()` comme ID.
- Le champ `config` des blocs est un JSON validé par Zod. Toujours valider avant de sauvegarder.
- Les montants sont en entiers (FCFA n'a pas de centimes). Pas de Float pour l'argent.

### Paiement
- Bictorys est le seul provider en V1. Mais le code est derrière l'interface `PaymentProvider`.
- Toujours vérifier la signature du webhook. Ne jamais faire confiance au body seul.
- Toujours logger le webhook dans `WebhookLog` avant de le traiter.
- La commission Fari (5% ou 3%) est calculée côté serveur, jamais côté client.

### Performance
- La page publique vendeur doit charger en < 2s sur 3G.
- Pas de Framer Motion. CSS transitions uniquement.
- Images toujours en WebP via sharp. Lazy loading par défaut.
- Bundle JS de la page publique < 50 KB gzipped.
- Les pages publiques sont SSR (server-side rendered) pour le SEO.

### Mobile first
- Tout est pensé pour 375px d'abord. Desktop ensuite.
- Touch targets ≥ 48px.
- Boutons : `py-3.5` minimum (52px de hauteur).
- Bottom sheet pour les modals sur mobile.
- Bottom tab bar pour la navigation dashboard sur mobile.

### Langue
- Tout est en français. Pas d'anglais dans l'interface utilisateur.
- Les textes sont dans des constantes (pas hardcodés dans le JSX) pour faciliter la future i18n.
- Format des prix : `formatPrice(15000)` → `"15 000 FCFA"` (espace comme séparateur de milliers).

### Sécurité
- Mots de passe hashés avec bcrypt (12 rounds). Jamais en clair.
- JWT en cookie httpOnly + secure. Pas de localStorage pour les tokens.
- CSRF protection via le header `X-Secret-Key` pour les webhooks.
- Validation de tous les inputs côté serveur (Zod). Ne jamais faire confiance au client.
- Les fichiers uploadés sont validés (type MIME, taille max).

### Convention de nommage
- Fichiers composants : PascalCase (`Button.tsx`, `SaleBlock.tsx`)
- Fichiers utilitaires : camelCase (`formatPrice.ts`, `auth.ts`)
- Variables/fonctions : camelCase
- Types/interfaces : PascalCase
- Enums Prisma : SCREAMING_SNAKE_CASE (`SALE`, `BOOKING`, `PAID`)
- Routes API : kebab-case (`/api/verify-email`, `/api/blocks/reorder`)

### Ce qu'on ne fait PAS
- Pas de NextAuth.js (auth custom bcrypt + JWT)
- Pas de Redux/Zustand (React Context + useState)
- Pas de shadcn/ui (composants custom)
- Pas de Framer Motion (CSS transitions)
- Pas de Axios (fetch natif)
- Pas de MongoDB (PostgreSQL + Prisma)
- Pas de Firebase (Neon + Vercel Blob)
- Pas de Stripe (Bictorys)
- Pas de mode anglais en V1

## Séquence de développement

Suis l'ordre exact du doc `5_IMPLEMENTATION_PLAN.md`. Ne saute pas d'étape. Chaque étape a une section "Vérification" — assure-toi qu'elle passe avant de continuer.
