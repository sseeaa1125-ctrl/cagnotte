# Audit 031 — SEO complet cagnotte.sn

**Date :** 2026-04-16
**Auditeur :** Claude (gsd-code-reviewer)
**Scope :** Toutes les pages publiques, layout, robots, sitemap, middleware, OG images, structured data, meta
**Methode :** Lecture source de chaque fichier page.tsx, layout.tsx, et composant SEO-critique

---

## Sommaire executif

Le site a une **base SEO solide** : metadata dynamique par cagnotte, OG image dynamique generee par cagnotte, sitemap dynamique, robots.txt, JSON-LD sur la home et les pages aide/detail, `lang="fr"`, canonical URLs sur les pages cles. Les lacunes sont concentrees sur (1) le manifest.json legacy Izy/Fari.store, (2) l'absence de JSON-LD Organization, (3) quelques pages sans canonical/OG, et (4) des images `<img>` sans next/image.

---

## 1. Metadata & Open Graph

### Ce qui est bien fait

| Page | title | description | og:title | og:description | og:image | twitter:card | canonical |
|------|-------|-------------|----------|----------------|----------|--------------|-----------|
| `/` (home) | Unique, absolue | Oui, riche keywords SN | Oui | Oui | Default `/og-default.png` | `summary_large_image` | Oui |
| `/c/[slug]` | Dynamique (`cagnotte.title`) | Dynamique (stripped HTML, 155 chars) | Oui | Oui | **Dynamique via opengraph-image.tsx** | `summary_large_image` | Oui |
| `/cagnottes` | Oui | Oui | Oui | Oui | Default (inherited) | Oui | Oui |
| `/aide` | Oui | Oui | Oui + url | Oui | Default | Oui | Oui |
| `/tarifs` | Oui | Oui | Non explicite | Non | Default | Non | Oui |
| `/a-propos` | Oui | Oui | Non | Non | Default | Non | Oui |
| `/cgu` | Oui | Oui | Non | Non | Default | Non | Oui |
| `/confidentialite` | Oui | Oui | Non | Non | Default | Non | Oui |
| `/mentions-legales` | Oui | Oui | Non | Non | Default | Non | Oui |
| `/comment` | Oui | Oui | Non | Non | Default | Non | **Non** |
| `/cookies` | Oui | Oui | Non | Non | Default | Non | **Non** |
| `/rgpd` | Oui | Oui | Non | Non | Default | Non | **Non** |

### Findings

#### SEO-01 [MEDIUM] Pages legales sans canonical URL

**Fichiers :** `src/app/(public)/comment/page.tsx`, `src/app/(public)/cookies/page.tsx`, `src/app/(public)/rgpd/page.tsx`

Ces pages n'ont pas de `alternates: { canonical: "..." }`. Bien que le risque de contenu duplique soit faible, les bonnes pratiques recommandent un canonical sur chaque page indexable.

**Fix :**
```tsx
export const metadata = {
  // ... existing
  alternates: { canonical: "https://cagnotte.sn/comment" },
};
```

#### SEO-02 [LOW] Pages secondaires sans OG/Twitter explicites

**Fichiers :** `/tarifs`, `/a-propos`, `/comment`, `/cookies`, `/rgpd`, `/cgu`, `/confidentialite`, `/mentions-legales`

Ces pages heritent du OG global du root layout (generique "cagnotte.sn"). Quand partagees sur WhatsApp/Facebook, le titre affiché sera le generique au lieu du titre de page. Impact reel faible car ces pages sont rarement partagees.

**Fix :** Ajouter `openGraph: { title, description }` et `twitter: { card, title, description }` a chaque page.

#### SEO-03 [INFO] Le root layout OG image est `/og-default.png` sans dimensions explicites de l'URL

Deja bien configure avec `width: 1200, height: 630` dans le metadata object. Correct.

---

## 2. Structured Data / JSON-LD

### Ce qui est bien fait

- **Homepage** (`/`) : JSON-LD `WebSite` avec name, url, description, inLanguage. Correct.
- **Cagnotte detail** (`/c/[slug]`) : JSON-LD `Event` avec name, description, url, startDate, endDate, organizer, eventStatus, eventAttendanceMode, location. Bon choix pragmatique.
- **Aide** (`/aide`) : JSON-LD `FAQPage` avec toutes les questions/reponses des sections. **Excellent** — eligibilite aux rich results Google.

### Findings

#### SEO-04 [MEDIUM] Pas de JSON-LD Organization

**Fichier :** `src/app/layout.tsx` ou `src/app/(public)/page.tsx`

Google recommande un schema `Organization` pour les entites commerciales. Cela aide le Knowledge Panel et la confiance marque.

**Fix :** Ajouter dans le root layout ou la homepage :
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "cagnotte.sn",
  "url": "https://cagnotte.sn",
  "logo": "https://cagnotte.sn/og-default.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "contact@cagnottes.sn",
    "contactType": "customer service",
    "availableLanguage": "French"
  },
  "sameAs": []
}
```

#### SEO-05 [LOW] JSON-LD Event pour les cagnottes — choix discutable

**Fichier :** `src/app/(public)/c/[slug]/page.tsx:267-286`

Le type `Event` fonctionne mais les cagnottes sont plutot des campagnes de financement. Il n'existe pas de schema officiel `Fundraiser` mais `DonateAction` ou `MonetaryGrant` pourraient etre plus semantiques. Le choix actuel est fonctionnel et n'est pas une erreur.

#### SEO-06 [LOW] Pas de BreadcrumbList JSON-LD

Pour les pages `/c/[slug]`, un breadcrumb JSON-LD (`Home > Cagnottes > [Titre]`) aiderait Google a afficher les breadcrumbs dans les SERP.

---

## 3. Canonical URLs

### Ce qui est bien fait
- Home, cagnotte detail, cagnottes listing, aide, tarifs, a-propos, cgu, confidentialite, mentions-legales : tous ont un canonical.
- Private cagnottes ont `robots: { index: false, follow: false }`. Correct.

### Findings
- SEO-01 couvre les 3 pages sans canonical (deja cite).

---

## 4. robots.txt & sitemap

### Ce qui est bien fait

- **robots.ts** : Bien configure. Allow `/`, `/c/`, `/cagnottes`, `/a-propos`, `/aide`, `/tarifs`. Disallow toutes les routes authed + API + auth.
- **sitemap.ts** : Dynamique. Fetche les cagnottes publiques depuis le backend. Inclut static pages + dynamic cagnotte URLs. `force-dynamic` + `revalidate: 3600`.
- Reference sitemap dans robots.txt.

### Findings

#### SEO-07 [MEDIUM] robots.txt ne bloque pas `/admin/`

**Fichier :** `src/app/robots.ts`

Le disallow list ne contient pas `/admin/`. Les pages admin sont protegees par middleware auth redirect mais Google pourrait decouvrir `/admin/connexion` (qui est public). Meme si le layout admin a `robots: { index: false }`, un disallow explicite dans robots.txt est plus robuste.

**Fix :**
```ts
disallow: [
  // ... existing
  "/admin/",
],
```

#### SEO-08 [LOW] sitemap.ts — `revalidate` et `force-dynamic` conflict

**Fichier :** `src/app/sitemap.ts:3-4`

```ts
export const dynamic = "force-dynamic";
export const revalidate = 3600;
```

`force-dynamic` rend `revalidate` inoperant (chaque requete est dynamique). L'un ou l'autre suffit. Pour une sitemap, `revalidate = 3600` seul serait preferable (un hit cache soulage le backend).

**Fix :** Supprimer `export const dynamic = "force-dynamic";` et garder uniquement `revalidate = 3600`.

#### SEO-09 [LOW] sitemap ne contient pas `/comment`

**Fichier :** `src/app/sitemap.ts`

La page `/comment` ("Comment ca marche") est indexable mais absente de la sitemap. Pages `/cookies` et `/rgpd` aussi, mais elles ont moins d'interet SEO.

---

## 5. Semantic HTML

### Ce qui est bien fait

- **`<main>`** present dans les deux layouts publics (`(public)/layout.tsx` et `(auth)/layout.tsx`).
- **`<article>`** correctement utilise pour les pages de contenu long (cgu, confidentialite, mentions, aide, tarifs, cagnotte detail).
- **`<header>`** dans les pages listing et a-propos.
- **`<section>`** avec `id` pour participants, trust items.
- Heading hierarchy : `h1` unique par page, `h2` pour les sous-sections.
- **`<nav>`** dans PublicNavbar.
- `aria-label` sur le mobile drawer, operator picker, burger button.
- `role="alert"` sur les messages d'erreur.

### Findings

#### SEO-10 [LOW] Home page: pas de `<h1>` visible au premier render pour les crawlers lents

**Fichier :** `src/app/(public)/_home/_Hero.tsx`

Le `<h1>` contient `HOME_HERO_LABELS.h1Part1` + `<RotatingHeadline />`. Si `RotatingHeadline` est un composant client avec animation, le texte complet du h1 pourrait ne pas etre dans le HTML initial. A verifier selon l'implementation de RotatingHeadline — si le texte est rendu en SSR avant l'animation, c'est correct.

---

## 6. Internal Linking

### Ce qui est bien fait

- Homepage lie vers `/cagnottes` (bouton "Voir toutes"), `/inscription`, `/tableau-de-bord`.
- Cagnottes featured sur la home lient vers `/c/[slug]`.
- Navbar contient : `/`, `/cagnottes`, `/comment`, `/aide`, `/a-propos`.
- 404 page lie vers `/` et `/cagnottes`.
- Pages a-propos et tarifs lient vers `/inscription` et `/cagnottes`.
- Footer (PreFooter + Footer components) probablement contient des liens vers les pages legales.

### Findings

#### SEO-11 [INFO] Pas de lien interne vers `/tarifs` dans la navbar

La navbar contient Accueil, Cagnottes, Comment, Aide, A propos — mais pas Tarifs. L'accès se fait uniquement via le footer ou les pages internes. Pas critique mais une page "Tarifs" est souvent un bon signal de confiance.

---

## 7. URL Structure

### Ce qui est bien fait

- `/c/[slug]` est court et clean. Le prefix `/c/` est optimal (court pour le partage WhatsApp).
- Slugs normalises en lowercase via middleware (301 redirect).
- Pas de trailing slashes inutiles.
- Routes en francais (`/connexion`, `/inscription`, `/tableau-de-bord`, `/cagnottes`, `/a-propos`).
- Cagnotte URLs shareable : `cagnotte.sn/c/mon-bapteme`.

### Findings

Aucun probleme. La structure `/c/[slug]` est excellente pour le marche cible (partage WhatsApp, SMS).

---

## 8. Image SEO

### Ce qui est bien fait

- OG image dynamique par cagnotte via `opengraph-image.tsx` — branded card 1200x630 avec titre, progress bar, stats.
- Images de cover ont `alt={c.title}` dans la liste featured (home).
- Payment logos ont `alt="Wave"`, `alt="Orange Money"`, etc. dans FeaturesPink.
- Avatar images ont `alt=""` (decorative, correct).

### Findings

#### SEO-12 [MEDIUM] Usage de `<img>` au lieu de `next/image` partout

**Fichiers multiples :** `_PublicCampaignsList.tsx:113`, `_FeaturesPink.tsx:26-48`, `c/[slug]/page.tsx:327`, `c/[slug]/paiement/page.tsx:528-549`

Toutes les images utilisent `<img>` natif avec `eslint-disable @next/next/no-img-element`. Cela desactive :
- L'optimisation automatique WebP/AVIF
- Le lazy loading intelligent
- Le responsive `srcSet`
- Le preloading LCP

Pour les **images de cover** des cagnottes (provenant de R2), c'est le cas le plus impactant : elles sont souvent la LCP (Largest Contentful Paint) sur mobile.

**Fix (prioritaire pour les cover images) :**
```tsx
import Image from "next/image";
<Image
  src={c.coverUrl}
  alt={c.title}
  fill
  className="object-cover"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  priority={idx === 0} // premier item = LCP probable
/>
```

Note : les images de payment logos (`/wave.png`, `/orange-money.png`) sont petites et statiques — `<img>` est acceptable pour celles-ci.

#### SEO-13 [LOW] Cover images dans la liste featured : pas de `loading="lazy"`

**Fichier :** `src/app/(public)/_home/_PublicCampaignsList.tsx:113`

Les `<img>` des cagnottes featured n'ont pas `loading="lazy"`. Sur mobile 3G, les 6 images chargent simultanement. Sans next/image, ajouter manuellement `loading="lazy"` sur les images below-the-fold.

#### SEO-14 [LOW] Avatar seller sur cagnotte detail : pas de dimensions explicites

**Fichier :** `src/app/(public)/c/[slug]/page.tsx:327-333`

L'avatar a `width={56} height={56}` en attributs mais utilise CSS classes `h-12 w-12 sm:h-14 sm:w-14` qui different. L'attribut width/height sert au CLS (Cumulative Layout Shift) — les valeurs devraient correspondre a la taille CSS dominante.

---

## 9. Performance signals for SEO

### Ce qui est bien fait

- Cagnotte detail page est un **server component** (SSR) — le HTML complet est envoye au crawler.
- Home page SSR avec fetch backend direct.
- Cagnottes listing SSR avec `force-dynamic`.
- Toutes les pages legales sont des **server components statiques** (zero JS client).
- `<main>` avec `animate-page-enter` — CSS only, pas de JS animation.

### Findings

#### SEO-15 [MEDIUM] `/c/[slug]/paiement` est un "use client" page sans SSR content

**Fichier :** `src/app/(public)/c/[slug]/paiement/page.tsx`

La page de paiement est entierement client-side. C'est correct car elle n'est pas indexable (pas dans le sitemap, pas accessible sans session stash). Pas un probleme SEO.

#### SEO-16 [LOW] ProgressPoll est un client component charge sur la page detail

**Fichier :** `src/app/(public)/c/[slug]/page.tsx:393`

Le composant de polling est client-side mais la page entiere est SSR. Le ProgressPoll hydrate avec les valeurs initiales server-side, donc le contenu est present dans le HTML initial pour les crawlers. Correct.

---

## 10. Mobile SEO

### Ce qui est bien fait

- `viewport` metadata : `width: device-width, initialScale: 1, viewportFit: cover`. Correct.
- `themeColor: "#172866"` — couleur de la barre d'adresse mobile.
- Boutons avec `min-h-12` ou `min-h-14` (48px+ touch targets).
- `py-3.5` minimum sur les CTA principaux.
- Mobile-first responsive : `sm:`, `md:`, `lg:` breakpoints.
- Safe area inset gere dans le mobile drawer footer.

### Findings

Aucun probleme majeur.

---

## 11. Internationalization

### Ce qui est bien fait

- `<html lang="fr">` dans root layout. Correct.
- OG locale : `"fr_FR"`. Correct.
- Tout le texte UI en francais.
- JSON-LD `inLanguage: "fr"`.

### Findings

#### SEO-17 [INFO] Pas de hreflang

Pas necessaire actuellement — le site est mono-langue francais pour le marche senegalais. Si une version Wolof ou anglaise est prevue, hreflang sera necessaire.

---

## 12. Page Speed indicators

### Ce qui est bien fait

- Pages publiques SEO-critiques (home, `/c/[slug]`, `/cagnottes`) sont SSR.
- Zero client JS sur les pages legales.
- Fonts Inter + Poppins chargees via `next/font/google` (self-hosted, pas de render-blocking Google Fonts fetch).
- Compression gzip active (backend middleware).
- HSTS, DNS prefetch actives.

### Findings

#### SEO-18 [MEDIUM] `force-dynamic` sur la homepage empeche le caching CDN

**Fichier :** `src/app/(public)/page.tsx:51`

```ts
export const dynamic = "force-dynamic";
```

La homepage est re-rendered a chaque requete. Avec 90% du trafic mobile SN (connexions lentes), un `revalidate = 60` permettrait au CDN de servir une version cachee pendant 60s, reduisant significativement le TTFB.

**Fix :**
```ts
export const revalidate = 60; // ISR: rebuild every 60s
```

---

## 13. Social sharing

### Ce qui est bien fait

- **WhatsApp / Facebook / Twitter** : Les cagnottes individuelles ont un OG image dynamique unique (opengraph-image.tsx) avec le titre, la progress bar, les stats, le badge festive/solidaire. **Excellent** — c'est le cas d'usage #1 (partage WhatsApp).
- OG type "article" pour les cagnottes (correctement traite par les social platforms).
- ShareSheet composant present sur la page detail + merci.

### Findings

#### SEO-19 [INFO] OG image de la homepage utilise l'image par defaut statique

L'image `/og-default.png` est generique. Pas un probleme — la homepage est rarement partagee directement (les utilisateurs partagent les cagnottes individuelles).

---

## 14. 404/Error pages

### Ce qui est bien fait

- **not-found.tsx** : `robots: { index: false, follow: false }`. Title "Page introuvable". Liens vers `/` et `/cagnottes`. Texte en francais.
- **error.tsx** : Client component avec `reset()` et lien retour. Texte en francais.
- Next.js retourne automatiquement 404 sur `notFound()` et 500 sur les erreurs.
- `notFound()` appele dans `/c/[slug]/page.tsx` quand la cagnotte n'existe pas.

### Findings

Aucun probleme. La gestion 404/500 est correcte.

---

## 15. Redirects

### Ce qui est bien fait

- **Slug normalization** : Middleware 301 redirect uppercase → lowercase. Correct pour la canonicalisation.
- **Authed routes** : 303 redirect vers `/api/auth/refresh-and-return`. Non-indexable.
- **Admin routes** : 303 redirect vers `/admin/connexion` sans cookie.

### Findings

#### SEO-20 [INFO] www → non-www et HTTP → HTTPS

Pas gere au niveau Next.js — doit etre configure au niveau DNS/CDN (Cloudflare, Vercel, Railway). A verifier au deploiement.

---

## 16. manifest.json — Legacy Izy/Fari.store

### Findings

#### SEO-21 [CRITICAL] manifest.json contient les donnees Izy/Fari.store

**Fichier :** `public/manifest.json`

```json
{
  "name": "Izy — Ta boutique dans ta bio",
  "short_name": "Izy",
  "description": "Le link-in-bio avec paiement mobile money pour les createurs d'Afrique.",
  "start_url": "/app",
  "theme_color": "#009b8d"
}
```

- **name** : "Izy" au lieu de "cagnotte.sn"
- **short_name** : "Izy" au lieu de "cagnotte.sn"
- **description** : "link-in-bio" au lieu de cagnotte
- **start_url** : `/app` n'existe pas
- **theme_color** : `#009b8d` (vert Izy) au lieu de `#172866` (navy cagnotte.sn)

Cela affecte : l'apparence PWA (install banner), les resultats Google "app" enrichis, le partage sur certains navigateurs.

**Fix :**
```json
{
  "name": "cagnotte.sn — La cagnotte qui fait du bien",
  "short_name": "cagnotte.sn",
  "description": "Cree ta cagnotte en ligne et collecte via Wave, Orange Money ou Free Money au Senegal.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F9FAFB",
  "theme_color": "#172866",
  "orientation": "portrait-primary",
  "lang": "fr",
  "categories": ["finance"],
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

#### SEO-22 [HIGH] Les icones PWA (icon-192x192.png, icon-512x512.png) sont probablement le logo Izy

**Fichier :** `public/icon-192x192.png`, `public/icon-512x512.png`

A verifier visuellement. Si ce sont encore les icones Izy/Fari.store, les remplacer par le logo cagnotte.sn.

#### SEO-23 [MEDIUM] apple-touch-icon.png probablement legacy

**Fichier :** `public/apple-touch-icon.png`

Utilisee quand un utilisateur iOS ajoute le site a l'ecran d'accueil. A verifier visuellement.

---

## 17. Fichiers legacy dans /public

### Findings

#### SEO-24 [LOW] Fichiers statiques residuels de Fari.store

**Fichiers :** `public/izy-store-og-green.png`, `public/brevo.png`, `public/systemeio.png`, `public/telegram.jpeg`, `public/sw.js`, `public/mobicash.png`, `public/mtn_money.png`, `public/moov.png`, `public/togocell.png`, `public/visa-mastercard.png`

Ces fichiers sont des residus du fork Fari.store. Ils ne sont probablement plus references mais :
- `sw.js` (service worker) pourrait etre enregistre dans le navigateur d'anciens utilisateurs
- `izy-store-og-green.png` est reference nulle part mais reste servable publiquement

**Fix :** Supprimer les fichiers non-references. Attention a `sw.js` — si un service worker legacy est enregistre, le supprimer sans desinstaller le SW cause des comportements etranges. Remplacer par un no-op SW.

---

## 18. Cagnotte detail — dangerouslySetInnerHTML

### Findings

#### SEO-25 [INFO] Usage de dangerouslySetInnerHTML sur la description — securise

**Fichier :** `src/app/(public)/c/[slug]/page.tsx:362-364`

```tsx
dangerouslySetInnerHTML={{
  __html: normalizeLegacyDescription(cagnotte.description),
}}
```

Passe par `sanitize-html` avec whitelist restrictive (`p, br, strong, em, b, i, u, a`). Les liens sont forces en `target="_blank" rel="noopener noreferrer nofollow"`. Le `nofollow` est une bonne pratique SEO pour les liens UGC.

Les deux autres usages de `dangerouslySetInnerHTML` sont pour JSON-LD (`JSON.stringify` d'un objet controle) — sans risque.

---

## Recapitulatif des findings par severite

### CRITICAL (1)

| ID | Issue | Fichier |
|----|-------|---------|
| SEO-21 | manifest.json legacy Izy — nom, description, start_url, theme_color incorrects | `public/manifest.json` |

### HIGH (1)

| ID | Issue | Fichier |
|----|-------|---------|
| SEO-22 | Icones PWA probablement logo Izy (a verifier visuellement) | `public/icon-*.png` |

### MEDIUM (6)

| ID | Issue | Fichier |
|----|-------|---------|
| SEO-01 | 3 pages sans canonical URL | `comment`, `cookies`, `rgpd` |
| SEO-04 | Pas de JSON-LD Organization | root layout ou homepage |
| SEO-07 | robots.txt ne bloque pas `/admin/` | `src/app/robots.ts` |
| SEO-12 | `<img>` au lieu de next/image pour les cover images | multiples |
| SEO-18 | `force-dynamic` homepage empeche caching CDN | `src/app/(public)/page.tsx` |
| SEO-23 | apple-touch-icon probablement legacy | `public/apple-touch-icon.png` |

### LOW (7)

| ID | Issue | Fichier |
|----|-------|---------|
| SEO-02 | Pages secondaires sans OG/Twitter explicites | 8 pages |
| SEO-05 | JSON-LD Event vs DonateAction pour cagnottes | `/c/[slug]/page.tsx` |
| SEO-06 | Pas de BreadcrumbList JSON-LD | `/c/[slug]/page.tsx` |
| SEO-08 | sitemap.ts force-dynamic + revalidate conflict | `src/app/sitemap.ts` |
| SEO-09 | `/comment` absent de la sitemap | `src/app/sitemap.ts` |
| SEO-13 | Cover images sans loading="lazy" | `_PublicCampaignsList.tsx` |
| SEO-24 | Fichiers statiques residuels Fari.store | `public/` |

### INFO (4)

| ID | Issue |
|----|-------|
| SEO-10 | RotatingHeadline dans h1 — verifier SSR |
| SEO-11 | `/tarifs` absent de la navbar |
| SEO-17 | Pas de hreflang (non necessaire actuellement) |
| SEO-19 | OG image homepage generique |
| SEO-20 | www/non-www + HTTP/HTTPS redirect — config CDN |
| SEO-25 | dangerouslySetInnerHTML securise via sanitize-html |

---

## Priorites de correction

### Sprint immediat (pre-launch)

1. **SEO-21** — Corriger `manifest.json` (5 min)
2. **SEO-22** — Verifier et remplacer les icones PWA (15 min)
3. **SEO-07** — Ajouter `/admin/` au disallow robots.txt (2 min)
4. **SEO-23** — Verifier et remplacer apple-touch-icon (5 min)

### Sprint court terme

5. **SEO-01** — Ajouter canonicals aux 3 pages manquantes (5 min)
6. **SEO-12** — Migrer les cover images vers next/image (30 min)
7. **SEO-18** — Passer la homepage en ISR revalidate=60 (5 min)
8. **SEO-04** — Ajouter JSON-LD Organization (10 min)

### Backlog

9. SEO-02, SEO-06, SEO-08, SEO-09, SEO-24 — corrections mineures

---

_Audit realise le 2026-04-16 par Claude (gsd-code-reviewer)_
_Scope : 25+ fichiers source, toutes les pages publiques et layouts_
