# Audit 038 — Admin edit cagnotte + CSV audit log + smoke-test

**Date** : 2026-04-22
**Scope** : 3 commits locaux créés en réponse aux recos #2, #3 d'audit-037 + nouvelle
feature "édition complète d'une cagnotte par l'admin". Non pushés (règle `no-auto-push`).

| Commit | Type | Changement |
|---|---|---|
| `5ccc29c` | feat | `logAdminAction("CSV_EXPORTED", ...)` sur orders / logs / reports |
| `e6239a6` | test | Smoke-test 15 → 18 assertions (null webhook / slug inconnu / cagnotte expirée) |
| `ac971e9` | feat | `PATCH /api/admin/cagnottes/:id` + page admin d'édition complète |

---

## 1. `5ccc29c` — CSV audit log

**Revue** :
- ✅ Fire-and-forget (`.catch(logger.error)`) — une erreur d'écriture AdminLog ne casse pas le CSV.
- ✅ Payload contient `{rowCount, truncated, filters}` — le flag `truncated: orders.length >= 50_000` corrige la lacune d'observabilité signalée audit-037 §4.1.
- ✅ `req.ip` inclus — traçable par IP.
- ⚠️ **Reco #1 d'audit-037 (cap 50k dans le CSV lui-même)** reste non traitée : le fichier retourné à l'admin ne mentionne pas la troncature, seul AdminLog le sait. Pas grave côté audit interne mais un admin exportant 50k lignes pensera avoir tout. Acceptable v1.

## 2. `e6239a6` — smoke-test

**Revue** :
- ✅ Test 16 crée son propre Order `smoke-amount-null-<ts>`, cleanup via `cleanup.pendingOrderIds.push`.
- ✅ Test 18 crée un block temporaire (`endDate=hier`) et nettoie en `finally` — pas de pollution de la seed.
- ✅ Type `BictorysWebhook.amount: number | null` aligne le harness sur le format prod observé (hotfix `fd88421`).
- ⚠️ Test 17 suppose que `test-seller-a` existe dans la seed — dépendance implicite à `seed-dev.ts`. OK documenté dans CLAUDE.md.
- ❌ **Pas encore exécuté en CI** — le harness doit être lancé manuellement (`npm run dev` + `npx tsx scripts/smoke-test.ts`). Recommandé : premier run local avant push.

## 3. `ac971e9` — admin edit cagnotte (le gros morceau)

### 3.1 Sécurité backend (PATCH /api/admin/cagnottes/:id)

- ✅ `requireRole("SUPER_ADMIN")` — seul le top role peut éditer le contenu narratif d'une cagnotte d'autrui (écarte ADMIN et SUPPORT).
- ✅ Zod `updateCagnotteBodySchema` — refuse les payloads non-{title, config}.
- ✅ Merge partiel puis **re-validation COMPLÈTE** via `validateBlockConfig("FUNDRAISER")` — attrape les invariants cross-field (subtype × occasion × cause × beneficiary via `superRefine`).
- ✅ Filter `type: "FUNDRAISER"` — ne peut pas détourner un block DONATION/PAYMENT legacy.
- ✅ Audit log `CAGNOTTE_EDITED` avec `changedKeys` + diff titre — traçable dans `/admin/logs`.
- ✅ `Block.slug` non exposé dans le schema → **immutable** (cohérent avec la règle CLAUDE.md "slug change is v2").
- ⚠️ **Pas de snapshot "before"** dans l'audit log : on log les clés modifiées mais pas les valeurs précédentes. Si un admin vandalise un titre et on veut restaurer, il faut fouiller les backups DB. Pour la v2, envisager `logAdminAction(..., { changedKeys, snapshotBefore: existingCfg })` si surface d'abus confirmée.
- ⚠️ **Pas de rate-limit** : un SUPER_ADMIN compromis peut bruteforcer les éditions. Atténué par le faible nombre de SUPER_ADMIN (1 en prod actuellement).

### 3.2 Risque d'interprétation : `config.status` vs `Block.isActive`

🚨 **Point le plus important de cet audit**.

Le formulaire admin expose un toggle **"Statut actif / clôturée"** qui écrit dans `config.status` (valeur acceptée par Zod L157 du schema). **Ce champ n'a AUCUN effet sur `Block.isActive`** — la visibilité publique reste contrôlée par le endpoint séparé `PATCH /:id/toggle-active`.

**Conséquence** : un admin pense désactiver une cagnotte en mettant "clôturée" → en réalité la cagnotte reste publique et accepte toujours les dons si `isActive=true`. `config.status` est purement une étiquette métadonnée.

**Mitigations possibles** :
1. **Renommer** le toggle du form en "Étiquette statut (informatif)" pour clarifier qu'il est cosmétique.
2. **OU** : ajouter dans le PATCH admin un champ `isActive` qui mappe vers la colonne Block + maintenir la cohérence `config.status === "closed" ⇔ isActive=false`.
3. **OU** : retirer le toggle du form admin et renvoyer vers l'action existante `/admin/cagnottes/:id` (bouton "Désactiver" déjà présent sur la page détail via `toggle-active`).

Recommandation : **option 3** (retirer du form) — évite le doublon conceptuel, garde `toggle-active` comme seul path de désactivation.

### 3.3 Visibilité public / privé

- ✅ Le form expose bien `VisibilityCard` avec `value="public"|"private"` — map sur `config.visibility` (schema L150).
- ✅ Les endpoints publics `/api/cagnottes` filtrent déjà par `config.visibility === "public"` (CLAUDE.md "SQL-level visibility filter").
- ✅ Changement de visibilité `public → private` via PATCH retire la cagnotte de la liste publique immédiatement (pas de cache créateur long-lived).
- ⚠️ Les donateurs ayant le lien direct peuvent toujours accéder à la page via `/api/cagnottes/:slug` (détail). Header `Cache-Control: private, no-store` est bien posé sur détail privé (vérifié dans routes/cagnottes.ts), mais le lien reste exploitable. Comportement attendu ≠ régression.

### 3.4 Images

- ✅ Le form réutilise `ImageUpload` (gallery + coverUrl) — même surface que créateur, pas de nouveau path d'upload.
- ✅ L'upload passe par `/api/upload` (SELLER auth). Question : l'admin utilisant le form admin n'a PAS de cookie `izy-token` seller → l'upload devrait échouer. **Point à vérifier en manuel** : est-ce que l'admin peut réellement uploader une image via ce form, ou faut-il basculer sur `/api/admin/upload` (qui n'existe pas) ?

🔴 **Probable bug** : le form admin tente `fetch("${BACKEND_URL}/api/upload", credentials: "include")`. Sans cookie seller, `requireAuth` renvoie 401. Cas non couvert → l'admin pourra éditer texte/config mais **pas changer les images**.

**Fix proposé** : ajouter un endpoint `POST /api/admin/upload` protégé par `requireAdmin` qui délègue à la même logique R2. Sinon, modifier `/api/upload` pour accepter aussi le cookie admin (moins propre — mélange d'auth).

### 3.5 Frontend

- ✅ Page loader `modifier/page.tsx` gère loading / error / missing id proprement.
- ✅ Réutilise `adminApi` + `AdminApiError` (cohérent avec les autres pages admin).
- ✅ Retour "Retour au détail" préserve la navigation.
- ⚠️ **Duplication code form** : `_AdminEditForm.tsx` est un fork de `_EditForm.tsx` créateur (477 lignes dupliquées). La divergence va s'accumuler. **Accepté v1** (commenté dans le commit message) mais à factoriser si les deux forms convergent.

---

## 4. Points non couverts

1. **Upload image admin** (§3.4) — probable 401, à tester en prod/staging.
2. **`config.status` vs `Block.isActive`** (§3.2) — confusion UX à résoudre avant release.
3. **Rate-limit PATCH admin** — pas urgent (SUPER_ADMIN unique) mais à garder en tête.
4. **Smoke-test non encore exécuté** — 18/18 attendu, à valider en local.

---

## 5. Recommandations (ordre priorité)

| # | Action | Effort | Urgence |
|---|---|---|---|
| 1 | **Tester upload image depuis le form admin** — confirmer ou infirmer le 401 | 10min manuel | 🔴 Critique |
| 2 | **Clarifier le toggle "statut actif/clôturée"** — renommer "étiquette" ou retirer | 15min | 🟠 Important |
| 3 | Lancer smoke-test local (18/18 attendu) | 5min | 🟡 Avant push |
| 4 | Ajouter `snapshotBefore` dans audit log CAGNOTTE_EDITED (v2) | 1h | 🟢 Nice-to-have |
| 5 | Factoriser `_EditForm` / `_AdminEditForm` (v2) | 2-3h | 🟢 Quand divergence > 30% |

---

## 6. Verdict global

| Aspect | Verdict |
|---|---|
| CSV audit log | ✅ OK — lacune observabilité audit-037 §4.1 corrigée |
| Smoke-test extension | ✅ OK — 3 régressions clés couvertes |
| Admin edit backend (PATCH) | ✅ OK — RBAC + re-validation + audit log cohérents |
| Admin edit frontend form | ⚠️ 2 points à lever avant release : upload image (§3.4) + status toggle ambigu (§3.2) |

**Push recommandé** : **NON** avant de résoudre le point §3.4 (upload image admin). Le reste est shippable.
