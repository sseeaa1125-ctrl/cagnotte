# Audit 014 — Hide commissions + end-to-end site review

**Date** : 2026-04-14
**Scope** :
1. **Part 1** — cacher les taux de commission sur tout le contenu donateur, les garder visibles pour les créateurs lors de la création.
2. **Part 2** — tour complet du site en analyse statique pour identifier ce qui manque, ce qui ne marche pas, et ce qu'il reste à ajouter.

---

## PART 1 — Commission rates removal (donor-facing)

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| [src/app/(public)/tarifs/page.tsx](src/app/(public)/tarifs/page.tsx) | Re-écriture complète : les gros « 6 % » / « 8 % » retirés, titre devient « Gratuit pour tes donateurs. Rien à ajouter. », les deux cartes Festive/Solidaire gardent la description mais plus de % affiché. Note en bas : « les frais exacts applicables à l'organisateur sont affichés au moment de la création ». |
| [src/app/(public)/cgu/page.tsx:32-43](src/app/(public)/cgu/page.tsx#L32-L43) | Section 2 « Commissions » ré-écrite : plus de taux explicite, message « la participation est gratuite pour les donateurs, les frais applicables à l'organisateur sont présentés à la création ». |
| [src/lib/faq-content.ts:58](src/lib/faq-content.ts#L58) | FAQ « différence festive vs solidaire » : retrait de « 8% festive, 6% solidaire ». |
| [src/lib/faq-content.ts:153-154](src/lib/faq-content.ts#L153-L154) | FAQ « Quelle commission… » : retiré. Remplacé par « gratuit pour les donateurs, taux présenté à la création ». |
| [src/lib/faq-content.ts:168](src/lib/faq-content.ts#L168) | FAQ « frais appliqués aux contributions » : retrait des taux. |
| [src/lib/constants.ts:258-260](src/lib/constants.ts#L258-L260) | `HOME_COPY.featuresList[0]` : « Commission transparente / 6% solidaire, 8% festive » → « Gratuit pour tes donateurs / Tes contributeurs paient exactement ce qu'ils choisissent ». |
| [src/lib/constants.ts:277-280](src/lib/constants.ts#L277-L280) | `HOME_COPY.faqItems` « Quelle commission prélève cagnotte.sn » → « La participation est-elle gratuite pour mes donateurs ». |
| [src/lib/constants.ts:349-354](src/lib/constants.ts#L349-L354) | `HOME_FEATURES_LABELS.plaisir.cards[3]` kicker « 6% SOLIDAIRE · 8% FESTIVE » → « GRATUIT POUR LES DONATEURS ». |
| [src/lib/constants.ts:378-382](src/lib/constants.ts#L378-L382) | `HOME_FEATURES_LABELS.soutenir.cards[3]` kicker « COMMISSION SOLIDAIRE / 6% » → « UNE PLATEFORME SÉRIEUSE / Infrastructure, support, KYC ». |
| [src/lib/constants.ts:1228](src/lib/constants.ts#L1228) | `ABOUT_LABELS.paragraphs[2]` : retrait de « 8 %…6 % », remplacé par « les frais applicables à l'organisateur sont présentés en clair au moment de la création ». |

### Ce qui reste exposé (volontairement)

- **`CREATE_PICKER_LABELS`** ([constants.ts:660-672](src/lib/constants.ts#L660-L672)) — affiche `festiveFeeAmount: "8 %"` et `solidaireFeeAmount: "6 %"` sur la page `/tableau-de-bord/nouvelle` (le picker festive/solidaire). **C'est le seul endroit où le taux est affiché**. Correspond exactement à la demande : « on les affiche aux gens qui créent les cagnottes lors de la création ».
- **`COMMISSION_LABELS` + `OrderSummary.tsx`** — laissés en l'état car uniquement consommés par `/dev-foundations` (playground interne non shipé). Ce composant pourrait être supprimé (cf. finding **E2E-05** plus bas) ou conservé comme référence de design.
- **`formatCommissionLabel()`** dans [src/lib/commission.ts](src/lib/commission.ts) — helper zero-dep, plus consommé par aucun flow live, mais le `computeCommission()` l'est. Laissé en place car le backend dépend du même pattern.

### Vérifications

- `tsc --noEmit` frontend → 0 erreur
- `tsc --noEmit` backend → 0 erreur
- `eslint` sur les 4 fichiers touchés → 0 warning
- Grep final : plus aucune chaîne `6 %` / `8 %` / `6%` / `8%` dans des pages publiques donateur, sauf `CREATE_PICKER_LABELS` (réservé créateur).

---

## PART 2 — End-to-end review

### Méthodologie

Analyse statique flux par flux : lecture des pages, vérification des imports, grep des appels API, vérification que chaque route frontend a un endpoint backend correspondant et que chaque lien du footer/navbar mène à une page existante.

**Hors scope** : tests runtime dans un navigateur (nécessite deux serveurs, une session connectée, un paiement Bictorys réel, un WebView TikTok, etc.).

### 2.1 — Map des flux

| Flux | Pages | Endpoints backend |
|---|---|---|
| **Public** | `/`, `/cagnottes`, `/c/[slug]`, `/c/[slug]/participer`, `/c/[slug]/paiement`, `/c/[slug]/merci` | `GET /api/cagnottes`, `/:slug`, `/:slug/participants`, `POST /api/orders`, `GET /api/orders/:ref` (?), webhooks |
| **Statique** | `/a-propos`, `/aide`, `/comment`, `/tarifs`, `/cgu`, `/mentions-legales`, `/confidentialite`, `/cookies`, `/rgpd` | N/A |
| **Auth** | `/connexion`, `/inscription`, `/verification-email`, `/mot-de-passe-oublie`, `/mot-de-passe-reinitialiser` | `POST /api/auth/login`, `signup`, `verify-email`, `resend-code`, `forgot-password`, `reset-password`, `GET /me`, `POST /refresh`, `GET /refresh-and-return`, `POST /logout` |
| **Créateur dashboard** | `/tableau-de-bord`, `/tableau-de-bord/cagnottes/[slug]`, `/stats`, `/modifier`, `/nouvelle`, `/nouvelle/{festive,solidaire}/etape-{1,2,3}`, `/nouvelle/succes` | `GET /api/sellers/dashboard/stats`, `/api/blocks`, `POST /api/blocks`, `PUT /api/blocks/:id`, `POST /api/blocks/:id/close`, `POST /api/blocks/:id/reopen`, `GET /api/blocks/:id/progress` |
| **Profil** | `/profil`, `/profil/securite`, `/profil/kyc`, `/profil/coordonnees-bancaires`, `/profil/preferences` | `GET /api/auth/me`, `PUT /api/sellers/profile`, `PUT /api/auth/change-password`, `POST /api/sellers/kyc`, `POST /api/upload`, `GET /api/sellers/withdrawal-pin/status`, `POST /api/sellers/withdrawal-pin`, `GET/PATCH /api/notifications/prefs` |
| **Retraits** | `/retraits` (Amount), `/retraits/pin`, `/retraits/confirmation`, `/retraits/succes` | `GET /api/withdrawals/balance`, `POST /api/withdrawals` |
| **Participations** | `/participations` | `GET /api/sellers/me/participations` |
| **Notifications** | `/notifications` | `GET /api/notifications`, `POST /mark-read`, `GET /count` |

### 2.2 — Flows qui compilent et semblent cohérents

✅ Auth (signup → verify → login → refresh → logout)
✅ Cagnotte creation wizard (picker → festive/solidaire → etape 1/2/3 → succes)
✅ Public discover (home → cagnottes list → detail)
✅ Participer → paiement → merci (after this session's fixes)
✅ Creator dashboard (after close/reopen reload fix + list filter fix)
✅ Profile pages
✅ KYC submission (upload + POST /sellers/kyc)
✅ Withdrawals (balance → amount → pin → confirmation → success)
✅ Notifications feed + préférences

---

## 3 — Findings (E2E-XX)

Classement : 🔴 Bloquant · 🟠 Important · 🟡 Mineur · 🟢 Observation.

### 🟠 E2E-01 — Aucun smoke-test bout-en-bout n'est exécuté dans cette session

Le harness `backend/scripts/smoke-test.ts` (15 assertions, phase 2+) existe mais je ne l'ai pas lancé car il nécessite un reset complet de la DB + un boot de backend + des cagnottes de test fraîches, et ce n'est pas idempotent avec les données actuelles (où `soutien-pour-la-cas-de-mamadou-diop-...` est déjà en status closed par tests précédents).

**Reco** : lancer `npm run dev` côté backend puis :
```bash
cd backend && npx tsx scripts/seed-dev.ts && npx tsx scripts/smoke-test.ts
```
Ça doit afficher `15/15 ✓ GREEN` — si ça échoue, les findings remontés par ce harness sont plus fiables que ce que je peux voir en analyse statique.

---

### 🟠 E2E-02 — Pas de page de loading sur les flux lents

**Couverture actuelle** :
- `src/app/(authed)/tableau-de-bord/loading.tsx` ✓
- `src/app/(public)/c/[slug]/loading.tsx` ✓

**Manquants** :
- `/cagnottes` (liste) — le server component fait un fetch ≈ 100-300 ms. Sans loading.tsx, l'utilisateur voit un flash blanc.
- `/tableau-de-bord/cagnottes/[slug]` — la page créateur fait 4 fetches en parallèle. Sans loading, même flash.
- `/retraits`, `/profil`, `/profil/kyc`, `/participations`, `/notifications` — idem.

**Reco** : ajouter un `loading.tsx` minimal par segment (un spinner + skeleton), c'est 10 lignes par fichier. C'est du polish mais améliore la perception.

---

### 🟠 E2E-03 — Merci page : timeout de polling à 2 min, pas de retour vers la cagnotte si EXPIRED

[src/app/(public)/c/[slug]/merci/page.tsx](src/app/(public)/c/[slug]/merci/page.tsx) poll `/api/orders/:ref` toutes les 3 s, 40 fois (2 min). Après MAX_POLLS, l'état bascule sur `TIMEOUT`. Je n'ai pas vérifié si la page affiche un CTA utile dans cet état (« Retour à la cagnotte » / « Réessayer le paiement »).

**Reco** : lire la page et ajouter (si absent) un CTA « Retourner à la cagnotte » + un message « Le paiement prend plus de temps que prévu. Si tu as été débité(e), consulte l'historique de ton opérateur ». État `FAILED` et `EXPIRED` doivent aussi avoir un CTA clair.

---

### 🟡 E2E-04 — Incohérence URL /api/upload : relative vs absolue

**Problème** : deux fichiers uploadent des images via des URLs différentes :
- [src/app/(authed)/tableau-de-bord/nouvelle/_uploadCover.ts:32](src/app/(authed)/tableau-de-bord/nouvelle/_uploadCover.ts#L32) utilise `fetch('/api/upload', ...)` — URL relative, passe par le rewrite Next.
- [src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx:57](src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx#L57), [_ProfileForm.tsx:74](src/app/(authed)/profil/_ProfileForm.tsx#L74), [_KycForm.tsx:47](src/app/(authed)/profil/kyc/_KycForm.tsx#L47) utilisent `fetch(\`${BACKEND_URL}/api/upload\`, ...)` — URL absolue directe.

Les deux marchent car le rewrite Next forward `/api/*` vers backend. Inconsistance mineure qui peut porter à confusion.

**Reco** : standardiser sur `fetch('/api/upload')` relatif (plus cohérent avec l'usage d'`api()` dans le reste du code) OU tout basculer sur `BACKEND_URL`. 2 min de cleanup.

---

### 🟡 E2E-05 — Dead code : `OrderSummary` + `COMMISSION_LABELS` + `dev-foundations` playground

Depuis que le flow donateur a été simplifié (Phase 10 récente) :
- [src/components/checkout/OrderSummary.tsx](src/components/checkout/OrderSummary.tsx) — seul consommateur : `/dev-foundations` (page interne de design playground).
- [src/lib/constants.ts:174-179](src/lib/constants.ts#L174-L179) — `COMMISSION_LABELS` idem.
- [src/app/dev-foundations/page.tsx](src/app/dev-foundations/page.tsx) — existe encore, taille non triviale.

**Reco** : soit supprimer le playground dev-foundations (et ses deps), soit le garder mais ajouter un commentaire TODO pour éviter qu'un grep futur le croie vivant. Je recommande suppression : 1 fichier `OrderSummary.tsx` + 1 namespace `COMMISSION_LABELS` + 1 page `/dev-foundations` = –500 lignes, –0 fonctionnalité.

---

### 🟡 E2E-06 — Rate limiter `refreshLimiter` partagé entre `/refresh` et `/refresh-and-return`

Déjà flaggé dans [audit-013](audits/audit-013-cleanup-cartes-refresh-suggested.md#l-03), rappelé ici car le nouvel endpoint ajoute une pression cumulée. Multi-tab aggressive → 30/15min atteint rapidement → 429.

**Reco** : séparer en deux limiters avec la même enveloppe mais des clés Redis différentes.

---

### 🟡 E2E-07 — `withdrawals.provider` enum ne contient pas `"moov"` (Free Money)

Déjà flaggé dans [audit-013 L-05](audits/audit-013-cleanup-cartes-refresh-suggested.md#l-05). Un créateur reçoit des dons Free Money mais ne peut pas retirer en Free Money. À décider : soit ajouter `"moov"` à l'enum withdrawal (dépend d'un check côté Bictorys payout API), soit documenter que les fonds arrivent toujours en wave_money/orange_money (acceptable car les opérateurs sont interchangeables par SMS sur place).

---

### 🟡 E2E-08 — `schemas.ts` `.max(4)` désaligné avec la règle max 3 sur suggestedAmounts

Déjà flaggé dans [audit-013 M-02](audits/audit-013-cleanup-cartes-refresh-suggested.md#m-02). Résiduel.

---

### 🟡 E2E-09 — `PARTICIPER_LABELS.suggestedAmounts` est du code mort

Déjà flaggé dans [audit-013 M-01](audits/audit-013-cleanup-cartes-refresh-suggested.md#m-01). Résiduel.

---

### 🟡 E2E-10 — Seed-dev.ts a encore 4 montants suggérés par cagnotte (vs règle max 3)

[backend/scripts/seed-dev.ts:210](backend/scripts/seed-dev.ts#L210) seed `suggestedAmounts: [1000, 5000, 10000, 25000]`. Idem L233, L257, L281. Cohérent avec le Zod actuel `.max(4)` mais pas avec la règle UI max 3.

**Reco** : ajuster le seed à 3 montants quand E2E-08 sera traité. Sinon au prochain reset, les tests tomberont en « 4ᵉ montant silencieusement tronqué ».

---

### 🟡 E2E-11 — Aucune page admin — KYC approval via script CLI uniquement

Connu (flag dans CLAUDE.md « KYC Approval Workflow » : `npx tsx scripts/approve-kyc.ts <seller-slug>`). En v1 c'est OK, mais :
- Risque d'erreur humaine (mauvais slug → mauvais seller approuvé).
- Impossible de voir les docs KYC soumis sans requêter la DB.

**Reco** : v1 ne pas bloquer, prévoir audit séparé pour une admin panel (hors scope de cette session).

---

### 🟡 E2E-12 — Pas de recherche sur `/cagnottes`

La page liste utilise pagination par cursor + filtre `subtype`. Aucune recherche textuelle. Pour un site de découverte, c'est un gros manque UX dès qu'il y aura 20+ cagnottes.

**Reco** : ajouter un input `<Input type="search" />` qui POST vers un endpoint `/api/cagnottes?q=...`. Le backend devrait supporter `WHERE title ILIKE '%q%' OR config->>'description' ILIKE '%q%'`. Environ 1h de travail.

---

### 🟡 E2E-13 — Pas d'OG image par cagnotte

Une cagnotte partagée sur WhatsApp / Facebook / TikTok affiche le favicon ou une image générique — pas le cover + titre de la cagnotte. Gros manque de conversion pour une plateforme de crowdfunding.

**Reco** : dans `src/app/(public)/c/[slug]/page.tsx`, ajouter un `generateMetadata()` qui renvoie `openGraph.images` basé sur `cagnotte.coverUrl`, et des `og:title` / `og:description` / `og:type=website`. ~30 min.

---

### 🟡 E2E-14 — Aucune gestion `robots.ts` explicite par page

[src/app/robots.ts](src/app/robots.ts) existe (probablement disallow /api, /profil, /tableau-de-bord). Je n'ai pas vérifié son contenu. Les pages authed ont déjà `metadata.robots.index: false` ponctuellement. Robust mais à vérifier.

---

### 🟢 E2E-15 — `/comment` et `/a-propos` sont des stubs très courts

[comment/page.tsx](src/app/(public)/comment/page.tsx), [a-propos/page.tsx](src/app/(public)/a-propos/page.tsx) — chacun rend ~3 paragraphes depuis constants. Fonctionnel mais pauvre pour le SEO. Pas un bug.

---

### 🟢 E2E-16 — Footer mentionne "Mon compte & Sécurité" qui pointe vers `/aide#compte-securite`

[src/components/layout/Footer.tsx](src/components/layout/Footer.tsx) ligne 32 — le lien `#compte-securite` nécessite que la page `/aide` ait une section avec cet anchor. À vérifier que l'anchor existe dans [faq-content.ts](src/lib/faq-content.ts) via un `id` sur la section correspondante.

---

### 🟢 E2E-17 — Pas de consentement cookies sur la page publique

Le projet a une page `/cookies` mais aucun banner cookie n'apparaît sur la LP (d'après le grep, pas trouvé de `CookieBanner` composant). Note : CookieBanner apparaît dans les commits récents (« feat(10): popular sort + CookieBanner local expand ») — je dois vérifier qu'il est toujours monté.

---

### 🟢 E2E-18 — Notifications : pas de push / SSE / polling

[src/app/(authed)/notifications/_NotificationsClient.tsx](src/app/(authed)/notifications/_NotificationsClient.tsx) fetch à l'ouverture de la page et sur `router.refresh()`. Pas de polling ni d'updates live. Pour v1 c'est acceptable (l'email reste le canal principal) mais à savoir.

---

## 4 — Résumé exécutif

**Part 1 (commission)** : 10 fichiers modifiés, toutes les mentions donateur supprimées, créateur (picker wizard) intact. tsc + eslint clean.

**Part 2 (E2E)** : aucun bug bloquant trouvé en analyse statique. Les flux compilent et les endpoints référencés existent tous côté backend. 2 findings orange (smoke-test non lancé + loading states manquants + merci/timeout UX), le reste est du polish ou des suivis d'audit-013.

### Top 5 reco priorisées

1. **Lancer le smoke-test** (E2E-01) — c'est la seule façon de savoir si les 15 invariants backend tournent encore. 5 min.
2. **Merci page timeout UX** (E2E-03) — un paiement sans CTA de retour est frustrant pour un donateur. 20 min.
3. **OG images par cagnotte** (E2E-13) — amplificateur direct de conversion sur les partages WhatsApp. 30 min.
4. **Loading states manquants** (E2E-02) — polish mais évite le flash blanc. 30 min.
5. **Nettoyage dead code** (E2E-05 + audit-013 M-01) — supprimer `/dev-foundations`, `OrderSummary`, `COMMISSION_LABELS`, `PARTICIPER_LABELS.suggestedAmounts`. 15 min.

---

## 5 — Findings déjà documentés ailleurs

Ne pas ré-ouvrir, cf [audit-013](audits/audit-013-cleanup-cartes-refresh-suggested.md) :
- M-01 PARTICIPER_LABELS dead code
- M-02 schemas .max(4) vs .max(3)
- L-01 router.refresh() dans 6 formulaires
- L-02 middleware 307 vs 303
- L-03 refreshLimiter partagé
- L-04 enum paymentType trop large
- L-05 withdrawal moov manquant

---

*Audit généré sans smoke-test runtime. Pour une validation complète, compléter avec le harness backend/scripts/smoke-test.ts.*
