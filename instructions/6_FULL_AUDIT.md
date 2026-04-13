# Audit Complet de la Codebase Fari.store

> Audit end-to-end effectue le 28 fevrier 2026. Couvre la totalite de la codebase (frontend, backend, schema, config, securite) ainsi qu'un audit approfondi de la fonctionnalite communautes.

---

## BILAN GLOBAL

| Domaine | Score | Issues Critiques | Issues Hautes |
|---------|-------|-----------------|---------------|
| Securite & Auth | 6/10 | 3 | 5 |
| Routes API Backend | 7/10 | 1 | 3 |
| Schema DB & Prisma | 8/10 | 1 | 2 |
| Pages Frontend | 8/10 | 0 | 3 |
| Composants UI | 7.5/10 | 2 | 4 |
| Lib, Config, Types | 6.5/10 | 3 | 5 |
| Communautes (end-to-end) | 5.5/10 | 9 | 15 |
| **Total** | **7/10** | **19** | **37** |

---

# PARTIE 1 : AUDIT GENERAL DE LA CODEBASE

---

## 1. SECURITE & AUTHENTIFICATION

### CRITIQUES

**S1. Secrets potentiellement dans l'historique git**
- `backend/.env` est dans le `.gitignore` mais pourrait avoir ete committe anterieurement
- Contient JWT_SECRET, DATABASE_URL, cles Bictorys, Resend, R2, Google OAuth
- **Action** : Verifier `git log --all -- backend/.env`, rotation de tous les secrets si committe

**S2. CSRF : comparaison non timing-safe**
- `backend/src/lib/auth.ts:121` — utilise `!==` au lieu de `crypto.timingSafeEqual()`
- Token CSRF stocke dans un cookie `httpOnly: false` (lisible par JS)
- **Impact** : Vulnerabilite aux timing attacks

**S3. Pas de rate limiting specifique sur login/signup**
- `/api/auth/login` : rate limiter generique (20/15min) trop permissif
- `/api/auth/signup` : aucun rate limiter dedie
- `/api/auth/verify-email` : aucun rate limiter dedie
- **Impact** : Brute-force sur comptes existants, enumeration d'emails

### HAUTES

| # | Probleme | Localisation |
|---|----------|-------------|
| S4 | JWT expire en 7j sans refresh token — si compromis, acces 7 jours | `auth.ts:13` |
| S5 | Info leakage : "Ce compte utilise Google" revele que l'email existe | `auth.ts:356` |
| S6 | Pas de lockout apres tentatives echouees (seulement IP-based) | `auth.ts:341` |
| S7 | Codes de verification 6 digits = 1M combinaisons, brute-forceable | `utils.ts:30` |
| S8 | Pas de HSTS, CSP, X-Frame-Options au-dela des defaults Helmet | `index.ts:39` |

### BONNES PRATIQUES CONFIRMEES

- Bcrypt 12 rounds
- httpOnly + Secure + SameSite sur les cookies auth
- Zod validation sur tous les endpoints
- Webhook signature HMAC-SHA256 + timing-safe
- Chiffrement AES-256-GCM des tokens Telegram
- Upload : validation MIME par contenu reel (`file-type`)

---

## 2. ROUTES API BACKEND

### CRITIQUE

**R1. Rate limiting absent sur de nombreux endpoints d'ecriture**

| Endpoint | Rate Limit |
|----------|-----------|
| `POST /api/orders` | 10/min |
| `POST /api/communities/subscribe` | 10/min |
| `POST /api/partnerships` | 3/min |
| `PUT/DELETE /api/blocks/*` | **Aucun** |
| `POST /api/blocks/:id/reviews` | **Aucun** |
| `POST /api/analytics/track` | **Aucun** |
| `POST /api/withdrawals` | **Aucun** |
| `PUT /api/sellers/profile` | **Aucun** |

### HAUTES

| # | Probleme | Localisation |
|---|----------|-------------|
| R2 | Validation Zod incomplete : `title: z.string()` sans min/max | `blocks.ts:11` |
| R3 | `customFields: z.record(z.string())` sans profondeur ni cle max | `orders.ts:292` |
| R4 | Pas d'endpoint GET pour les order bumps | `blocks.ts` |

### POINTS FORTS

- Ownership verification (`sellerId`) sur tous les endpoints proteges
- Queries parametrisees (`$1, $2, $3`) sur les raw SQL
- Transaction Serializable sur les bookings et webhooks d'ordres
- Pagination correcte avec limites (50-500 max)
- Amount + currency verifies dans les webhooks d'ordres

---

## 3. SCHEMA DB & PRISMA

### CRITIQUE

**D1. Cascade delete sur Seller supprime TOUT (ordres, paiements, analytics)**
- Si un Seller est supprime → tous ses `Order` sont perdus
- **Risque legal** : obligation de conservation 7 ans pour les transactions financieres
- **Fix** : Soft delete (`deletedAt`) sur `Seller` et `Order`

### HAUTES

| # | Probleme | Localisation |
|---|----------|-------------|
| D2 | Index manquant `@@index([sellerId, type])` sur Block | `schema.prisma` |
| D3 | Seed : password `"password123"` hardcode sans garde `NODE_ENV` | `seed.ts:11` |

### MOYENNES

| # | Probleme |
|---|----------|
| D4 | `Order.customerId` nullable — possible incoherence avec `customerEmail` |
| D5 | Pas de validation `discountPrice < price` au niveau schema |
| D6 | `suggestedAmounts` valide `z.number()` au lieu de `z.number().int()` |
| D7 | Pas de `updatedAt` sur Review (incoherent avec les autres tables) |

### POINTS FORTS

- Tous les montants en `Int` (FCFA)
- `cuid()` partout pour les IDs
- `@@unique` sur toutes les contraintes critiques
- Transaction Serializable pour les double-bookings
- Idempotency double-verifiee dans les webhooks

---

## 4. PAGES FRONTEND

### POINTS FORTS

- Store page en **Server Component** avec `revalidate: 30` (SSR + ISR)
- Metadata dynamique par vendeur (OG, Twitter, canonical)
- `<html lang="fr">` defini correctement
- Skeleton loaders sur toutes les pages dashboard
- Auth layout redirige correctement (login → onboarding/dashboard)
- Tout le texte en francais

### HAUTES

| # | Probleme | Localisation |
|---|----------|-------------|
| P1 | Pas de validation client des URL params (`slug`, `id`, `ref`) | Multiple pages |
| P2 | Pas d'error boundary global dans le dashboard | `dashboard/layout.tsx` |
| P3 | `blocks/page.tsx` fait 1000+ lignes — devrait etre decoupe | `blocks/page.tsx` |

### MOYENNES

| # | Probleme |
|---|----------|
| P4 | Home page : bundle lourd (52KB+), beaucoup d'icones Lucide importees |
| P5 | Pas de focus visible (`:focus-visible`) sur les boutons custom |
| P6 | Modales sans focus trap |
| P7 | Drag-and-drop sans alternative clavier complete |
| P8 | Onboarding step check redondant (layout + page) |

---

## 5. COMPOSANTS UI

### CRITIQUES

**C1. Touch targets sous 48px**

| Composant | Taille reelle | Minimum requis |
|-----------|--------------|----------------|
| `Button.tsx` (py-3.5) | ~30px | 48px |
| `TimePicker.tsx` | 32px | 48px |
| `BottomTabBar.tsx` | 16px | 48px |
| `Modal.tsx` close button | 20px | 48px |

**C2. Aucun focus trap dans Modal.tsx**
- Les modales ne piegent pas le focus — l'utilisateur peut Tab hors de la modale
- Non conforme WCAG 2.1

### HAUTES

| # | Probleme | Localisation |
|---|----------|-------------|
| C3 | Images sans `loading="lazy"` | `SellerHeader.tsx`, `ProductPreview.tsx` |
| C4 | `useCallback` manquant sur le handler clavier de Modal | `Modal.tsx:32` |
| C5 | Texte UI hardcode dans les composants au lieu de `constants.ts` | Multiple |
| C6 | Boutons operateurs sans `role="radio"` ni `aria-checked` | `CommunityBlock.tsx` |

### POINTS FORTS

- Tailwind uniquement, aucun CSS module/styled-components
- Animations CSS uniquement (pas de Framer Motion)
- Teal-600 / amber-500 coherents
- `rounded-xl` dashboard, `rounded-full` onboarding
- `object-cover` + `aspect-*` sur toutes les images
- `loading="lazy"` sur la majorite des images

---

## 6. LIB, CONFIG, TYPES

### CRITIQUES

**L1. `next.config.ts` vide**
- Aucun security header (HSTS, CSP, X-Frame-Options)
- Aucune config d'images (domaines R2 manquants)
- Pas de rewrites/redirects

**L2. Pas de `tailwind.config.ts`**
- Utilise les defaults Tailwind au lieu du design system specifie
- Couleurs custom (teal-600, amber-500) doivent etre dans un config

**L3. Pas de timeout sur les appels API (`src/lib/api.ts`)**
- `fetch()` sans `AbortController` → requetes pendantes indefiniment
- **Impact** : DoS si le backend ne repond pas

### HAUTES

| # | Probleme | Localisation |
|---|----------|-------------|
| L4 | Deux hooks `useAuth()` differents (AuthContext + lib/hooks) | `contexts/` + `lib/hooks/` |
| L5 | Cache `useApi` non borne — fuite memoire | `lib/hooks/useApi.ts` |
| L6 | `Block.config` type `Record<string, unknown>` — pas de type safety | `types/index.ts` |
| L7 | `canvas-confetti` + `react-confetti` en doublon (~20KB) | `package.json` |
| L8 | Aucun framework de test configure | `package.json` |

### MOYENNES

| # | Probleme |
|---|----------|
| L9 | Constants incompletes : manque labels pour `BlockType`, `Plan`, `CommunityStatus` |
| L10 | `formatPrice()` hardcode `fr-FR`, pas de parametre locale |
| L11 | Pas d'error tracking (Sentry) en production |
| L12 | Logger custom (console only), pas de logs persistants |
| L13 | Retry API ne couvre pas les erreurs 5xx, seulement `TypeError` |

---

# PARTIE 2 : AUDIT APPROFONDI — COMMUNAUTES

---

## 7. COMMUNAUTES — BUGS CRITIQUES

### COM1. Aucune commission sur les paiements communautaires
- **`backend/src/routes/communities.ts:376`**
- Les abonnements communautaires **contournent entierement** le systeme de commission (5% free / 3% pro)
- CLAUDE.md exige : "Payment commission is always calculated server-side"
- **Impact** : Perte de revenus sur toutes les transactions communautaires

### COM2. Pas de creation de paiement apres renouvellement
- **`backend/src/lib/cron/communityBilling.ts:212`**
- Quand un abonnement est renouvele, les periodes sont mises a jour mais **aucun nouveau `CommunityPayment` n'est cree** pour le cycle suivant
- Le mois suivant, le cron ne trouve aucun paiement → marque comme echoue → boucle infinie de grace

### COM3. Operateurs de paiement manquants dans l'UI
- **`src/components/store/blocks/CommunityBlock.tsx:289`**
- L'UI n'affiche que 3 operateurs (Wave, Orange, Free) mais l'API accepte aussi `mtn_money` et `card`
- Les utilisateurs MTN Money et carte bancaire **ne peuvent pas souscrire**

### COM4. Annulation par simple email — pas d'authentification reelle
- **`backend/src/routes/communities.ts:540-544`**
- `POST /subscription/:id/cancel` ne requiert qu'un email correspondant
- L'email est enumerable → un attaquant pourrait annuler l'abonnement de quelqu'un d'autre
- **Fix** : Exiger un OTP envoye par email ou un token JWT

### COM5. Webhook communautaire sans isolation Serializable
- **`backend/src/routes/webhooks.ts:53-71`**
- Le handler d'ordres utilise `isolationLevel: "Serializable"` mais le handler communautaire ne le fait pas
- Si deux webhooks identiques arrivent en parallele → **emails en double**, invite link cree deux fois

### COM6. BigInt → Number perd en precision
- **`communityBilling.ts:359, 471`**
- `Number(sub.community.telegramChatId)` — Les IDs de supergroups Telegram sont de grands entiers negatifs
- `Number()` perd en precision au-dela de `2^53`
- Le ban pourrait cibler le **mauvais groupe/utilisateur**
- **Fix** : Passer `.toString()` a l'API Telegram

### COM7. Bot retire du groupe = kicks silencieusement echoues
- **`communityBilling.ts:356-364`**
- Si un admin retire le bot du groupe, tous les appels `banMember()` retournent 403 et sont ignores
- Les membres en grace ne sont jamais vires. Aucune alerte au vendeur

### COM8. Groupe Telegram supprime = facturation infinie
- Aucun mecanisme de detection si le groupe est supprime
- Le cron continue de facturer les abonnes, qui n'ont plus acces a rien

### COM9. Rate limit Telegram absent dans le cron
- Le cron envoie des DMs Telegram en boucle sans pause pour chaque abonne
- Limite Telegram : 30 msg/s. Avec 1000+ membres, les messages sont silencieusement droppes

---

## 8. COMMUNAUTES — BUGS HAUTES PRIORITE

| # | Probleme | Localisation |
|---|----------|-------------|
| COM10 | Calcul de grace non-deterministe (utilise `now` au lieu de `currentPeriodEnd`) | `communityBilling.ts:224` |
| COM11 | `memberCount` desynchronisable (peut devenir negatif) | Multiple fichiers |
| COM12 | Frequence du cron inadequate (6h, rappel J-3 rate possible) | `index.ts:207` |
| COM13 | Reutilisation de liens de paiement expires | `communityBilling.ts:373` |
| COM14 | Pas de contrainte unique sur `telegramUserId` par communaute | `schema.prisma` |
| COM15 | Pattern ban/unban fragile (sleep 1s, unban peut echouer = ban permanent) | `telegram.ts:77-86` |
| COM16 | Utilisateur rejoint sans invite link = telegramUserId jamais defini | `webhooksTelegram.ts:60` |
| COM17 | Race condition sur webhook join (deux users ecrasent l'un l'autre) | `webhooksTelegram.ts:62-72` |
| COM18 | Amount mismatch = echec silencieux total (pas de notification) | `webhooks.ts:38-42` |
| COM19 | Email failures apres paiement : membre paie mais pas d'invite link | `webhooks.ts:72-127` |
| COM20 | Abonnements PENDING jamais nettoyes (DB accumule des orphelins) | Pas de cleanup job |
| COM21 | Webhook logs communautaires jamais marques "processed" | `webhooks.ts:243` |
| COM22 | Lien d'invitation expire (24h) = aucun recours pour le membre | `webhooks.ts:82` |
| COM23 | Status `string` au lieu d'`enum` Prisma (pas de validation DB) | `schema.prisma:591` |
| COM24 | Types TypeScript incomplets (manque `lockedPrice`, `gracePeriodEnd`, etc.) | `types/index.ts:205` |

---

## 9. COMMUNAUTES — EMAILS

| # | Probleme | Severite |
|---|----------|----------|
| CE1 | Emails HTML uniquement, pas de version texte (risque spam) | Haute |
| CE2 | Header `List-Unsubscribe` manquant (RFC 2369) | Haute |
| CE3 | Entites HTML dans les sujets email (`&apos;` affiche tel quel) | Moyenne |
| CE4 | Pluralisation cassee : "Plus que 1 jour(s)" | Moyenne |
| CE5 | Lien de paiement `null` dans les rappels (Bictorys echoue = pas de lien) | Moyenne |
| CE6 | Aucun retry si Resend echoue (email perdu definitivement) | Moyenne |
| CE7 | Pas de notification vendeur quand un membre entre en grace | Moyenne |
| CE8 | Pas de lien de reabonnement dans l'email d'annulation | Basse |

---

## 10. COMMUNAUTES — FRONTEND

| # | Probleme | Severite |
|---|----------|----------|
| CF1 | Race condition polling apres unmount (state update on unmounted) | Moyenne |
| CF2 | Deux boucles de polling simultanees possibles (bouton "Reverifier") | Moyenne |
| CF3 | Modal : etat non reinitialise via Escape (donnees stales) | Moyenne |
| CF4 | `window.location.href` sans garde SSR | Moyenne |
| CF5 | Validation email trop permissive (accepte `a@b.c`) | Moyenne |
| CF6 | Parametres de recherche (`ref`) non valides | Moyenne |
| CF7 | Reponses API non validees a runtime (confiance aveugle au type TS) | Moyenne |
| CF8 | Boutons operateurs sans ARIA (`role`, `aria-checked`, `aria-label`) | Moyenne |

---

# PARTIE 3 : PLAN DE CORRECTIONS

---

## TOP 20 CORRECTIONS PAR PRIORITE

### Bloquantes pour la production (P0)

| # | Correction | Effort | Domaine |
|---|-----------|--------|---------|
| 1 | Verifier/rotater les secrets si `.env` dans l'historique git | 1h | Securite |
| 2 | Ajouter commission aux paiements communautaires | 1h | Communautes |
| 3 | Creer `CommunityPayment` apres chaque renouvellement reussi | 1h | Communautes |
| 4 | Ajouter `isolationLevel: "Serializable"` au webhook communautaire | 15min | Communautes |
| 5 | Fixer BigInt → Number (utiliser `.toString()` pour IDs Telegram) | 30min | Communautes |
| 6 | Ajouter CSRF timing-safe comparison | 15min | Securite |
| 7 | Rate limiting specifique sur `/auth/login` et `/auth/signup` | 30min | Securite |
| 8 | Timeout API avec `AbortController` (30s) | 30min | Frontend |
| 9 | Security headers dans `next.config.ts` (HSTS, CSP, X-Frame-Options) | 1h | Config |
| 10 | Soft delete sur `Seller` et `Order` (conservation legale) | 2h | Schema |

### Importantes (P1)

| # | Correction | Effort | Domaine |
|---|-----------|--------|---------|
| 11 | Detecter quand le bot est retire du groupe + alerter le vendeur | 2h | Communautes |
| 12 | Ajouter operateurs manquants (MTN, carte) dans l'UI communautes | 30min | Communautes |
| 13 | OTP pour l'annulation d'abonnement (remplacer email seul) | 2h | Communautes |
| 14 | Creer `tailwind.config.ts` avec le design system | 30min | Config |
| 15 | Configurer `images.remotePatterns` dans `next.config.ts` | 15min | Config |
| 16 | Supprimer le hook `useAuth` doublon dans `lib/hooks/` | 15min | Frontend |
| 17 | Borner le cache `useApi` (LRU, max 100 entries) | 1h | Frontend |
| 18 | Focus trap dans `Modal.tsx` | 1h | A11y |
| 19 | Touch targets >= 48px sur `Button`, `TimePicker`, `BottomTabBar` | 1h | A11y |
| 20 | Rate limiting sur endpoints d'ecriture (`/blocks/*`, `/withdrawals`) | 1h | Securite |

### Qualite (P2)

| # | Correction | Effort | Domaine |
|---|-----------|--------|---------|
| 21 | Error boundary global dans le dashboard layout | 30min | Frontend |
| 22 | Index `@@index([sellerId, type])` sur Block | 15min | Schema |
| 23 | `loading="lazy"` sur `SellerHeader` et `ProductPreview` | 15min | Performance |
| 24 | Supprimer `canvas-confetti` (garder `react-confetti`) | 15min | Bundle |
| 25 | Centraliser les labels manquants dans `constants.ts` | 1h | Qualite |
| 26 | Augmenter la frequence du cron communautes a 1-2h | 15min | Communautes |
| 27 | Ajouter emails version texte + header `List-Unsubscribe` | 2h | Emails |
| 28 | Fixer `gracePeriodEnd` (base sur `currentPeriodEnd`, pas `now`) | 15min | Communautes |
| 29 | Validation Zod : min/max sur tous les strings | 1h | Backend |
| 30 | Configurer Sentry pour l'error tracking en prod | 2h | Monitoring |

---

# PARTIE 4 : ARCHITECTURE — CE QUI EST BIEN FAIT

- Separation claire frontend/backend avec API REST
- Server Components par defaut, `"use client"` seulement quand necessaire
- ISR (30s) sur les pages publiques pour le SEO
- Abstraction du provider de paiement (interface `PaymentProvider`)
- Systeme de blocs extensible (type enum + config JSON + composant React)
- Cookie httpOnly pour l'auth (pas de localStorage)
- Prisma avec Neon serverless adapter
- Transaction Serializable sur les operations critiques
- Webhook idempotency avec double-verification
- HMAC-SHA256 + timing-safe pour les webhooks Bictorys
- Chiffrement AES-256-GCM pour les tokens sensibles
- IP hashe dans l'analytics (RGPD)
- Tout le texte UI en francais
- Prix en entiers FCFA (jamais de Float)
- `cuid()` coherent pour tous les IDs
- Upload avec detection MIME reelle (pas juste le header client)
- Skeleton loaders sur toutes les pages dashboard
- Metadata dynamique SEO par vendeur

---

## FICHIERS AUDITES (85+)

### Backend (25+ fichiers)
- `backend/src/routes/auth.ts`, `sellers.ts`, `blocks.ts`, `orders.ts`, `webhooks.ts`, `webhooksTelegram.ts`, `communities.ts`, `upload.ts`, `analytics.ts`, `withdrawals.ts`, `leads.ts`, `customers.ts`, `partnerships.ts`, `google-auth.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/lib/auth.ts`, `crypto.ts`, `email.ts`, `telegram.ts`, `prisma.ts`, `storage.ts`, `logger.ts`, `utils.ts`
- `backend/src/lib/payments/bictorys.ts`, `index.ts`
- `backend/src/lib/blocks/schemas.ts`
- `backend/src/lib/cron/communityBilling.ts`
- `backend/prisma/schema.prisma`, `seed.ts`

### Frontend (60+ fichiers)
- `src/app/page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `globals.css`
- `src/app/(auth)/layout.tsx`, `login/page.tsx`, `signup/page.tsx`
- `src/app/dashboard/layout.tsx`, `page.tsx`, `blocks/page.tsx`, `blocks/new/page.tsx`, `blocks/create/page.tsx`, `blocks/[id]/edit/page.tsx`, `bookings/page.tsx`, `settings/page.tsx`, `customers/page.tsx`, `statistics/page.tsx`, `orders/page.tsx`, `revenue/page.tsx`, `leads/page.tsx`, `communities/page.tsx`, `communities/new/page.tsx`, `communities/[id]/page.tsx`
- `src/app/store/[slug]/layout.tsx`, `page.tsx`, `success/page.tsx`, `pending/page.tsx`, `error/page.tsx`, `community-success/page.tsx`
- `src/app/onboarding/layout.tsx`, `page.tsx`
- `src/app/download/[ref]/page.tsx`
- `src/app/community/cancel/[id]/page.tsx`
- `src/components/ui/` (14 fichiers)
- `src/components/dashboard/` (15 fichiers)
- `src/components/store/` (18 fichiers)
- `src/lib/api.ts`, `constants.ts`, `utils.ts`, `deepLinks.ts`, `productTypes.ts`, `socialLinks.ts`
- `src/lib/hooks/useApi.ts`, `useAuth.ts`
- `src/contexts/AuthContext.tsx`, `ToastContext.tsx`
- `src/types/index.ts`

### Config
- `package.json` (frontend + backend)
- `tsconfig.json` (frontend + backend)
- `next.config.ts`
- `.gitignore`