# Audit 032 — Securite complete du flux de paiement et retrait

**Date :** 2026-04-16
**Auditeur :** Claude (gsd-code-reviewer, deep mode)
**Perimetre :** orders.ts, webhooks.ts, withdrawals.ts, commission.ts, bictorys.ts, payout.ts, auth.ts, middleware/auth.ts, cagnottes.ts, blocks.ts, notifications.ts, utils.ts, blocks/schemas.ts, dispatch.ts, index.ts
**Contexte :** Application financiere en FCFA (montants reels). Bictorys = mobile money (Wave, Orange Money, Maxit). Commission 6% solidaire / 8% festive.

---

## Resume executif

Le flux de paiement est globalement **bien securise** avec plusieurs couches de defense en profondeur : transactions Serializable, idempotence webhook via `WebhookLog @@unique`, verification de signature timing-safe, KYC gate sur les retraits, PIN de retrait, et separation des cles API charge/payout. L'audit identifie neanmoins **2 issues CRITICAL**, **4 HIGH**, **5 MEDIUM**, et **4 LOW**.

---

## CRITICAL — Risque de perte d'argent

### CR-01 : Status polling fallback peut marquer PAID sans verification de commission ni idempotence webhook

**Fichier :** `backend/src/routes/orders.ts:1286-1328`
**Severite :** CRITICAL

Le fallback de status polling (`GET /api/orders/:ref/status`) detecte un paiement Bictorys `succeeded` et marque l'order PAID dans une transaction Serializable. Cependant :

1. **Pas de upsert WebhookLog** — le chemin de code ne cree pas de `WebhookLog` entry, donc si le webhook arrive ensuite, il re-traitera l'order. Le `ord.paymentStatus === "PAID"` check dans le webhook empechera le double-credit, mais les notifications post-tx (donation_received, milestone) seront envoyees en doublon car le dispatcher est hors-tx.

2. **Pas de verification de commission** — le polling ne verifie pas que `txStatus.amount` correspond a `order.amount` avec la devise correcte (seul `txStatus.amount === order.amount` est checke, pas la devise).

**Impact :** Notifications en doublon (donor-received, milestone) si webhook et polling race. Mineur mais degradant pour l'UX creator.

**Fix :**
```typescript
// Dans le fallback status poll, ajouter un upsert WebhookLog pour
// prevenir les doubles notifications :
await tx.webhookLog.upsert({
  where: { externalId_eventType: {
    externalId: order.paymentExternalId!,
    eventType: "succeeded_poll_fallback",
  }},
  create: {
    provider: "bictorys",
    eventType: "succeeded_poll_fallback",
    externalId: order.paymentExternalId!,
    payload: { source: "polling", amount: txStatus.amount },
    status: "processed",
  },
  update: {},
});
```

### CR-02 : Refund balance check inclut la commission platform mais rembourse seulement `sellerAmount`

**Fichier :** `backend/src/routes/orders.ts:557-591`
**Severite :** CRITICAL

Le refund flow verifie `order.sellerAmount > balance` (L578), mais le `balance` est calcule comme `totalEarned (somme sellerAmount) - totalWithdrawn`. Le refund transfere `order.sellerAmount` au client via Bictorys payout, mais marque la commande `REFUNDED` — ce qui signifie que `sellerAmount` reste dans `totalEarned` mais l'argent a physiquement quitte le compte Bictorys du marchant.

**Probleme :** Apres un refund, le `balance` (GET /withdrawals/balance) ne soustrait PAS les ordres REFUNDED de `totalEarned`. Le seller peut retirer l'argent qui a deja ete rembourse.

**Verification :** Le balance endpoint (L111-132) ne filtre QUE `paymentStatus: "PAID"` — les ordres REFUNDED ont toujours `paymentStatus: "REFUNDED"`, pas `"PAID"`, donc ils ne sont PAS dans `totalEarned`. **CORRECT** — le refund marque REFUNDED ce qui exclut de l'aggregate.

**MAIS** la Serializable transaction du refund (L557-591) recalcule le solde AVANT de marquer REFUNDED. Si l'order est deja REFUNDED par un doublon, le check `order.paymentStatus !== "PAID"` (L534) previent. **Le flow est en fait SAFE** apres re-analyse. Reclassifie en INFO.

**Reclassification :** ~~CRITICAL~~ -> INFO. Le flow est correct : REFUNDED exclut de `totalEarned`, et le check `paymentStatus !== "PAID"` previent les doubles.

---

## CRITICAL (reclassifie apres analyse)

### CR-01 (REVISED) : Notifications doublonnees entre webhook et status polling

**Reclassifie :** CRITICAL -> **HIGH** (pas de perte d'argent, mais UX degradante)

---

## HIGH — Fuite de donnees ou contournement

### HI-01 : Le status polling expose des donnees sensibles sans authentification

**Fichier :** `backend/src/routes/orders.ts:1198-1415`
**Severite :** HIGH

Le endpoint `GET /api/orders/:ref/status` est public (pas de `requireAuth`). Il retourne, quand `isPaid`:
- `amount`, `currency`, `customerName` (L1369-1370)
- `seller.displayName`, `seller.slug`, `seller.avatarUrl`, **`seller.supportPhone`**, **`seller.metaPixelId`**, **`seller.googleAdsId`**, **`seller.googleAnalyticsId`**, **`seller.tiktokPixelId`** (L1223)
- `donorMessage` (L1394)
- `booking.date`, `booking.location` (L1387-1390)

L'order reference (`FA-XXXXXXXXXX`) a 36^10 combinaisons donc n'est pas facilement enumerable, mais quiconque a la reference (copiee depuis le success URL, historique navigateur, sniffee en reseau) peut acceder aux tracking IDs du seller, au nom du donateur, et au message de don.

**Impact :** Fuite des tracking IDs (metaPixelId, googleAdsId, tiktokPixelId, googleAnalyticsId) et du supportPhone du seller a tout detenteur de la reference. Les tracking IDs sont des identifiants publicitaires qui ne devraient pas etre exposables par reference.

**Fix :**
```typescript
// Limiter le select seller aux champs strictement necessaires pour le success page :
seller: {
  select: {
    displayName: true,
    slug: true,
    avatarUrl: true,
    // Retirer : supportPhone, metaPixelId, googleAdsId, googleAnalyticsId, tiktokPixelId
  },
},
```

### HI-02 : CSRF faible — header seul suffit sans cookie match

**Fichier :** `backend/src/lib/auth.ts:191-220`
**Severite :** HIGH

La middleware `verifyCsrf` accepte la requete si le header `x-csrf-token` est present MEME SI le cookie `izy-csrf` est absent (L209-218). Le commentaire cite "S2b: Custom header alone is sufficient CSRF protection (OWASP pattern)".

C'est vrai que les navigateurs empechent les requetes cross-origin avec custom headers sans CORS preflight. Cependant :
- **Flash/Silverlight legacy** (edge case, de moins en moins pertinent)
- Si CORS est mal configure pour accepter un origin non-prevu, le header seul ne protege plus

Le risque reel est faible car le CORS est strict (ALLOWED_ORIGINS) avec un boot guard qui rejette `*` en production (index.ts:52-63). **Reclassifie :** HIGH -> **MEDIUM**.

### HI-03 : Donation a une cagnotte privee possible par reference directe

**Fichier :** `backend/src/routes/orders.ts:218-257`
**Severite :** HIGH

Le `POST /api/orders` cherche un donationBlock avec `isActive: true` mais ne verifie PAS `config.visibility`. Un attaquant connaissant le `sellerSlug` et le `blockId` d'une cagnotte privee peut creer une donation via l'API directement.

La cagnotte privee n'est pas listee publiquement (`/api/cagnottes` filtre sur `visibility: "public"`), mais si le `blockId` est connu (par ex. via l'inspecteur reseau d'un visiteur autorise), n'importe qui peut donner.

**Impact :** Les cagnottes "privees" ne sont pas reellement privees — elles sont "non listees". Toute personne avec le lien ou le blockId peut participer.

**Note :** C'est possiblement le comportement voulu (private = "unlisted" comme YouTube). Si c'est intentionnel, documenter clairement. Si private = "invite only", ajouter un check sur `config.visibility !== "private"` dans orders.ts ou un mecanisme d'invite.

### HI-04 : Pas de verification que le blockId appartient bien au seller dans le POST order

**Fichier :** `backend/src/routes/orders.ts:219-225`
**Severite :** HIGH

Le query `prisma.block.findFirst` filtre sur `sellerId: seller.id` ET `data.blockId ? { id: data.blockId } : {}`. C'est correct — le sellerId filtre empeche de donner via un blockId d'un autre seller. **SAFE** apres re-lecture.

**Reclassification :** ~~HIGH~~ -> SAFE. Le filtre `sellerId: seller.id` est present.

---

## HIGH (confirmees)

### HI-01 : Status polling expose tracking IDs et supportPhone (confirme)

### HI-03 : Cagnotte privee accepte les donations sans verification de visibilite (confirme — a documenter si intentionnel)

### HI-05 : Le blocks/:id/donations endpoint ne respecte pas hideAmount

**Fichier :** `backend/src/routes/blocks.ts:246-292`
**Severite :** HIGH

Le endpoint `GET /api/blocks/:id/donations` (L258-288) retourne `d.amount` directement sans verifier `config.hideAmount`. Contrairement au endpoint `GET /api/cagnottes/:slug` et `GET /api/cagnottes/:slug/participants` qui masquent le montant via `maskDonation()`, ce endpoint bypass la protection.

**Impact :** Un attaquant peut recuperer les montants individuels de chaque donation meme si le createur a active `hideAmount`.

**Fix :**
```typescript
// Lire config.hideAmount et masquer si necessaire :
const config = block.config as Record<string, unknown>;
const hideAmount = config?.hideAmount === true;
// ...
donations: donations.map((d) => ({
  id: d.id,
  amount: hideAmount ? null : d.amount,
  name: d.isAnonymous ? "Anonyme" : (d.customerName || "Anonyme"),
  message: d.messageIsPrivate ? null : (d.donorMessage || null),
  createdAt: d.createdAt,
})),
```

### HI-06 : L'endpoint GET /api/orders/:id retourne la totalite de l'order sans masquage

**Fichier :** `backend/src/routes/orders.ts:1418-1440`
**Severite :** MEDIUM (derriere requireAuth + sellerId check)

Le `GET /api/orders/:id` (L1418-1440) retourne l'objet `order` complet via `res.json({ order })` apres verification `order.sellerId !== sellerId`. L'objet inclut potentiellement tous les champs Prisma (include Product, BookingService, BumpSelections). C'est derriere auth + owner check, donc pas un IDOR, mais retourne plus de donnees que necessaire.

---

## MEDIUM

### MED-01 : Reference enumeration via timing side-channel sur status polling

**Fichier :** `backend/src/routes/orders.ts:1198-1270`
**Severite :** MEDIUM

Le endpoint `GET /api/orders/:ref/status` retourne 404 pour les references inexistantes et 200 pour les existantes. Un attaquant peut enumerer des references valides. La reference `FA-XXXXXXXXXX` a 36^10 combinaisons (3.6 quadrillions), ce qui rend l'enumeration par brute-force impraticable. Le rate limiter `statusPollLimiter` (20/min) ajoute une protection.

**Impact :** Risque theorique seulement. Le taux de succes par brute-force est ~0%.

### MED-02 : Withdrawal PIN verification utilise bcrypt (timing constant) mais pas de rate limit specifique

**Fichier :** `backend/src/routes/withdrawals.ts:236-245`
**Severite :** MEDIUM

La verification du PIN de retrait utilise `verifyPassword()` (bcrypt, timing-safe). Le `withdrawalLimiter` limite a 10/heure. Avec un PIN a 4 chiffres (10000 combinaisons), un attaquant peut tester 240 combinaisons par jour. A ce rythme, il faut ~42 jours pour brute-force. C'est suffisant pour v1, mais un compteur de tentatives echouees avec lockout serait plus sur.

**Fix recommande (v2) :**
```typescript
// Apres 5 echecs PIN consecutifs, bloquer les retraits 24h
if (!pinValid) {
  await prisma.seller.update({
    where: { id: sellerId },
    data: { withdrawalPinAttempts: { increment: 1 } },
  });
  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (seller.withdrawalPinAttempts >= 5) {
    await prisma.seller.update({
      where: { id: sellerId },
      data: { withdrawalBlocked: true, withdrawalBlockReason: "Trop de tentatives PIN" },
    });
  }
  res.status(403).json({ error: "Code de retrait incorrect" });
  return;
}
```

### MED-03 : Pas de verification max amount par Order.amount dans le webhook

**Fichier :** `backend/src/routes/webhooks.ts:330-342`
**Severite :** MEDIUM

Le webhook verifie `amount !== order.amount` (L331) mais si un attaquant compromet le webhook secret et envoie un payload avec un montant different, la commande est marquee FAILED. C'est le bon comportement. **Cependant**, le webhook ne verifie pas que l'`amount` du payload est positif et raisonnable (par ex. > 0 et < 100M). Un payload malveillant avec `amount: 0` serait detecte par la mismatch, mais un payload avec le bon montant et un `status: "succeeded"` crediterait le seller normalement — ce qui est correct car c'est protege par la signature.

**Conclusion :** Le webhook est correctement protege par la signature. SAFE si la signature est forte.

**Reclassification :** ~~MEDIUM~~ -> **LOW** (signature est la barriere).

### MED-04 : Le `createOrderSchema` accepte `orderType: "SALE" | "BOOKING" | "PAYMENT"` inutilement

**Fichier :** `backend/src/routes/orders.ts:32`
**Severite :** MEDIUM

Le schema Zod accepte `SALE`, `BOOKING`, `PAYMENT` et `DONATION` comme orderType, mais la plateforme cagnottes.sn n'utilise en pratique que `DONATION` (pour les FUNDRAISER blocks). Les types SALE/BOOKING/PAYMENT sont des vestiges du fork fari.store. Un attaquant pourrait creer des ordres de type SALE/BOOKING/PAYMENT si les blocks correspondants existent encore.

**Impact :** Les blocs non-FUNDRAISER ne peuvent pas etre crees via le frontend (supprime), mais si un seller cree un bloc via API directe, les ordres SALE/BOOKING/PAYMENT fonctionneraient avec l'ancienne commission Math.round (L311-314) qui peut over-collect 1 FCFA vs Math.floor.

**Fix :** Limiter `orderType` a `"DONATION"` seulement pour cagnottes.sn, ou ajouter un guard:
```typescript
if (data.orderType !== "DONATION") {
  res.status(400).json({ error: "Seules les donations sont acceptees" });
  return;
}
```

### MED-05 : Le webhook retourne toujours 200 meme en cas d'erreur interne

**Fichier :** `backend/src/routes/webhooks.ts:668-670`
**Severite :** MEDIUM

Le catch block retourne `res.status(200).json({ received: true, error: "internal" })`. C'est intentionnel pour eviter les retries infinis de Bictorys, mais cela signifie qu'une erreur serveur (DB down, etc.) perd silencieusement l'evenement webhook. Si la DB est temporairement down, l'order restera PENDING indefiniment et sera expire par le cron (10min TTL).

**Mitigation existante :** Le status polling fallback (orders.ts:1274-1354) recupere les paiements PAID qui n'ont pas eu de webhook. C'est un filet de securite acceptable.

---

## LOW

### LOW-01 : Bictorys API key loggee dans le body

**Fichier :** `backend/src/lib/payments/bictorys.ts:41`
**Severite :** LOW

`logger.log("[Bictorys] Body:", JSON.stringify(body))` logge le body complet de la requete Bictorys. Le body ne contient pas la cle API (elle est dans le header `X-Api-Key`), mais contient le `customerObject` avec nom, telephone et email du client.

La lib `logger.ts` fait de la redaction en production, mais verifier que `customerObject.phone` et `customerObject.email` sont bien redactees.

### LOW-02 : `generateUniqueReference` fallback inclut `Date.now()` (semi-predictable)

**Fichier :** `backend/src/lib/utils.ts:46-47`
**Severite :** LOW

Le fallback `FA-${Date.now().toString(36)}-${rand}` apres 10 collisions inclut le timestamp, rendant la reference partiellement predictable. En pratique, 10 collisions consecutives sont statistiquement quasi-impossibles (36^10 namespace), donc ce fallback ne sera jamais atteint.

### LOW-03 : Le webhook `verifyWebhookSignature` accepte deux modes (HMAC + static key)

**Fichier :** `backend/src/routes/webhooks.ts:228-261`
**Severite :** LOW

Le fallback `x-secret-key` (static key comparison) est moins securise que HMAC-SHA256 car il n'inclut pas de protection replay. Si Bictorys utilise uniquement le mode static key, un attaquant qui capture un webhook valide (man-in-the-middle sur le transit, meme si HTTPS) pourrait le rejouer sans limite de temps.

**Mitigation :** Le `WebhookLog @@unique([externalId, eventType])` previent le double-credit meme en cas de replay. Le risque residuel est nul pour la partie financiere.

### LOW-04 : Le payout log expose le phone number

**Fichier :** `backend/src/lib/payout.ts:107`
**Severite :** LOW

`logger.log("[PAYOUT] Appel Bictorys — ref=... phone=${params.phone}")` logge le numero complet. La lib logger fait de la redaction des phones en production (`lib/logger.ts`), mais confirmer que le pattern de redaction capture ce format.

---

## Points positifs (bien fait)

1. **Transactions Serializable** sur les operations critiques : creation d'ordre (booking), webhook PAID, balance check + withdrawal creation, refund.

2. **Triple protection anti-double-delivery webhook** : `WebhookLog @@unique([externalId, eventType])` + Serializable isolation + `Notification.dedupeKey @unique`.

3. **Commission server-side only** : `computeCommission()` est appele cote serveur, les champs client sont ignores. L'invariant `commission + net === gross` est enforce.

4. **Subtype defensif** : Le subtype est narrowed a "solidaire" par defaut si la valeur DB est invalide (orders.ts:304-305). Aucun moyen client de forcer un subtype avec une commission plus basse.

5. **Separation des cles API** : `BICTORYS_API_KEY` (charges) vs `BICTORYS_PRIVATE_KEY` (payouts) — jamais melangees.

6. **KYC gate solide** : `kycStatus !== "APPROVED"` -> 403 sur withdrawals ET refunds.

7. **Idempotence withdrawal** : `Withdrawal.idempotencyKey @unique` + pre-check par sellerId.

8. **Seller isolation** : Chaque query authentifiee filtre par `sellerId = req.seller!.sub`. Verifie sur : orders GET (L937), orders GET/:id (L1430), withdrawals GET (L66), withdrawals POST (tx L323-340), withdrawals balance (L111), blocks CRUD, notifications, refund (L502,519).

9. **maskDonation() centralise** dans cagnottes.ts — `customerEmail` JAMAIS retourne (T-02-03).

10. **Webhook signature timing-safe** avec length guard avant `timingSafeEqual`.

11. **Boot guards** : JWT_SECRET length check (>= 32 chars), placeholder rejection, CORS wildcard rejection en production.

---

## Tableau de synthese

| ID | Severite | Resume | Fichier:Ligne | Corrige ? |
|---|---|---|---|---|
| CR-01 | HIGH (reclassifie) | Notifications doublonnees webhook/polling race | orders.ts:1286-1328 | Non |
| HI-01 | HIGH | Status polling expose tracking IDs seller | orders.ts:1223 | Non |
| HI-03 | HIGH | Cagnotte privee accepte donations (a documenter) | orders.ts:218-257 | Non |
| HI-05 | HIGH | blocks/:id/donations ne respecte pas hideAmount | blocks.ts:246-292 | Non |
| MED-02 | MEDIUM | PIN brute-force lent mais pas de lockout | withdrawals.ts:236-245 | Non |
| MED-04 | MEDIUM | orderType accepte SALE/BOOKING/PAYMENT inutilement | orders.ts:32 | Non |
| MED-05 | MEDIUM | Webhook 200 sur erreur interne = perte silencieuse | webhooks.ts:668-670 | Non (mitige par polling) |
| HI-02 | MEDIUM (reclassifie) | CSRF header-only sans cookie match | auth.ts:191-220 | Non (CORS strict) |
| LOW-01 | LOW | Customer data dans les logs Bictorys | bictorys.ts:41 | Non |
| LOW-02 | LOW | Fallback reference semi-predictable | utils.ts:46-47 | Non (jamais atteint) |
| LOW-03 | LOW | Static key webhook sans replay protection | webhooks.ts:228-261 | Non (WebhookLog mitige) |
| LOW-04 | LOW | Phone dans les logs payout | payout.ts:107 | Non |

---

## Recommandations prioritaires

1. **HI-05 (blocks/:id/donations hideAmount)** — Fix rapide, impact utilisateur direct. Le createur active hideAmount mais les montants fuitent via un endpoint public alternatif.

2. **HI-01 (tracking IDs dans status polling)** — Retirer les champs `metaPixelId`, `googleAdsId`, `googleAnalyticsId`, `tiktokPixelId`, `supportPhone` du select dans le status polling endpoint.

3. **CR-01 (webhook/polling notification race)** — Ajouter un upsert WebhookLog dans le polling fallback pour prevenir les notifications doublonnees.

4. **MED-04 (orderType restriction)** — Restreindre a DONATION-only en production pour reduire la surface d'attaque.

5. **MED-02 (PIN lockout)** — Implanter un compteur d'echecs PIN avec blocage temporaire (v2 acceptable).

---

_Audit complet — 2026-04-16_
_Auditeur : Claude (claude-opus-4-6, deep security review)_
