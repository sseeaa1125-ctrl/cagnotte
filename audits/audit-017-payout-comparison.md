# Audit 017 — Comparaison système de payout cagnottes-sn vs cagnotte

Date : 2026-04-14

## Verdict

**cagnottes-sn est strictement supérieur ou égal à cagnotte sur tous les axes du payout.** Aucun gap de sécurité ou de fiabilité. 2 améliorations propres au fork.

## Parité stricte (byte-à-byte ou logique équivalente)

| Axe | cagnottes-sn | cagnotte | État |
|---|---|---|---|
| `lib/payout.ts` (`initiatePayout`) | 222 lignes | 222 lignes | ✅ identique |
| Env keys | `BICTORYS_PRIVATE_KEY` + `BICTORYS_MERCHANT_SECRET_CODE` + `BICTORYS_API_URL` | idem | ✅ |
| Timeout + parse JSON guards | ✅ | ✅ | ✅ |
| `parseBictorysPayoutError` (401/403/msg) | ✅ | ✅ | ✅ |
| Modèle Prisma `Withdrawal` | 23 champs + 2 `@unique` (`reference`, `idempotencyKey`) + 2 index composites | idem | ✅ byte-à-byte |
| `Seller.withdrawalPinHash` (bcrypt) | ✅ | ✅ | ✅ |
| `kycStatus` gate `!== "APPROVED"` → 403 | ✅ | ✅ | ✅ |
| `withdrawalBlocked` admin flag | ✅ | ✅ | ✅ |
| `PAYOUT_LIMITS` quotidien + solde | ✅ | ✅ | ✅ |
| Pending-withdrawal lock (1 seul à la fois) | ✅ | ✅ | ✅ |
| `withdrawalLimiter` (express-rate-limit Redis-backed) | ✅ | ✅ | ✅ |
| Middleware : `withdrawalLimiter + verifyCsrf + requireAuth` | ✅ | ✅ | ✅ |
| `createWithdrawalSchema` Zod | ✅ | ✅ | ✅ |
| `$transaction` avec recompute balance + insertion PENDING | ✅ | ✅ | ✅ |
| Update post-payout à `COMPLETED` / `FAILED` hors transaction | ✅ | ✅ | ✅ |
| `verifyPassword(pin, hash)` PIN check avec `PIN_REQUIRED` code | ✅ | ✅ | ✅ |

## cagnottes-sn **>** cagnotte

### 1. Dispatch de notifications post-payout (+ ~60 lignes)

cagnottes-sn importe et déclenche `firePayoutCompleted` / `firePayoutFailed` depuis `lib/notifications/dispatch.ts` après chaque transition d'état du withdrawal. Les notifications :
- Sont tirées **post-commit uniquement**, jamais dans `$transaction` (respect de la règle Neon 2s tx ceiling)
- Sont encapsulées dans un `.catch` pour qu'un échec notif ne casse pas le flow
- S'appuient sur `Notification.dedupeKey @unique` pour at-most-once delivery

cagnotte n'a aucune notification sur payout — l'utilisateur voit juste le status changer dans son dashboard sans alerte email/push.

### 2. Idempotency pre-check explicite

cagnottes-sn [withdrawals.ts:185](../backend/src/routes/withdrawals.ts) fait un `findUnique({ where: { idempotencyKey }})` AVANT d'entrer dans `$transaction`. Si le même idempotencyKey est resoumis (retry client, double-submit), on retourne immédiatement le withdrawal existant sans rejouer la transaction.

cagnotte compte uniquement sur le `@unique` de base : le doublon cause un P2002 au commit, la transaction rollback, le client reçoit une 500. Fonctionne mais moins élégant + cycle tx inutile.

## Volumétrie

- cagnottes-sn : **483 lignes** dans `withdrawals.ts`
- cagnotte : **397 lignes**
- Delta : **+86 lignes** = notifications dispatch (+60) + idempotency pre-check (+15) + gestion erreurs fines (+11)

## Faiblesses partagées

1. **Pas de webhook Bictorys payout** : les deux projets attendent la réponse synchrone `initiatePayout()` pour décider COMPLETED/FAILED. Si le paiement part en PROCESSING côté Bictorys puis échoue async, aucun signal de mise à jour — le withdrawal reste en PROCESSING indéfiniment. Mitigation : polling manuel ou status check via cron (non implémenté dans les 2).
2. **Pas de retry automatique** : si `initiatePayout()` timeout ou 5xx, le withdrawal part direct en FAILED. Pas de queue de retry (contrairement aux orders qui ont le circuit breaker).
3. **Circuit breaker Bictorys absent côté payout** : présent uniquement sur les charges (orders), pas sur les payouts. cagnottes-sn bénéficierait d'un `lib/payments/payoutCircuitBreaker.ts` symétrique.

## Recommandations (non bloquantes, par ordre de valeur)

1. **HIGH** — Ajouter un webhook de payout Bictorys pour capter les transitions async PROCESSING→PAID/FAILED. Bictorys supporte ça (`x-webhook-signature` HMAC identique au charge webhook). Impact : libère les withdrawals bloqués en PROCESSING.
2. **MED** — Appliquer le circuit breaker au payout (`recordBictorysFailure/Success`) en réutilisant `lib/payments/circuitBreaker.ts`. Impact : protège contre les cascades de payouts échoués.
3. **LOW** — Aligner cagnotte sur cagnottes-sn (ajout notifications + idempotency pre-check). Pertinent seulement si les deux projets restent synchronisés.

## Conclusion

Le payout cagnottes-sn est **production-ready** et strictement supérieur à cagnotte sur 2 axes (notifications + idempotency). Aucune régression par rapport au fork. Les 3 faiblesses partagées sont des améliorations futures, pas des bugs.
