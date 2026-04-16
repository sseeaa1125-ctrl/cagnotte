# Audit 011 — Audit complet front/back (couverture, sanitisation, XSS, double-soumission)

**Date :** 2026-04-14
**Périmètre :** `src/` (Next.js 16 App Router) + `backend/src/` (Express 5 / Prisma)
**Objectifs utilisateur :**
1. Chaque API a-t-elle un composant UI, et chaque UI a-t-elle un backend cohérent ?
2. Les formulaires sont-ils sanitisés ?
3. Pas d'injection XSS possible ?
4. Les boutons sont-ils protégés contre la double-action ?

---

## 1. Résumé exécutif

**Verdict global : OK pour v1, avec deux points rouges et plusieurs points oranges.**

| Axe | Statut |
|---|---|
| Couverture API ↔ UI | 🟧 18 endpoints câblés / ~72 existants. 15 sont des reliquats fari.store à supprimer, ~30 attendent le branchement Banani, aucun appel frontend ne pointe vers une route manquante. |
| Auth / CSRF / Rate limiting | 🟩 `requireAuth + verifyCsrf + writeLimiter` appliqués partout où il faut. Limiters dédiés sur `auth`, `orders` (IP + email), `withdrawals`. |
| Validation Zod backend | 🟩 Présente sur tous les endpoints sensibles. 🟧 Quelques champs texte libre sans borne `.max()`. |
| Sanitisation / échappement | 🟧 Aucune réécriture HTML côté backend. Tout repose sur le rendu JSX côté client. |
| XSS côté frontend | 🟩 **Zéro** `dangerouslySetInnerHTML`, zéro `innerHTML`, zéro `eval`. |
| En-têtes sécurité | 🟧 X-Frame-Options / nosniff / Referrer-Policy OK. **CSP manquante.** |
| Double-soumission boutons | 🟥 **2 problèmes critiques** : retry 401 générique sur POST, `ParticiperForm` sans état `submitting`. |
| Idempotency-Key | 🟥 Aucun endpoint de paiement/retrait n'en envoie ni n'en consomme. |

Les deux points rouges (retry 401 sur POST + ParticiperForm) sont les seuls qui peuvent, en théorie, causer un double-débit. Tout le reste est de la défense en profondeur.

---

## 2. Couverture API ↔ UI

### 2.1 Endpoints orphelins (backend uniquement)

**À supprimer — reliquats fari.store** (non atteignables depuis l'UI du fork, pollution du schéma Prisma) :

| Endpoint | Fichier | Raison |
|---|---|---|
| `POST/PUT/DELETE /api/blocks/:id/reviews*` | [backend/src/routes/blocks.ts](backend/src/routes/blocks.ts) | Reviews store fari.store |
| `POST/PUT/DELETE /api/blocks/:id/bumps*` | [backend/src/routes/blocks.ts](backend/src/routes/blocks.ts) | Order bumps fari.store |
| `GET /api/orders/bookings`, `PUT /api/orders/:id/cancel-booking`, `POST /api/orders/lead-magnet` | [backend/src/routes/orders.ts](backend/src/routes/orders.ts) | Booking / lead magnet |
| `PUT /api/sellers/theme`, `GET /api/sellers/:slug/blocks/:blockId`, `GET /api/sellers/:slug/availability` | [backend/src/routes/sellers.ts](backend/src/routes/sellers.ts) | Store multi-vendeur / booking |
| `GET /api/upload/images` | [backend/src/routes/upload.ts](backend/src/routes/upload.ts) | Galerie legacy |
| `GET /api/auth/google/*`, `POST /api/auth/unsubscribe`, `POST /api/auth/check-email` | [backend/src/routes/auth.ts](backend/src/routes/auth.ts) | OAuth Google legacy + email-marketing |

> Ces routes agrandissent la surface d'attaque pour rien. Elles devraient être retirées **avant** la mise en ligne publique, même si CLAUDE.md garde le schéma Prisma intact.

**À brancher (features core cagnottes qui attendent Banani)** : liste/reorder/close/reopen des blocs, `GET /api/cagnottes/:slug/participants` pour le mur de donateurs, `GET /api/orders/:ref/status` pour la page merci, refunds, delete account, etc.

### 2.2 Appels frontend vers routes manquantes

**Aucun** appel frontend ne pointe vers un endpoint inexistant. Les cinq « faux positifs » repérés (trailing slash) sont résolus par Express.

### 2.3 Divergences de shape à surveiller

- `PUT /api/sellers` vs `PUT /api/sellers/profile` : le code frontend appelle parfois `/profile`, le backend est monté sur `/api/sellers`. À vérifier au branchement final des formulaires profil/bank.
- `PATCH /api/notifications/prefs` : le schéma Zod côté backend accepte un objet libre (pas de shape stricte). Le frontend envoie un objet de toggles — risque faible mais à cadrer.

---

## 3. Sanitisation des formulaires

### 3.1 Ce qui est bien fait

- **Validation Zod backend** sur signup, login, reset-password, blocks (create/update), orders, withdrawals, sellers, KYC, notifications, upload.
- **Upload** ([backend/src/routes/upload.ts](backend/src/routes/upload.ts)) : whitelist MIME, taille limitée (5 MB images / 50 MB fichiers), `sanitizeFileName()`, vérification magic-byte via `file-type`, conversion HEIC → JPEG.
- **Fichiers KYC** taggés `purpose=kyc` et exclus du gallery picker.
- **`maskDonation()`** ([backend/src/routes/cagnottes.ts](backend/src/routes/cagnottes.ts)) redacte `customerEmail`, `isAnonymous`, `messageIsPrivate` avant de servir le mur public.
- **`escapeHtml()`** est utilisé dans [backend/src/routes/orders.ts](backend/src/routes/orders.ts) pour la construction des corps d'e-mails.
- **Filtre de visibilité SQL-level** sur `GET /api/cagnottes` — une cagnotte privée ne peut pas fuiter via la liste publique (mitigation P05).
- Quelques formulaires front trimment correctement avant envoi : KYC ([src/app/(authed)/profil/kyc/_KycForm.tsx](src/app/(authed)/profil/kyc/_KycForm.tsx)), profil, donation ([src/app/(public)/c/[slug]/participer/ParticiperForm.tsx](src/app/(public)/c/[slug]/participer/ParticiperForm.tsx)).

### 3.2 Points à corriger

**B-01 — Champs texte libre sans `.max()` côté Zod (DoS / bloat DB, Medium)**

Plusieurs schémas acceptent des chaînes de longueur illimitée :

- `Order.customerName` ([backend/src/routes/orders.ts](backend/src/routes/orders.ts)) — `z.string().min(1)` sans `.max()`
- `Block.config.title` / `description` ([backend/src/lib/blocks/schemas.ts](backend/src/lib/blocks/schemas.ts)) — à borner
- `Seller.displayName`, `subtitle` ([backend/src/routes/sellers.ts](backend/src/routes/sellers.ts)) — `bio` est capé à 500 mais pas les deux autres
- `Order.donorMessage` : OK, `z.string().max(500)` déjà appliqué

**Correctif :** ajouter `.max(200)` ou `.max(2000)` selon le champ, appliquer `.trim()` dans le schéma (`z.string().trim().max(...)`).

**B-02 — Absence de validation Zod côté frontend (Low, cosmétique)**

Aucun formulaire n'utilise Zod côté client — validation manuelle par ifs. Le backend protège, mais UX dégradée (erreurs tardives). À prioriser bas.

**B-03 — Trimming inconsistant côté client (Low)**

Login, forgot-password, reset-password, bank coords n'appliquent pas `.trim()` avant envoi. Pas critique (backend devrait le refaire), mais à harmoniser.

**B-04 — `maxLength` PIN mal câblé (Low, bug d'UX)**

Dans [_PinForm.tsx](src/app/(authed)/profil/securite/_PinForm.tsx) et [_PinStep.tsx](src/app/(authed)/retraits/pin/_PinStep.tsx), les inputs individuels de PIN ont `maxLength={6}` alors qu'un chiffre par input attend `maxLength={1}`. Fonctionnel mais permet de coller 6 chiffres dans une case unique.

**B-05 — Pas de `type="email"` sur les champs email (Low)**

Tous les inputs email sont `type="text"` : pas d'autocomplete, pas de validation navigateur. À corriger.

---

## 4. Injection XSS

### 4.1 Surface statique

| Vecteur | Résultat |
|---|---|
| `dangerouslySetInnerHTML` dans `src/` et `backend/src/` | **0 occurrence** |
| `innerHTML`, `outerHTML`, `document.write` | **0 occurrence** |
| `eval(`, `new Function(` | **0 occurrence** |
| `target="_blank"` sans `rel="noopener noreferrer"` | OK — vérifié sur [paiement/page.tsx:632](src/app/(public)/c/[slug]/paiement/page.tsx#L632) |

### 4.2 Rendu du contenu utilisateur

- **Message du donateur** sur [tableau-de-bord/cagnottes/[slug]/page.tsx:403](src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx#L403) : rendu via interpolation JSX `{p.message}` — **text node, sûr**.
- **Titre + description cagnotte** sur [c/[slug]/page.tsx](src/app/(public)/c/[slug]/page.tsx) : interpolation JSX avec `whitespace-pre-line` — **sûr**.
- **Notifications** ([_NotificationsClient.tsx](src/app/(authed)/notifications/_NotificationsClient.tsx)) : idem.

**Conclusion XSS : aucun vecteur exploitable dans l'état actuel.** React protège par défaut tant que personne n'ajoute `dangerouslySetInnerHTML`. À inscrire comme règle dans [CLAUDE.md](CLAUDE.md) pour les futures PR Banani.

### 4.3 Points d'attention futurs

**X-01 — Content-Security-Policy manquante (Medium)**

[next.config.ts](next.config.ts) pose `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` mais **pas de CSP**. À ajouter a minima :

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';  // Next.js inline bootstraps
  img-src 'self' data: https:;                      // R2 + data URIs
  connect-src 'self' ${NEXT_PUBLIC_API_URL};
  frame-ancestors 'none';
  base-uri 'self';
```

À durcir en v2 (`unsafe-inline` est nécessaire tant que Next.js hydrate via inline scripts ; basculer vers nonce quand possible).

**X-02 — Templates d'e-mails** ([backend/src/lib/notifications/templates.ts](backend/src/lib/notifications/templates.ts)) : vérifier que toutes les interpolations `${donorName}`, `${message}` passent par `escapeHtml()` avant d'être injectées dans le HTML Resend. Certaines templates sont marquées PROVISIONAL — à auditer en phase 5.

**X-03 — Stockage brut des champs libres** : `donorMessage`, `bio`, `title`, `description` sont persistés tels quels. Actuellement inoffensif car le rendu est JSX-safe, mais **si** un futur écran Banani introduit un rendu markdown/HTML, il faudra re-passer sur ces points. Documenter dans CLAUDE.md : « le rendu JSX est la barrière ; tout composant qui affiche du contenu utilisateur doit rester en text node ».

---

## 5. Boutons et double-soumission

### 5.1 État général

18 boutons mutant sur 21 sont protégés par un `submitting`/`saving` + `disabled`. Motif standard respecté :

```tsx
e.preventDefault();
if (submitting) return;           // guard de ré-entrance
setSubmitting(true);
try { await api(...); }
finally { setSubmitting(false); }
```

### 5.2 Problèmes critiques

**D-01 🟥 Retry automatique sur 401 dans [src/lib/api.ts](src/lib/api.ts) (HIGH)**

Lignes ~81-88 : en cas de 401, `api()` appelle `/api/auth/refresh` puis **rejoue la requête d'origine**, y compris les POST. Scénario :

1. POST `/api/withdrawals` → le serveur crée le retrait et répond
2. La réponse se perd (coupure réseau / TikTok WebView)
3. `api()` voit un échec → rafraîchit le token → **rejoue le POST**
4. Un second retrait est créé.

**Même risque sur `POST /api/orders` (charge Bictorys).** La Bictorys côté paiement a son propre circuit breaker et le webhook est idempotent via `WebhookLog @@unique([externalId, eventType])`, mais la création d'`Order` en base peut se dupliquer.

**Correctifs possibles (par ordre de préférence) :**
1. Restreindre le retry-après-refresh aux verbes idempotents (`GET`, `HEAD`).
2. Ajouter un en-tête `Idempotency-Key: <uuid>` généré côté client pour chaque POST mutant, et un index unique côté Order / Withdrawal.
3. À défaut, laisser le 401 remonter à l'appelant sur les mutations et demander à l'utilisateur de réessayer manuellement.

**D-02 🟥 `ParticiperForm` sans état `submitting` (HIGH pour l'UX, LOW pour la finance)**

[src/app/(public)/c/[slug]/participer/ParticiperForm.tsx:109](src/app/(public)/c/[slug]/participer/ParticiperForm.tsx#L109) : `handleSubmit` écrit dans `sessionStorage` puis `router.push('/paiement')`. Il **n'y a aucun `submitting`**, aucun `disabled`. Un double-clic rapide peut :

- enclencher deux navigations successives,
- laisser un écart entre le payload sessionStorage et l'URL.

Impact financier : **faible** (la charge réelle se fait sur `/paiement`), mais le parcours public de don est le plus sensible en image : il mérite la même protection que tous les autres formulaires.

**Correctif :**
```tsx
const [submitting, setSubmitting] = useState(false);
async function handleSubmit(e) {
  e.preventDefault();
  if (submitting) return;
  setSubmitting(true);
  try { /* stash + router.push */ }
  finally { setSubmitting(false); }
}
// puis <button disabled={submitting}>
```

### 5.3 Points mineurs

**D-03 — Logout sans `disabled`** ([DashboardShell.tsx:24](src/app/(authed)/DashboardShell.tsx#L24)) : l'état `loggingOut` existe mais le bouton n'est pas `disabled`. Impact nul (clearing cookies est idempotent), mais cohérence.

**D-04 — `ConfirmStep` retraits** : le bouton est `disabled={submitting}`, mais `handleConfirm()` n'a pas de garde `if (submitting) return;` en première ligne. Défense en profondeur : à ajouter (couple la défense DOM + état React).

**D-05 — Pas d'Idempotency-Key global** : aucun POST ne transporte d'`Idempotency-Key`. C'est la vraie solution universelle au problème D-01 ; à prévoir dans une passe « hardening paiement ».

---

## 6. Plan d'action priorisé

### Urgent (à faire avant la mise en ligne publique)

1. **D-01** — Corriger le retry 401 de [src/lib/api.ts](src/lib/api.ts) : ne rejouer que `GET`/`HEAD`, ou bien imposer une Idempotency-Key sur tous les POST.
2. **D-02** — Protéger [ParticiperForm.tsx](src/app/(public)/c/[slug]/participer/ParticiperForm.tsx) avec un état `submitting` + `disabled`.
3. **B-01** — Ajouter `.max()` aux schémas Zod : `customerName`, `Block.title`, `Block.description`, `Seller.displayName`, `Seller.subtitle`.

### Important (v1.1)

4. **X-01** — Ajouter une `Content-Security-Policy` dans [next.config.ts](next.config.ts).
5. **D-05** — Implémenter Idempotency-Key côté `api()` + tables `Order`/`Withdrawal` (`@@unique([sellerId, idempotencyKey])`).
6. **Suppression legacy** — Retirer les ~15 endpoints fari.store orphelins (reviews, bumps, bookings, lead-magnet, theme, google-auth, unsubscribe, check-email, upload/images).
7. **X-02** — Auditer [backend/src/lib/notifications/templates.ts](backend/src/lib/notifications/templates.ts) : s'assurer que toutes les interpolations de contenu utilisateur passent par `escapeHtml()`.

### Cosmétique (v2)

8. **B-02/B-03/B-04/B-05** — Schémas Zod côté client, trim systématique, `maxLength={1}` sur les cases PIN, `type="email"`.
9. **D-03/D-04** — Harmoniser `disabled` + garde de ré-entrance sur logout et ConfirmStep.
10. **X-03** — Inscrire dans [CLAUDE.md](CLAUDE.md) : « tout contenu utilisateur doit rester en text node JSX ; interdiction de `dangerouslySetInnerHTML` sans revue sécurité ».

---

## 7. Ce qui est déjà solide (à préserver)

- Middleware chain ([backend/src/index.ts](backend/src/index.ts)) : Helmet → CORS whitelist → Gzip → raw JSON parser scope `/api/webhooks` only → cookie parser → rate limiters Redis → CSRF.
- Double authentification : cookie JWT httpOnly + `x-csrf-token` double-submit + `requireAuth` ré-interroge la DB à chaque requête (mitigation stale-JWT).
- Rate limiting multi-couches sur `POST /api/orders` : IP-minute (20), IP-hour (100), email-minute (5).
- Circuit breaker Bictorys ([lib/payments/circuitBreaker.ts](backend/src/lib/payments/circuitBreaker.ts)) : 5 échecs / 30 s → open 60 s.
- Webhook Bictorys : signature HMAC-SHA256 timing-safe, fenêtre replay ±5 min, `WebhookLog @@unique` inside `$transaction` Serializable, dispatch notifications post-commit.
- Notifications : `Notification.dedupeKey @unique` garantit un at-most-once par canal, dispatch concentré dans [lib/notifications/dispatch.ts](backend/src/lib/notifications/dispatch.ts).
- Zero raw SQL concaténé, zéro `eval/Function`, zéro `$queryRawUnsafe`. Tout passe par Prisma parameterized.
- Filtre de visibilité SQL-level sur `GET /api/cagnottes` — isolation cagnottes privées.

---

## Annexe — Fichiers clés cités

- [src/lib/api.ts](src/lib/api.ts) — wrapper fetch + retry 401 (D-01)
- [src/app/(public)/c/[slug]/participer/ParticiperForm.tsx](src/app/(public)/c/[slug]/participer/ParticiperForm.tsx) (D-02)
- [backend/src/routes/orders.ts](backend/src/routes/orders.ts) (B-01)
- [backend/src/lib/blocks/schemas.ts](backend/src/lib/blocks/schemas.ts) (B-01)
- [backend/src/routes/sellers.ts](backend/src/routes/sellers.ts) (B-01)
- [next.config.ts](next.config.ts) (X-01)
- [backend/src/lib/notifications/templates.ts](backend/src/lib/notifications/templates.ts) (X-02)
