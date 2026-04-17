# Audit 031 — Mobile Responsiveness & UX Complet

**Date :** 2026-04-16
**Auditeur :** Claude (code-reviewer)
**Scope :** Toute la surface frontend (public + authed + auth)
**Cible :** 375px mobile, 3G/4G Senegal, 90% mobile traffic

---

## Verdict Global

**La base mobile est SOLIDE.** Le codebase est genuinement mobile-first : styles de base = mobile, responsive breakpoints ajoutent de la complexite vers le haut. Les touch targets, le safe-area handling, la typography, et la gestion du BottomNav sont bien faits. Les problemes ci-dessous sont des correctifs chirurgicaux, pas une refonte.

---

## 1. Breakpoint Consistency

**Verdict : BON** — Le design est veritablement mobile-first.

Les styles de base (sans prefixe) ciblent le mobile. Les breakpoints `sm:` (640px), `md:` (768px), `lg:` (1024px) ajoutent progressivement. Pattern coherent sur toutes les pages.

### INFO — I-01 : Quelques valeurs hardcodees pourraient beneficier de clamp()

**Fichier :** `src/app/(public)/c/[slug]/ProgressPoll.tsx:87`
**Constat :** Bon usage de `text-[clamp(1.5rem,5vw,2.25rem)]` pour le montant collecte. Ce pattern devrait etre generalise.
**Suggestion :** Considerer `clamp()` aussi pour le h1 du Hero (`_Hero.tsx:29`) qui saute de `text-4xl` a `text-7xl` — le saut entre `sm:text-5xl` et `md:text-6xl` est fluide mais le gap 4xl->5xl a 640px peut etre brusque sur les 400-639px.

---

## 2. Touch Targets

**Verdict : BON** — CLAUDE.md exige min 48px, c'est respecte presque partout.

### MEDIUM — M-01 : Back link sur /participer et /paiement trop petit

**Fichier :** `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx:177-181`
**Fichier :** `src/app/(public)/c/[slug]/paiement/page.tsx:408-413`
**Constat :** Le lien "Retour a la cagnotte" est un `inline-flex items-center` sans padding vertical explicite. La zone tappable depend uniquement de la hauteur du texte (~20px + line-height). Sur mobile, le pouce rate facilement ce lien.
**Fix :**
```tsx
<Link
  href={`/c/${slug}`}
  className="inline-flex min-h-12 items-center gap-2 rounded-lg px-2 -ml-2 font-bold text-primary transition-colors hover:text-primary-hover hover:bg-muted"
>
```

### MEDIUM — M-02 : Footer links trop serres sur mobile

**Fichier :** `src/components/layout/Footer.tsx:70-79`
**Constat :** Les liens dans les colonnes "Produit", "Aide", "Legal" ont `space-y-2` (8px gap). A 14px font-size, la zone tappable totale par lien est ~22px. Bien en dessous des 48px. Les 6 liens "Aide" sont les plus problematiques — 6 items serres sur une colonne etroite.
**Fix :** Ajouter `py-2` sur chaque `<Link>` dans les listes pour atteindre ~44px minimum, ou augmenter a `space-y-3`.

### LOW — L-01 : "En savoir +" dans CookieBanner en mode "intro"

**Fichier :** `src/components/layout/CookieBanner.tsx:123-126`
**Constat :** Le lien inline "En savoir +" a l'interieur du paragraphe est un text link sans padding. Difficile a taper mais c'est un lien secondaire — acceptable.

---

## 3. Typography Scaling

**Verdict : EXCELLENT**

### Positif

- **iOS zoom prevention :** `globals.css:534-540` — La regle `@supports (-webkit-touch-callout: none)` force `font-size: max(16px, 1em)` sur tous les inputs. C'est exactement la bonne approche.
- **Input component :** `Input.tsx:57` — `text-base` (16px) par defaut. Pas de zoom sur focus iOS.
- **Textarea :** `Textarea.tsx:49` — Meme pattern, `text-base`.
- **Body text :** Font Inter, `text-base` par defaut. Lisible.
- **Headings :** Poppins, poids varies, scaling responsive.

### INFO — I-02 : text-[11px] et text-[10px] tres frequents

**Fichiers multiples :** ParticiperForm.tsx:380, paiement/page.tsx:553, CagnotteDetailPage:301, etc.
**Constat :** Le label `text-[10px]` (ex: "Vous participez a") et `text-[11px]` (ex: labels uppercase tracking-wider) sont utilises sur les eyebrow labels. A 10px, meme avec font-bold, c'est limite pour la lisibilite sur des ecrans OLED Senegalais (souvent luminosite elevee en exterieur).
**Suggestion :** Remonter les `text-[10px]` a `text-[11px]` minimum. Ce sont des labels contextuels — pas critiques, mais ameliorer la lisibilite.

---

## 4. Layout Issues — Horizontal Scroll Risks

**Verdict : BON**

### MEDIUM — M-03 : Reference de transaction sur /merci peut deborder

**Fichier :** `src/app/(public)/c/[slug]/merci/page.tsx:205`
**Constat :** La reference est affichee avec `font-mono text-xl font-bold`. Si la reference Bictorys est longue (>20 chars), sur un ecran de 375px dans un `max-w-md` container avec `p-5`, le texte mono pourrait forcer un scroll horizontal.
**Fix :** Ajouter `break-all` :
```tsx
<p className="font-mono text-xl font-bold text-primary break-all">
```
Note : la reference timeout a la ligne 270 a deja `break-all` — incohérence.

### LOW — L-02 : Slug preview sur /inscription potentiellement long

**Fichier :** `src/app/(auth)/inscription/page.tsx:270-275`
**Constat :** `<span className="font-mono text-primary">cagnotte.sn/{slugPreview}</span>` — si le slugPreview est long (noms composes senegalais : "mamadou-moustapha-diallo"), ca peut deborder le container `max-w-md`.
**Fix :** Ajouter `break-all` ou `truncate` avec title tooltip.

---

## 5. Navigation

**Verdict : EXCELLENT**

### Positif

- **PublicNavbar** : Hamburger 48x48 a droite (md:hidden). Drawer slide-in from right, body scroll lock, Escape to close, backdrop tap to close. Safe-area bottom padding. Tres bien fait.
- **BottomNav** : 3 tabs (Accueil, Mes dons, Notifs), h-16, safe-area-inset-bottom. Unread badge avec polling 60s + visibilitychange. md:hidden.
- **DashboardNavbar** : Sticky top, avatar dropdown 48x48 touch target, menu items min-h-12.
- **MobileActionBar** : Se positionne AU-DESSUS du BottomNav avec `bottom: calc(4rem + env(safe-area-inset-bottom))`. Audit 024 fix applique.

### INFO — I-03 : BottomNav n'a que 3 tabs — pas de "Profil"

**Fichier :** `src/components/layout/BottomNav.tsx:91-107`
**Constat :** Les 3 tabs sont Accueil/Mes dons/Notifs. Pour acceder a Profil/Retraits sur mobile, il faut passer par le DashboardNavbar avatar dropdown. C'est un choix delibere (simplicite) mais avec 90% mobile, "Profil" ou "Retrait" pourrait meriter un 4eme tab. Pas un bug — UX decision.

---

## 6. Forms on Mobile

**Verdict : BON**

### Positif

- **Phone input sur /paiement :** `type="tel"` + `inputMode` implicite + `autoComplete="tel-national"`. Clavier numerique sur mobile.
- **Custom amount :** `inputMode="numeric"` correctement utilise (pas `type="number"` qui a des problemes UX).
- **Email fields :** `type="email"` + `autoComplete="email"`.
- **Password fields :** `autoComplete="current-password"` / `autoComplete="new-password"`. Eye toggle 44x44.

### MEDIUM — M-04 : Champ montant personnalise manque inputMode sur le hint

**Fichier :** `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx:231-246`
**Constat :** Le `<input type="text" inputMode="numeric">` est correct. Mais la valeur initiale est pre-remplie depuis `suggestedAmounts` — si l'utilisateur efface et retape, le clavier numerique apparait bien. RAS.

### LOW — L-03 : Inscription — grid-cols-2 sur Prenom/Nom a md: seulement

**Fichier :** `src/app/(auth)/inscription/page.tsx:227`
**Constat :** `grid-cols-1 gap-4 md:grid-cols-2` — sur mobile, les champs Prenom et Nom sont empiles. C'est correct. Mais la page est dans un `max-w-md` container, donc meme a 768px+ (md), le max-w-md (~448px) fait que les 2 colonnes sont assez etroites (~200px chacune). Fonctionnel mais tight.

---

## 7. Image Handling

**Verdict : ATTENTION REQUISE**

### HIGH — H-01 : Utilisation de `<img>` natif partout au lieu de `next/image`

**Fichiers :** CampaignCard.tsx:77, CagnotteMediaViewer.tsx:157, cagnotte detail page.tsx:327, paiement/page.tsx:527-549, etc.
**Constat :** Toutes les images (covers, avatars, logos operateurs) utilisent `<img>` natif avec `eslint-disable @next/next/no-img-element`. Sur un reseau 3G senegalais, une image cover de 1200x630px peut peser 200-500KB non optimisee.

`next/image` fournit :
- Lazy loading automatique (deja fait manuellement avec `loading="lazy"`)
- Conversion WebP/AVIF automatique
- `srcSet` responsive (servir 375w au lieu de 1200w sur mobile)
- Placeholder blur

**Impact :** Sur 3G (500kbps), une image cover 400KB prend ~6.4 secondes a charger. Avec `next/image` et format WebP + sizing 375w, ca tomberait a ~80KB (~1.3s).

**Fix :** Migrer progressivement les images critiques (covers de cagnottes sur la page publique) vers `next/image`. Les logos operateurs (28x28) et avatars (48x48) sont petits — priorite basse.

```tsx
import Image from "next/image";

<Image
  src={coverUrl}
  alt={title}
  width={640}
  height={360}
  sizes="(max-width: 768px) 100vw, 66vw"
  className="h-full w-full object-cover"
  priority={idx === 0}
/>
```

**Note :** Les images viennent de R2 (proxy `/api/files/:key`). Le loader Next.js par defaut ne peut pas optimiser les URLs externes sans config `images.remotePatterns` dans `next.config`. Il faudra configurer cela.

### INFO — I-04 : OG images utilisent ImageResponse (correct)

**Fichier :** `src/app/(public)/c/[slug]/opengraph-image.tsx`
**Constat :** Les OG images sont generees cote serveur via `ImageResponse` — pas de probleme mobile ici, c'est pour les previews sociales.

---

## 8. Modals/Dialogs on Mobile

**Verdict : EXCELLENT**

### Positif

- **ConfirmDialog** : Bottom sheet sur mobile (`flex-col justify-end`), centered card sur desktop (`md:items-center md:justify-center`). Drag handle visuel. `pb-[calc(env(safe-area-inset-bottom)+1.25rem)]`. Buttons stacked avec Cancel en bas (thumb reach). Transition slide-up/scale. Tres bon pattern.
- **Modal** : `max-h-[calc(100vh-24px)]` + `overflow-y-auto`. `pb-[calc(env(safe-area-inset-bottom)+12px)]`. Body scroll lock. Focus management.
- **PublicNavbar drawer** : Full-height slide-in panel from right, 88% width, body scroll lock, backdrop tap close, Escape close.

---

## 9. Loading States

**Verdict : BON**

### Positif

- **Skeleton screens** : `loading.tsx` present pour dashboard, cagnotte detail, participations, profil, retraits, cagnottes list. Tous utilisent `animate-pulse` avec des shapes qui matchent le layout reel. Minimise CLS.
- **Button loading** : Le component Button a un prop `loading` qui affiche un spinner `Loader2` + disabled state.

### LOW — L-04 : Pas de loading.tsx pour /participer ni /paiement

**Fichier :** `src/app/(public)/c/[slug]/participer/` et `src/app/(public)/c/[slug]/paiement/`
**Constat :** Ces pages sont client-side (`"use client"`), donc Next.js ne peut pas streamer un loading.tsx server-side. Le ParticiperForm rend immediatement. Le PaiementPage affiche "Chargement..." via `stashChecked` state. C'est fonctionnel mais pourrait beneficier d'un skeleton plus riche.

---

## 10. Scroll Behavior

**Verdict : BON**

### Positif

- **BottomNav** : `pb-24 md:pb-10` sur le `<main>` authed (layout.tsx:51). Le padding 96px (6rem) est genereux pour compenser h-16 (64px) + safe-area.
- **MobileActionBar** : Positionne avec `bottom: calc(4rem + env(safe-area-inset-bottom))` — au-dessus du BottomNav.
- **Sticky sidebars** : `lg:sticky lg:top-24` sur les asides de cagnotte detail et participer.
- **Overscroll** : `overscroll-behavior: none` dans globals.css.

### MEDIUM — M-05 : CookieBanner peut chevaucher le BottomNav sur authed pages

**Fichier :** `src/app/(public)/layout.tsx:19` — CookieBanner est dans le layout public.
**Fichier :** `src/components/layout/CookieBanner.tsx:104`
**Constat :** Le CookieBanner est `fixed bottom-4 left-4 right-4 z-50`. Sur les pages publiques, il n'y a pas de BottomNav — pas de probleme. MAIS si un utilisateur connecte visite une page publique (ex: `/c/slug`), le BottomNav n'est pas present (c'est le layout public), donc pas de conflit. Neanmoins, sur mobile (sm:left-auto non actif), le banner occupe toute la largeur `left-4 right-4` et peut couvrir du contenu important en bas de page.
**Fix mineur :** Ajouter `mb-safe` ou `bottom-[calc(1rem+env(safe-area-inset-bottom))]` pour eviter que le banner soit sous le home indicator iOS.

---

## 11. Text Truncation

**Verdict : BON**

### Positif

- **Titres de cagnottes** : `line-clamp-2` sur CampaignCard, ParticiperForm recap card, paiement recap.
- **Noms de donateurs** : `truncate` sur les listes de participants.
- **Emails** : `truncate` dans le drawer mobile.
- **Montants** : `tabular-nums` pour eviter le jitter de chiffres.

### LOW — L-05 : Titre h1 sur la page cagnotte detail n'a pas de line-clamp

**Fichier :** `src/app/(public)/c/[slug]/page.tsx:318-319`
**Constat :** `<h1>` sans `line-clamp` ni `truncate`. Un titre de 200 caracteres occuperait beaucoup d'espace vertical sur mobile. C'est intentionnel (c'est le titre principal), mais une `line-clamp-4` pourrait etre utile avec un "Voir plus".

---

## 12. Payment Flow on Mobile

**Verdict : EXCELLENT — C'est le point fort du codebase.**

### Positif

- **Amount selection** : 3 presets en `grid-cols-3`, boutons `min-h-14` (56px). Excellent touch target.
- **Custom amount** : `inputMode="numeric"`, centered, large font (`text-3xl`).
- **Operator picker** : Sur mobile `grid-cols-1` (stacked), chaque operateur est un bouton avec radio dot. Sur desktop `sm:grid-cols-3`.
- **Phone input** : `type="tel"`, flag emoji, "+221" prefix badge separee, large text.
- **Pay CTA** : `min-h-[60px]` sur paiement, `min-h-14` sur participer. Shine animation. Tres visible.
- **In-app browser handling** : Audit 008/009 implemented — TikTok/Meta WebView detection, base64 proxy, waiting card with open/share/copy actions.
- **Voluntary contribution** : Toggle avec checkbox accessible, label tronquable, montant shrink-0.

### INFO — I-05 : Pas de fixed bottom CTA bar sur /participer mobile

**Fichier :** `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx`
**Constat :** Le commentaire en ligne 63 mentionne "a fixed bottom CTA bar surfaces Total + Proceder au paiement" below lg. Mais dans le JSX, il n'y a PAS de fixed bottom bar implementee — le bouton pay est dans le sidebar recap qui est en-dessous du form sur mobile. L'utilisateur doit scroller tout en bas pour trouver le bouton.

C'est le seul probleme significant trouve dans le payment flow. Sur un form long (3 steps), le CTA est invisible sans scroll.

**Fix :** Ajouter un fixed bottom bar pour mobile (< lg) :
```tsx
{/* Fixed mobile CTA — visible below lg only */}
<div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden"
     style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <span className="text-[11px] font-bold uppercase text-gray-500">Total</span>
      <span className="block font-headings text-xl font-black text-primary">
        {formatPrice(totalAmount)}
      </span>
    </div>
    <button type="submit" disabled={submitting} className={cn(PAY_BTN_BASE, "min-h-12 px-6")}>
      Participer
    </button>
  </div>
</div>
```

---

## 13. Tailwind CSS v4

**Verdict : CORRECT**

### Positif

- **`@theme inline` directive** : Utilise correctement dans `globals.css:15-41`.
- **`@import "tailwindcss"`** : Import v4 correct (ligne 1).
- **`@plugin "@tailwindcss/typography"`** : Plugin v4 syntax correct.
- **Custom colors** : Definies via `--color-*` dans le block `@theme inline`.
- **Custom font** : `--font-sans` et `--font-headings` correctement definis.

### INFO — I-06 : Legacy teal references dans globals.css

**Fichier :** `src/app/globals.css:179-186, 575-576`
**Constat :** Les classes `.theme-*` et `.izy-driver-popover` referencent teal (`#0D9488`) — c'est la couleur fari.store, pas cagnottes.sn (navy `#172866`). Ces classes `.theme-*` sont probablement mortes (pas utilisees dans les pages actives) mais les `.izy-driver-popover` pourraient etre visibles si le product tour est active.
**Fix :** Rechercher les usages et nettoyer ou re-mapper sur la palette Banani.

---

## Recapitulatif des Findings

| Severite | ID | Sujet |
|----------|------|-------|
| HIGH | H-01 | `<img>` natif partout — pas de `next/image` (impact 3G) |
| MEDIUM | M-01 | Back links trop petits (/participer, /paiement) |
| MEDIUM | M-02 | Footer links gap trop serre (touch targets < 48px) |
| MEDIUM | M-03 | Reference transaction /merci sans `break-all` |
| MEDIUM | M-04 | _(retracte — le champ est correct)_ |
| MEDIUM | M-05 | CookieBanner safe-area bottom manquant |
| LOW | L-01 | "En savoir +" inline dans CookieBanner |
| LOW | L-02 | Slug preview /inscription peut deborder |
| LOW | L-03 | Inscription grid 2 cols dans max-w-md |
| LOW | L-04 | Pas de skeleton pour /participer, /paiement |
| LOW | L-05 | h1 cagnotte detail sans line-clamp |
| INFO | I-01 | Suggerer clamp() pour Hero headings |
| INFO | I-02 | text-[10px] limite en lisibilite exterieur |
| INFO | I-03 | BottomNav 3 tabs — pas de Profil (UX choice) |
| INFO | I-04 | OG images correctes |
| INFO | I-05 | **Pas de fixed bottom CTA sur /participer mobile** |
| INFO | I-06 | Legacy teal dans globals.css |

---

## Points Forts

1. **Mobile-first authentique** — pas de desktop-first adapte.
2. **Touch targets** generalement >= 48px (min-h-12 partout).
3. **iOS zoom prevention** via @supports rule dans globals.css.
4. **Safe-area handling** sur BottomNav, ConfirmDialog, mobile drawer.
5. **Body scroll lock** correct sur tous les overlays.
6. **ConfirmDialog bottom-sheet** pattern — best practice mobile.
7. **Prefers-reduced-motion** respecte sur toutes les animations.
8. **Payment flow** tres bien pense pour le mobile senegalais.
9. **Skeleton loading screens** sur les pages critiques.
10. **Overscroll-behavior: none** previent le pull-to-refresh accident.

---

## Recommandations Prioritaires

### P0 (Critical path — revenu direct)

1. **I-05/M-01** : Ajouter un fixed bottom CTA bar sur `/participer` mobile. Le bouton "Participer a la cagnotte" est invisible sans scroll — c'est une perte de conversion directe.

### P1 (Performance — 3G)

2. **H-01** : Migrer les cover images critiques vers `next/image` avec `sizes` responsive. Configurer `images.remotePatterns` pour le domaine R2. Impact : -60-80% bandwidth sur les images cover.

### P2 (Polish)

3. **M-02** : Augmenter les touch targets footer.
4. **M-03** : `break-all` sur la reference /merci.
5. **M-05** : Safe-area bottom sur CookieBanner.

---

_Audit 031 — clos._
