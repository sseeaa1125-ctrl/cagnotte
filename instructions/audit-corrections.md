---
AUDIT POST-CORRECTIONS — IZY.STORE
Date : 27 février 2026
Build : next build ✅ | tsc --noEmit ✅ | prisma db push ✅
---

## RÉSUMÉ

Sur les **48 problèmes** identifiés dans l'audit initial (`flaws.md`), **25 ont été corrigés**
dans le code, **3 étaient déjà OK**, et **20 restent non corrigés** (principalement des
améliorations UX mineures et des fonctionnalités manquantes hors scope correctif).

---

## PARTIE 1 : SÉCURITÉ — 14 items

### ✅ CORRIGÉS (11/14)

| #   | Problème                                      | Statut | Vérification code                                                    |
|-----|-----------------------------------------------|--------|----------------------------------------------------------------------|
| S1  | Change password sans vérifier l'ancien        | ✅ OK  | `auth.ts:510-535` — `currentPassword` requis, `verifyPassword()` vérifié |
| S3  | Race condition webhook idempotence            | ✅ OK  | `webhooks.ts:150-197` — `$transaction` Serializable, check+update atomique |
| S5  | JWT renvoyé dans le body JSON                 | ✅ OK  | `auth.ts:264`, `auth.ts:371`, `google-auth.ts:159,218` — `token` supprimé de tous les `res.json()` |
| S7  | Comparaison code non timing-safe              | ✅ OK  | `auth.ts:20-24` — `timingSafeCompare()` utilisé dans verify-email (L220) et reset-password (L465) |
| S8  | timingSafeEqual crash si longueurs différentes | ✅ OK  | `webhooks.ts:58-62,68-72`, `orders.ts:580-583` — length guard avant chaque appel |
| S10 | Config bloc validé seulement LINK/PAYMENT     | ✅ OK  | `blocks.ts:173-174` (create) et `blocks.ts:259-262` (update) — `validateBlockConfig()` pour TOUS les types |
| S11 | fileUrl exposé sur page publique              | ✅ OK  | `sellers.ts:322-352` — `select` explicite, fileUrl/fileName/fileSize/redirectUrl exclus |
| S13 | Slugs réservés non validés                    | ✅ OK  | `auth.ts:48-53` — 18 slugs système bloqués (login, dashboard, admin, api, store, etc.) |
| S14 | Pas de max length mot de passe                | ✅ OK  | `auth.ts:29` (signup), `auth.ts:443` (reset), `auth.ts:513` (change) — `.max(128)` partout |

### ⚠️ ATTÉNUÉS (2/14)

| #   | Problème                                    | Statut       | Justification                                                        |
|-----|---------------------------------------------|--------------|----------------------------------------------------------------------|
| S2  | Comptes Google avec password vide `""`      | ⚠️ Atténué   | `auth.ts:532` — `!seller.password` (falsy pour `""`) bloque change-password pour Google users. Idéal : `password: null` en DB mais nécessite migration schema (String→String?) |
| S6  | CSRF avec sameSite "none"                   | ⚠️ Atténué   | Cross-origin Vercel→Railway impose `sameSite: "none"`. Protection via CORS strict (whitelist origins) + httpOnly cookie + mutations POST/PUT/DELETE uniquement |
| S12 | Proxy R2 sans auth                          | ⚠️ Atténué   | S11 supprime `fileUrl` du public → clés 32-char hex non devinables. Risque résiduel faible |

### ❌ NON CORRIGÉ (1/14)

| #   | Problème                                    | Raison                                                               |
|-----|---------------------------------------------|----------------------------------------------------------------------|
| S4  | Suppression compte fragile (onDelete manquant) | Partiellement résolu par D1 (onDelete Cascade sur Order→Seller). Le endpoint `DELETE /api/auth/account` n'a pas été audité en détail |
| S9  | Messages d'erreur upload exposent des détails | Hors scope des 3 sprints                                             |

---

## PARTIE 2 : API & BASE DE DONNÉES — 15 items

### ✅ CORRIGÉS (8/15)

| #   | Problème                                    | Statut | Vérification code                                                    |
|-----|---------------------------------------------|--------|----------------------------------------------------------------------|
| A1  | Pas de rate limit sur création commandes    | ✅ OK  | `orders.ts:34-41` — `createOrderLimiter` 10/min/IP sur `POST /api/orders` |
| A5  | Booking sans validation serveur             | ✅ OK  | `orders.ts:83-116` — date passée, minAdvanceHours, créneau déjà réservé |
| A7  | Availability sans check seller ownership    | ✅ OK  | `sellers.ts:393-399` — `service.block.sellerId !== seller.id` vérifié |
| D1  | Order→Seller manque onDelete Cascade        | ✅ OK  | `schema.prisma:244` — `onDelete: Cascade` ajouté                    |
| D2  | OrderBumpSelection→OrderBump manque onDelete| ✅ OK  | `schema.prisma:305` — `onDelete: Cascade` ajouté                    |
| D3  | Order→Product/BookingService manque onDelete| ✅ OK  | `schema.prisma:267,269` — `onDelete: SetNull` ajouté                |
| D4  | Index manquant productId/bookingServiceId   | ✅ OK  | `schema.prisma:292-293` — `@@index([productId])` et `@@index([bookingServiceId])` |
| D5  | commissionRate Float                        | ✅ OK  | `schema.prisma:250` → `Int` (basis points), `orders.ts:151-153` — 500=5%, 300=3% |

### ❌ NON CORRIGÉS (7/15)

| #   | Problème                                    | Raison                                                               |
|-----|---------------------------------------------|----------------------------------------------------------------------|
| A2  | Revenue chart charge tous les orders en RAM | Optimisation perf, hors scope sécurité                               |
| A3  | Analytics charge 10k PageViews en RAM       | Optimisation perf, hors scope sécurité                               |
| A4  | PAYMENT sans vérifier bloc actif            | Risque faible, hors scope                                            |
| A6  | Lead magnet ne vérifie pas prix=0           | Hors scope                                                           |
| A8  | Pas d'endpoint cancellation booking         | Fonctionnalité manquante (Partie 6)                                  |
| A9  | Pas d'expiration commandes PENDING          | Fonctionnalité manquante                                             |
| A10 | Stats lead magnet hors transaction          | Risque faible                                                        |

---

## PARTIE 3 : UX — 10 items

### ✅ CORRIGÉS (3/10)

| #   | Problème                                    | Statut | Vérification code                                                    |
|-----|---------------------------------------------|--------|----------------------------------------------------------------------|
| UX1 | window.open bloqué sur mobile               | ✅ OK  | `PaymentModal.tsx:119` — `window.location.href` au lieu de `window.open` |
| UX3 | setAuthToken no-op encore appelé            | ✅ OK  | Import et appels supprimés de `login/page.tsx`, `signup/page.tsx`, `AuthContext.tsx`. Reste uniquement la définition dans `api.ts` |

### ⚠️ DÉJÀ OK (1/10)

| #   | Problème                                    | Statut     | Vérification                                                         |
|-----|---------------------------------------------|------------|----------------------------------------------------------------------|
| UX2 | Pas de loading gate dans dashboard          | ⚠️ Déjà OK | `dashboard/layout.tsx:54-59` — Spinner affiché pendant `loading`     |

### ❌ NON CORRIGÉS (6/10)

| #    | Problème                                   | Raison                                                               |
|------|--------------------------------------------|----------------------------------------------------------------------|
| UX4  | Calendrier ignore slots specificDate       | Refonte calendrier, hors scope                                       |
| UX5  | Touch targets sociaux 32px < 48px          | Amélioration UI mineure                                              |
| UX6  | Pas d'empty state booking                  | Amélioration UX                                                      |
| UX7  | PaymentBlock accepte NaN                   | Amélioration UX                                                      |
| UX8  | Pas de focus trap/ARIA dans sheets         | Accessibilité — important mais gros chantier                         |
| UX9  | Drag-and-drop inaccessible clavier         | Accessibilité                                                        |
| UX10 | Pas de retry button erreur réseau          | Amélioration UX                                                      |

---

## PARTIE 4 : UI — 8 items

### ✅ CORRIGÉS (5/8)

| #   | Problème                                    | Statut | Vérification code                                                    |
|-----|---------------------------------------------|--------|----------------------------------------------------------------------|
| UI1 | Texture externe transparenttextures.com     | ✅ OK  | `(auth)/layout.tsx:39` — remplacé par `radial-gradient` CSS pur     |
| UI2 | Google Fonts render-blocking                | ✅ OK  | `StoreThemeProvider.tsx:49-55` — `preconnect` ajouté (next/font impossible en dynamique) |
| UI4 | Footer fixed overlap contenu mobile         | ✅ OK  | `IzyFooter.tsx:84` — spacer `h-10` + `safe-area-inset-bottom` + gradient bg |
| UI5 | Prix barré inversé                          | ✅ OK  | `SaleBlock.tsx:242-260` — `discountPrice < price` → prix original barré, discount affiché |
| UI8 | formatPreviewPrice dupliqué                 | ✅ OK  | `ProductPreview.tsx:4` — `import { formatPrice }` from `@/lib/utils` |

### ❌ NON CORRIGÉS (3/8)

| #   | Problème                                    | Raison                                                               |
|-----|---------------------------------------------|----------------------------------------------------------------------|
| UI3 | style={{}} non-CSS-variable                 | Refonte styling, effort important                                    |
| UI6 | Calendrier commence dimanche                | ✅ **EN FAIT CORRIGÉ** — voir ci-dessous                            |
| UI7 | Landing page "use client" 54KB              | Refonte SSR, effort important                                        |

**Note UI6** : `BookingCalendar.tsx:24-25` → `JOURS_FR = ["Lun", "Mar", ...]` et `L39` → `(firstDay.getDay() + 6) % 7` pour Monday-first. **✅ CORRIGÉ.**

---

## PARTIE 5 : FLOW — 5 items

### ✅ CORRIGÉS (2/5)

| #   | Problème                                    | Statut | Vérification code                                                    |
|-----|---------------------------------------------|--------|----------------------------------------------------------------------|
| FL1 | Pas de guard auth sur login/signup          | ✅ OK  | `(auth)/layout.tsx:17-26` — appel `/api/auth/me`, redirect si authentifié |
| FL2 | Onboarding non vérifié dans dashboard       | ✅ OK  | `dashboard/layout.tsx:47-52` — `useEffect` redirect `/onboarding` si `!seller.onboardingCompleted` |

### ❌ NON CORRIGÉS (3/5)

| #   | Problème                                    | Raison                                                               |
|-----|---------------------------------------------|----------------------------------------------------------------------|
| FL3 | Pas de retour au produit après erreur paiement | Amélioration UX                                                   |
| FL4 | Transition booking saccadée                 | Amélioration UX                                                      |
| FL5 | 5 fonctionnalités cachées dans hamburger    | Architecture navigation, hors scope                                  |

---

## PARTIE 6 : FONCTIONNALITÉS MANQUANTES

Aucune fonctionnalité manquante n'a été ajoutée dans ce sprint de corrections.
Ce sont des développements de features, pas des corrections de bugs.

---

## FICHIERS MODIFIÉS (récapitulatif complet)

### Backend (8 fichiers)
- `backend/prisma/schema.prisma` — D1, D2, D3, D4, D5
- `backend/src/routes/auth.ts` — S1, S5, S7, S8, S13, S14, timingSafeCompare helper
- `backend/src/routes/google-auth.ts` — S5
- `backend/src/routes/webhooks.ts` — S3, S8
- `backend/src/routes/orders.ts` — A1, A5, D5, S8
- `backend/src/routes/sellers.ts` — S11, A7
- `backend/src/routes/blocks.ts` — S10 (create + update)
- `backend/src/lib/auth.ts` — aucun changement (S6 déjà OK)

### Frontend (10 fichiers)
- `src/app/(auth)/layout.tsx` — FL1, UI1
- `src/app/(auth)/login/page.tsx` — UX3, S5 type cleanup
- `src/app/(auth)/signup/page.tsx` — UX3, S5 type cleanup
- `src/app/dashboard/layout.tsx` — FL2
- `src/app/dashboard/settings/page.tsx` — S1 (currentPassword field)
- `src/components/store/PaymentModal.tsx` — UX1
- `src/components/store/StoreThemeProvider.tsx` — UI2
- `src/components/store/BookingCalendar.tsx` — UI6
- `src/components/store/IzyFooter.tsx` — UI4
- `src/components/store/blocks/SaleBlock.tsx` — UI5
- `src/components/dashboard/ProductPreview.tsx` — UI8
- `src/contexts/AuthContext.tsx` — UX3

---

## SCORE FINAL

| Catégorie       | Total | ✅ Corrigé | ⚠️ Atténué/Déjà OK | ❌ Restant |
|-----------------|-------|-----------|---------------------|-----------|
| Sécurité (S)    | 14    | 9         | 3                   | 2         |
| API/DB (A+D)    | 15    | 8         | 0                   | 7         |
| UX              | 10    | 2         | 1                   | 7         |
| UI              | 8     | 6         | 0                   | 2         |
| Flow (FL)       | 5     | 2         | 0                   | 3         |
| **TOTAL**       | **52**| **27**    | **4**               | **21**    |

### Vulnérabilités critiques : **5/5 corrigées** ✅
- S1 (change password) ✅
- S3 (webhook race condition) ✅
- S11 (fileUrl exposé) ✅
- A1 (rate limit orders) ✅
- UX1 (popup blocker paiement) ✅

### Items restants non corrigés (par priorité) :
1. **S4** — Suppression compte robuste (transaction complète)
2. **S9** — Messages d'erreur upload trop verbeux
3. **A2/A3** — Agrégations SQL au lieu de JS en RAM
4. **A4/A6** — Validations métier manquantes (payment bloc actif, lead magnet prix=0)
5. **UX4-UX10** — Améliorations UX et accessibilité
6. **UI3/UI7** — Refonte styling et SSR landing page
7. **FL3-FL5** — Améliorations parcours utilisateur
