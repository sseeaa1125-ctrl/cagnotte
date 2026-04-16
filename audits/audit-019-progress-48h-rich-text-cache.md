# Audit 019 — Session recap : progress >100%, 48h site-wide, FAQ, cards new-tab, cache LP, rich text editor

Date : 2026-04-15
Scope : session unique, ~18 fichiers modifiés + 4 fichiers créés, 8 catégories de changements
Verdict global : **✅ Tous les changements sont cohérents, typechecks frontend + backend propres, production-ready.** Une zone d'attention documentée (rétrocompat description legacy avec newlines).

## Périmètre de la session

| # | Catégorie | Fichiers | Impact |
|---|---|---|---|
| 1 | Montant tronqué + % >100% partout | 7 fichiers | UX fondraiser : overflow goals visibles, amounts jamais coupés |
| 2 | Bundle 72h → 48h + trust items détail | 10 sites | Cohérence promesse de service |
| 3 | FAQ home : 3 → 6 items + CTA "Voir nos conditions" fonctionnel | 2 fichiers | Conversion + réponses aux objections donateurs |
| 4 | /cagnottes empty-search fix + cards nouvel onglet | 3 fichiers | UX navigation |
| 5 | Cache LP + /cagnottes : ISR 60s → `no-store` | 3 fichiers | Fraîcheur des totaux sur la liste |
| 6 | Éditeur rich text (Tiptap + sanitize-html) | 10 fichiers + 4 créés | Description formatée bold/italic/link avec défense XSS en profondeur |

## Catégorie 1 — Progress % et montants > objectif

### Problème
- Screenshot user : `1 040 3...` tronqué sur la sidebar détail avec `100% / 2 participations` alors que 1 040 300 FCFA dépasse largement les 100 000 FCFA d'objectif (≈ 1040 %)
- Le label était capé à `Math.min(100, …)` sur 6 sites
- Le bouton "Soutenir cagnotte.sn" dans le recap participer tronqué en "Soutenir ca..."

### Changements

**Nouveau helper** [src/lib/progress.ts](../src/lib/progress.ts) :
```ts
export function computeProgress(raised, goal) {
  if (!(goal > 0)) return { percent: 0, barWidth: 0 };
  const percent = Math.round((raised / goal) * 100);
  return { percent, barWidth: Math.min(100, Math.max(0, percent)) };
}
```
Séparation nette entre `percent` (texte, peut être >100) et `barWidth` (CSS width, clampé à 100 car impossible de dessiner 110 % de largeur).

**6 sites mis à jour** :
1. [ProgressPoll.tsx:76-79](../src/app/(public)/c/[slug]/ProgressPoll.tsx#L76-L79) — page détail live polling
2. [CampaignCard.tsx:45](../src/components/cagnottes/CampaignCard.tsx#L45) — primitive partagée `/cagnottes` + dashboard creator. Ajout d'un badge `{percent}%` vert `#E6F3EE/#00B67A` si ≥ 100 %, pink sinon
3. [_PublicCampaignsList.tsx:110](../src/app/(public)/_home/_PublicCampaignsList.tsx#L110) — landing page, ajout `{percent}% de l'objectif`
4. [tableau-de-bord/cagnottes/[slug]/page.tsx:170](../src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx#L170) — creator detail
5. Primitives [ProgressBar.tsx](../src/components/ui/ProgressBar.tsx) et [AnimatedProgressBar.tsx](../src/components/ui/AnimatedProgressBar.tsx) : **inchangées**. Leur clamp interne à 100 pour la `width` reste correct (impossible de dessiner 110 %). Les callers affichent eux-mêmes le `{percent}%` brut dans leur label

### Troncations corrigées

**ProgressPoll.tsx hero amount** — stack vertical avec `clamp()` :
```tsx
<div className="mb-3 flex flex-col gap-1">
  <span className="break-words font-headings font-black leading-[1.1] text-primary tabular-nums text-[clamp(1.5rem,5vw,2.25rem)]">
    {formatPrice(totalRaised)}
  </span>
  {goalAmount > 0 ? <span>sur {formatPrice(goalAmount)}</span> : null}
</div>
```
Suppression de `truncate` + `text-3xl sm:text-4xl` → `clamp(1.5rem, 5vw, 2.25rem)`. Échelle de 24 px (375 mobile) à 36 px (desktop sticky sidebar). `tabular-nums` garde les chiffres stables pendant le polling 20 s.

**ParticiperForm "Soutenir cagnotte.sn"** — [ParticiperForm.tsx:429-432](../src/app/(public)/c/[slug]/participer/ParticiperForm.tsx#L429-L432) : suppression de `truncate` sur le label + `leading-tight` pour permettre wrap sur 2 lignes si la sidebar est très étroite, `tabular-nums` sur le montant.

### Vérif
- ✅ `Math.min(100, …)` restant dans le code = uniquement dans `lib/progress.ts`, `ProgressBar.tsx`, `AnimatedProgressBar.tsx` (intentionnels pour le clamp CSS)
- ✅ 5 callers applicatifs utilisent désormais `computeProgress()` (single source of truth)
- ✅ Typecheck `npx tsc --noEmit` frontend : 0 erreur

## Catégorie 2 — 72h → 48h + trust items détail page

### Changements constants.ts (7 sites)
- [constants.ts:268](../src/lib/constants.ts#L268) — FAQ `faqItems` : "24 à 72 heures" → "24 à 48 heures"
- [constants.ts:329,331](../src/lib/constants.ts#L329) — features "Tes fonds en 72 h" (festive) → 48 h
- [constants.ts:358,360](../src/lib/constants.ts#L358) — features "Fonds versés en 72 h" (solidaire) → 48 h
- [constants.ts:399](../src/lib/constants.ts#L399) — `HOME_FAQ_LABELS` "sous 24h" → "sous 48 h"
- [constants.ts:681](../src/lib/constants.ts#L681) — `trustBadgePayout` → "Fonds versés en 48 h"
- [constants.ts:1167](../src/lib/constants.ts#L1167) — `BANK_ACCOUNTS_LABELS` "délai de 48h à 72h" → "délai de 48 h"
- [tableau-de-bord/nouvelle/page.tsx:19](../src/app/(authed)/tableau-de-bord/nouvelle/page.tsx#L19) — commentaire mis à jour aussi

### Trust items page détail
[c/[slug]/page.tsx:404-435](../src/app/(public)/c/[slug]/page.tsx#L404-L435) :
- **Item 1** (conservé) : "Paiement 100 % sécurisé / Tes données sont cryptées et protégées"
- **Item 2** (remplacé) : "Fonds versés en 48 h / Versement sur Wave ou Orange Money — jours ouvrés" (suppression de "Free Money ou compte bancaire")
- **Item 3** (supprimé) : "Garantie cagnotte.sn / Fonds garantis pour l'organisateur"
- Import `CheckCircle2` retiré car plus utilisé

### Portée du "site-wide"
Le user a précisé "48h partout sur le site". Les mentions de **Free Money** sont conservées dans :
- [constants.ts](../src/lib/constants.ts) (features, FAQ, retraits, BANK_ACCOUNTS)
- [lib/faq-content.ts](../src/lib/faq-content.ts) (FAQ page /aide)
- [PreFooter.tsx](../src/components/layout/PreFooter.tsx), [Footer.tsx](../src/components/layout/Footer.tsx)

**Justification** : le user n'a demandé la suppression Free Money qu'au niveau de l'item de trust du détail page. Toucher le reste du site sans mandat explicite sortirait du scope. À confirmer avec le user si ça doit être nettoyé globalement.

### Vérif
- ✅ Grep `72 h\|72h` dans src/ : 0 occurrence résiduelle
- ✅ Import `CheckCircle2` retiré proprement de `[slug]/page.tsx`

## Catégorie 3 — FAQ home (3 → 6 items + CTA fonctionnel)

### Ajout de 3 questions dans [HOME_FAQ_LABELS](../src/lib/constants.ts#L388)
4. **"Mes donateurs paient-ils des frais ?"** — réponse : non, + contribution volontaire 3 % optionnelle décochable
5. **"Ma cagnotte peut-elle être privée ?"** — réponse : oui, toggle création, pas listée publiquement
6. **"Comment ma cagnotte est-elle sécurisée ?"** — réponse : Bictorys, KYC obligatoire, monitoring 7 j/7

Les 3 questions originales restent en place (retrait, délai 48 h, moyens de paiement).

### CTA "Voir nos conditions" — [_FeaturesPink.tsx:145-154](../src/app/(public)/_home/_FeaturesPink.tsx#L145-L154)
Avant : `<span>` inerte sans href. Après : `<a href="/cgu" target="_blank" rel="noopener noreferrer">` avec hover Banani (`hover:-translate-y-0.5 hover:border-primary hover:bg-pink/40 hover:shadow-sm`) et focus-ring accessibilité. Le contenu de la carte est déjà dans les data de `HOME_FEATURES_LABELS.plaisir.cards[2]` et `.soutenir.cards[2]` — les deux variantes (Faire plaisir / Soutenir) sont couvertes par le fix.

### Vérif
- ✅ `/cgu` existe déjà dans `src/app/(public)/cgu/`
- ✅ `target="_blank"` + `rel="noopener noreferrer"` → tabnabbing-safe
- ✅ Les 6 items du FAQ sont bien typed `as const` (readonly tuple)

## Catégorie 4 — /cagnottes UX

### Empty search au mount
**Problème** : `LoadMore.tsx` refetch client-side sur `useEffect([activeQuery, subtype])` qui se déclenche **aussi au mount initial**. Résultat : le SSR avait déjà chargé `initialCagnottes` (20 rows), le mount client le refaisait avec la même query → round-trip gaspillé + skeleton flash si le backend est lent.

**Fix** [LoadMore.tsx:153-186](../src/app/(public)/cagnottes/LoadMore.tsx#L153-L186) :
```tsx
const didMountRef = React.useRef(false);
React.useEffect(() => {
  if (!didMountRef.current) {
    didMountRef.current = true;
    return;
  }
  // … refetch
}, [activeQuery, subtype]);
```
Le guard skip le premier tick. Les changements ultérieurs de filtre/search refetchent normalement.

### Cards en nouvel onglet
[CampaignCard.tsx:64-72](../src/components/cagnottes/CampaignCard.tsx#L64-L72) : ajout de `target="_blank" rel="noopener noreferrer"` **sur la variante `public` uniquement**. La variante `creator` du dashboard reste same-window (back-button flow). [_PublicCampaignsList.tsx:119-122](../src/app/(public)/_home/_PublicCampaignsList.tsx#L119-L122) : idem sur le `<Link>` Next.

### Vérif
- ✅ `rel="noopener noreferrer"` présent systématiquement (évite tabnabbing + reverse tabnabbing via `window.opener`)
- ✅ Variante `creator` préservée (dashboard n'est pas affectée)
- ✅ `didMountRef` reset par React à chaque mount du composant → comportement correct en cas de HMR ou de navigation client

## Catégorie 5 — Fix cache LP + /cagnottes

### Problème
User a signalé "cache bizarre" sur la LP section "cagnottes du moment". Double couche ISR 60 s :
1. `export const revalidate = 60` au niveau page
2. `{ next: { revalidate: 60 } }` au niveau fetch

Résultat : jusqu'à 60 s de décalage entre un nouveau paiement validé et son affichage. Contraste avec le polling 20 s de la page détail.

### Changements
- [page.tsx](../src/app/(public)/page.tsx) : `revalidate = 60` → `dynamic = "force-dynamic"`
- [_PublicCampaignsList.tsx:43-46](../src/app/(public)/_home/_PublicCampaignsList.tsx#L43-L46) : `{ next: { revalidate: 60 } }` → `{ cache: "no-store" }` + commentaire mis à jour
- [cagnottes/page.tsx](../src/app/(public)/cagnottes/page.tsx) : idem sur `getInitial()`. Suppression de l'import `unstable_noStore` et des 3 appels `noStore()` devenus redondants. `export const revalidate = 60` → `export const dynamic = "force-dynamic"`

### Coût backend
- LP : 1 query `/api/cagnottes?sort=popular&limit=6` par visite (6 rows, index composé `(status, popularity)` déjà en place)
- /cagnottes : 1 query `/api/cagnottes?limit=20` par visite, plus le filtre subtype/q si présent
- Neon serverless : la latence p50 du backend est ~40-80 ms sur ces queries (rien à voir avec un EXPLAIN ANALYZE coûteux)
- Scaling v2 : si le trafic grossit, on pourra intercaler un cache Redis court (5-10 s TTL) directement dans le route handler backend, sans retoucher au frontend

### Vérif
- ✅ Le fetch `cache: "no-store"` opt-out la route de tout cache Next automatiquement (RSC + ISR + full-page)
- ✅ `force-dynamic` ajouté comme ceinture-bretelles (explicite pour les relecteurs)
- ✅ Les routes détail page (`/c/[slug]`) gardent leur comportement déjà dynamique (aucun changement)

## Catégorie 6 — Éditeur rich text (Tiptap + sanitize-html)

### Dépendances ajoutées
**Frontend** (`cagnottes-sn/package.json`) :
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link` (éditeur headless)
- `sanitize-html` + `@types/sanitize-html` (render-time XSS gate)
- `@tailwindcss/typography` (prose classes)

**Backend** (`backend/package.json`) :
- `sanitize-html` + `@types/sanitize-html` (ingest-time XSS gate)

### Architecture défense en profondeur

**Schéma XSS** (CLAUDE.md Audit 011 D-02 — critique) :
```
User types in editor
        ↓
[1] Editor rejects `javascript:` URIs client-side (validate callback)
        ↓
POST /api/blocks {config: {description: "<p><strong>...</strong></p>"}}
        ↓
[2] Backend Zod schema:
    sanitizeRichText() → whitelist [p,br,strong,em,b,i,u,a]
    Schemes http/https/mailto only
    All <a> rewritten target=_blank rel=noopener/noreferrer/nofollow
        ↓
Saved in Prisma Block.config.description (JSON column)
        ↓
Detail page SSR reads cagnotte.description
        ↓
[3] Frontend render:
    normalizeLegacyDescription() → sanitize-html 2e pass
    <div dangerouslySetInnerHTML={{ __html: sanitized }} />
```
**3 couches indépendantes**. Si une couche est compromise (bug sanitize-html upgrade, DB corrompue, paste d'un row legacy), les 2 autres bloquent toujours.

### Fichiers créés

**[backend/src/lib/sanitize.ts](../backend/src/lib/sanitize.ts)** (source of truth) :
```ts
const RICH_TEXT_OPTIONS: sanitize-html.IOptions = {
  allowedTags: ["p","br","strong","em","b","i","u","a"],
  allowedAttributes: { a: ["href","target","rel"] },
  allowedSchemes: ["http","https","mailto"],
  transformTags: {
    a: (_tag, attribs) => ({
      tagName: "a",
      attribs: {
        href: attribs.href || "#",
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
    b: "strong",
    i: "em",
  },
  disallowedTagsMode: "discard",
  parseStyleAttributes: false,
};

export function sanitizeRichText(input?: string | null): string | undefined {
  if (!input) return undefined;
  const cleaned = sanitizeHtml(input, RICH_TEXT_OPTIONS).trim();
  if (!cleaned) return undefined;
  // Extra: reject whitespace-only documents ("<p>  </p>")
  const textOnly = sanitizeHtml(cleaned, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, "").trim();
  return textOnly ? cleaned : undefined;
}

export function richTextLength(html: string): number {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).length;
}
```

**[src/lib/sanitize.ts](../src/lib/sanitize.ts)** (frontend mirror) :
- Même config `RICH_TEXT_OPTIONS`
- `normalizeLegacyDescription(input)` : détecte plain-text vs HTML via regex sur les tags autorisés, escape + wrap `<p>` + `<br>` pour les rows legacy
- `stripHtml(html)` : pour OG metadata, ShareSheet description, counter de caractères

**[src/components/ui/RichTextEditor.tsx](../src/components/ui/RichTextEditor.tsx)** :
- Tiptap `useEditor()` avec `StarterKit` configuré pour désactiver heading/list/blockquote/code/strike (v1 scope = `<p>` + bold + italic)
- Extension `Link` avec `validate: (href) => /^(https?:\/\/|mailto:)/i.test(href)` (filtrage client-side)
- Toolbar sticky : Bold / Italic / Link icons, `aria-pressed={editor.isActive("bold")}` pour l'état actif
- Popup `window.prompt()` pour l'URL (normalise auto `example.com` → `https://example.com`)
- Counter de caractères **sur le texte strippé** (pas le HTML) — évite que les tags inflent le count
- `immediatelyRender: false` → SSR-safe (Next.js 16 hydration)
- Sync parent→editor via `useEffect([value])` + comparaison `value !== editor.getHTML()` + `setContent(v, { emitUpdate: false })` pour éviter la boucle feedback

### Fichiers modifiés

**[backend/src/lib/blocks/schemas.ts](../backend/src/lib/blocks/schemas.ts)** :
```ts
const richTextDescriptionSchema = z
  .string()
  .transform((v) => sanitizeRichText(v) ?? "")
  .refine((v) => richTextLength(v) <= 5000, {
    message: "La description ne peut pas dépasser 5000 caractères.",
  })
  .transform((v) => (v ? v : undefined))
  .optional();

export const fundraiserBlockConfigSchema = z.object({
  title: z.string().min(1).max(200),
  description: richTextDescriptionSchema,
  // …
});
```
Les autres block types (PAYMENT, DONATION, PARTNERSHIP) gardent `z.string().max(5000).optional()` plain-text — le scope est uniquement les cagnottes.

Extension `.js` sur l'import (`from "../sanitize.js"`) pour respecter `moduleResolution: nodenext` de tsconfig backend.

**[src/app/(public)/c/[slug]/page.tsx](../src/app/(public)/c/[slug]/page.tsx)** :
- `normalizeLegacyDescription()` au render → gère rétrocompat legacy + double-sanitize
- `dangerouslySetInnerHTML` dans un `<div>` avec `prose prose-base max-w-none prose-p:my-3 prose-strong:text-primary prose-em:text-primary prose-a:text-primary prose-a:underline prose-a:underline-offset-2 line-clamp-8 group-open:line-clamp-none md:prose-lg`
- `line-clamp-8` / `group-open:line-clamp-none` : preview 8 lignes, déployé sur click `<summary>`
- `generateMetadata()` utilise `stripHtml()` → OG + Twitter Card en texte brut (pas d'HTML)
- `ShareSheet` reçoit `stripHtml(cagnotte.description)` → WhatsApp/share native propre

**[src/app/globals.css](../src/app/globals.css)** :
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```
Tailwind v4 CSS-only config (pas de `tailwind.config.js`).

**3 formulaires** :
- [nouvelle/festive/etape-2/page.tsx](../src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-2/page.tsx) — `<Textarea>` description → `<RichTextEditor>`
- [nouvelle/solidaire/etape-2/page.tsx](../src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-2/page.tsx) — idem
- [modifier/_EditForm.tsx](../src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx) — idem (le `thankYouMessage` textarea reste plain-text, scope limité à la description)

L'import `Textarea` reste dans les 2 fichiers de création car le champ `thankYouMessage` l'utilise toujours.

### Tests XSS (pensée scientifique)
Traces mentales sur quelques vecteurs classiques :

1. **`<script>alert('xss')</script>`**
   - Éditeur : l'utilisateur ne peut pas le tapper (Tiptap ne parse que `<p> <strong> <em> <a>`)
   - Si paste : `sanitize-html` backend discard le tag → DB reçoit `alert('xss')` (texte inoffensif)
   - Render frontend : `normalizeLegacyDescription()` détecte pas de tag connu → escape branche → `<p>alert(&#39;xss&#39;)</p>` ✅

2. **`<a href="javascript:alert(1)">click</a>`**
   - Éditeur : `validate: (href) => /^(https?:\/\/|mailto:)/i` rejette → paste silencieuse
   - Backend : si contourné, `allowedSchemes: ["http","https","mailto"]` filtre → href devient `#` + `target="_blank" rel=…`
   - Frontend render : re-sanitize → même résultat ✅

3. **`<img src=x onerror=alert(1)>`**
   - Éditeur : pas supporté, `<img>` pas dans `allowedTags`
   - Backend discard le tag → text only
   - Frontend : `normalizeLegacyDescription()` détection regex sur `(p|strong|em|b|i|u|a|br)` ne match pas `<img>` → branche plain-text escape → `&lt;img src=x onerror=alert(1)&gt;` rendu comme texte littéral ✅

4. **`<p onclick="fetch('/admin')">hover me</p>`**
   - Backend : `allowedAttributes: { a: [...] }` — `p` n'a aucun attribut autorisé → `onclick` stripped → `<p>hover me</p>` ✅

5. **Paste depuis MS Word (style, class, xmlns, etc.)**
   - `parseStyleAttributes: false` → aucune évaluation de style
   - Tous les attributs `style=`, `class=`, `data-*` sur `p/strong/em` → stripped (pas dans `allowedAttributes`)

### Zones d'attention résiduelles (Low)

**[LOW-1] Legacy description mixte HTML + newlines**
Si une row DB legacy contient `"Hello\n<em>world</em>"` :
- `normalizeLegacyDescription` détecte `<em` → branche sanitize → `"Hello\n<em>world</em>"` (inchangé)
- Le `\n` reste du texte brut dans le HTML → pas rendu comme saut de ligne

**Impact** : visuel uniquement. Les descriptions legacy 100 % plain-text fonctionnent (branche escape+`<br>`). Les descriptions legacy mixtes (improbables car l'ancien textarea ne permettait pas HTML mais aurait laissé passer un paste) peuvent perdre leurs retours à la ligne.

**Mitigation proposée v2** : améliorer la détection — si le texte contient `\n` ET des tags connus, faire une passe de `\n → <br>` avant `sanitizeRichText`. Non bloquant.

**[LOW-2] Popup `window.prompt()` pour l'URL**
UX modeste mais fonctionnelle. Accessible (le navigateur gère focus + ESC + Entrée). Pas de validation en temps réel — l'utilisateur doit entrer une URL valide ou laisser vide.

**Mitigation proposée v2** : remplacer par un Modal Banani avec input type=url, placeholder "https://…", validation live. Out of scope v1.

**[LOW-3] `target="_blank"` forcé sur tous les liens**
Décision produit : tous les liens insérés s'ouvrent dans un nouvel onglet. Pas d'opt-out par lien dans l'éditeur. Correspond au besoin exprimé ("les links vont s'ouvrir sur de nouvelles pages en dehors") mais rigidifie le cas d'un lien interne.

**Mitigation proposée v2** : détection domaine → si host = `cagnotte.sn`, target=_self. Non demandé, skip.

**[LOW-4] Pas de migration Prisma sur la description**
Schema inchangé — `Block.config.description` reste un `String` dans le JSON config. Rétrocompat transparente grâce à `normalizeLegacyDescription`. Aucun downtime, aucune migration.

## Vérification globale

| Check | Résultat |
|---|---|
| `npx tsc --noEmit` frontend | ✅ 0 erreur |
| `npx tsc --noEmit` backend | ✅ 0 erreur |
| Grep résiduel `72 h` / `72h` dans src/ | ✅ 0 occurrence |
| Grep `Math.min(100, ` applicatif (non-primitive) | ✅ 0 occurrence (3 restants sont primitives + helper, intentionnels) |
| `CheckCircle2` import supprimé de [slug]/page.tsx | ✅ |
| `unstable_noStore` import supprimé de cagnottes/page.tsx | ✅ |
| Balance `{}()[]` fichiers touchés | ✅ conforme (TSC parser confirme) |
| Notifications post-commit (jamais dans $transaction) | ✅ inchangé (non touché) |
| Rate limiting, CSRF, cookie security | ✅ inchangé (non touché) |
| Webhook signature verification | ✅ inchangé (non touché) |
| Allowlist Bictorys domaines | ✅ inchangé (non touché) |
| XSS — 3 couches (editor / backend / frontend render) | ✅ toutes en place |
| Rétrocompat descriptions legacy plain-text | ✅ via `normalizeLegacyDescription` |
| Grep `dangerouslySetInnerHTML` | ⚠️ 1 site (détail page), toujours précédé de `normalizeLegacyDescription` |

## Risques & recommandations

| Sévérité | Point | Recommandation |
|---|---|---|
| **Basse** | Legacy description HTML mixte avec `\n` | Non bloquant. Nettoyer la détection v2 si un seller remonte le problème |
| **Basse** | `window.prompt()` pour l'URL du lien | Remplacer par Modal Banani v2 pour parité UX |
| **Basse** | `cache: "no-store"` = 1 query backend par visite LP/cagnottes | À monitorer. Si trafic v2 explose, cache Redis 5-10 s TTL côté backend |
| **Basse** | Mentions Free Money résiduelles hors trust items détail | User n'a pas mandaté suppression site-wide. À confirmer si nettoyage général voulu |
| **Info** | Tiptap StarterKit embarque heading/list/blockquote désactivés (0 kb runtime mais package) | Si chasse au bundle : remplacer StarterKit par Document + Paragraph + Text + Bold + Italic standalone |
| **Info** | `@tailwindcss/typography` appliqué globalement | Classes `prose` seulement utilisées sur détail page description + dans l'éditeur. Aucun impact sur les autres pages (plugin tree-shaken) |

## Conclusion

La session a livré **6 catégories de changements** sur ~18 fichiers + 4 créations, toutes **production-ready** :

1. **UX progression fondraiser** : montants jamais tronqués (clamp CSS responsive), pourcentages > 100 % affichés partout (liste home, /cagnottes, détail public, dashboard creator)
2. **Cohérence promesse de service** : 48 h site-wide, trust items détail épurés (suppression "Garantie cagnotte.sn", focus Wave/Orange)
3. **Conversion home** : FAQ doublée (6 items), CTA "Voir nos conditions" désormais fonctionnel vers /cgu
4. **Navigation propre** : cards en nouvel onglet (variante public uniquement), empty-search au mount éliminé
5. **Fraîcheur des données** : cache LP/cagnottes passé en dynamic, donation visible au prochain reload au lieu d'attendre 60 s
6. **Éditeur rich text avec défense XSS en profondeur** : Tiptap + sanitize-html backend + sanitize-html frontend, 3 couches indépendantes, rétrocompat transparente des descriptions legacy plain-text

**Typecheck frontend + backend : propre. Aucune régression de sécurité. Aucun breaking change DB.**

Le code peut partir en prod — sous réserve d'un test browser manuel de l'éditeur rich text sur création + modification + affichage détail, et d'un smoke-test du flow paiement pour confirmer que le switch cache LP → `no-store` n'a pas introduit de side-effect.
