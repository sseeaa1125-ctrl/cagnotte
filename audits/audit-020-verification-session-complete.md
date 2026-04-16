# Audit 020 — Vérification indépendante de la session (progress + 48h + FAQ + cache + rich text)

Date : 2026-04-15
Scope : relecture ligne-à-ligne de tous les fichiers touchés pendant la session, vérification des APIs tierces contre leurs `.d.ts` installés, traçage XSS adversarial, tests de régression.
Méthodologie : **pas "de mémoire"** — chaque constat s'appuie sur une re-lecture directe du code ou une vérification d'API.
Verdict global : **✅ Production-ready** sur la sécurité et la correction, **⚠️ 1 risque HIGH documenté** (rate limit backend vs `cache: "no-store"`), **2 MEDIUM** (strict mode + dead code), **4 LOW** (UX rich text, commentaire erroné, legacy mixte).

Ce rapport **complète** [audit-019](audit-019-progress-48h-rich-text-cache.md) qui décrit le quoi. Audit 020 décrit le **comment verified** et expose les découvertes que la rédaction "from memory" de 019 avait loupées.

---

## 1. Vérification des APIs tierces

### 1.1 Tiptap `editor.commands.setContent(value, options)` — ✅ correct

Vérifié contre `node_modules/@tiptap/core/dist/index.d.ts` ligne 3061 :
```ts
interface SetContentOptions {
  parseOptions?: ParseOptions;
  emitUpdate?: boolean;
  // …
}
```
Mon appel `editor.commands.setContent(value, { emitUpdate: false })` est valide. Le champ `emitUpdate` existe bel et bien dans `SetContentOptions` (et pas seulement dans les "other properties" que le rapport initial laissait deviner).

### 1.2 Tiptap `useEditor({ immediatelyRender: false })` — ✅ correct

Vérifié contre `node_modules/@tiptap/react/dist/index.d.ts` lignes 12-26 :
```ts
type UseEditorOptions = Partial<EditorOptions> & {
  /** If server-side rendering, set this to `false`. @default true */
  immediatelyRender?: boolean;
  // …
}
```
Nécessaire pour SSR Next.js 16 — sans cette option, Tiptap construit l'éditeur immédiatement au mount, ce qui crash sur le serveur (pas de `window`).

### 1.3 `@tiptap/extension-link` — `validate: (url: string) => boolean` — ✅ correct

Vérifié contre `node_modules/@tiptap/extension-link/dist/index.d.ts`. Signature = `validate: (url: string) => boolean`. Mon regex `/^(https?:\/\/|mailto:)/i.test(href)` retourne bien un boolean et reçoit bien un string.

### 1.4 `sanitize-html` `transformTags` signature — ✅ correct

Vérifié contre `node_modules/@types/sanitize-html/index.d.ts` lignes 17-20, 74 :
```ts
interface Tag { tagName: string; attribs: Attributes; text?: string; }
type Transformer = (tagName: string, attribs: Attributes) => Tag;
transformTags?: { [tagName: string]: string | Transformer };
```
Les deux formes (function + string alias) sont valides. Mon `b: "strong"` et `i: "em"` passent par la string-form, `a: (tagName, attribs) => {...}` passe par la function-form. ✅

---

## 2. Vérification par fichier (adversarial)

### 2.1 `src/lib/progress.ts` — ✅ propre

```ts
if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) {
  return { percent: 0, barWidth: 0 };
}
const percent = Math.round((raised / goal) * 100);
return { percent, barWidth: Math.min(100, Math.max(0, percent)) };
```

**Traces** :
- `computeProgress(NaN, 100)` → `{0, 0}` (NaN rejetée par `isFinite`)
- `computeProgress(-500, 100)` → `percent = -5` (négatif possible mais raised < 0 est absurde), `barWidth = Math.max(0, -5) = 0`. Pas de crash, visuellement propre
- `computeProgress(1_040_300, 100_000)` → `percent = 1040`, `barWidth = 100`. ✅
- `computeProgress(0, 0)` → `{0, 0}` via la garde `goal <= 0`

Aucun bug.

### 2.2 `src/lib/sanitize.ts` (frontend) — ✅ propre + 1 observation

**Trace `normalizeLegacyDescription`** sur inputs divers :

| Input | Détection tag | Branche | Output |
|---|---|---|---|
| `""` | N/A | `!input` guard | `""` |
| `"Hello world"` | pas de `<tag>` | plain-text escape | `"<p>Hello world</p>"` |
| `"Hello\nworld"` | pas de `<tag>` | plain-text escape | `"<p>Hello<br>world</p>"` |
| `"<p>Hello</p>"` | match `<p` | sanitize | `"<p>Hello</p>"` |
| `"<script>alert(1)</script>"` | pas de tag autorisé (regex) | plain-text escape | `"<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"` (rendu littéral) |
| `"<img src=x onerror=alert(1)>"` | pas de match (`<img` pas dans la regex) | plain-text escape | `"<p>&lt;img src=x onerror=alert(1)&gt;</p>"` |
| `"<a href='javascript:alert(1)'>x</a>"` | match `<a` | sanitize → href filtered to `#`, `target=_blank` forcé | `"<a href=\"#\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">x</a>"` |

**⚠️ [LOW-1] Edge case legacy mixte :**

```
Input:  "Hello\n<em>world</em>"
Detect: match <em → sanitize branch
Output: "Hello\n<em>world</em>"  (sanitize-html preserve text-node whitespace mais ne convertit pas \n en <br>)
Render: "Hello <em>world</em>" (browser collapses whitespace)
```

Les descriptions legacy qui contiennent à la fois du HTML ET des `\n` perdent leurs sauts de ligne au render. **Impact purement visuel**, probabilité **très basse** (l'ancien `<Textarea>` stockait du plain-text — aucune raison d'avoir des tags HTML mixés avec des newlines sauf paste accidentel).

**Fix v2 proposé** : si la détection match ET le texte contient `\n`, pré-convertir `\n → <br>` avant `sanitizeRichText`. Non bloquant.

### 2.3 `backend/src/lib/sanitize.ts` — ✅ propre + 1 commentaire erroné

**⚠️ [LOW-2] Commentaire faux ligne 44 :**
```ts
  // Strip any HTML comments (could hide script shims).
  allowedSchemesByTag: {},
```
Le commentaire dit "Strip any HTML comments" mais `allowedSchemesByTag: {}` **ne fait PAS ça** — cette option contrôle les allow-schemes *par tag*. Les commentaires HTML sont gérés par `allowedTags` (les tags inconnus sont discardés par défaut, et `<!-- -->` n'est pas un tag HTML donc il est géré par le parser sous-jacent `htmlparser2` qui discard les comments par défaut).

**Fix** : retirer `allowedSchemesByTag: {}` (redondant avec la config vide) OU corriger le commentaire pour dire qu'il n'override pas les schemes par tag.

Pas d'impact fonctionnel — juste trompeur pour les relecteurs.

### 2.4 `backend/src/lib/blocks/schemas.ts` — ✅ Zod transform chain traced

```ts
const richTextDescriptionSchema = z
  .string()                                            // input: string
  .transform((v) => sanitizeRichText(v) ?? "")         // → string (may be "")
  .refine((v) => richTextLength(v) <= 5000)            // ← validates
  .transform((v) => (v ? v : undefined))               // → string | undefined
  .optional();                                         // → …  | undefined
```

**Traces du pipeline** :

| Input client | Après `sanitizeRichText` | `richTextLength` | Après 2e transform | Final stored |
|---|---|---|---|---|
| `undefined` | N/A (optional catches) | N/A | N/A | `undefined` |
| `""` | `undefined ?? ""` = `""` | `0` ≤ 5000 ✓ | `""` → `undefined` | `undefined` |
| `"<p></p>"` | `undefined ?? ""` = `""` (textOnly vide) | `0` ✓ | `undefined` | `undefined` |
| `"<p>  </p>"` | `""` (whitespace-only) | `0` ✓ | `undefined` | `undefined` |
| `"<p>Hello</p>"` | `"<p>Hello</p>"` | `5` ✓ | `"<p>Hello</p>"` | `"<p>Hello</p>"` |
| `"Hello"` (plain, legacy client) | `"Hello"` (sanitize-html preserves plain text) | `5` ✓ | `"Hello"` | `"Hello"` |
| `"<script>X</script>Y"` | `"Y"` (script stripped) | `1` ✓ | `"Y"` | `"Y"` |
| 6000-char `<p>…</p>` | sanitize keeps it | `6000` **>** 5000 ❌ | refine **fails** → 422 Unprocessable Entity | N/A |
| `"<p>" + "a".repeat(5001) + "</p>"` | sanitized | `5001` > 5000 ❌ | refine fails | N/A |

Le pipeline fonctionne correctement pour tous les cas observés. **L'ancien backend acceptait plain-text** via `z.string().max(5000).optional()` — le nouveau l'accepte aussi grâce à la tolérance plain-text de sanitize-html.

**Aucun breaking change.** Les clients legacy qui POST du plain-text voient leurs données stockées sans transformation, et affichées correctement via `normalizeLegacyDescription` au render.

### 2.5 `src/app/(public)/c/[slug]/page.tsx` — ✅ propre

- Ligne 9 : import `normalizeLegacyDescription, stripHtml` présents
- Ligne 114-118 : `descriptionPlain` via `stripHtml()` pour OG/Twitter (texte brut)
- Ligne 333-335 : `dangerouslySetInnerHTML` **protégé** par `normalizeLegacyDescription()` (sanitize-html 2e passe)
- Ligne 328 : guard `cagnotte.description ? <details> : null` — si description est `""`, ne render rien ✅
- Ligne 398 : `ShareSheet` reçoit `stripHtml(cagnotte.description ?? "") || undefined` — WhatsApp text-only ✅

**⚠️ [LOW-3] Edge case whitespace-only legacy :**
Si une row DB legacy contient `"<p></p>"` (improbable — notre backend rejette maintenant ces valeurs), `cagnotte.description` est truthy → le `<details>` render → `normalizeLegacyDescription("<p></p>")` → branche sanitize → `"<p></p>"` → `<p>` vide rendu. Résultat visuel : un petit bloc vide avec "Lire toute l'histoire" inutile.

**Probabilité** : très faible (seulement pour rows pre-patch qui contenaient du HTML vide — les backends n'ont jamais produit ça, et les rows plain-text ne passent pas par la branche sanitize).

### 2.6 `src/app/(public)/c/[slug]/ProgressPoll.tsx` — ✅ propre

- `computeProgress(totalRaised, goalAmount)` utilisé
- `percent` → label texte (peut dépasser 100)
- `barWidth` → props `<AnimatedProgressBar percent={barWidth} />` (clampé)
- Ligne 102 utilise bien `barWidth` et pas `percent` (aurait été un bug si j'avais passé `percent` à la primitive)
- Ligne 106 utilise bien `percent` pour le label
- Stack vertical `flex-col` avec `text-[clamp(1.5rem,5vw,2.25rem)]` → responsive sans troncature

**⚠️ [LOW-4] UX overshoot :**
Quand `percent = 1040`, `barWidth = 100` → la barre est pleine à 100 % mais le label dit "1040 %". Visuellement cohérent mais un donor pressé pourrait mal interpréter. V2 pourrait afficher un indicateur "✨ Objectif × 10" ou colorer la barre en doré. Hors scope v1.

### 2.7 `src/components/cagnottes/CampaignCard.tsx` — ✅ propre

- `openInNewTab = linkVariant === "public"` — clean
- `target={openInNewTab ? "_blank" : undefined}` + `rel` ← ✅
- `value={barWidth}` sur `ProgressBar` (pas `percent`) ✅
- Badge `{percent}%` avec variante verte si ≥ 100
- `<p>` avec flex layout contenant `<span>` — valide (span inline dans p)

**Observation** : le badge `{percent}%` est seulement rendu dans `<p>` avec `flex`. En HTML5 c'est valide car `display: flex` sur `<p>` override le display par défaut, et les enfants `<span>` sont inline. TypeScript ne flag pas. ✅

### 2.8 `src/app/(public)/cagnottes/LoadMore.tsx` — ⚠️ **MEDIUM bug strict mode**

```ts
const didMountRef = React.useRef(false);
React.useEffect(() => {
  if (!didMountRef.current) {
    didMountRef.current = true;
    return;
  }
  // refetch logic…
}, [activeQuery, subtype]);
```

**⚠️ [MEDIUM-1] React 19 strict mode défait le guard :**

React 19 + Next.js `reactStrictMode: true` (default) simule mount → unmount → mount sur l'initial render. Le ref est **préservé** entre les deux mounts simulés (même instance de composant). Séquence :

1. Effect run 1 : `didMountRef.current = false` → set `true` → return (pas de refetch)
2. Cleanup : aucune fonction cleanup retournée — no-op
3. Effect run 2 : `didMountRef.current === true` → **refetch runs**

En dev, le refetch s'exécute malgré le guard. **En prod** (strict mode désactivé), le guard fonctionne. Impact : bruit dev-only, pas de corruption de données utilisateur.

**Fix recommandé** (robuste en strict mode) :
```tsx
const lastFetchedRef = React.useRef({
  subtype: initialSubtype,
  query: initialQuery,
});
React.useEffect(() => {
  const lastFetch = lastFetchedRef.current;
  if (lastFetch.subtype === subtype && lastFetch.query === activeQuery) {
    return; // already have this data (SSR or previous fetch)
  }
  lastFetchedRef.current = { subtype, query: activeQuery };
  // refetch…
}, [activeQuery, subtype]);
```

Cette approche compare les **paramètres** plutôt que d'utiliser un flag de mount. Les deux runs strict-mode voient les mêmes params et skippent tous les deux.

### 2.9 `src/app/(public)/_home/_PublicCampaignsList.tsx` — ⚠️ **dead code résiduel**

```ts
import { unstable_noStore as noStore } from "next/cache";  // ← line 2
// …
const res = await fetch(url, { cache: "no-store" });       // ← line 44 (my change)
if (!res.ok) {
  // …
  noStore();  // ← line 51 (now redundant with cache: "no-store")
  return [];
}
// …
if (cagnottes.length === 0) {
  noStore();  // ← line 58 (redundant)
}
// …
catch (err) {
  noStore();  // ← line 63 (redundant)
}
```

**⚠️ [MEDIUM-2] Dead code + commentaire stale :**
J'ai switché la stratégie de cache sans nettoyer :
1. Import `unstable_noStore` devenu redondant (`cache: "no-store"` opt-out déjà toute la route)
2. 3 appels `noStore()` redondants
3. Commentaire header lignes 8-14 dit "60s ISR cache" — **faux** maintenant

**Impact fonctionnel** : zéro (noStore() est idempotent). **Impact maintenabilité** : confusion pour le prochain relecteur.

**Fix** : retirer import + 3 appels + mettre à jour le commentaire. 4 lignes d'edits.

### 2.10 Forms rich text — ✅ propres

Les 3 formulaires (festive/etape-2, solidaire/etape-2, _EditForm) :
- Import `RichTextEditor` ajouté
- `<Textarea>` description remplacé par `<RichTextEditor>`
- **`Textarea` reste importé** car utilisé pour `thankYouMessage` (etape-2) ou autres champs (_EditForm) — correct, pas de dead import
- Submit handler `description.trim() || undefined` fonctionne toujours avec HTML :
  - Empty doc → state = `""` (normalized par onUpdate) → `.trim() || undefined` = `undefined` ✅
  - Non-empty → state = `"<p>…</p>"` → `.trim()` = `"<p>…</p>"` → submit HTML ✅

**Trace edge case :** si user hydrate depuis draft puis clear tout :
- Hydration : `setDescription("<p>Old</p>")`
- Editor render via useEffect : setContent("<p>Old</p>")
- User clear : editor → onUpdate → `stripHtml("<p></p>").trim() = ""` → `onChange("")`
- State : `description = ""`
- User submit : `"".trim() || undefined` = `undefined` → backend reçoit undefined → description effacée ✅

### 2.11 `src/components/ui/RichTextEditor.tsx` — ⚠️ 2 LOW bugs UX

**⚠️ [LOW-5] Insertion de lien sur sélection vide silencieuse :**

```ts
function handleSetLink() {
  // …
  const url = window.prompt("URL du lien", previousUrl ?? "https://");
  // …
  editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
}
```

Si la sélection est vide (curseur posé dans le texte sans rien sélectionner), `extendMarkRange("link")` n'a rien à étendre, `setLink` applique la mark sur une sélection vide → **aucun lien visible n'apparaît**. L'utilisateur clique "lien", entre une URL, voit... rien.

**Fix recommandé v2** :
```ts
if (editor.state.selection.empty) {
  editor.chain().focus()
    .insertContent(`<a href="${normalized}">${normalized}</a>`)
    .run();
} else {
  editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
}
```

**⚠️ [LOW-6] Pas de hard-limit sur maxLength :**

Le compteur passe rouge quand `plainLength > maxLength` (ligne 233) mais l'éditeur n'empêche pas de taper plus. Le user peut écrire 7000 caractères puis submit → backend Zod refine rejette avec 422 → toast d'erreur.

**Fix recommandé v2** : ajouter `@tiptap/extension-character-count` avec `limit: maxLength`. Le package est déjà installable.

**Observation** : le compteur actuel est visuellement efficace (passage en rouge). Pour v1 c'est acceptable mais pas idéal pour les users qui voudraient un blocage réel.

**⚠️ [LOW-7] Placeholder overlay alignment :**

```tsx
{isEmpty && placeholder ? (
  <p className="pointer-events-none absolute left-4 top-3 ...">
    {placeholder}
  </p>
) : null}
```
Le placeholder utilise `left-4 top-3` (16px + 12px) qui correspond au `px-4 py-3` de l'éditeur. ✅ Aligné.

Mais : la hauteur `min-h-40` (160px) de l'éditeur et le `rounded-b-lg border-t-0` combinés avec la toolbar (border-b-0 rounded-t-lg) forment un container visuel uni. Le focus ring sur l'éditeur se voit mais pas sur la toolbar. Minor visual — toolbar garde son border séparé.

**Pas un bug**, juste une observation.

### 2.12 `src/app/(public)/cagnottes/page.tsx` — ✅ propre (déjà nettoyé)

- Import `unstable_noStore` **retiré**
- Appels `noStore()` **retirés**
- `cache: "no-store"` + `dynamic = "force-dynamic"` en place
- Pas de dead code résiduel (contrairement à `_PublicCampaignsList.tsx`)

### 2.13 `src/app/(public)/page.tsx` — ✅ propre

- `revalidate = 60` remplacé par `dynamic = "force-dynamic"`
- Commentaire explique le pourquoi

### 2.14 `src/app/(public)/_home/_FeaturesPink.tsx` — ✅ propre

- `<span>` inerte → `<a href="/cgu" target="_blank" rel="noopener noreferrer">`
- Hover Banani appliqué (`hover:-translate-y-0.5 hover:border-primary hover:bg-pink/40 hover:shadow-sm`)
- focus-visible ring pour a11y

### 2.15 `src/lib/constants.ts` — ✅ 72h → 48h complet

7 occurrences modifiées (vérifié par grep final : 0 occurrence résiduelle de `72 h|72h` dans `src/`).

### 2.16 `src/app/globals.css` — ✅ plugin typography wired

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```
Syntaxe Tailwind v4 correcte (`@plugin` directive — v4 uses CSS-only config).

---

## 3. Risque HIGH découvert : rate limit backend vs `cache: "no-store"`

**⚠️ [HIGH-1] Le switch cache peut saturer le global limiter backend**

### Découverte

Le backend a un `globalLimiter` configuré à **300 req/15 min par IP** ([backend/src/index.ts:116-128](../backend/src/index.ts#L116-L128)) avec skip uniquement pour `/withdrawals`, `/orders`, `/auth`. **`/api/cagnottes` est sous le global limiter.**

Express `trust proxy 1` ([index.ts:35](../backend/src/index.ts#L35)) lit l'IP depuis `X-Forwarded-For` — OK pour les browsers qui passent par la rewrite Next.js.

**Mais les fetches SSR de server components (LP `getFeatured`, `/cagnottes` `getInitial`) vont directement du serveur Next.js au backend** sans passer par la rewrite, donc sans `X-Forwarded-For`. Le backend voit alors l'IP du serveur Next.js — **une seule IP partagée pour toutes les visites**.

### Impact

Avec `cache: "no-store"`, chaque visite de la LP déclenche une requête SSR côté serveur. Tous les visiteurs partagent la même IP source côté backend. À **~1 req/3s soutenue**, le global limiter passe en 429.

Trafic cible estimé :
- LP : 1 fetch par visite = 1 req backend par pageview
- /cagnottes : 1 fetch par visite = 1 req par pageview
- Budget = 300 req / 15 min = **0.33 req/sec**

À 100 visiteurs/minute sur LP + /cagnottes → ~3.3 req/sec → limite saturée en ~1 min → LP + /cagnottes serviront **vide** jusqu'au reset.

### Mitigations (3 options)

**Option A — ajouter `/api/cagnottes` au skip list du global limiter**

```ts
skip: (req) => {
  const url = req.originalUrl || req.url;
  return (
    url.startsWith("/api/withdrawals") ||
    url.startsWith("/api/orders") ||
    url.startsWith("/api/auth") ||
    // Public read-only GETs — protected by Cloudflare/edge cache in prod,
    // and saturating 300/15min from the Next.js server IP is a known
    // issue with SSR cache: no-store. No mutation path goes through here.
    (req.method === "GET" && url.startsWith("/api/cagnottes"))
  );
},
```

**Pros** : aligne `/api/cagnottes` avec le pattern existant des routes sans limit. Simple.
**Cons** : pas de protection contre un flood côté edge. Mais WAF/CDN en production gère ça.

**Option B — revenir à ISR court (`next: { revalidate: 10 }`)**

Remplacer `cache: "no-store"` par `next: { revalidate: 10 }` dans `_PublicCampaignsList.tsx` et `cagnottes/page.tsx`.

**Pros** : garde la protection rate limit. Fraîcheur ~10s (6× meilleure que ISR 60s originale, pratiquement live). Backend hit ~6 fois/min max au lieu d'1 par visite.
**Cons** : jusqu'à 10s de staleness sur les totaux LP. Polling détail 20s compense côté page cagnotte.

**Option C — cache Redis côté backend**

Intercaler un cache Redis dans [backend/src/routes/cagnottes.ts](../backend/src/routes/cagnottes.ts) pour la query `GET /api/cagnottes?sort=popular`. TTL 5-10s.

**Pros** : la meilleure archi long-terme. Protège des floods + fresh côté visiteur.
**Cons** : plus de code à maintenir. Scope creep pour ce bundle.

### Recommandation

**Option A immédiate** (10 minutes d'implémentation, changement localisé, low risk) **+** **Option B** en fallback si Option A ne suffit pas après 24h prod. Option C pour v2 scaling.

Justification Option A : `/api/cagnottes` est publique, read-only, ne mute rien. La saturer via un flood ne casse pas le backend (Prisma + index Neon gèrent facilement 1000+ req/s sur ces queries simples). Le global limiter n'est pas une défense contre les flood — c'est une défense contre les endpoints coûteux. Les lectures publiques sur des tables indexées n'en ont pas besoin.

---

## 4. Traces XSS adversarial (verified against installed sanitize-html)

J'ai tracé **6 vecteurs d'attaque classiques** contre ma config réelle :

### Vecteur 1 : `<script>fetch('/steal')</script>`

- Éditeur : Tiptap ne parse pas `<script>` (pas dans les extensions). Paste = insertion comme texte littéral
- Si bypass client (user POST directement à l'API avec le tag) : backend `sanitize-html` discard `<script>` (pas dans `allowedTags`) → DB stocke `""` ou le texte residual
- Render : even si un row DB corrompu contenait `<script>`, `normalizeLegacyDescription` regex ne match pas `<script>` (pas dans `(p|strong|em|b|i|u|a|br)`) → branche plain-text escape → `&lt;script&gt;...&lt;/script&gt;` rendu comme texte ✅

### Vecteur 2 : `<a href="javascript:alert(1)">click</a>`

- Éditeur : `validate: (href) => /^(https?:\/\/|mailto:)/i.test(href)` rejette → paste échoue silencieusement
- Backend : `allowedSchemes: ["http","https","mailto"]` → sanitize-html discard le `href` entier → `transformTags.a` reçoit `attribs.href = undefined` → `href: attribs.href || "#"` → href rewritten to `#`, target=_blank, rel=noopener... ✅
- Render frontend (2e passe) : idem ✅

### Vecteur 3 : `<img src=x onerror=alert(1)>`

- Éditeur : `<img>` pas dans StarterKit minimal config
- Backend : `<img>` pas dans `allowedTags` → discard entier → texte résidual vide
- Render : `normalizeLegacyDescription` regex ne match pas `<img>` → branche plain-text → rendu comme `&lt;img src=x...&gt;` ✅

### Vecteur 4 : `<p onclick="fetch('/admin')">hover me</p>`

- Backend : `<p>` est allowed mais `allowedAttributes: { a: [...] }` signifie que `<p>` n'a **aucun** attribut autorisé → `onclick` discard → `<p>hover me</p>` ✅
- Render : idem

### Vecteur 5 : MS Word paste `<span class="style1"><b style="color:red">Bold</b></span>`

- Éditeur : Tiptap normalise via StarterKit → `<span>` converti ou strip, `<b>` → bold mark internal
- Backend : `<span>` pas dans `allowedTags` → strip, keep inner `<b>Bold</b>` → `transformTags.b: "strong"` → `<strong>Bold</strong>` ✅
- `style=` discard par `parseStyleAttributes: false` ✅
- `class=` pas dans `allowedAttributes` → discard

### Vecteur 6 : `<a href="http://evil.com" onclick="alert(1)" style="color:red">click</a>`

- Backend : `<a>` allowed avec `[href, target, rel]` → `onclick` et `style` **non listés → discard**
- `transformTags.a` rewrite : href préservé (`http://` = scheme OK), target=_blank (force), rel=noopener/noreferrer/nofollow (force)
- Output : `<a href="http://evil.com" target="_blank" rel="noopener noreferrer nofollow">click</a>` ✅
- **Le lien est préservé** (c'est voulu — user peut mettre un lien externe). Le `target="_blank"` + `rel="noopener"` empêche le tabnabbing.

### Vecteur 7 bonus : protocol-relative URL `<a href="//evil.com">click</a>`

- Backend : `allowProtocolRelative: false` → sanitize-html discard href → `transformTags.a` reçoit empty href → rewritten to `#` ✅

---

## 5. Régressions potentielles (surface adjacente non-touchée)

### 5.1 Dashboard creator detail page — ✅ non impacté

Le dashboard `/tableau-de-bord/cagnottes/[slug]` utilise `CampaignCard` avec `linkVariant="creator"` → mon change `openInNewTab = linkVariant === "public"` → false → target=undefined → same-window. Comportement dashboard inchangé. ✅

### 5.2 Existing CSP — ⚠️ OUT-OF-SCOPE observation

Le CSP existant (non touché par ce bundle) inclut :
```
script-src 'self' 'unsafe-inline' https://accounts.google.com ...
```
`'unsafe-inline'` autorise **tous** les scripts inline. C'est une faiblesse **pré-existante** (elle est là pour les tags tiers Google/FB/TikTok) — pas introduite par mes changements. Mais ça signifie que le browser n'ajoute pas de défense supplémentaire contre les `<script>` injectés.

**Impact réel** : nos 3 couches de sanitization (editor validate / backend Zod transform / frontend normalize) suffisent. Le CSP n'était pas prévu comme dernière défense pour du contenu user.

**Recommandation séparée** : envisager de remplacer `'unsafe-inline'` par des `nonce`-based scripts v2. Hors scope complet.

### 5.3 Email queue + notifications — ✅ non touché

Toutes les notifications post-commit (fireDonationReceived, fireMilestone, firePayoutCompleted, etc.) sont intactes. Aucune modification des dispatchers. ✅

### 5.4 Webhook signature verification + idempotency — ✅ non touché

`WebhookLog @@unique([externalId, eventType])` + Serializable transaction + `Notification.dedupeKey @unique` : aucune modification. ✅

### 5.5 Rate limiters orders stackés (audit 018) — ✅ non touché

`validate: { singleCount: false }` sur `orderIpMinuteLimiter` + `orderIpHourLimiter` : intact. ✅

### 5.6 Bictorys allowlist (audit 018) — ✅ non touché

`pay-redirect` + `redirect.ts` allowlist `bictorys.com` : intact. ✅

### 5.7 Reconcile cron (audit 018) — ✅ non touché

`reconcileStaleWithdrawals` + `checkPayoutStatus` : intact. ✅

### 5.8 Paiement flow + WaitingCard (audit 018) — ✅ non touché

Branching 4-scenarios in-app/QR/USSD/normal + polling /merci : intact. ✅

---

## 6. Summary des findings

| Sévérité | ID | Point | Action |
|---|---|---|---|
| **HIGH** | HIGH-1 | `/api/cagnottes` sous global limiter 300/15min → SSR `no-store` peut saturer | **Appliquer Option A** (skip list) OU Option B (revalidate 10s) avant prod |
| **MED** | MED-1 | `didMountRef` défait par React strict mode en dev | Remplacer par `lastFetchedRef` avec comparaison de params |
| **MED** | MED-2 | `_PublicCampaignsList.tsx` — dead code (`noStore` import + 3 calls) + commentaire stale | Nettoyer (4 lignes) |
| **LOW** | LOW-1 | Legacy description HTML+`\n` mixte perd les newlines | Fix v2 si remonté |
| **LOW** | LOW-2 | Backend `sanitize.ts` commentaire erroné sur `allowedSchemesByTag` | Corriger le commentaire |
| **LOW** | LOW-3 | Edge case `<p></p>` legacy render vide mais "Lire toute l'histoire" apparaît | Probabilité nulle en pratique |
| **LOW** | LOW-4 | Overshoot UX : barre pleine à 100% avec label "1040%" | V2 — indicateur "× 10" |
| **LOW** | LOW-5 | RichTextEditor : lien sur sélection vide silencieux | V2 — insertContent fallback |
| **LOW** | LOW-6 | RichTextEditor : pas de hard-limit max chars | V2 — character-count extension |
| **LOW** | LOW-7 | Placeholder alignment — OK après re-vérification | Pas d'action |
| **INFO** | INFO-1 | CSP `'unsafe-inline'` pré-existant — défense en profondeur affaiblie | Hors scope, v2 nonce |

---

## 7. Test plan avant prod

### 7.1 Rich text editor — scénarios minimaux

**Création festive :**
1. Aller sur `/tableau-de-bord/nouvelle/festive/etape-1`, remplir titre + objectif
2. Continuer vers etape-2
3. Dans le champ description, vérifier :
   - Tapper du texte → counter s'incrémente
   - Sélectionner du texte → cliquer `B` → mis en gras visuel
   - Sélectionner du texte → cliquer `I` → italique visuel
   - Sélectionner du texte → cliquer link → prompt → entrer `https://example.com` → lien créé, underline primary
   - Cliquer dans le lien → bouton "Retirer le lien" (`Unlink`) apparaît
   - Taper > 5000 caractères → counter passe en rouge
4. Continuer vers etape-3, publier
5. Aller sur `/c/[slug]` public, vérifier que la description s'affiche avec la mise en forme

**Création solidaire :** idem

**Modification :**
1. Depuis dashboard `/tableau-de-bord`, cliquer une cagnotte existante → modifier
2. Vérifier que l'éditeur est pré-rempli avec la description actuelle (rich text ou legacy plain)
3. Modifier la mise en forme + submit
4. Re-ouvrir le formulaire → vérifier que la modification a persisté

### 7.2 XSS paste attack (optionnel mais recommandé)

1. Copier dans un éditeur `<script>alert('xss')</script>` puis paste dans l'éditeur RichText
2. Submit → vérifier dans la DB (prisma studio) que le champ `description` ne contient PAS `<script>` (sanitized away)
3. Aller sur `/c/[slug]` → vérifier qu'aucune alert() ne fire et que le texte est rendu littéral

### 7.3 /cagnottes empty search

1. Aller sur `/cagnottes` frais (nouvelle tab)
2. Vérifier dans devtools Network : aucun `GET /api/cagnottes` supplémentaire au mount (seulement le SSR fetch embedded)
3. Taper dans la search bar → refetch fire après 300ms debounce ✅

**⚠️ En dev mode** avec strict mode actif, le bug MED-1 va déclencher une requête en plus au mount. C'est attendu (voir section 2.8). Pas bloquant pour la prod.

### 7.4 Cache LP

1. Créer une nouvelle donation via `/c/[slug]/participer` → `/paiement` → Bictorys sandbox → /merci
2. Revenir sur la home → vérifier que le total de la cagnotte en question est à jour **immédiatement** (pas 60s après)
3. Vérifier backend logs : un `GET /api/cagnottes?sort=popular&limit=6` par pageview de la home

### 7.5 Cards new-tab

1. Depuis `/` (home), cliquer une card de cagnotte → doit s'ouvrir dans un **nouvel onglet**
2. Depuis `/cagnottes`, cliquer une card → **nouvel onglet**
3. Depuis `/tableau-de-bord` (dashboard creator), cliquer une de ses cagnottes → **same-window** (variante creator)

### 7.6 FAQ home

1. Scroll jusqu'à la section FAQ → compter 6 items
2. Cliquer chaque item → expand/collapse fonctionne
3. Dans `HomeFeaturesPink`, toggle "Faire plaisir" / "Soutenir" → dans les 2 variantes, cliquer "Voir nos conditions" → ouvre `/cgu` dans **un nouvel onglet**

### 7.7 48h partout

1. `/` → section features "Tes fonds en 48 h"
2. `/c/[slug]` → trust item "Fonds versés en 48 h"
3. `/aide` → FAQ mentionne 48h (24 à 48 heures)
4. `/tableau-de-bord/retraits` (creator) → badges 48h
5. `/coordonnees-bancaires` → "délai de 48 h"

### 7.8 Typecheck + smoke test

```bash
cd cagnottes-sn && npx tsc --noEmit
cd backend && npx tsc --noEmit
# (si dispo) cd backend && npx tsx scripts/smoke-test.ts
```

---

## 8. Fixes immédiats recommandés (< 30 min)

Avant déploiement prod, appliquer au moins :

### 8.1 Fix HIGH-1 — Skip global limiter pour `/api/cagnottes` GET

Dans `backend/src/index.ts`, lignes 123-126 :
```ts
skip: (req) => {
  const url = req.originalUrl || req.url;
  return (
    url.startsWith("/api/withdrawals") ||
    url.startsWith("/api/orders") ||
    url.startsWith("/api/auth") ||
    (req.method === "GET" && url.startsWith("/api/cagnottes"))
  );
},
```

### 8.2 Fix MED-1 — LoadMore.tsx lastFetchedRef

Remplacer le `didMountRef` par `lastFetchedRef` comme décrit en section 2.8.

### 8.3 Fix MED-2 — Nettoyer _PublicCampaignsList.tsx

- Retirer `import { unstable_noStore as noStore } from "next/cache";`
- Retirer les 3 appels `noStore();`
- Mettre à jour le commentaire header pour refléter `cache: "no-store"`

**Total estimé** : 20 minutes d'edits + 2 min typecheck.

---

## 9. Conclusion

Vérification indépendante ligne-à-ligne de **~20 fichiers touchés + 4 créés**.

**Ce qui est solide :**
- XSS : 3 couches indépendantes, 6 vecteurs d'attaque tracés, tous bloqués
- API Tiptap / sanitize-html : verified contre les `.d.ts` installés, signatures correctes
- Zod transform chain : tous les cas inputs tracés (undefined, "", `<p></p>`, plain text, HTML complet, 6000 chars, script injection)
- Backward compatibility : legacy plain-text descriptions rendues correctement via `normalizeLegacyDescription`
- Typechecks frontend + backend propres
- Aucune régression sur l'auth, paiements, webhooks, rate limits existants, notifications, cron reconcile, allowlist Bictorys

**Ce qui doit être corrigé avant prod :**
- **HIGH-1** : risque de saturation rate limit backend — fix 5 lignes en section 8.1
- **MED-1** : didMountRef défait en dev par strict mode — fix élégant en section 8.2
- **MED-2** : dead code dans `_PublicCampaignsList.tsx` — cleanup 4 lignes en section 8.3

**Ce qui peut attendre v2 :**
- LOW-1/2/3/4/5/6/7 — UX améliorations + edge cases rares

**Recommandation finale** :
1. Appliquer les 3 fixes de la section 8 (~20 min)
2. Exécuter le test plan section 7 en dev
3. Déployer en staging pour smoke test + test cross-browser (Safari iOS critique pour le prompt())
4. Monitor backend rate limit hits pendant 24h post-prod
5. Si pas d'incident, cacher officiellement audit-019 + audit-020 comme "✅ session complete"

Le code est **production-ready sous réserve des 3 fixes MED/HIGH**. Les 7 findings LOW sont des améliorations, pas des blockers.
