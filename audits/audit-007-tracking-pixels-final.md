# Audit 007 — Tracking Pixels : Audit Final Complet

**Date** : 2026-03-23  
**Scope** : Revue complète feature pixels de suivi (3 commits)  
**Fichiers audités** : 12  
**Build** : `next build` ✅ | `tsc` frontend ✅ | `tsc` backend ✅

---

## Résumé des 3 commits audités

1. `feat: add tracking pixels` — Schema + API + UI + injection store
2. `fix: audit-006` — XSS, checkout page, CSP, UX badges
3. `feat: conversion events` — Events achat sur /success, validation format, format hints

---

## Bugs trouvés et corrigés

### 🔴 BUG 1 — ConversionPixels : race condition SDKs pas encore chargés (CRITIQUE)

**Problème** : `PixelScripts` charge les SDKs (`fbevents.js`, `gtag.js`, `ttq`) avec `strategy="afterInteractive"` (asynchrone). `ConversionPixels` fire son `useEffect` immédiatement au mount. À ce moment, `window.fbq` / `window.gtag` / `window.ttq` n'existent pas encore → les checks échouent silencieusement → `firedRef.current = true` → **les events de conversion ne se déclenchent JAMAIS**.

**Impact** : Aucune conversion trackée sur la page /success. Les vendeurs pensent que leurs pixels marchent mais ne reçoivent aucune donnée de conversion dans Meta Ads, Google Ads ou TikTok Ads.

**Fichier** : `src/components/store/ConversionPixels.tsx`

**Fix** : Remplacement du fire-once par un mécanisme de retry :
- Délai initial de 300ms (laisse les scripts commencer à charger)
- Retry toutes les 500ms, max 20 tentatives (10s total)
- Vérifie que chaque SDK requis est disponible sur `window`
- Fire une seule fois quand tous les SDKs sont prêts
- Cleanup function qui empêche le fire après unmount

**Sévérité** : 🔴 Critique (fonctionnalité entièrement cassée)

---

### 🟡 BUG 2 — CSP manquait googleadservices.com

**Problème** : Google Ads envoie ses pings de conversion via `www.googleadservices.com/pagead/conversion/`. Ce domaine n'était ni en `script-src` ni en `connect-src`, bloquant silencieusement les conversions Google Ads.

**Fichier** : `next.config.ts`

**Fix** : Ajout de `https://www.googleadservices.com` aux deux directives.

**Sévérité** : 🟡 Moyenne (conversions Google Ads bloquées silencieusement)

---

### 🟢 BUG 3 — Query seller redondante dans PUT /pixels

**Problème** : Le PUT `/api/integrations/pixels` faisait un `prisma.seller.findUnique` pour obtenir le slug avant d'appeler `invalidateStoreCache()`, mais `invalidateStoreCache()` fait déjà son propre `findUnique` en interne. Double query inutile.

**Fichier** : `backend/src/routes/integrations.ts`

**Fix** : Suppression du `findUnique` redondant, appel direct à `invalidateStoreCache(sellerId)`.

**Sévérité** : 🟢 Faible (performance, 1 query DB en trop)

---

## Checklist complète — tous les points vérifiés

### Base de données
| Point | Statut |
|-------|--------|
| 4 champs `String?` sur `Seller` | ✅ |
| Noms cohérents (camelCase) | ✅ |
| Pas de migration cassante (champs optionnels) | ✅ |

### Backend — Routes
| Point | Statut |
|-------|--------|
| GET `/api/integrations/pixels` : auth requise | ✅ |
| PUT `/api/integrations/pixels` : CSRF + auth | ✅ |
| Validation Zod format spécifique par plateforme | ✅ |
| `trim()` avant sauvegarde en DB | ✅ |
| Empty string → `null` (pas de chaîne vide en DB) | ✅ |
| Invalidation cache store après PUT | ✅ |
| GET `/api/sellers/:slug` expose les 4 pixels | ✅ |
| GET `/api/sellers/:slug/blocks/:blockId` expose les 4 pixels | ✅ |
| GET `/api/orders/:ref/status` expose les pixels via seller (query initiale) | ✅ |
| GET `/api/orders/:ref/status` expose les pixels via seller (fallback Bictorys) | ✅ |
| Erreurs Zod renvoyées en 400 avec message clair | ✅ |
| Erreurs internes loggées + 500 générique | ✅ |

### Frontend — Types
| Point | Statut |
|-------|--------|
| `Seller` type : 4 champs `string \| null` | ✅ |
| `SellerMini` (blockId page) : 4 champs `string \| null \| undefined` | ✅ |
| `SellerInfo` (success page) : 4 champs `string \| null \| undefined` | ✅ |

### Frontend — PixelScripts.tsx
| Point | Statut |
|-------|--------|
| Sanitization defense-in-depth (regex strip) | ✅ |
| Early return si aucun pixel | ✅ |
| Meta : snippet officiel fbevents.js + noscript fallback | ✅ |
| Google : gtag.js partagé entre GA4 et Ads (1 seul script) | ✅ |
| TikTok : snippet officiel ttq | ✅ |
| `strategy="afterInteractive"` (performance) | ✅ |
| Pas de XSS possible (sanitization + regex backend) | ✅ |

### Frontend — ConversionPixels.tsx
| Point | Statut |
|-------|--------|
| `"use client"` directive | ✅ |
| Sanitization defense-in-depth | ✅ |
| Retry mechanism (300ms initial + 500ms × 20) | ✅ |
| Fire-once via `useRef` | ✅ |
| Cleanup function empêche fire après unmount | ✅ |
| Meta : `fbq('track', 'Purchase')` avec value + currency | ✅ |
| GA4 : `gtag('event', 'purchase')` avec transaction_id | ✅ |
| Google Ads : `gtag('event', 'conversion')` avec send_to | ✅ |
| TikTok : `ttq('track', 'CompletePayment')` avec value | ✅ |

### Frontend — Page intégrations
| Point | Statut |
|-------|--------|
| Fetch pixels au mount (Promise.all) | ✅ |
| État `pixels` + `pixelsSaved` séparés | ✅ |
| Bouton Save n'apparaît que si changement (`JSON.stringify` diff) | ✅ |
| Badge "Actif" (vert) uniquement si sauvé en DB | ✅ |
| Badge "Modifié" (ambre) si input ≠ sauvé | ✅ |
| Format hints sous chaque label | ✅ |
| Liens d'aide vers docs officielles | ✅ |
| Toast succès/erreur après save | ✅ |
| `ApiError` message affiché proprement | ✅ |
| Empty string → `null` dans le body du PUT | ✅ |

### Injection sur pages publiques
| Point | Statut |
|-------|--------|
| `/store/[slug]` (page principale) : PixelScripts ✓ | ✅ |
| `/store/[slug]/[blockId]` (checkout) : PixelScripts ✓ | ✅ |
| `/store/[slug]/success` : PixelScripts + ConversionPixels ✓ | ✅ |

### CSP (Content Security Policy)
| Directive | Domaines ajoutés | Statut |
|-----------|-----------------|--------|
| `script-src` | `connect.facebook.net`, `googletagmanager.com`, `google-analytics.com`, `googleads.g.doubleclick.net`, `googleadservices.com`, `analytics.tiktok.com` | ✅ |
| `connect-src` | `google-analytics.com`, `analytics.google.com`, `facebook.com`, `graph.facebook.com`, `googleads.g.doubleclick.net`, `googleadservices.com`, `analytics.tiktok.com` | ✅ |

### Régression
| Point | Statut |
|-------|--------|
| `next build` — 0 erreurs | ✅ |
| `tsc --noEmit` frontend — 0 erreurs | ✅ |
| `tsc --noEmit` backend — 0 erreurs | ✅ |
| Aucun import cassé | ✅ |
| Aucun type manquant | ✅ |
| Pages existantes non modifiées (sauf injection pixel) | ✅ |

---

## Flux fonctionnel vérifié

```
Vendeur saisit pixel ID dans Settings > Intégrations
  → Frontend valide format (formatHint visuel)
  → PUT /api/integrations/pixels
  → Backend valide regex Zod par plateforme
  → Sauvegarde en DB + invalidation cache

Visiteur accède à /{slug}
  → Backend renvoie seller avec pixels
  → PixelScripts injecte SDKs (afterInteractive)
  → fbq/gtag/ttq chargent et track PageView

Visiteur accède à /{slug}/{blockId} (checkout)
  → Backend renvoie seller avec pixels
  → PixelScripts injecte SDKs
  → PageView tracké

Visiteur paie → redirigé vers /{slug}/success?ref=XXX
  → Polling /api/orders/XXX/status
  → Quand PAID : seller avec pixels retourné
  → PixelScripts charge les SDKs
  → ConversionPixels attend les SDKs (retry 500ms × 20)
  → Fire Purchase/conversion/CompletePayment events
```

---

## Aucune recommandation restante

Toutes les recommandations de l'audit-006 ont été implémentées. Feature complète.
