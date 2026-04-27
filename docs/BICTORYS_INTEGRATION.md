# Bictorys Payment API — Skill d'intégration complet

> **Skill self-contained pour intégrer Bictorys dans n'importe quel projet** (Wave, Orange Money, Maxit, MTN, Moov, Carte) — Sénégal et Afrique de l'Ouest. Tous les patterns ci-dessous sont **production-validated** sur cagnottes.sn (avril 2026), avec hotfixes et reverts inclus.
>
> **Lecture recommandée** : §1 (mental model) → §11 (TikTok / WebView, à lire AVANT de toucher au flow paiement) → §6 (status check, l'endpoint a changé) → §7 (webhook, sécurité critique) → reste.

---

## Table des matières

1. [Mental model en 30 secondes](#1-mental-model-en-30-secondes)
2. [Configuration & variables d'environnement](#2-configuration--variables-denvironnement)
3. [Authentification — 3 clés distinctes](#3-authentification--3-clés-distinctes)
4. [Créer un paiement (Charge) — mobile money](#4-créer-un-paiement-charge--mobile-money)
5. [Créer un paiement (Charge) — carte bancaire](#5-créer-un-paiement-charge--carte-bancaire)
6. [Vérifier le statut d'une transaction (NOUVEAU endpoint)](#6-vérifier-le-statut-dune-transaction-nouveau-endpoint)
7. [Webhooks — réception & sécurité](#7-webhooks--réception--sécurité)
8. [Circuit breaker — protéger l'API contre les ratés Bictorys](#8-circuit-breaker--protéger-lapi-contre-les-ratés-bictorys)
9. [Polling fallback — serveur (cache 30s)](#9-polling-fallback--serveur-cache-30s)
10. [Polling fallback — client (circuit breaker + stop-on-404)](#10-polling-fallback--client-circuit-breaker--stop-on-404)
11. [⚠️ TikTok & in-app browsers (audits 008/009)](#11-️-tiktok--in-app-browsers-audits-008009)
12. [Allowlist des domaines de redirection (à maintenir en double)](#12-allowlist-des-domaines-de-redirection-à-maintenir-en-double)
13. [Normalisation pays & opérateurs](#13-normalisation-pays--opérateurs)
14. [Payouts — retraits vers mobile money](#14-payouts--retraits-vers-mobile-money)
15. [Erreurs courantes & debugging](#15-erreurs-courantes--debugging)
16. [Checklist production](#16-checklist-production)
17. [Historique des hotfixes (à ne pas refaire)](#17-historique-des-hotfixes-à-ne-pas-refaire)

---

## 1. Mental model en 30 secondes

```
┌─────────────┐  POST /pay/v1/charges    ┌──────────┐
│  Frontend   │─────────────────────────▶│ Bictorys │
│  (Next.js)  │  ◀─ {transactionId, link, qrCode}  │
└─────────────┘                          └──────────┘
       │                                       │
       │  redirect/QR/USSD                     │  webhook
       ▼                                       ▼
   ┌────────┐  POST /api/webhooks   ┌──────────────────┐
   │ Wave / │ ◀───────────────────  │  Backend Express │
   │ OM /   │                       │  (signature +    │
   │ Maxit  │                       │  Serializable tx)│
   └────────┘                       └──────────────────┘
                                            │
                                            ▼ (si webhook ne vient pas)
                                   GET /pay/v1/transactions/
                                       :id/status?by_charge_id=true
                                   (poll fallback, cache 30s)
```

**Flux nominal** :
1. Frontend → backend → `POST /pay/v1/charges` → backend stocke `transactionId` (= `paymentExternalId`)
2. Frontend redirige l'user vers Wave/OM/Maxit (deep link, QR, ou USSD)
3. User valide le paiement
4. Bictorys → POST webhook → backend marque PAID dans une transaction Serializable
5. Frontend poll `/api/orders/:ref/status` toutes les 3s → voit PAID → redirige vers /merci

**Flux fallback** : si le webhook n'arrive pas (réseau flaky, dev local sans tunnel), le poll backend appelle `GET /pay/v1/transactions/:id/status?by_charge_id=true` (cache 30s) et passe l'order PAID si Bictorys confirme.

**Trois sources d'auth distinctes** : `BICTORYS_API_KEY` (publique, charges + status), `BICTORYS_PRIVATE_KEY` (privée, payouts), `BICTORYS_WEBHOOK_SECRET` (validation webhook). **Ne jamais mélanger** — la publique sur un payout = 401, la privée sur un webhook = pas de validation possible.

---

## 2. Configuration & variables d'environnement

```env
# Base
BICTORYS_API_URL=https://api.bictorys.com               # prod
# BICTORYS_API_URL=https://api.test.bictorys.com        # sandbox

# Charges & status (clé PUBLIQUE)
BICTORYS_API_KEY=public-XXXX.YYYY                       # prefix `test_public-` en sandbox

# Payouts (clé PRIVÉE — jamais côté client)
BICTORYS_PRIVATE_KEY=secret-XXXX.YYYY                   # prefix `test_secret-` en sandbox

# Webhook (secret indépendant configuré dans le dashboard)
BICTORYS_WEBHOOK_SECRET=votre_secret_webhook

# Payouts uniquement
BICTORYS_MERCHANT_SECRET_CODE=1234                      # Dashboard → Entreprise → Préférences
```

**Pièges classiques** :
- Webhook configuré en sandbox mais clés API en prod (ou inverse) → webhooks silencieusement perdus
- `test_public-` en prod → 401 sur charges
- Confusion `BICTORYS_API_KEY` ↔ `BICTORYS_PRIVATE_KEY` → "Access right not sufficient"

---

## 3. Authentification — 3 clés distinctes

| Opération | Header | Clé |
|---|---|---|
| `POST /pay/v1/charges` (paiements entrants) | `X-Api-Key` | **publique** |
| `GET /pay/v1/transactions/:id/status?by_charge_id=true` | `X-Api-Key` | **publique** |
| `POST /pay/v1/payouts` (retraits) | `X-API-Key` | **privée** |
| `GET /onboarding/v1/payment-methods/me` | `X-API-Key` | **privée** |
| Webhook entrant (Bictorys → vous) | `X-Secret-Key` reçu | secret webhook |

**Note** : `X-Api-Key` et `X-API-Key` sont équivalents côté Bictorys (insensible à la casse), mais respecter la convention par opération évite la confusion.

---

## 4. Créer un paiement (Charge) — mobile money

### Endpoint

```
POST {BICTORYS_API_URL}/pay/v1/charges?payment_type={type}
Headers:
  X-Api-Key: {BICTORYS_API_KEY}
  Content-Type: application/json
```

### `payment_type` (query param)

| Valeur | Opérateur |
|---|---|
| `wave_money` | Wave (SN, CI, BF) |
| `orange_money` | Orange Money (SN, CI, ML, BK) |
| `maxit` | Maxit (SN) — sortie 2025 |
| `mtn_money` | MTN Money (CI, BJ) |
| `moov` | Moov Money (TG, CI, BF, BJ) |
| `togocell` | Togocell (TG) |
| `mobicash` | Mobicash (BF, ML) |

### Body

```json
{
  "amount": 5000,
  "currency": "XOF",
  "country": "SN",
  "paymentReference": "ORDER-ABC123",
  "successRedirectUrl": "https://monsite.com/success?ref=ORDER-ABC123",
  "ErrorRedirectUrl":   "https://monsite.com/error?ref=ORDER-ABC123",
  "customerObject": {
    "name":  "Amadou Fall",
    "phone": "+221771234567",
    "email": "amadou@example.com",
    "country": "SN"
  },
  "otp": "123456"
}
```

### ⚠️ Pièges critiques

| Piège | Symptôme | Fix |
|---|---|---|
| `errorRedirectUrl` au lieu de `ErrorRedirectUrl` | Pas de redirect erreur, silencieux | **E majuscule obligatoire** |
| Téléphone `771234567` ou `221 77 123 45 67` | 400 silencieux ou paiement coincé | Format `+221XXXXXXXXX` collé, pas d'espaces |
| `country: "BF"` pour Orange Money Burkina | `wrong payment type` | Utiliser `country: "BK"` (convention Bictorys) |
| Carte avec `payment_type=card` seul | Erreur | Ajouter `&payment_category=card` (voir §5) |

### Réponse 201 Created

```json
{
  "transactionId": "33e1c83b-7cb0-437b-bc50-a7a58e5660ad",
  "redirectUrl":   "https://pay.bictorys.com/checkout/...",
  "link":          "https://pay.wave.com/...",
  "qrCode":        "data:image/png;base64,...",
  "message":       "Composez *144*82# pour valider..."
}
```

| Champ | Quand présent | Usage UX |
|---|---|---|
| `transactionId` | Toujours | **À stocker en DB** (= `paymentExternalId`) pour status check + réconciliation |
| `redirectUrl` | Toujours | Fallback générique (page checkout Bictorys) |
| `link` | Wave, Carte | Deep link mobile (Wave) ou URL hosted-checkout (Carte) |
| `qrCode` | Wave | Afficher en modal pour desktop, l'user scanne avec son tel |
| `message` | Orange CI, MTN CI, Orange SN, Maxit | Instructions USSD à afficher |

### UX par opérateur

| Opérateur | Mobile | Desktop |
|---|---|---|
| **Wave** | Redirect vers `link` (deep link app) | QR code + polling |
| **Orange Money SN** | Redirect vers `link` (Firebase flow link `orange-money-prod-flowlinks.web.app`) | Idem ou QR |
| **Maxit (SN)** | Redirect vers `link` (`sugu.orange-sonatel.com`) | Idem |
| **Orange Money CI** | Step OTP (`#144*82#`) → `otp` dans body → afficher `message` + polling | Idem |
| **MTN Money CI** | Afficher `message` + polling | Idem |
| **Carte** | Redirect vers `link` (page checkout Bictorys → 3DS) | Idem |

### Retry WAF AWS (CRITIQUE)

Bictorys utilise un WAF AWS qui retourne parfois **403 HTML** (pas JSON) sur des requêtes valides. **Toujours implémenter un retry exponentiel** sur ce cas spécifique :

```typescript
const MAX_RETRIES = 3;
for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  if (attempt > 0) {
    await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000)); // 2s, 4s, 8s
  }
  const response = await fetch(url, { method: "POST", headers, body });
  if (response.ok) return await response.json();
  const errorText = await response.text();
  if (response.status === 403 && errorText.includes("Forbidden") && attempt < MAX_RETRIES) {
    continue;  // WAF → retry
  }
  throw new Error(`Bictorys charge error (${response.status}): ${errorText}`);
}
```

En sandbox : ajouter **5s entre les requêtes** sinon le WAF retourne des `200` vides silencieusement.

### Flow OTP — Orange Money Côte d'Ivoire (seul cas)

1. User compose `#144*82#` sur son tel
2. Reçoit un OTP (6-8 chiffres)
3. Saisit dans votre form
4. Vous l'envoyez dans `body.otp`
5. Bictorys retourne `message` USSD
6. User valide sur tel → webhook

```typescript
const needsOtp = paymentType === "orange_money" && country === "CI";
if (otp) body.otp = otp;
```

L'OTP expire vite — prévoir un step dédié et la possibilité de redemander.

---

## 5. Créer un paiement (Charge) — carte bancaire

```
POST {BICTORYS_API_URL}/pay/v1/charges?payment_type=card&payment_category=card
```

**Différences avec mobile money** :
- Query : ajouter `&payment_category=card` (sans ça → erreur)
- `country` : **toujours envoyer `"SN"`** quel que soit le pays du client (Bictorys normalise en interne)
- Réponse : utiliser le champ `link` qui pointe vers la page checkout Bictorys (saisie carte + 3DS)
- Pas de `qrCode` ni de `message` dans la réponse
- Pays supportés en pratique : SN, CI, BF (et plus, via la normalisation `SN`)

**UX recommandée** : redirect direct vers `link` dans la même fenêtre (`window.location.href`). Le 3DS challenge se fait sur le site Bictorys, puis Bictorys redirige vers `successRedirectUrl` ou `ErrorRedirectUrl`.

> **Note cagnottes.sn** : la carte a été retirée du UI v1 (avril 2026, mobile money only). Le code reste compatible — pour réactiver, ajouter le picker côté frontend et router le `payment_type` correctement.

---

## 6. Vérifier le statut d'une transaction (NOUVEAU endpoint)

> ⚠️ **Migration avril 2026** : l'ancien `GET /pay/v1/charges/{id}` retourne **HTTP 500 systématiquement** (en prod ET en test). Utilisez le nouveau endpoint ci-dessous.

### Endpoint

```
GET {BICTORYS_API_URL}/pay/v1/transactions/{transactionId}/status?by_charge_id=true
Headers:
  X-Api-Key: {BICTORYS_API_KEY}
```

Le flag `by_charge_id=true` indique à Bictorys que `transactionId` est l'ID de **charge** retourné par `POST /pay/v1/charges` (pas un autre identifiant interne).

### Réponse 200

```json
{ "id": "33e1c83b-...", "status": "succeeded" }
```

**Plus de `amount` ni `paymentReference` dans la réponse.** L'anti-fraude amount-match est désormais **exclusivement webhook-side** (le webhook reçoit toujours le montant encaissé).

### Statuts possibles

| Statut | Action |
|---|---|
| `succeeded` | ✅ Marquer PAID |
| `authorized` | ✅ Traiter comme PAID (pré-capture carte) |
| `pending` | ⏳ Continuer le polling |
| `processing` | ⏳ Continuer le polling |
| `failed` | ❌ Marquer FAILED |
| `cancelled` | ❌ Marquer FAILED |
| `reversed` | ❌ Marquer FAILED (remboursé) |

### Implémentation TypeScript

```typescript
async checkTransactionStatus(transactionId: string): Promise<{
  status: "succeeded" | "failed" | "cancelled" | "pending" | "processing" | "authorized" | "reversed";
} | null> {
  if (!BICTORYS_API_URL || !BICTORYS_API_KEY) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(
      `${BICTORYS_API_URL}/pay/v1/transactions/${transactionId}/status?by_charge_id=true`,
      { headers: { "X-Api-Key": BICTORYS_API_KEY }, signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!res.ok) {
      // Downgrade les 500 (problème provider) en log info pour ne pas spammer
      if (res.status === 500) logger.log(`[Bictorys] 500 for txn=${transactionId}`);
      else logger.warn(`Bictorys status check failed: ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { id?: string; status: string };
    return { status: data.status as ... };
  } catch (err) {
    logger.warn("Bictorys status check error", err);
    return null;
  }
}
```

**Logger un `warn` si `data.status` n'est pas dans l'enum attendu** — Bictorys peut introduire de nouveaux statuts silencieusement.

---

## 7. Webhooks — réception & sécurité

### Configuration dashboard

1. Dashboard → Developers → Webhooks → URL `https://votre-api.com/api/webhooks`
2. Renseigner le **Secret Key** (= `BICTORYS_WEBHOOK_SECRET`)
3. **⚠️ La config webhook est séparée test/prod** — configurer les deux

### Headers reçus

```
POST /api/webhooks
  Content-Type:        application/json
  X-Secret-Key:        <votre_webhook_secret>          ← toujours présent
  X-Webhook-Signature: <hmac_sha256_hex>               ← optionnel (HMAC activé)
  X-Webhook-Timestamp: <unix_timestamp_ms>             ← optionnel (HMAC activé)
```

### Validation signature (HMAC + fallback static-key)

```typescript
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

function verifyWebhookSignature(rawBody: string | Buffer, headers: Record<string, string | undefined>): boolean {
  const signature = headers["x-webhook-signature"];
  const timestamp = headers["x-webhook-timestamp"];

  if (signature && timestamp) {
    // 1. Replay protection
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > WEBHOOK_TIMESTAMP_TOLERANCE_MS) return false;

    // 2. HMAC-SHA256(secret, "<timestamp>.<rawBody>")
    const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf-8") : rawBody;
    const expected = crypto.createHmac("sha256", BICTORYS_WEBHOOK_SECRET)
      .update(`${timestamp}.${body}`).digest("hex");

    // 3. Length-guard puis timing-safe (sinon throw asymétrique = leak côté timing)
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  // Fallback : static x-secret-key
  const secretKey = headers["x-secret-key"];
  if (secretKey) {
    const a = Buffer.from(secretKey);
    const b = Buffer.from(BICTORYS_WEBHOOK_SECRET);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  return false;
}
```

### Express : raw body AVANT json (CRITIQUE)

```typescript
// L'ordre du middleware compte — Bictorys signe les bytes bruts.
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());     // ← APRÈS le raw
```

### Anti-fraude null-safe (hotfix prod fd88421)

Bictorys peut envoyer `amount: null` / `currency: null` (changement de format). **Skip l'anti-fraude dans ce cas plutôt que mark FAILED** — la money est déjà débitée côté Wave/OM, et `paymentReference` suffit à identifier l'order :

```typescript
if (amount == null || currency == null) {
  logger.warn(`Webhook: amount/currency absent ref=${paymentReference} amount=${amount} (${typeof amount}) — skip anti-fraude`);
} else if (amount !== order.amount || currency !== order.currency) {
  logger.warn(`Webhook: mismatch ref=${paymentReference} expected=${order.amount} got=${amount}`);
  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
  res.status(200).json({ received: true });
  return;
}
```

### Idempotency : triple protection

Le webhook peut être livré 2× (réseau, retry Bictorys). Trois lignes de défense :

1. **Postgres unique constraint** sur `WebhookLog (externalId, eventType)` — la 2ème écriture lève P2002
2. **Serializable isolation** — Postgres SSI abort le perdant en cas de race
3. **Notification.dedupeKey @unique** sur le path post-commit — si une notification est dispatchée 2× malgré tout

```typescript
// Triple-protected. CRITIQUE : tx body MUST stay <2s — Neon serverless ceiling.
// Aucun email, aucune notif, aucun appel HTTP DANS la tx.
const result = await prisma.$transaction(async (tx) => {
  await tx.webhookLog.upsert({
    where: { externalId_eventType: { externalId: transactionId, eventType: status } },
    create: { provider: "bictorys", eventType: status, externalId: transactionId, payload },
    update: {},     // no-op — l'unique constraint a déjà gagné
  });
  // ... order.update, customer.updateMany, etc.
}, { isolationLevel: "Serializable" });

// POST-commit (hors tx) : dispatcher notif, envoyer email.
await fireDonationReceived(...);
```

### TOUJOURS retourner 200

Même en cas d'erreur interne. Sinon Bictorys retentera indéfiniment et amplifiera la charge.

```typescript
try { /* logique */ } catch (err) {
  logger.error("Webhook error", err);
}
res.status(200).json({ received: true });
```

---

## 8. Circuit breaker — protéger l'API contre les ratés Bictorys

```typescript
const WINDOW_MS = 30_000;             // fenêtre glissante
const COOLDOWN_MS = 60_000;           // OPEN duration
const FAILURE_THRESHOLD = 5;
```

```
État machine :
  CLOSED    → [5 failures en 30s]   → OPEN
  OPEN      → [60s écoulés]         → HALF_OPEN  (un seul appel autorisé)
  HALF_OPEN → [1 success]           → CLOSED
  HALF_OPEN → [1 failure]           → OPEN       (reset cooldown 60s)
```

Quand OPEN, `POST /api/orders` short-circuit en **HTTP 503** sans appeler Bictorys. Évite de cramer le quota / d'amplifier la panne (P07).

**Limitation v1** : single-instance (state in-memory). Multi-instance → swap pour Redis (`INCR` + TTL key).

---

## 9. Polling fallback — serveur (cache 30s)

Le webhook est la source nominale ; le polling est un filet de sécurité (réseau flaky, dev local sans tunnel public). Pour ne pas harceler Bictorys, **cache 30s par `transactionId`**, cap 10 000 entrées, FIFO eviction.

```typescript
const cache = new Map<string, { result: { status: string } | null; expiresAt: number }>();
const TTL = 30_000;
const MAX_SIZE = 10_000;

function set(externalId: string, result: { status: string } | null) {
  if (cache.size >= MAX_SIZE) {
    const iter = cache.keys();
    for (let i = 0; i < 1000; i++) { const k = iter.next().value; if (k) cache.delete(k); }
  }
  cache.set(externalId, { result, expiresAt: Date.now() + TTL });
}
```

**Important** : si le poll détecte PAID, marquer l'order PAID **dans une transaction Serializable** ET upsert un `WebhookLog` avec `eventType: "succeeded_poll_fallback"` — sinon le webhook qui arrive 30s plus tard re-déclenchera les notifications.

```typescript
await tx.webhookLog.upsert({
  where: { externalId_eventType: { externalId, eventType: "succeeded_poll_fallback" } },
  create: { provider: "bictorys", eventType: "succeeded_poll_fallback",
            externalId, payload: { source: "polling", amount: order.amount }, status: "processed" },
  update: {},
});
```

**Trust status only** depuis la migration §6 (l'amount n'est plus dans la réponse). L'anti-fraude reste webhook-side uniquement.

---

## 10. Polling fallback — client (circuit breaker + stop-on-404)

```typescript
const POLL_INTERVAL_MS = 3_000;       // 3s
const MAX_POLLS = 40;                 // 2 min total
const MAX_CONSECUTIVE_ERRORS = 5;     // circuit breaker
```

```typescript
React.useEffect(() => {
  if (!ref) return;
  if (status !== "PENDING") return;
  if (attempts >= MAX_POLLS) { setStatus("TIMEOUT"); return; }
  if (errors >= MAX_CONSECUTIVE_ERRORS) { setStatus("TIMEOUT"); return; }

  let cancelled = false;
  const id = setTimeout(async () => {
    try {
      const data = await api<{ status: string }>(`/api/orders/${ref}/status`);
      if (cancelled) return;
      setErrors(0);   // reset circuit breaker sur chaque succès
      if (data.status === "PAID" || data.status === "FAILED" || data.status === "EXPIRED") {
        setStatus(data.status);
      } else {
        setAttempts(n => n + 1);
      }
    } catch (err) {
      if (cancelled) return;
      // Stop immédiat sur 404 — order n'existe pas, état terminal.
      if (err instanceof ApiError && err.status === 404) {
        setErrors(MAX_CONSECUTIVE_ERRORS);
        return;
      }
      setErrors(n => n + 1);
      setAttempts(n => n + 1);
    }
  }, POLL_INTERVAL_MS);

  return () => { cancelled = true; clearTimeout(id); };
}, [ref, status, attempts, errors]);
```

**À NE PAS pause quand l'onglet est caché** (waiting card paiement) : l'user peut scanner un QR sur desktop puis payer sur mobile — le desktop doit redirect vers /merci quand il redevient visible. Sur la page /merci elle-même, par contre, on peut pause (cf. `document.visibilityState`).

---

## 11. ⚠️ TikTok & in-app browsers (audits 008/009)

**À LIRE AVANT DE TOUCHER AU FLOW PAIEMENT.** TikTok bloque toutes les redirections sortantes. Plusieurs approches ont été tentées et **revertées** — ne pas refaire la même erreur.

### Matrice de comportement WebView

| Méthode | Instagram / FB | TikTok |
|---|---|---|
| `<a target="_blank">` | ✅ Ouvre Safari | ❌ Bloqué |
| `window.location.href` (async) | ❌ | ❌ |
| `window.location.href` (sur user click) | — | ❌ |
| Server 302 redirect | — | ❌ |
| 302 + URL Base64 | — | ❌ |
| `navigator.share()` | ✅ | ✅ (seul échappatoire) |

### Ce qui marche

```typescript
// src/lib/redirect.ts — branch order CRITIQUE : TikTok first (specificity).
// isInAppBrowser() détecte tous les WebViews dont TikTok ; tester TikTok d'abord.
export async function openPaymentUrl(url: string): Promise<"navigated" | "shared" | "copied" | "unsupported"> {
  if (!isAllowedPayDomain(url)) return "unsupported";

  if (isTikTokBrowser()) {
    // Essayer navigator.share()
    if (navigator.share) {
      try { await navigator.share({ url, title: "Lien de paiement" }); return "shared"; }
      catch { /* user a cancel */ }
    }
    // Fallback : copier dans clipboard, afficher un toast à l'user
    await navigator.clipboard.writeText(url);
    return "copied";
  }

  if (isInAppBrowser()) {
    // Meta : laisser le caller render <a target="_blank" rel="noopener noreferrer">
    return "unsupported";
  }

  window.location.href = url;   // navigateur normal
  return "navigated";
}
```

### Proxy route (pour Meta + same-domain hop)

`src/app/api/pay-redirect/route.ts` — wrapper qui prend une URL Base64-encodée et 302 vers la vraie cible. Utile pour Meta WebView qui supporte `<a target="_blank">` mais filtre certains query params longs.

```typescript
export async function GET(request: NextRequest) {
  const encoded = request.nextUrl.searchParams.get("t");
  if (!encoded) return NextResponse.json({ error: "Missing parameter" }, { status: 400 });

  let url: string;
  try { url = atob(encoded); }
  catch { return NextResponse.json({ error: "Invalid encoding" }, { status: 400 }); }

  // Allowlist obligatoire — voir §12.
  const parsed = new URL(url);
  if (!ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 400 });
  }
  return NextResponse.redirect(url, 302);
}
```

### Approches revertées (audit-009)

1. ❌ Retirer TikTok de `isInAppBrowser()` → interstitial bloque quand même
2. ❌ `window.location.href` sur user-gesture click → bloqué
3. ❌ Proxy `?url=pay.wave.com` → TikTok scanne les query params, bloqué
4. ❌ Proxy + Base64 → bloqué depuis WebView TikTok aussi (le scan est plus profond qu'on pensait)
5. ✅ `navigator.share()` + fallback clipboard → seule sortie viable

### Détection WebView (utilitaires sealed)

```typescript
// src/lib/utils.ts — NE PAS modifier sans audit.
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|TikTok|Line|Snapchat/i.test(ua);
}
export function isTikTokBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /TikTok|musically/i.test(navigator.userAgent);
}
```

---

## 12. Allowlist des domaines de redirection (à maintenir en double)

Deux listes **doivent rester synchronisées** : le proxy serveur et le validateur client.

### Server (`src/app/api/pay-redirect/route.ts`)

```typescript
const ALLOWED_DOMAINS = [
  "pay.wave.com",
  "checkout.bfrpay.com",
  "checkout.bfrpay.net",
  "pay.bfrpay.com",
  "bictorys.com",                            // couvre pay.bictorys.com + api.test.bictorys.com
  "orange-money-prod-flowlinks.web.app",     // Firebase flow links Orange Money
  "sugu.orange-sonatel.com",                 // Maxit
];
```

### Client (`src/lib/redirect.ts`)

```typescript
const PAY_REDIRECT_ALLOWED_DOMAINS = [
  "pay.wave.com",
  "checkout.bfrpay.com",
  "checkout.bfrpay.net",
  "pay.bfrpay.com",
  "bictorys.com",
  "orange-money-prod-flowlinks.web.app",
  "sugu.orange-sonatel.com",
];

function isAllowedPayDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return PAY_REDIRECT_ALLOWED_DOMAINS.some(d =>
      parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch { return false; }
}
```

**Règle** : tout nouveau domaine de paiement (nouveau opérateur, nouveau pays) doit être ajouté **dans les deux listes simultanément**. Ne jamais autoriser un domaine racine comme `web.app` (= tout Firebase Hosting).

**Fallback gracieux** : si `isAllowedPayDomain` retourne `false`, afficher une "waiting card" avec QR + lien copiable au lieu de planter.

---

## 13. Normalisation pays & opérateurs

### Codes pays Bictorys

| Code | Pays | Indicatif tel |
|---|---|---|
| `SN` | Sénégal | +221 |
| `CI` | Côte d'Ivoire | +225 |
| `BK` | Burkina Faso | +226 ⚠️ (`BK`, pas `BF` comme ISO) |
| `ML` | Mali | +223 |
| `TG` | Togo | +228 |
| `BJ` | Bénin | +229 |

### Règles de normalisation

```typescript
function normalizeBictorysCountry(paymentType: string, country: string): string {
  if (paymentType === "card") return "SN";                                  // carte = toujours SN
  if (paymentType === "orange_money" && country === "BF") return "BK";      // OM Burkina spécial
  return country;
}
```

### Matrice pays × opérateurs (observée mars 2026)

```typescript
const ALL_COUNTRY_OPERATORS = {
  SN: ["wave_money", "orange_money", "maxit", "moov"],
  CI: ["wave_money", "orange_money", "mtn_money", "moov"],
  BF: ["wave_money", "moov", "mobicash"],
  ML: ["orange_money", "mobicash"],
  TG: ["moov", "togocell"],
  BJ: ["mtn_money", "moov"],
};
```

**Vérifier les opérateurs réellement activés sur votre compte** via :

```
GET {BICTORYS_API_URL}/onboarding/v1/payment-methods/me
Header: X-API-Key: BICTORYS_PRIVATE_KEY
```

### Détection auto du pays par tel

```typescript
function detectCountryFromPhone(phone: string): string | null {
  if (phone.startsWith("+221") || phone.startsWith("221")) return "SN";
  if (phone.startsWith("+225") || phone.startsWith("225")) return "CI";
  if (phone.startsWith("+226") || phone.startsWith("226")) return "BF";
  if (phone.startsWith("+223") || phone.startsWith("223")) return "ML";
  if (phone.startsWith("+228") || phone.startsWith("228")) return "TG";
  if (phone.startsWith("+229") || phone.startsWith("229")) return "BJ";
  return null;
}
```

---

## 14. Payouts — retraits vers mobile money

**Pas de webhook pour les payouts** — la réponse synchrone décide COMPLETED / FAILED. En mars 2026 : seuls **Wave SN** et **Orange Money SN** supportent les payouts (`transferEnabled: true`).

### Endpoint

```
POST {BICTORYS_API_URL}/pay/v1/payouts?payment_type={wave_money|orange_money}
Headers:
  X-API-Key:        {BICTORYS_PRIVATE_KEY}            ← clé PRIVÉE obligatoire
  Content-Type:     application/json
  accept:           application/json
  Idempotency-Key:  {UUID-unique-par-retrait}
```

⚠️ La clé publique retourne 401 ici. Toujours envoyer `Idempotency-Key` (UUID v4) pour éviter les double-envois.

### Body

```json
{
  "amount": 10000,
  "currency": "XOF",
  "country": "SN",
  "customerObject": {
    "name":  "Amadou Fall",
    "phone": "+221771234567",
    "country": "SN",
    "locale":  "fr-FR"
  },
  "transactionType":   "payment",
  "paymentReason":     "Payout",
  "merchantReference": "WD-ABC123",
  "merchant": { "secretCode": "1234" }
}
```

### Réponse 200/201

```json
{
  "id": "abc123-def456",
  "amount": -10000,
  "merchantFee": 150,
  "status": 0,
  "createdAt": "2026-03-01T12:00:00Z"
}
```

`amount: -10000` → NÉGATIF (argent sortant). `status: 0` → succès.

### Implémentation (timeout 30s, AbortController)

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000);
try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-Key": BICTORYS_PRIVATE_KEY,
      "Content-Type": "application/json",
      "accept": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (response.ok) return { success: true, data: await response.json(), idempotencyKey };
  return { success: false, error: await response.text(), httpStatus: response.status, idempotencyKey };
} catch (err) {
  clearTimeout(timeout);
  // Network/timeout — DO NOT retry automatiquement (risque double payout).
  // Re-essayer manuellement via la même Idempotency-Key.
  throw err;
}
```

### Erreurs courantes payout

| HTTP | Body | Cause |
|---|---|---|
| `401` | — | Mauvaise clé (publique au lieu de privée) |
| `400` | `"balance"` | Solde Bictorys insuffisant |
| `400` | `"plafon"` / `"limit"` | Plafond mobile money atteint |
| `400` | `"phone"` | Numéro invalide |
| `400` | `"secretCode"` | Code marchand incorrect |

### Limites connues

- Pas de retry auto (risque double payout) — préférer un cron de réconciliation qui re-essaye avec la même `Idempotency-Key`
- Pas de circuit breaker payout (audit 017)
- État final connu uniquement par la réponse synchrone — stocker `httpStatus` + `rawResponse` pour le debug

---

## 15. Erreurs courantes & debugging

| Symptôme | Cause | Fix |
|---|---|---|
| `403 HTML` (`<html>... Forbidden ...`) | WAF AWS rate-limit | Retry exponentiel 2s/4s/8s, en sandbox espacer les requêtes de 5s |
| `403 JSON` (`Access right not sufficient`) | Mauvaise clé pour l'opération | Publique pour charges/status, privée pour payouts |
| `400 wrong payment type` | Opérateur pas activé pour le pays sur votre compte | Vérifier via `GET /onboarding/v1/payment-methods/me` |
| `400 country not available` | Pays pas activé pour cet opérateur | Contacter Bictorys |
| `ErrorRedirectUrl` ne fonctionne pas | Mauvaise casse | E majuscule obligatoire |
| Webhook non reçu | Config webhook test/prod désynchronisée OU URL inaccessible OU mauvais Secret Key | Vérifier dashboard, mode actif (test vs prod), et que les clés API matchent le mode |
| `500` sur `/pay/v1/charges/{id}` | **Endpoint déprécié** | Migrer vers `/pay/v1/transactions/:id/status?by_charge_id=true` (§6) |
| OTP invalide / expiré (OM CI) | OTP expire vite | User doit recomposer `#144*82#` |
| Réponse 200 vide en sandbox | WAF bloque les requêtes trop rapides | 5s entre requêtes |
| Order coincé en PENDING + webhook arrivé | Race tx Serializable abort | Vérifier `WebhookLog` ; si présent, le post-commit dispatch a peut-être échoué — re-jouer la notif |
| Double notification donateur | Webhook + poll fallback ont tous deux marqué PAID | Vérifier que le poll fallback insère bien `WebhookLog` avec `eventType: "succeeded_poll_fallback"` |

---

## 16. Checklist production

**Dashboard Bictorys**
- [ ] Mode **Production** activé
- [ ] Clés API prod obtenues (pas de prefix `test_`)
- [ ] Webhook configuré en mode prod avec la bonne URL et le bon Secret Key
- [ ] Micro-paiement test (500 FCFA) validé en prod

**Variables d'environnement**
- [ ] `BICTORYS_API_URL=https://api.bictorys.com`
- [ ] `BICTORYS_API_KEY=public-...` (pas `test_public-`)
- [ ] `BICTORYS_PRIVATE_KEY=secret-...`
- [ ] `BICTORYS_WEBHOOK_SECRET=...`
- [ ] `BICTORYS_MERCHANT_SECRET_CODE=...` (si payouts)

**Sécurité backend**
- [ ] `express.raw()` AVANT `express.json()` sur la route webhook
- [ ] `verifyWebhookSignature` : HMAC-SHA256 + replay window 5 min + length-guard avant `timingSafeEqual`
- [ ] Anti-fraude null-safe (`amount == null` → skip + warn)
- [ ] Idempotency : `WebhookLog @@unique([externalId, eventType])` + tx Serializable + `Notification.dedupeKey`
- [ ] PAID branch tx body **< 2s** (pas d'email, pas de notif, pas d'HTTP dans la tx — tout post-commit)
- [ ] **Toujours retourner 200** sur le webhook (même en cas d'erreur interne)
- [ ] Retry WAF 403 implémenté (charges)
- [ ] Circuit breaker (5 fails / 30s → 60s OPEN)
- [ ] Polling fallback serveur avec cache 30s + cap 10k entrées
- [ ] Polling fallback insère `WebhookLog` avec `eventType: "succeeded_poll_fallback"` quand il marque PAID
- [ ] Payout : `Idempotency-Key` UUID + timeout 30s + clé PRIVÉE
- [ ] Clé privée jamais exposée côté client

**Frontend**
- [ ] Polling client : 3s × 40 polls + circuit breaker 5 erreurs + stop-on-404
- [ ] Reset du compteur d'erreurs sur chaque succès
- [ ] Continue de poller quand l'onglet est caché (waiting card paiement)
- [ ] `openPaymentUrl()` testé sur TikTok, Instagram, Facebook, Safari, Chrome mobile
- [ ] Allowlist `PAY_REDIRECT_ALLOWED_DOMAINS` synchronisée entre `redirect.ts` et `pay-redirect/route.ts`
- [ ] Branch order TikTok-first dans `openPaymentUrl`
- [ ] Fallback "waiting card" avec QR + clipboard copy si redirect fail

**Auto-retry interdit sur les mutating verbs**
- [ ] POST/PUT/PATCH/DELETE NE doivent PAS être retry automatiquement sur erreur réseau (risque double charge / double payout). Seuls GET/HEAD peuvent.

---

## 17. Historique des hotfixes (à ne pas refaire)

| Commit | Type | Leçon |
|---|---|---|
| `da56715` | migration | `GET /pay/v1/charges/{id}` → 500 systématique. Migrer vers `/pay/v1/transactions/:id/status?by_charge_id=true`. Plus d'`amount` dans la réponse — anti-fraude exclusivement webhook |
| `ed16ccb` | hotfix | Maxit utilise `sugu.orange-sonatel.com` — ajouter à l'allowlist (les 2 listes) |
| `c890a2d` | hotfix | Allowlist proxy serveur DOIT matcher l'allowlist client — désynchronisation = redirect cassé |
| `1bae62f` | hotfix | Orange Money utilise `orange-money-prod-flowlinks.web.app` (Firebase). Ne PAS autoriser `web.app` racine |
| `354c565` | hotfix | Si `openPaymentUrl()` retourne `unsupported`, NE PAS planter — afficher la waiting card avec QR + lien copiable |
| `fd88421` | hotfix | Bictorys peut envoyer `amount: null` dans le webhook. Skip anti-fraude au lieu de mark FAILED (paiement déjà débité) |

**Audits à lire** :
- `audits/audit-008-inapp-browser-payment.md` — comportement WebView Meta/Instagram/Facebook
- `audits/audit-009-tiktok-payment-flow.md` — pourquoi TikTok est spécial, ce qui a été tenté et reverté
- `audits/audit-017-payouts-reconciliation.md` — limitations payout

---

*Skill basé sur cagnottes.sn (Sénégal) — production avril 2026.*
*Tous les patterns ci-dessus sont en service ; toutes les `Pièges critiques` ont causé un incident prod historique.*
