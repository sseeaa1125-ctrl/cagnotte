# Audit 035 — Affichage "Soutenir cagnotte.sn" côté créateur + redirect QR desktop

**Date**: 2026-04-19
**Scope**: corrections d'affichage du montant côté créateur (excl. contribution volontaire) + fix du redirect polling desktop après paiement QR + rename labels KPI + retrait barre fixe mobile sur /participer.

---

## 1. Problèmes identifiés

### P1 — Montants affichés au créateur incluent le pourboire plateforme

Un donateur contribue `baseAmount` + `voluntaryContribution` (= 3% "Soutenir cagnotte.sn"). Exemple : 500 + 15 = 515 FCFA.

Répartition réelle des 515 FCFA :
- **500 FCFA** = contribution à la cagnotte (dont 30 FCFA de commission solidaire 6% → plateforme, 470 FCFA → créateur)
- **15 FCFA** = pourboire 100% plateforme

Avant ce patch, partout où le créateur voyait un montant (dashboard "Montant récolté", participations récentes, notifications, emails), c'était `Order.amount` brut = **515 FCFA** au lieu de 500 FCFA. Le pourboire pollue la perception du créateur.

**Invariant souhaité** : pour les vues créateur ET publiques :
```
cagnotteContribution = Order.amount - Order.voluntaryContribution
```

### P2 — Redirect desktop bloqué sur "Paiement confirmé !" après scan QR

Flow QR desktop : le desktop affiche un QR code, l'utilisateur scanne avec son mobile, paye via Wave/OM. Le backend reçoit le webhook Bictorys → `Order.paymentStatus = PAID`. Le desktop poll `/api/orders/:ref/status` et détecte PAID.

Bug dans [paiement/page.tsx](../src/app/(public)/c/[slug]/paiement/page.tsx#L200-L245) :

```js
if (data.status === "PAID") {
  setWaitingStatus("paid");
  window.setTimeout(() => {
    if (!cancelled) router.push(`/c/${slug}/merci?...`);  // ← jamais exécuté
  }, 900);
}
```

1. `setWaitingStatus("paid")` déclenche un re-render.
2. L'effet dépend de `waitingStatus` → cleanup : `cancelled = true`, `clearTimeout`.
3. Le `setTimeout(900ms)` imbriqué fire 900ms plus tard.
4. `!cancelled` = **false** → `router.push` pas appelé.

Résultat : l'écran affiche "Paiement confirmé !" indéfiniment sans jamais rediriger sur `/merci`.

Bug secondaire même effet : guard `document.visibilityState !== "visible"` dans le poll → quand le user bascule sur son téléphone pour scanner, l'onglet desktop devient caché et le poll return early sans incrémenter. Rien ne relance le poll quand l'onglet redevient visible.

### P3 — Barre CTA fixe mobile redondante sur /participer

L'écran `/participer` avait une `<div fixed inset-x-0 bottom-0>` avec "Total + Participer" toujours visible en mobile. Or le bouton "Participer à la cagnotte" est déjà présent dans le récap sticky qui se trouve *en dessous* du formulaire sur mobile. Doublon visuel inutile.

---

## 2. Correctifs

### F1 — Exclusion de `voluntaryContribution` partout où l'on affiche au créateur/public

| Fichier | Changement |
|---|---|
| [backend/src/routes/cagnottes.ts](../backend/src/routes/cagnottes.ts) | `maskDonation()` calcule `cagnotteAmount = amount - voluntaryContribution`. 4 agrégations `_sum: { amount }` étendues à `_sum: { amount, voluntaryContribution }` ; `totalRaised` soustrait. 2 `findMany.select` ajoutent `voluntaryContribution`. |
| [backend/src/routes/blocks.ts](../backend/src/routes/blocks.ts) | `GET /:id/progress` → `realCollected = amount - voluntaryContribution`. `GET /:id/donations` → idem par ligne. |
| [backend/src/lib/notifications/dispatch.ts](../backend/src/lib/notifications/dispatch.ts) | `OrderForDispatch.voluntaryContribution` ajouté. `fireDonationReceived` passe `cagnotteAmount` au template ET au `data.amount` de la Notification. |
| [backend/src/routes/webhooks.ts](../backend/src/routes/webhooks.ts) | `prevTotal` et `newTotal` (milestones 50%/100%) soustraient voluntary. `ordForDispatch` passe `voluntaryContribution`. |
| [backend/src/lib/notifications/endedCron.ts](../backend/src/lib/notifications/endedCron.ts) | `computeBlockTotals()` — `totalRaised` soustrait voluntary (sinon la notif `CAGNOTTE_ENDED` annonce un montant gonflé). |

**Endpoints/surfaces intentionnellement laissés en BRUT** :
- `/api/sellers/me/participations` — vue DONATEUR ("qu'ai-je donné ?") : 515 est correct, c'est ce qu'il a payé.
- `/c/:slug/merci` (page donateur post-paiement) — idem, gross correct.
- `/api/admin/cagnottes` + `/api/admin/dashboard` — vue plateforme, brut est le flux réel de trésorerie ; le dashboard admin a déjà une décomposition `amount / sellerAmount / voluntaryContribution` explicite.
- `Customer.totalSpent` — total payé par le client = brut.

### F2 — Fix redirect QR desktop

[paiement/page.tsx](../src/app/(public)/c/[slug]/paiement/page.tsx) :

1. **Retiré** le guard `document.visibilityState !== "visible"` dans le polling. Le poll continue même onglet caché — coût négligeable (3s × 40 = 2 min max).
2. **Extrait** la redirection vers `/merci` dans un `useEffect` dédié keyé sur `waitingStatus === "paid"`. La tempo de 900ms est maintenant gérée par un `setTimeout` dont le cleanup appartient au nouveau effet, donc `setWaitingStatus("paid")` ne l'annule plus.

```js
React.useEffect(() => {
  if (waitingStatus !== "paid") return;
  if (!waitingData) return;
  const ref = waitingData.reference;
  const id = window.setTimeout(() => {
    router.push(`/c/${slug}/merci?ref=${encodeURIComponent(ref)}`);
  }, 900);
  return () => window.clearTimeout(id);
}, [waitingStatus, waitingData, router, slug]);
```

### F3 — Retrait barre fixe mobile

[ParticiperForm.tsx](../src/app/(public)/c/[slug]/participer/ParticiperForm.tsx) — suppression du bloc `<div className="fixed inset-x-0 bottom-0 … lg:hidden">` (29 lignes). Le bouton "Participer à la cagnotte" du récap sticky reste la seule CTA.

### F4 — Renommage labels KPI dashboard créateur

[src/lib/constants.ts](../src/lib/constants.ts) :
- `kpiCollected`: "Montant récolté" → **"Montant brut récolté"** (= somme des contributions cagnotte, avant commission 6/8%)
- `kpiAvailableFunds`: "Fonds disponibles" → **"Fonds net disponibles"** (= sellerAmount après commission, disponible au retrait)

Distinction claire entre "brut pour le créateur" (ce que les donateurs lui ont donné) et "net retirable" (après ponction plateforme).

---

## 3. Vérifications

- [x] `cd backend && npx tsc --noEmit` — clean
- [x] `npx tsc --noEmit` (frontend) — clean
- [x] Audit de tous les `_sum: { amount }` et `order.aggregate` / `order.groupBy` du backend — aucun miss restant côté créateur/public.
- [x] Vérification que `endedCron.ts` (un spot facile à oublier) a été patché → fait.
- [x] Vérification que les endpoints donateur/admin conservent bien le montant brut (c'est leur sémantique correcte).

## 4. Points non résolus / v2

- **Templates notifications** : `donation_received.html` contient toujours un libellé générique "a participé à hauteur de X FCFA". X est désormais le montant cagnotte (500) et non le total payé (515). Pas de régression — si le créateur veut voir les 15 FCFA de pourboire, il peut les déduire mais la majorité des créateurs ne verront que "quelqu'un a donné 500 FCFA" ce qui est la sémantique voulue.
- **Page dashboard admin** : `/admin/cagnottes` liste toujours `totalRaised` en brut (gestion plateforme). À reconsidérer si on veut aligner avec la vue créateur.
- **Smoke-test** : [scripts/smoke-test.ts](../backend/scripts/smoke-test.ts) n'a pas d'assertion sur `totalRaised` incluant un pourboire volontaire ; recommandation d'ajouter un test en v2 pour figer l'invariant (un don de 500+15 doit produire totalRaised=500 pour le créateur).

## 5. Fichiers modifiés

```
backend/src/lib/notifications/dispatch.ts
backend/src/lib/notifications/endedCron.ts
backend/src/routes/blocks.ts
backend/src/routes/cagnottes.ts
backend/src/routes/webhooks.ts
src/app/(public)/c/[slug]/paiement/page.tsx
src/app/(public)/c/[slug]/participer/ParticiperForm.tsx
src/lib/constants.ts
```

Aucune migration Prisma. Aucun commit effectué — à la demande de l'utilisateur.
