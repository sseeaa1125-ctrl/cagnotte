# Audit 036 — Bulk actions admin + récap hotfixes session 2026-04-20/21

**Date** : 2026-04-21
**Contexte** : Fin de session — 3 hotfixes prod pushés + feature "actions groupées sur toutes les pages admin" demandée. Cet audit dresse l'état, identifie les risques avant build et cale le scope.

---

## 1. Hotfixes prod livrés aujourd'hui (post-mortem)

### 1.1 Webhook Bictorys `amount=null` (commit `fd88421`)

**Symptôme** : Paiements débités côté Wave/OM mais orders marqués `FAILED` en DB.

**Root cause** : Bictorys a modifié le format de ses webhooks — `amount` et `currency` peuvent arriver à `null` alors que `status=succeeded`. Le check anti-fraude `if (amount !== order.amount || currency !== order.currency)` déclenchait toujours (null strict-neq int), marquant `FAILED`.

**Preuve** : 4 `WebhookLog.payload.amount = null (object)` en DB sur `pour-ma-mere` le 20 avril (FA-D8OUTGKAIM, FA-5DLEG9GVSC, FA-ULBXW1V5TV, FA-7EHPKVEZPS).

**Fix** : Skip anti-fraude quand `amount == null || currency == null`, défense en profondeur sur 3 sites (webhook principal, branche community legacy, fallback polling `/api/orders/by-ref/:ref`). Types `number | null` / `string | null` sur `BictorysWebhookPayload` + `checkTransactionStatus`.

**Vérifié en prod post-deploy** : FA-F2YBCZCA9H (16:28), FA-TIFQS7M4H8 (17:05) passent PAID normalement.

**Reste à faire** : Réconciliation des 4 commandes (après vérif dashboard Bictorys) via `npx tsx scripts/reconcile-bictorys.ts paid <ref>`.

### 1.2 `cagnotteSlug` ignoré → dons mal routés (commit `72d7684`)

**Symptôme** : Donateur paie sur `cagnotte.sn/c/pour-ma-mere` mais le compteur ne bouge jamais.

**Root cause** : Le frontend stashe `cagnotteSlug` dans le body de `POST /api/orders` mais le backend l'utilisait **uniquement** pour construire la `successRedirectUrl`. La résolution du `blockId` passait par `findFirst({ sellerId, type, isActive })` qui retourne un block arbitraire quand le seller en a plusieurs actifs. Résultat : 4 dons destinés à `pour-ma-mere` (expirée) ont atterri sur `participe-a-nos-puits` (autre cagnotte du même seller).

**Fix** : Prioriser `cagnotteSlug` dans le filtre `findFirst` avant le fallback "premier block actif". Erreur 400 explicite "Cagnotte introuvable pour ce vendeur" si le slug ne matche rien.

**Reste à faire** : Décider si les 4 orders mal routés (FA-YIC04I4BN7, FA-SW6VCEU3CO, FA-F2YBCZCA9H, FA-TIFQS7M4H8 = 8 000 FCFA net) doivent être re-bind vers `pour-ma-mere`. Risque si on le fait : `pour-ma-mere` est expirée, recréer de l'historique post-endDate introduit une incohérence temporelle. **Recommandation** : laisser tel quel, communiquer aux donateurs si nécessaire.

### 1.3 CTA "Je participe" actif sur cagnotte expirée (commit `7da5e72`)

**Symptôme** : Sur une cagnotte `endDate` passée, le bouton restait cliquable → le donor remplissait le formulaire → 400 sur `/paiement`.

**Fix** : Bandeau "Cagnotte terminée — la date de fin est dépassée" + hint créateur. Server-side redirect sur `/participer` → `/c/[slug]` si clôturée ou expirée. Logique d'expiration identique au backend (`end.setHours(23,59,59,999)`).

**Note** : L'édit `endDate` depuis le dashboard créateur est déjà supporté par `_EditForm.tsx` — pas de modif dashboard nécessaire.

---

## 2. État du dashboard admin (inventaire)

### 2.1 Pages listes (11 pages)

| Page | Entité | Actions individuelles | Checkbox | RBAC |
|---|---|---|---|---|
| `/admin/kyc` | Seller (KYC) | Approve / Reject (+ raison) | ❌ | `requireAdmin` |
| `/admin/sellers` | Seller | Détail, Flag/Unflag, Update KYC | ❌ | `requireAdmin` |
| `/admin/orders` | Order | Détail | ❌ | `requireAdmin` |
| `/admin/retraits` | Withdrawal | Approve / Reject | ❌ | `requireAdmin` |
| `/admin/cagnottes` | Block (FUNDRAISER) | Détail | ❌ | `requireAdmin` |
| `/admin/utilisateurs` | Admin | Create, Update role, Toggle active | ❌ | `requireRole("SUPER_ADMIN")` |
| `/admin/reports` | Report | TBD | ❌ | `requireAdmin` |
| `/admin/wallet` | Ledger | TBD | ❌ | ADMIN + SUPER_ADMIN |
| `/admin/notifications` | Notification | TBD | ❌ | `requireAdmin` |
| `/admin/config` | Config | TBD | ❌ | `requireAdmin` |
| `/admin/logs` | AdminLog | Read-only | ❌ | `requireAdmin` |

**Constat** : **aucune page n'a de sélection multiple**. Tout est par-entity. Ajouter les bulk actions est donc 100 % greenfield côté UI.

### 2.2 Modèle de rôle

```prisma
enum AdminRole { SUPER_ADMIN, ADMIN, SUPPORT }
model Admin { id, email @unique, password, name, role, isActive, logs AdminLog[] }
```

Middleware : `requireAdmin` (valide JWT + cache 30s + DB re-query) et `requireRole("SUPER_ADMIN")` chainable. Cache évincé par `evictAdminCache(id)` quand rôle/isActive changent.

**Bootstrap admin** : via `/admin/utilisateurs` (UI) ou via [`backend/scripts/promote-admin.ts`](backend/scripts/promote-admin.ts) (script idempotent — crée si absent, update rôle si présent). `mass.kane@gmail.com` est **déjà SUPER_ADMIN actif** (vérifié 2026-04-21 13:16 UTC).

### 2.3 Backend admin routes (existantes)

```
/api/admin/auth/*      → login, logout, me, refresh
/api/admin/users/*     → [SUPER_ADMIN] CRUD admins
/api/admin/sellers/*   → [ADMIN] list + flag/kyc
/api/admin/kyc/*       → [ADMIN] list + approve/reject
/api/admin/orders/*    → [ADMIN] list read-only
/api/admin/withdrawals/* → [ADMIN] approve/reject
/api/admin/cagnottes/* → [ADMIN] list
/api/admin/reports/*   → [ADMIN] TBD
/api/admin/config/*    → [ADMIN] TBD
/api/admin/logs/*      → [ADMIN] read-only
/api/admin/dashboard/* → [ADMIN] metrics
```

**Aucun endpoint `/bulk` n'existe aujourd'hui.** À créer par entité.

---

## 3. Risques & décisions ouvertes pour les bulk actions

### 3.1 Sécurité / RBAC

- **Escalade de privilège via bulk** : un admin `ADMIN` qui bulk-delete des cagnottes doit être traité différemment d'un `SUPER_ADMIN` qui bulk-deactivate des admins. **Décision** : chaque endpoint bulk doit explicitement déclarer son niveau de rôle minimum via `requireRole(...)`. Aucun endpoint générique `/bulk` unique — un par entité.
- **Self-target protection** : le endpoint `bulk deactivate admins` doit refuser si l'admin courant est dans la liste. Pareil pour `bulk change role` (pas de self-demote). C'est un pattern à factoriser dans un helper commun.
- **CSRF** : tous les endpoints admin sont déjà derrière `verifyCsrf` (middleware commun). Les bulk endpoints en hériteront — à vérifier.
- **Rate limit** : un `ADMIN` qui déclenche un bulk-approve sur 500 KYC d'un coup n'est pas un cas DDoS légitime — mais le endpoint doit avoir un `@max 100` par appel pour éviter les hard-timeouts Neon.

### 3.2 Atomicité / Idempotence

- **Tout-ou-rien vs best-effort** ? Si 50 cagnottes à clôturer, une qui échoue → on rollback tout ou on reporte les erreurs item par item ? **Recommandation** : best-effort par défaut, retour `{ succeeded: [...ids], failed: [{id, reason}] }`. Permet à l'UI de garder les items failed sélectionnés pour retry.
- **Transactions Neon 2s ceiling** : un bulk sur 100+ items avec email dispatch ne tient PAS dans une tx Serializable. **Pattern à appliquer** : mutations DB en tx, side-effects (email, notifications) post-tx en fire-and-forget `.catch()`.

### 3.3 Audit log

- **1 entrée AdminLog par item affecté** (bulk de 50 = 50 rows de log) OU **1 entrée par action avec `details.ids` array** ?
- **Recommandation** : 1 entrée par action pour éviter le bloat, avec `details: { ids: string[], action, params, succeeded, failed }`. Permet retrieval par opération plutôt que par cible. Mais perd le filtrage "toutes les actions sur cet item".
- **Alternative** : dual-log — 1 ligne résumé + 1 ligne par item. Plus coûteux mais traçabilité complète.

### 3.4 Confirm modals (règle projet)

> Memory: "All admin inline actions must have confirmation modals before execution"

Pour bulk, la modal doit afficher :
- Le **count** d'items
- L'**action** précise
- Un **résumé** des items (ex: "3 sellers seront flaggés : John Doe, Jane Smith, …")
- Si destructif : demander de taper le count pour confirmer (pattern GitHub delete-repo)

### 3.5 UX

- **BulkActionBar sticky bottom** quand `selected.size > 0` — masque les listes avec scroll mobile ? Vérifier sur Safari iOS.
- **"Tout sélectionner"** : s'applique à la page courante ou à toute la query filtrée ? Si tout → il faut un endpoint qui retourne tous les IDs matchant les filtres (pas de pagination) pour passer au bulk.
- **Desélection** : un bouton explicite dans la BulkActionBar + reset sur changement de filtre/page.

### 3.6 Scope ambigu "toutes les pages"

Certaines pages ont des actions bulk qui ne font pas de sens :

| Page | Bulk utile ? |
|---|---|
| `/admin/orders` | ❌ Orders passées, pas d'actions destructives en v1 (pas de refund). **Export CSV uniquement** |
| `/admin/logs` | ❌ Read-only audit trail. **Export CSV** |
| `/admin/notifications` | ❌ Lecture seule (dispatch côté backend). Peut-être "mark as read" mais aucune valeur op. |
| `/admin/config` | ❌ Settings globaux, pas une liste |
| `/admin/wallet` | ❌ Ledger financier, pas de bulk |

**Recommandation** : retirer de "toutes les pages" les pages où aucune bulk action n'a de sens opérationnel. 6 pages concernées : KYC, Retraits, Sellers, Cagnottes, Utilisateurs admins, Reports. Les autres reçoivent un **bouton Export CSV** uniquement.

---

## 4. Plan d'exécution proposé (5 itérations)

Chaque itération = 1 vertical slice déployable (backend + frontend + types + tests manuels), 1 commit.

### Iter 1 — Infrastructure partagée + KYC (commit 1)

- `src/components/admin/BulkActionBar.tsx` — sticky bottom bar
- `src/hooks/useAdminSelection.ts` — hook générique selection (`selected: Set<string>`, `toggleOne`, `toggleAll`, `clear`)
- `src/components/admin/BulkConfirmModal.tsx` — modal générique avec count + action + params slot
- Backend : `POST /api/admin/kyc/bulk` accepte `{ ids: string[], action: "approve"|"reject", reason?: string }`
- Self-target guard : N/A pour KYC
- Audit log : 1 ligne par action avec `details.ids`

### Iter 2 — Retraits (commit 2)

- Backend : `POST /api/admin/withdrawals/bulk` — `approve` / `reject` (+ reason)
- Frontend : checkbox col + réutilise `BulkActionBar`

### Iter 3 — Sellers (commit 3)

- Backend : `POST /api/admin/sellers/bulk` — `flag` / `unflag` / `suspend`
- Self-target guard : un admin ne peut pas flagguer sa propre ligne (bien que les sellers ne soient pas des admins, risque faible mais cohérent)
- **Ouverture** : suspend = quoi exactement ? champ `isSuspended` ou `deletedAt` ? À décider avec le user

### Iter 4 — Cagnottes (commit 4)

- Backend : `POST /api/admin/cagnottes/bulk` — `close` / `activate` / `delete`
- **Ouverture** : delete = soft (`isActive=false`) ou hard (cascade → orders PAID → perte historique financier) ?
- **Recommandation forte** : soft delete uniquement. Hard delete sur une cagnotte avec PAID orders = interdiction légale (compta / réclamations).

### Iter 5 — Utilisateurs admins (commit 5)

- Backend : `POST /api/admin/users/bulk` — `deactivate` / `activate` / `change-role`
- **Self-target guard critique** : refuser si `currentAdminId ∈ ids`
- **Chien de garde SUPER_ADMIN** : refuser si l'opération laisserait 0 SUPER_ADMIN actif
- `requireRole("SUPER_ADMIN")` sur tout le endpoint

### Iter 6 (optionnel) — Exports CSV (commit 6)

- Orders, Reports, Logs, Notifications, Wallet
- Bouton "Exporter CSV" utilise les filtres actuels, appelle `/api/admin/{entity}/export.csv`
- Background : streaming response pour gros datasets

---

## 5. Décisions en attente (du user)

1. **Scope final** : 5 iter (KYC/Retraits/Sellers/Cagnottes/Users) suffit, ou faut-il pousser exports CSV (iter 6) ?
2. **Cagnottes delete** : hard ou soft ?
3. **Sellers suspend** : quel champ, quel effet (login bloqué ? cagnottes masquées ? les deux) ?
4. **Bulk KYC reject sans raison commune** : autorisé avec raison par défaut "Dossier incomplet" ou forçage d'un champ commun ?
5. **Self-target** : pour le "bulk deactivate admins", retourner 400 global ou skip silencieux des items self-targeted ? (recommandation : 400 pour être explicite)

---

## 6. Ship-check avant commit

- [ ] `npx tsc --noEmit` backend + frontend passent
- [ ] Confirm modal présente sur toute action destructive (règle projet)
- [ ] `AdminLog` écrit pour chaque action bulk
- [ ] RBAC explicite par endpoint (pas de fallback générique)
- [ ] Rate limit : `@max 100 ids` par call
- [ ] Pas de hard delete sur entités financièrement traçables (Order, Withdrawal, Block avec PAID)
- [ ] Self-target guard sur Users bulk
- [ ] Tests manuels : 1 bulk success + 1 bulk avec 1 item failed (vérifier partial response)

---

## Annexe — Scripts livrés dans cette session

- [backend/scripts/reconcile-bictorys.ts](backend/scripts/reconcile-bictorys.ts) — réconciliation FAILED → PAID après vérif dashboard Bictorys
- [backend/scripts/promote-admin.ts](backend/scripts/promote-admin.ts) — promotion idempotente (crée ou update) d'un admin. Testé en prod sur `mass.kane@gmail.com` (déjà SUPER_ADMIN actif).

Non commités au moment de l'audit : `promote-admin.ts`. Le reste des hotfixes est pushé sur `main` (commits `fd88421`, `72d7684`, `7da5e72`).
