# Audit 012 — Refactor auth Google-first + audit champs formulaire + expiration de session

**Date :** 2026-04-14
**Contexte :** Demande utilisateur — pattern « Google en haut / Continuer avec Email » sur /connexion et /inscription, plus audit des champs de formulaire et du système d'expiration de session.

---

## 1. Refactor UI — pattern collapsible

### Implémenté

Sur [/connexion](src/app/(auth)/connexion/page.tsx) et [/inscription](src/app/(auth)/inscription/page.tsx), la structure est maintenant :

```
┌─────────────────────────────┐
│  [G] Inscription rapide...  │  ← Google OAuth (toujours visible)
├─────────────────────────────┤
│          ou                 │  ← divider
├─────────────────────────────┤
│  ✉️ Continuer avec Email    │  ← déclencheur outline button
└─────────────────────────────┘
           ↓ on click
┌─────────────────────────────┐
│  [G] Inscription rapide...  │
│          ou                 │
│  email: [________________]  │  ← auto-focus sur l'email
│  password: [_____________]  │
│  [Se connecter]             │
└─────────────────────────────┘
```

**Changements concrets** :
- Nouvel état `showEmailForm` (React.useState, par défaut `false`).
- Le bouton Google est déplacé **au-dessus** des champs et rendu inconditionnellement quand `FEATURE_SOCIAL_AUTH` est `true` (il l'est — [src/lib/features.ts:12](src/lib/features.ts#L12)).
- Le `<form>` email et le trigger « Continuer avec Email » sont mutuellement exclusifs via rendu conditionnel.
- `autoFocus` sur le premier champ (email côté connexion, firstName côté inscription) pour l'UX mobile : on tape « Continuer avec Email » et le clavier monte immédiatement.
- Pas d'animation de hauteur — rendu conditionnel simple. Préserve la prop de démarrage instantané et évite les jank sur 3G.

**Pourquoi pas de transition CSS ?** Le pattern `grid-template-rows: 0fr → 1fr` qu'on utilise parfois pour collapse anime proprement mais ajoute ~6 lignes de code et du risque de layout shift. Sur un chemin critique (login), l'absence d'animation est ressentie comme « instantané » plutôt que comme « statique ». Facile à ajouter plus tard si tu veux.

**Accessibilité** :
- Le `autoFocus` déplace le focus sur le premier champ, annoncé par les lecteurs d'écran.
- Le bouton déclencheur disparaît quand révélé → le focus reste sur la page, pas de saut.
- Les labels `Input` sont toujours associés via `htmlFor`.

**Rien côté backend** : les deux formulaires continuent d'appeler `POST /api/auth/login` et `POST /api/auth/signup` exactement comme avant.

---

## 2. Audit champs de formulaire — signup / login

### 2.1 Côté backend (source de vérité)

| Champ | Schéma Zod | Statut |
|---|---|---|
| `email` (signup + login + forgot + reset) | `z.string().email()` | ✅ Validation RFC, case non-normalisée par Zod (voir ci-dessous) |
| `password` (signup) | `z.string().min(8).max(128)` | ✅ Min 8 / Max 128 |
| `password` (login) | `z.string().min(1)` | ✅ Volontairement permissif (un ancien compte peut avoir un pwd court) |
| `displayName` (signup) | `.min(2).max(50)` | ✅ |
| `slug` (signup) | Regex + reserved list guard | ✅ |
| OTP code (verify + reset) | `z.string().length(6)` | ✅ |
| `customerName` (orders) | `.trim().max(120)` | ✅ (corrigé audit 011 B-01) |

**Hashage** : `bcryptjs` rounds=12 ([backend/src/lib/auth.ts:68](backend/src/lib/auth.ts#L68)). Industry-standard, OK pour 2026. Argon2id serait plus résistant GPU mais bcrypt@12 est toujours acceptable pour un service mobile-money grand public.

**Timing-safe password check** : `bcrypt.compare()` est intrinsèquement constant-time. ✅

### 2.2 Rate limiters par endpoint auth

| Endpoint | Limite | Fenêtre | Clé |
|---|---|---|---|
| `POST /api/auth/signup` | 5 | 15 min | IP |
| `POST /api/auth/login` | 10 | 15 min | IP |
| `POST /api/auth/verify-email` | 6 | 15 min | IP |
| `GET /api/auth/check-slug` | 30 | 1 min | IP |
| `POST /api/auth/check-email` | 30 | 1 min | IP |
| `POST /api/auth/refresh` | **NEW : 30** | 15 min | IP |
| `POST /api/auth/forgot-password` | — (global) | — | — |
| `POST /api/auth/reset-password` | — (global) | — | — |

**Corrigé dans ce pass** : ajout du `refreshLimiter` (30/15min) sur `/refresh` — voir [backend/src/routes/auth.ts:88](backend/src/routes/auth.ts#L88).

**À considérer** : ajouter un limiter dédié sur `/forgot-password` et `/reset-password`. Aujourd'hui ils tombent sous le global 300/15min (CLAUDE.md dit qu'`/auth` est exempté du global — à re-vérifier — ce qui laisserait ces deux endpoints sans protection dédiée).

### 2.3 Côté frontend

Ce qui est OK dans [connexion/page.tsx](src/app/(auth)/connexion/page.tsx) et [inscription/page.tsx](src/app/(auth)/inscription/page.tsx) :

- `type="email"` sur les champs email → clavier adapté + validation navigateur basique.
- `autoComplete="email" | "current-password" | "new-password" | "given-name" | "family-name"` → keychain iOS/Android, password managers desktop.
- `required` sur tous les champs obligatoires → barrière HTML5 avant JS.
- `minLength={8}` sur le champ `password` signup → bloque la soumission avec < 8 char avant même de solliciter le backend.
- `disabled={submitting}` + `loading={submitting}` sur tous les boutons submit → pas de double-POST (déjà audit 011 D-02, aucun hit ici).
- `e.preventDefault()` en première ligne de chaque handler → pas de submit navigateur parasite.
- `email.trim()` avant envoi (login + forgot-password) → corrigé audit 011 B-03.

Petit manque : **`email.trim()` n'est PAS appliqué sur signup** (`body: { email, password, displayName, slug }`) et **reset-password** (`body: { email, code, newPassword }`). Espaces en début/fin d'email → `z.string().email()` côté backend refuse — donc erreur UX mais pas faille. À harmoniser en cohérence avec audit 011 B-03.

### 2.4 Points de durcissement non critiques

**F-01 — Email lowercase-normalisé côté schéma** (Medium, UX)
Le backend fait `email.toLowerCase()` à certains endroits (ex: [auth.ts:128](backend/src/routes/auth.ts#L128)) mais pas partout. Une inscription `ALICE@Example.com` puis login `alice@example.com` dépend de la route traversée. Recommandation : ajouter `.toLowerCase()` au schéma Zod (`z.string().email().toLowerCase()`) ou une transformation dans un seul helper `normalizeEmail()`.

**F-02 — Politique de mot de passe minimale** (Low)
`min(8).max(128)` n'exige ni majuscule, ni chiffre, ni symbole. Pour un service financier grand public, l'entropie compte plus que la complexité (8 chars random > 12 chars avec pattern). Acceptable en l'état si les utilisateurs sont éduqués à éviter les mots de passe évidents. Optionnel : checker contre une top-10k-leaked list.

**F-03 — Pas de CAPTCHA** (Low)
Les limiters (5 signups / 15min / IP) protègent, mais ne couvrent pas un botnet distribué. hCaptcha / Cloudflare Turnstile peut venir en v2 si on voit du spam signup.

**F-04 — `trim()` manquant sur signup + reset-password côté client** (Low)
À harmoniser avec B-03.

---

## 3. Audit du système d'expiration de session

### 3.1 Ce qui est en place

**JWT access token** : 15 min ([backend/src/lib/auth.ts:14](backend/src/lib/auth.ts#L14), `ACCESS_TOKEN_EXPIRY = "15m"`).
**JWT refresh token** : 7 jours ([auth.ts:15](backend/src/lib/auth.ts#L15), `REFRESH_TOKEN_EXPIRY = "7d"`).
**Cookies** :
- `izy-token` : `httpOnly`, `secure` (prod), `sameSite: "none"` (prod, pour cross-origin Vercel↔Railway), `maxAge: 15min`, path `/` (par défaut).
- `izy-refresh` : idem **mais scopé à `path: "/api/auth"`** → le navigateur ne l'envoie que sur les endpoints d'auth. Excellente segmentation.
- `izy-csrf` : `httpOnly: false` (lisible par JS pour double-submit), `sameSite: "none"` (prod), `maxAge: 7d`.

**Auto-refresh côté client** : [src/lib/api.ts](src/lib/api.ts) rattrape les 401 en appelant `/api/auth/refresh` puis en rejouant la requête. **Verrou de mutex** (`refreshPromise`) pour éviter les refresh concurrents.

**`requireAuth` re-interroge la DB** à chaque requête ([backend/src/middleware/auth.ts](backend/src/middleware/auth.ts)) — mitigation stale-JWT-plan-bypass (T-02-14).

### 3.2 Forces

- **Short access token (15m)** : limite la fenêtre d'exploitation d'un vol de cookie à 15 min dans le pire cas (cookie non renouvelé).
- **Refresh scopé à `/api/auth`** : un XSS (si un jour un se trouve) ne peut pas exfiltrer le refresh token via fetch() vers un autre endpoint — il n'est envoyé nulle part ailleurs que `/api/auth/*`.
- **CSRF double-submit** : le `x-csrf-token` header doit matcher le cookie `izy-csrf` → un attaquant cross-origin ne peut pas forger une mutation.
- **`sameSite: none` + `secure`** : correct pour l'archi cross-origin prod. En dev `sameSite: "lax"` pour localhost same-site.
- **Mutex refresh** : pas de tempête de refresh en cas de N tabs ouverts simultanément.

### 3.3 Findings — ordre de criticité

**S-01 🟧 → ✅ Rate limiter absent sur `/refresh` (corrigé dans ce pass)**

Avant : `POST /api/auth/refresh` n'avait aucun middleware de rate limiting. Un attaquant en possession d'un refresh token pouvait le rejouer en boucle (brute-force d'un JWT secret faible, DoS sur la DB via `createRefreshToken` → signature JWT, remplissage de logs).

**Corrigé** : `refreshLimiter` (30 req / 15 min / IP) ajouté dans [backend/src/routes/auth.ts:88](backend/src/routes/auth.ts#L88). 30 est un budget large pour un SPA multi-onglet : un refresh toutes les 10 min × 3 onglets = 4/heure ≈ 12/15min. Marge de sécurité suffisante, plafond strict vs abuse.

**S-02 🟧 Pas de rotation avec révocation du refresh token**

À chaque appel à `/refresh`, le handler émet un nouveau refresh token et écrase le cookie — mais l'**ancien refresh token reste valide jusqu'à son expiration naturelle 7j plus tard** (JWT stateless, pas de blacklist). Conséquence : si un attaquant intercepte un refresh token, il peut continuer à l'utiliser en parallèle du vrai utilisateur.

**Mitigation recommandée (v1.1)** :
1. Ajouter une table `RefreshToken(id, sellerId, tokenHash, createdAt, usedAt, revokedAt)` indexée par `tokenHash`.
2. Stocker le hash du refresh token à la création ; marquer `usedAt` à chaque refresh.
3. Détection de **refresh token reuse** : si un token avec `usedAt != null` est re-présenté → révoquer toute la famille de tokens du seller (suspicion de vol).

C'est une pratique OAuth 2.1 (refresh token rotation + reuse detection). **~2h de travail** + une migration Prisma. À prioriser pour un service financier, mais pas bloquant en v1 tant que le cookie est `httpOnly + secure + sameSite=none` (le vecteur de vol principal est le XSS, qui n'existe pas — audit 011 X-03).

**S-03 🟧 `change-password` n'invalide pas les JWT existants**

[backend/src/routes/auth.ts:708](backend/src/routes/auth.ts#L708) — `PUT /api/auth/change-password` met à jour le hash en DB mais :
- Ne révoque pas le refresh token actif.
- Ne force pas de re-login.
- Les JWT access déjà émis restent valides jusqu'à expiration (max 15m).
- Le refresh token actuel reste valide 7j.

Scénario : un utilisateur change son mot de passe parce qu'il suspecte un vol → l'attaquant qui a le cookie conserve l'accès pendant 7 jours via `/refresh`.

**Mitigation recommandée** :
- Ajouter un champ `Seller.tokenVersion: Int @default(0)`, incrémenter à chaque changement de mot de passe critique.
- Inclure `tokenVersion` dans la payload JWT ; `verifyAccessToken` compare à la version DB → rejette les tokens obsolètes.
- Ou plus simple avec la table `RefreshToken` de S-02 : dans `change-password`, `UPDATE refreshToken SET revokedAt = now() WHERE sellerId = ?`.

**Priorité** : Medium. La fenêtre d'exploitation post-change-password est un scénario réaliste pour un service financier.

**S-04 🟢 Logout ne révoque pas le JWT server-side (accepté)**

`POST /api/auth/logout` appelle `clearAuthCookies(res)` — le client perd les cookies, mais si le JWT avait été volé avant et stocké ailleurs, il reste valide jusqu'à expiration (15 min access, 7j refresh).

**Accepté comme v1 trade-off** inhérent aux JWT stateless. Mitigation : la même `RefreshToken` table de S-02 + S-03 permet une vraie révocation à l'appel logout.

**S-05 🟧 Durée du refresh token (7j) — à revoir pour un service financier**

7j est le défaut SPA classique. Pour un service qui manipule des mobile money et des retraits, **3 jours** serait plus prudent :
- Un téléphone perdu ré-authentifié tous les 3j limite la fenêtre d'exploitation.
- L'UX impact est minimal (le refresh est silencieux tant que l'utilisateur reste actif).
- À mettre en balance : 3j force les créateurs de cagnotte peu actifs à se reconnecter → friction sur le dashboard.

Recommandation : **5 jours** comme compromis, ou ajouter un toggle « Rester connecté » qui choisit entre 1j (off) et 7j (on).

**S-06 🟢 Pas de CSP `connect-src` restrictif sur `/api/auth` (non-critique)**

[next.config.ts:99](next.config.ts#L99) autorise le domaine backend dans `connect-src`. OK pour l'appel légitime depuis le navigateur. Pas un finding, juste à documenter : si un jour on segmente, garder `/api/auth` dans `connect-src`.

### 3.4 Verdict session expiration

**Statut actuel : acceptable pour v1**, avec :
- ✅ Rate limiter `/refresh` maintenant en place (corrigé ce pass)
- 🟧 3 gaps à traiter en v1.1 (S-02 rotation, S-03 change-password invalidation, S-05 durée refresh)

La combinaison de :
- Access token 15m + cookie `httpOnly` `secure` `sameSite=none`
- Refresh token scopé à `/api/auth`
- CSRF double-submit
- `requireAuth` re-query DB
- Zéro `dangerouslySetInnerHTML` (pas de vecteur XSS)

est déjà au-dessus du niveau moyen de l'écosystème SaaS FR. Les gaps S-02/S-03 deviennent pertinents si on traite des montants élevés ou si un incident nous oblige à ajouter de la traçabilité.

---

## 4. Plan d'action priorisé

### Appliqué ce pass
1. ✅ Pattern Google-first / Continuer avec Email sur /connexion et /inscription
2. ✅ Rate limiter sur `POST /api/auth/refresh` (30/15min/IP)

### v1.1 (avant mise en ligne financière)
3. **S-03** — Invalidation des JWT au changement de mot de passe (`Seller.tokenVersion` ou table RefreshToken)
4. **S-02** — Refresh token rotation avec détection de reuse (table `RefreshToken` — ~2h)
5. **F-04** — Harmoniser `email.trim()` sur signup + reset-password côté client
6. **F-01** — Normaliser email en lowercase côté schéma Zod

### v2
7. **S-05** — Réduire refresh TTL à 3-5 jours ou ajouter toggle « Rester connecté »
8. **F-02** — Checker des mots de passe contre une top-10k leaked list (haveibeenpwned k-anon API)
9. **F-03** — CAPTCHA (Turnstile) si signal de spam

---

## Annexe — fichiers touchés

| Fichier | Type |
|---|---|
| [src/app/(auth)/connexion/page.tsx](src/app/(auth)/connexion/page.tsx) | Refactor UI collapsible |
| [src/app/(auth)/inscription/page.tsx](src/app/(auth)/inscription/page.tsx) | Refactor UI collapsible |
| [backend/src/routes/auth.ts](backend/src/routes/auth.ts) | `refreshLimiter` + attache `/refresh` |
