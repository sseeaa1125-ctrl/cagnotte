# Audit 013 — Session "card removal + auth refresh + suggested amounts + close/reopen"

**Date** : 2026-04-14
**Scope** : audit complet des 4 lots de changements faits dans cette session :
1. Endpoint `/api/auth/refresh-and-return` + middleware silent refresh
2. `suggestedAmounts` (backend wire-up + EditForm cap + public participer)
3. Close/reopen UI refresh
4. Retrait complet des paiements par carte bancaire (Wave / Orange Money / Free Money uniquement)

**Verdict global** : ✅ Les fixes répondent au besoin utilisateur. `tsc` + `eslint` sont propres sur tous les fichiers touchés. **5 findings mineurs / 2 findings moyens / 0 finding critique**. Voir détail ci-dessous.

---

## 1. Résumé des changements audités

### 1.a — Silent refresh (authed pages)
- **backend/src/routes/auth.ts** : nouvel endpoint `GET /api/auth/refresh-and-return?next=<path>` — rafraîchit les cookies puis 302 vers `next` (ou `/connexion?next=…` si échec). Protégé par `refreshLimiter` (30 req / 15 min). `sanitizeNext()` bloque `//` et `/\`.
- **src/middleware.ts** : pour tout path dans `AUTHED_PREFIXES` (`/tableau-de-bord`, `/profil`, `/notifications`, `/participations`, `/retraits`) sans cookie `izy-token` → 307 vers refresh-and-return avec `next` encodé.

### 1.b — `suggestedAmounts`
- **backend/src/routes/cagnottes.ts** : interface `FundraiserConfig` étendue ; `GET /api/cagnottes/:slug` renvoie `suggestedAmounts` (fallback `[2000, 5000, 10000]`, cappé à 3).
- **src/app/(public)/c/[slug]/participer/page.tsx** : lit `cagnotte.suggestedAmounts` avec fallback + slice(0, 3), passe au form.
- **src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx** : constante `MAX_SUGGESTED_AMOUNTS = 3`, `parseSuggestedAmounts` clamppe à 3.
- **src/lib/constants.ts** : helper text « Jusqu'à 3 montants, minimum 500 FCFA ».

### 1.c — Close/reopen UI refresh
- **src/app/(authed)/tableau-de-bord/cagnottes/[slug]/_components/CloseCagnotteButton.tsx** : `router.refresh()` remplacé par `window.location.reload()`. Import `useRouter` retiré.

### 1.d — Retrait cartes bancaires
- **Backend** (5 fichiers) : `orders.ts` Zod enum, `payments/types.ts`, `payments/bictorys.ts`, `lib/utils.ts`, `index.ts` — toute logique `"card"` retirée.
- **Frontend** (≈ 10 fichiers) : `paiement/page.tsx` (suppression du radio Carte Bancaire + `MethodGroup` + `PaymentType` type), `types/index.ts` (`PaymentOperator` / `ALL_OPERATORS` / `COUNTRY_OPERATORS` / `ALL_COUNTRY_OPERATORS` / `OPERATORS` / `isOperatorDisabled`), `constants.ts` (`OPERATOR_LABELS`, `PAIEMENT_LABELS.methodCard`, copies home/FAQ/ABOUT/COMMENT), `faq-content.ts` (3 entrées), `_FeaturesPink.tsx` (icônes lucide → logos Wave/OM/Free), `tarifs`/`cgu`/`a-propos`/home metadata, `Footer.tsx`, `ParticiperForm.tsx` (commentaire), `ProfileSidebar.tsx` (`CreditCard` → `Wallet`).
- **CLAUDE.md** : mention « Wave, Orange Money, Free Money » + note retrait v1.

---

## 2. Findings

### 🟡 M-01 — Dead code : `PARTICIPER_LABELS.suggestedAmounts` jamais utilisé

**Fichier** : [src/lib/constants.ts:429](src/lib/constants.ts#L429)

```ts
suggestedAmounts: [1000, 2500, 5000, 10000, 25000] as readonly number[],
```

**Problème** : après le wire-up sur `cagnotte.suggestedAmounts`, plus aucun consommateur. Un `grep "PARTICIPER_LABELS.suggestedAmounts" src/` retourne 0 résultat. C'est du code mort qui ne fait plus qu'embrouiller un lecteur (il contient une valeur divergente du défaut backend `[2000, 5000, 10000]`).

**Recommandation** : supprimer l'entrée.

---

### 🟡 M-02 — Backend Zod schema `.max(4)` désaligné avec la règle « max 3 »

**Fichier** : [backend/src/lib/blocks/schemas.ts:37,52,90](backend/src/lib/blocks/schemas.ts#L37)

```ts
// paymentBlockConfigSchema
suggestedAmounts: z.array(z.number().min(500)).max(4).default([5000, 10000, 25000]),
// donationBlockConfigSchema
suggestedAmounts: z.array(z.number().min(500)).max(4).default([1000, 2000, 5000]),
// fundraiserBlockConfigSchema
suggestedAmounts: z.array(z.number().min(500)).max(4).default([2000, 5000, 10000]),
```

**Problème** : l'EditForm n'envoie que 3 montants max et la page publique n'affiche que 3 pills — mais le schéma Zod accepte encore 4. Un client direct de l'API (curl, Postman, anciens tests) peut persister 4 montants ; le 4ᵉ sera silencieusement tronqué partout. Pas un bug bloquant (défense en profondeur dans `cagnottes.ts` et dans le form), mais ça masque la règle métier.

**Recommandation** : `.max(3)` sur les 3 schémas + bump du message d'erreur dans [backend/src/lib/zodErrors.ts](backend/src/lib/zodErrors.ts). Note : les blocs existants en BDD avec 4 montants passeraient encore via `validateBlockConfig` dans la route close/reopen (elle re-valide avant save) → leur save échouerait. Faire une passe de backfill (SQL update) avant le bump OU ajouter un clamp défensif dans `setFundraiserStatus` avant `validateBlockConfig`.

---

### 🟡 L-01 — `router.refresh()` toujours utilisé dans 5 autres formulaires sans reload

**Fichiers** :
- [src/app/(authed)/profil/kyc/_KycForm.tsx:213](src/app/(authed)/profil/kyc/_KycForm.tsx#L213)
- [src/app/(authed)/profil/securite/_PinForm.tsx:159](src/app/(authed)/profil/securite/_PinForm.tsx#L159)
- [src/app/(authed)/profil/coordonnees-bancaires/_BankForm.tsx:65](src/app/(authed)/profil/coordonnees-bancaires/_BankForm.tsx#L65)
- [src/app/(authed)/profil/_ProfileForm.tsx:92,123](src/app/(authed)/profil/_ProfileForm.tsx#L92)
- [src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx:218](src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx#L218)
- [src/app/(authed)/notifications/_NotificationsClient.tsx:147](src/app/(authed)/notifications/_NotificationsClient.tsx#L147)

**Problème** : si la vraie cause pour laquelle `router.refresh()` n'a pas fonctionné sur CloseCagnotteButton est un bug Next 16 (et pas un cas isolé), ces 6 autres formulaires peuvent exhiber le même comportement silencieux. L'utilisateur n'a pas remonté de bug dessus — mais le test a été passif (« il refait F5 sans le dire »).

**Recommandation** : laisser en l'état (ne pas fixer ce qui n'est pas cassé). Si d'autres rapports arrivent, creuser la root cause au lieu de généraliser le `window.location.reload()`. Mon changement sur CloseCagnotteButton est pragmatique, pas architectural.

---

### 🟡 L-02 — `307` vs `303` dans le middleware refresh gate

**Fichier** : [src/middleware.ts:59](src/middleware.ts#L59)

```ts
return NextResponse.redirect(url, 307);
```

**Problème** : `307 Temporary Redirect` préserve la méthode. Si une requête POST/PUT/DELETE atterrit sur une page authed sans cookie (scénario rare : form submit cross-origin, action, etc.), elle sera redirigée en POST vers `/api/auth/refresh-and-return` qui n'accepte que GET → 404/405. Le code frontend actuel n'émet jamais de POST vers une page SSR, donc **risque pratique ≈ 0**. Mais `303 See Other` est sémantiquement plus correct (force un GET après un submit).

**Recommandation** : passer en `303` quand on aura le temps. Pas urgent.

---

### 🟡 L-03 — Refresh rate limiter potentiellement tight multi-tab

**Fichier** : [backend/src/routes/auth.ts:101-108](backend/src/routes/auth.ts#L101-L108)

```ts
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  …
});
```

**Problème** : le nouveau `/refresh-and-return` partage le même limiter que `POST /refresh`. Un créateur qui ouvre 6 onglets sur son dashboard après 15 min d'inactivité déclenche 6 appels au middleware → 6 redirects vers refresh-and-return → 6 × 1 requête. Multiplie par quelques allers-retours et il peut consommer tout le quota rapidement, surtout si le `api()` client fait aussi des refresh POST en parallèle. Budget initial 30/15 min prévu pour un seul endpoint — maintenant deux endpoints cumulent dessus.

**Recommandation** : soit créer un limiter séparé pour refresh-and-return (même budget mais clé différente), soit bumper `max` à 60. Plus propre : limiter séparé, car les deux flux ont des patterns différents (refresh-and-return = déclenché par nav, refresh = déclenché par `api()` 401).

---

### 🟡 L-04 — Backend enum `paymentType` contient encore des opérateurs non-SN non utilisés

**Fichier** : [backend/src/routes/orders.ts:35-39](backend/src/routes/orders.ts#L35-L39)

```ts
paymentType: z.enum(["orange_money", "wave_money", "maxit", "mtn_money", "moov", "togocell", "mobicash"]),
```

**Problème** : cagnottes.sn est SN-only en v1. Le frontend n'envoie jamais `maxit`, `mtn_money`, `togocell`, `mobicash`. Garder ces valeurs dans l'enum ne cause pas de bug, mais un client direct API pourrait persister un `paymentType: "mtn_money"` qui passerait Zod mais échouerait plus tard côté Bictorys (pas de country CI mapping pour SN). Risque surface attaque très faible.

**Recommandation** : soit restreindre à `["wave_money", "orange_money", "moov", "maxit"]` (SN + Maxit = OM rebrandé SN), soit laisser et ajouter un commentaire. J'ai opté pour laisser avec un commentaire — c'est défendable. Pas de changement requis sauf si tu veux durcir.

---

### 🟡 L-05 — Withdrawal provider enum ne supporte pas encore `moov` (Free Money)

**Fichier** : [backend/src/routes/withdrawals.ts:42](backend/src/routes/withdrawals.ts#L42)

```ts
provider: z.enum(["wave_money", "orange_money"]),
```

**Problème** : depuis cette session, les **donateurs** peuvent payer via Free Money. Mais un **créateur** ne peut retirer que vers Wave ou Orange Money. Un créateur qui reçoit des dons Free Money ne peut pas les retirer vers son propre compte Free Money — il doit passer par Wave/OM. Pas un bug tant que les fonds sont interchangeables côté Bictorys, mais UX incohérente : « je peux recevoir des Free Money mais pas en retirer ».

**Recommandation** : ajouter `"moov"` à l'enum withdrawal ET vérifier que `lib/payout.ts` passe bien la bonne string à Bictorys pour Free Money. Hors scope de cette session (la demande portait sur les paiements donateurs) mais à flaguer. Demande à l'utilisateur si c'est à traiter maintenant ou après.

---

### 🟢 N-01 — Commentaires « Carte Bancaire » restants dans le code (intentionnels)

**Fichiers** : `paiement/page.tsx:35`, `types/index.ts:1141,1193,1202,1238`.

Ces occurrences sont dans des blocs `// cagnottes.sn v1 — la carte bancaire a été retirée` que j'ai écrits comme documentation historique du retrait. Pas du code vivant. OK tel quel, à moins que tu préfères un codebase totalement vierge de « carte bancaire ».

---

### 🟢 N-02 — `ParticiperForm.defaultAmount` choisit l'index 2 (3ᵉ pill)

**Fichier** : [src/app/(public)/c/[slug]/participer/ParticiperForm.tsx:73](src/app/(public)/c/[slug]/participer/ParticiperForm.tsx#L73)

```ts
const defaultAmount = suggestedAmounts[2] ?? suggestedAmounts[1] ?? 5000;
```

**Observation** : le pill sélectionné par défaut est le **3ᵉ** (`[2]`), pas le 1er. Avec les defaults `[2000, 5000, 10000]`, ça veut dire que la checkbox pré-sélectionnée est **10 000 FCFA**, pas 2 000. C'est un choix UX volontaire (viser un montant « généreux »), mais à vérifier : si un créateur met `[500, 1000, 2000]` (dons modestes), le défaut sera 2 000 — potentiellement trop élevé par rapport à son contexte. Pas un bug, juste un comportement à connaître.

**Recommandation** : à laisser si l'UX « viser haut » est intentionnelle. Sinon, passer à `suggestedAmounts[1]` (le médian) ou `suggestedAmounts[0]`.

---

## 3. Vérifications effectuées

| Check | Résultat |
|---|---|
| `tsc --noEmit` backend | ✅ 0 erreur |
| `tsc --noEmit` frontend | ✅ 0 erreur |
| `eslint` sur les fichiers touchés | ✅ 0 erreur, 0 warning |
| Grep final `"card"` / `carte bancaire` / `Carte Bancaire` / `visa-mastercard` / `CreditCard` | ✅ 0 référence vivante (seulement commentaires de doc) |
| Open-redirect sur `refresh-and-return` | ✅ `sanitizeNext` bloque `//` et `/\` |
| Boucle infinie middleware → refresh → middleware | ✅ Pas de boucle (après refresh, le cookie `izy-token` est présent) |
| `router.refresh()` consistency | ⚠️ 6 autres formulaires non touchés (F-L-01) |
| Smoke test Bictorys bout-en-bout | ❌ Pas exécuté (nécessite lancer les deux servers + créer une cagnotte test) |

---

## 4. Reco ordonnées

1. **M-01** — Supprimer `PARTICIPER_LABELS.suggestedAmounts` (10 sec, 0 risque).
2. **M-02** — Durcir Zod `.max(4)` → `.max(3)` + clamp défensif côté save (20 min, risque faible avec backfill).
3. **L-03** — Séparer le rate limiter de `refresh-and-return` (10 min, impact perf multi-tab).
4. **L-05** — Ajouter `"moov"` à `withdrawals.provider` enum si Bictorys supporte Free Money payout (dépend d'une vérif Bictorys, pas codebase).
5. **L-02** — Passer middleware 307 → 303 (1 min).
6. **L-04** — (optionnel) restreindre `orders.paymentType` enum à 4 opérateurs SN.
7. **L-01** — Audit proactif du pattern `router.refresh()` uniquement si d'autres bugs similaires remontent. Ne pas généraliser `window.location.reload()` par défaut.

---

## 5. Non-findings explicitement vérifiés (pas de problème)

- **Slug normalization middleware** : encore active après le nouveau bloc authed-refresh ; le `redirect 301` lowercase continue de s'exécuter sur les pages publiques.
- **CSRF sur `refresh-and-return`** : non requis car c'est un GET ; le token CSRF est rotated côté backend via `setCsrfCookie` comme pour `POST /refresh`.
- **`config.status` persistance** : `setFundraiserStatus` utilise `validateBlockConfig` + `prisma.block.update` inside a write — robuste.
- **`isOwner` detection** pour les créateurs accédant à leur propre `/api/cagnottes/:slug` : le forward du cookie `izy-token` dans le fetch server-side fonctionne (backend lit `req.cookies["izy-token"]`), le header `Cache-Control: private, no-store` est bien envoyé au créateur.
- **`CLAUDE.md`** : mis à jour pour refléter le retrait carte.
- **XSS audit 011** : aucune de mes modifications n'introduit de `dangerouslySetInnerHTML` ni de rendu HTML user-content.

---

*Audit généré à la fin d'une session multi-bugs.*
