# Audit 006 — Tracking Pixels Integration

**Date** : 2026-03-23  
**Scope** : Feature pixels de suivi (Meta, GA4, Google Ads, TikTok)  
**Fichiers audités** : 8

---

## Bugs trouvés et corrigés

### 🔴 BUG 1 — Faille XSS via injection dans les pixel IDs (CRITIQUE)

**Problème** : Les pixel IDs étaient injectés directement dans des template literals à l'intérieur de `<Script>` tags (`fbq('init', '${metaPixelId}')`). Un vendeur malveillant pouvait saisir `'); alert('XSS` comme ID de pixel et exécuter du JavaScript arbitraire sur la page publique de n'importe quel visiteur.

**Fichiers** :
- `backend/src/routes/integrations.ts` — validation Zod trop permissive (`.string().max(50)` seulement)
- `src/components/store/PixelScripts.tsx` — aucune sanitization côté rendu

**Fix** :
- Backend : ajout regex `/^[A-Za-z0-9\-_]+$/` sur chaque champ pixel (Zod)
- Frontend : ajout fonction `sanitizePixelId()` defense-in-depth qui strip tout caractère non alphanumérique

**Sévérité** : 🔴 Critique (XSS stored)

---

### 🔴 BUG 2 — Pixels absents sur la page détail/checkout (CRITIQUE)

**Problème** : Les pixels n'étaient injectés que sur la page store principale (`/[slug]`), mais PAS sur la page détail produit (`/[slug]/[blockId]`). C'est sur cette page que le visiteur passe à l'achat — ne pas y avoir les pixels = **aucun tracking de conversion possible**.

**Fichiers** :
- `backend/src/routes/sellers.ts` — le select de `/:slug/blocks/:blockId` ne renvoyait pas les champs pixels
- `src/app/store/[slug]/[blockId]/page.tsx` — pas d'import ni d'injection de `PixelScripts`

**Fix** :
- Backend : ajout `metaPixelId`, `googleAdsId`, `googleAnalyticsId`, `tiktokPixelId` au select
- Frontend : ajout des champs au type `SellerMini`, import + injection de `<PixelScripts>` après `<PageTracker>`

**Sévérité** : 🔴 Critique (pixels non fonctionnels sur la page la plus importante)

---

### 🟡 BUG 3 — CSP bloquait les requêtes de reporting des pixels

**Problème** : `connect-src` dans la CSP n'incluait pas `graph.facebook.com` (API de reporting Meta) ni `googleads.g.doubleclick.net` (reporting Google Ads). Les scripts se chargeaient mais ne pouvaient pas envoyer les événements.

**Fichier** : `next.config.ts`

**Fix** : Ajout de `graph.facebook.com` et `googleads.g.doubleclick.net` au `connect-src`.

**Sévérité** : 🟡 Moyenne (pixels chargés mais events silencieusement bloqués)

---

### 🟡 BUG 4 — Badge "Actif" trompeur avant sauvegarde (UX)

**Problème** : Le badge vert "Actif" s'affichait dès qu'on tapait dans un champ pixel, même avant d'avoir sauvegardé. L'utilisateur pouvait croire que le pixel était actif alors qu'il ne l'était pas.

**Fichier** : `src/app/dashboard/settings/integrations/page.tsx`

**Fix** :
- Ajout prop `savedValue` au composant `PixelField`
- Badge "Actif" (vert) uniquement si la valeur sauvée en DB est non vide et identique à l'input
- Badge "Modifié" (ambre) si l'input diffère de la valeur sauvée

**Sévérité** : 🟡 Moyenne (UX trompeuse)

---

## Points vérifiés sans problème

| Point | Statut |
|-------|--------|
| Schema Prisma : 4 champs String? corrects | ✅ |
| DB push + Prisma generate | ✅ |
| Route GET /pixels : auth requise, select correct | ✅ |
| Route PUT /pixels : CSRF + auth + Zod validation | ✅ |
| Invalidation cache store après PUT | ✅ |
| Types frontend Seller : 4 champs ajoutés | ✅ |
| PixelScripts : early return si aucun pixel | ✅ |
| PixelScripts : gtag.js partagé entre GA4 et Google Ads | ✅ |
| PixelScripts : strategy="afterInteractive" (performance) | ✅ |
| Meta noscript fallback | ✅ |
| Frontend : bouton Save n'apparaît que si changement | ✅ |
| Frontend : badge "Pixels actifs" quand sauvé | ✅ |
| Frontend : toast erreur en cas d'échec | ✅ |
| TypeScript compile clean (frontend + backend) | ✅ |

---

## Recommandations futures (hors scope V1)

1. **Events de conversion** : Envoyer `fbq('track', 'Purchase')` / `gtag('event', 'conversion')` / `ttq.track('CompletePayment')` sur la page `/success` après paiement confirmé. Nécessite de passer les pixels + montant à la page success.

2. **Validation format pixel ID** : Les regex actuelles acceptent tout alphanumérique. On pourrait valider les formats spécifiques :
   - Meta : `^\d{15,16}$`
   - GA4 : `^G-[A-Z0-9]+$`
   - Google Ads : `^AW-[A-Z0-9]+$`
   - TikTok : `^C[A-Z0-9]+$`

3. **Pages pending/error/community-success** : Ces pages n'ont pas de pixels. Faible priorité car le trafic y est minime.
