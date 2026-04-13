# Bictorys Payment API — Guide d'intégration complet

> Guide **généraliste et complet** pour intégrer l'API Bictorys dans n'importe quelle application. Couvre les paiements (charges), les retraits (payouts), les webhooks, le flow OTP Orange Money CI, et tous les opérateurs mobile money d'Afrique de l'Ouest. Basé sur des tests réels en mars 2026.

---

## Table des matières

1. [Configuration & Variables d'environnement](#1-configuration--variables-denvironnement)
2. [Authentification](#2-authentification)
3. [Créer un paiement (Charge)](#3-créer-un-paiement-charge)
4. [Flow OTP — Orange Money Côte d'Ivoire](#4-flow-otp--orange-money-côte-divoire)
5. [Vérifier le statut d'une transaction](#5-vérifier-le-statut-dune-transaction)
6. [Webhooks — Recevoir les notifications](#6-webhooks--recevoir-les-notifications)
7. [Créer un retrait (Payout)](#7-créer-un-retrait-payout)
8. [Moyens de paiement supportés](#8-moyens-de-paiement-supportés)
9. [Normalisation pays](#9-normalisation-pays)
10. [Erreurs courantes & Debugging](#10-erreurs-courantes--debugging)
11. [Checklist de mise en production](#11-checklist-de-mise-en-production)
12. [Exemples de code complets](#12-exemples-de-code-complets)

---

## 1. Configuration & Variables d'environnement

### Clés nécessaires

| Variable | Usage | Où la trouver |
|---|---|---|
| `BICTORYS_API_URL` | Base URL de l'API | Voir tableau ci-dessous |
| `BICTORYS_API_KEY` | Clé publique — pour créer des charges et vérifier des statuts | Dashboard → Developers → API Keys → Public Key |
| `BICTORYS_PRIVATE_KEY` | Clé privée — pour les payouts et la lecture des payment methods | Dashboard → Developers → API Keys → Private Key |
| `BICTORYS_WEBHOOK_SECRET` | Secret dédié webhook — pour valider les notifications entrantes | Dashboard → Developers → Webhooks → Secret Key |
| `BICTORYS_MERCHANT_SECRET_CODE` | Code secret marchand — requis dans le body des payouts | Dashboard → Entreprise → Préférences |

### URLs par environnement

| Environnement | Base URL | Préfixe des clés |
|---|---|---|
| **Test (Sandbox)** | `https://api.test.bictorys.com` | `test_public-...`, `test_secret-...` |
| **Production** | `https://api.bictorys.com` | `public-...`, `secret-...` |

### Exemple `.env`

```env
BICTORYS_API_URL=https://api.bictorys.com
BICTORYS_API_KEY=public-XXXX.YYYY
BICTORYS_PRIVATE_KEY=secret-XXXX.YYYY
BICTORYS_WEBHOOK_SECRET=votre_secret_webhook
BICTORYS_MERCHANT_SECRET_CODE=1234
```

### IMPORTANT — Différence entre les 3 clés/secrets

- **`BICTORYS_API_KEY` (publique)** : Header `X-Api-Key` pour créer des charges et vérifier des transactions. C'est la clé principale pour les paiements entrants.
- **`BICTORYS_PRIVATE_KEY` (privée)** : Header `X-API-Key` pour les payouts (retraits) et la lecture des opérateurs activés. Ne JAMAIS exposer côté client.
- **`BICTORYS_WEBHOOK_SECRET`** : Secret dédié aux webhooks. Bictorys l'envoie dans le header `X-Secret-Key` de chaque notification. Ce n'est PAS la private key — c'est un secret séparé configuré dans le dashboard webhooks.

---

## 2. Authentification

Toutes les requêtes API utilisent le header `X-Api-Key` (ou `X-API-Key`, les deux fonctionnent).

```
X-Api-Key: <votre_clé>
Content-Type: application/json
```

| Opération | Clé à utiliser |
|---|---|
| Charges (paiements entrants) | Clé **publique** (`BICTORYS_API_KEY`) |
| Status check (`GET /charges/{id}`) | Clé **publique** (`BICTORYS_API_KEY`) |
| Payouts (retraits) | Clé **privée** (`BICTORYS_PRIVATE_KEY`) |
| Payment methods (lecture opérateurs activés) | Clé **privée** (`BICTORYS_PRIVATE_KEY`) |
| Webhooks (réception) | Pas de header sortant — Bictorys envoie `X-Secret-Key` dans sa requête |

**⚠️ Erreur courante** : utiliser la clé publique pour un payout → `403 "Access right not sufficient"`. Utiliser la clé privée pour une charge fonctionne, mais ce n'est pas recommandé.

---

## 3. Créer un paiement (Charge)

### Endpoint

```
POST {BICTORYS_API_URL}/pay/v1/charges?payment_type={type}
```

Pour carte bancaire, ajouter `&payment_category=card` :
```
POST {BICTORYS_API_URL}/pay/v1/charges?payment_type=card&payment_category=card
```

### Headers

| Header | Valeur |
|---|---|
| `X-Api-Key` | `BICTORYS_API_KEY` (clé publique) |
| `Content-Type` | `application/json` |

### Payment Types (query parameter `payment_type`)

| Valeur | Description |
|---|---|
| `wave_money` | Paiement Wave |
| `orange_money` | Paiement Orange Money |
| `mtn_money` | Paiement MTN Money |
| `moov` | Paiement Moov Money |
| `togocell` | Paiement Togocell |
| `mobicash` | Paiement Mobicash |
| `maxit` | Paiement Maxit (SN) |
| `card` | Carte bancaire (Visa/Mastercard) — nécessite aussi `&payment_category=card` |

### Body (JSON)

```json
{
  "amount": 5000,
  "currency": "XOF",
  "country": "SN",
  "paymentReference": "ORDER-ABC123",
  "successRedirectUrl": "https://monsite.com/success?ref=ORDER-ABC123",
  "ErrorRedirectUrl": "https://monsite.com/error?ref=ORDER-ABC123",
  "customerObject": {
    "name": "Amadou Fall",
    "phone": "+221771234567",
    "email": "amadou@example.com",
    "country": "SN"
  },
  "otp": "123456"
}
```

### Paramètres du body

| Champ | Type | Requis | Description |
|---|---|---|---|
| `amount` | `integer` | ✅ | Montant en FCFA (entier, pas de décimales). Bictorys min: 100 |
| `currency` | `string` | ✅ | Toujours `"XOF"` pour le franc CFA |
| `country` | `string` | ✅ | Code pays Bictorys — `"SN"`, `"CI"`, `"BK"` (Burkina), `"ML"`, `"TG"`, `"BJ"` |
| `paymentReference` | `string` | ✅ | Référence unique de votre commande |
| `successRedirectUrl` | `string` | ✅ | URL de redirection navigateur après paiement réussi |
| `ErrorRedirectUrl` | `string` | ✅ | URL de redirection après échec. **⚠️ E majuscule obligatoire** |
| `customerObject` | `object` | ❌ | Informations client (recommandé) |
| `customerObject.name` | `string` | ❌ | Nom du client |
| `customerObject.phone` | `string` | ❌ | Téléphone format `"+221771234567"` (pas d'espaces) |
| `customerObject.email` | `string` | ❌ | Email du client |
| `customerObject.country` | `string` | ❌ | Code pays du client |
| `otp` | `string` | ❌ | Code OTP pour Orange Money CI uniquement (voir §4) |

### ⚠️ PIÈGE CRITIQUE : `ErrorRedirectUrl` avec E majuscule

Bictorys attend `ErrorRedirectUrl` avec un **E majuscule**. Pas `errorRedirectUrl`. Si vous utilisez la mauvaise casse, la redirection d'erreur ne fonctionnera pas silencieusement — aucune erreur ne sera levée.

### ⚠️ Format du téléphone

Le numéro doit être au format **`+INDICATIF` + `NUMERO`** collé, sans espaces :
- ✅ `"+221771234567"` (Sénégal)
- ✅ `"+2250701234567"` (Côte d'Ivoire)
- ❌ `"221771234567"` (manque le `+`)
- ❌ `"771234567"` (pas de préfixe pays)
- ❌ `"+221 77 123 45 67"` (espaces interdits)

Ce format s'applique pour les charges ET les payouts.

### Réponse succès — `201 Created`

```json
{
  "transactionId": "33e1c83b-7cb0-437b-bc50-a7a58e5660ad",
  "redirectUrl": "https://pay.bictorys.com/checkout/33e1c83b-...",
  "link": "https://pay.bictorys.com/link/...",
  "qrCode": "data:image/png;base64,...",
  "message": "Composez *144*82# pour valider..."
}
```

| Champ | Type | Quand présent | Usage |
|---|---|---|---|
| `transactionId` | `string` (UUID) | Toujours | ID unique Bictorys — **à sauvegarder en base** pour le polling et la réconciliation |
| `redirectUrl` | `string` | Toujours | URL de redirection (fallback général) |
| `link` | `string` | Wave, Carte | Lien de paiement direct (deep link mobile Wave ou page checkout carte) |
| `qrCode` | `string` (base64 PNG) | Wave | QR code à afficher pour les users desktop (scannent avec l'app Wave) |
| `message` | `string` | Orange CI, MTN CI, Orange SN | Message USSD/instruction à afficher à l'utilisateur |

### Flux UX selon l'opérateur

| Opérateur | Flux recommandé |
|---|---|
| **Wave (mobile)** | Rediriger vers `link` → deep link app Wave → paiement → webhook |
| **Wave (desktop)** | Afficher `qrCode` dans un modal + polling statut → l'utilisateur scanne → webhook |
| **Orange Money CI** | Step OTP dédié (`#144*82#`) → envoyer `otp` dans le body → afficher `message` + polling → webhook |
| **Orange Money SN** | Afficher `message` USSD + polling → l'utilisateur valide sur son téléphone → webhook |
| **MTN Money CI** | Afficher `message` + polling → l'utilisateur valide sur son téléphone → webhook |
| **Carte** | Rediriger vers `link` → page checkout Bictorys → saisie carte → 3DS → webhook |

### Protection WAF — Retry obligatoire

Bictorys utilise un WAF AWS qui bloque parfois les requêtes avec un **403 HTML** (pas JSON). Implémentez un retry avec backoff exponentiel :

```typescript
async function createCharge(url: string, headers: HeadersInit, body: string): Promise<any> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000)); // 2s, 4s, 8s
    }
    const response = await fetch(url, { method: "POST", headers, body });
    if (response.ok) return await response.json();

    const errorText = await response.text();
    // Retry uniquement sur 403 WAF HTML
    if (response.status === 403 && errorText.includes("Forbidden") && attempt < MAX_RETRIES) {
      continue;
    }
    throw new Error(`Bictorys error (${response.status}): ${errorText}`);
  }
}
```

**Note** : en mode test, ajouter un délai de **5 secondes entre les requêtes** pour éviter que le WAF ne bloque avec des réponses 200 vides.

### Réponses d'erreur

| HTTP Status | Cause | Action |
|---|---|---|
| `400` | Paramètres invalides, `"wrong payment type"`, `"country not available"` | Vérifier le body et les query params |
| `401` | Clé API invalide ou manquante | Vérifier `X-Api-Key` |
| `403` (HTML) | WAF rate-limit | Retry avec backoff exponentiel |
| `403` (JSON) | `"Access right not sufficient"` | Mauvaise clé (publique vs privée) |
| `500` | Erreur interne Bictorys | Réessayer plus tard |

---

## 4. Flow OTP — Orange Money Côte d'Ivoire

Orange Money CI est le **seul opérateur** qui nécessite un code OTP généré par le client.

### Comment ça marche

1. L'utilisateur compose **`#144*82#`** sur son téléphone Orange CI
2. Il reçoit un code OTP (6-8 chiffres)
3. Il saisit ce code dans votre formulaire de paiement
4. Vous envoyez le code dans le champ `otp` du body de la charge
5. Bictorys retourne un `message` USSD
6. L'utilisateur valide sur son téléphone
7. Bictorys envoie un webhook avec le statut

### Détection côté code

```typescript
const needsOtp = paymentType === "orange_money" && country === "CI";
```

### Envoi dans le body

```typescript
const body: Record<string, unknown> = {
  amount, currency, country, paymentReference,
  successRedirectUrl, ErrorRedirectUrl, customerObject,
};
if (otp) {
  body.otp = otp; // Uniquement pour Orange Money CI
}
```

### Conseils UX

- Afficher un step dédié pour la saisie OTP (avant le paiement)
- Expliquer clairement : *"Compose #144*82# sur ton téléphone pour générer ton code OTP"*
- Si le paiement échoue → ramener au step OTP (pas au formulaire complet) pour réessayer facilement
- L'OTP expire rapidement — l'utilisateur devra peut-être recomposer `#144*82#`

---

## 5. Vérifier le statut d'une transaction

### Endpoint

```
GET {BICTORYS_API_URL}/pay/v1/charges/{transactionId}
```

### Headers

| Header | Valeur |
|---|---|
| `X-Api-Key` | `BICTORYS_API_KEY` (clé publique) |

### Statuts possibles

| Statut | Description | Action recommandée |
|---|---|---|
| `succeeded` | Paiement confirmé | ✅ Valider la commande |
| `authorized` | Paiement autorisé (pré-capture carte) | ✅ Traiter comme `succeeded` |
| `pending` | En attente de validation client | ⏳ Continuer le polling |
| `processing` | En cours de traitement | ⏳ Continuer le polling |
| `failed` | Paiement échoué | ❌ Marquer FAILED |
| `cancelled` | Annulé par le client | ❌ Marquer FAILED |
| `reversed` | Remboursé/annulé après succès | ❌ Marquer FAILED |

### Usage recommandé : polling en fallback du webhook

Ne pas se baser uniquement sur le polling — utiliser les **webhooks comme source principale** et le polling comme fallback :

```
Intervalle : toutes les 4 secondes
Max : 75 polls (≈ 5 minutes)
→ Si "succeeded" ou "authorized" → commande payée
→ Si "failed" ou "cancelled" → commande échouée
→ Si timeout (75 polls) → afficher "paiement non confirmé" + bouton réessayer
```

### ⚠️ Limitation sandbox

`GET /pay/v1/charges/{id}` retourne souvent **500** en environnement test (`api.test.bictorys.com`). Fonctionne normalement en production. En test, se baser uniquement sur les webhooks.

---

## 6. Webhooks — Recevoir les notifications

### Configuration dans le dashboard Bictorys

1. Dashboard → **Developers** → **Webhooks**
2. Ajouter votre URL : `https://votre-api.com/webhooks/bictorys`
3. Renseigner le **Secret Key**
4. Sauvegarder

**⚠️ IMPORTANT** : La configuration webhook est **séparée** entre mode test et production. Le webhook configuré en test n'est PAS actif en production et vice-versa. Il faut configurer les deux.

### Headers envoyés par Bictorys

```
POST https://votre-api.com/webhooks/bictorys
Headers:
  Content-Type: application/json
  X-Secret-Key: <votre_webhook_secret>           ← toujours présent
  X-Webhook-Signature: <hmac_sha256_hex>          ← optionnel (si HMAC activé)
  X-Webhook-Timestamp: <unix_timestamp_ms>        ← optionnel (si HMAC activé)
```

### Validation de la signature (2 méthodes)

#### Méthode 1 : HMAC-SHA256 (recommandée, si `X-Webhook-Signature` présent)

```typescript
import crypto from "crypto";

function verifyHmacSignature(rawBody: string, secret: string, signature: string, timestamp: string): boolean {
  // 1. Replay protection — rejeter si timestamp > 5 minutes
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    return false;
  }
  // 2. Calculer le HMAC
  const expected = crypto.createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  // 3. Comparaison timing-safe
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
```

#### Méthode 2 : Static key (fallback, si pas de HMAC)

```typescript
function verifyStaticKey(secretKeyHeader: string, expectedSecret: string): boolean {
  try {
    return crypto.timingSafeEqual(
      Buffer.from(secretKeyHeader),
      Buffer.from(expectedSecret)
    );
  } catch {
    return false;
  }
}
```

**⚠️ IMPORTANT** : Toujours utiliser `crypto.timingSafeEqual()`, jamais `===` pour la comparaison de secrets.

### Payload du webhook

```json
{
  "id": "33e1c83b-7cb0-437b-bc50-a7a58e5660ad",
  "merchantId": "d2d2053b-638d-4133-957e-3caf63e6b79c",
  "type": "payment",
  "amount": 5000,
  "currency": "XOF",
  "paymentReference": "ORDER-ABC123",
  "customerId": "fbd2053b-...",
  "customerObject": {
    "id": "fbd2053b-...",
    "name": "Amadou Fall",
    "phone": 221771234567,
    "email": "amadou@example.com",
    "address": "",
    "city": "Dakar",
    "postalCode": 0,
    "country": "SN",
    "locale": "fr-FR",
    "createdAt": "2026-03-01T12:00:00Z",
    "updatedAt": "2026-03-01T12:00:00Z"
  },
  "pspName": "wave_money",
  "paymentMeans": "+221 *** ** 67",
  "paymentChannel": "Terminal",
  "merchantFees": 150,
  "customerFees": 0,
  "merchantReference": "ORDER-ABC123",
  "status": "succeeded",
  "timestamp": "2026-03-01T12:05:00Z"
}
```

### Champs clés

| Champ | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | ID unique de la transaction Bictorys |
| `status` | `string` | `"succeeded"`, `"failed"`, `"cancelled"`, `"authorized"`, `"reversed"` |
| `paymentReference` | `string` | Votre référence de commande (celle envoyée à la création) |
| `amount` | `integer` | Montant en FCFA |
| `currency` | `string` | `"XOF"` |
| `pspName` | `string` | Opérateur utilisé (`"wave_money"`, `"orange_money"`, etc.) |
| `merchantFees` | `integer` | Frais Bictorys facturés au marchand |
| `customerFees` | `integer` | Frais facturés au client |
| `merchantReference` | `string` | Même valeur que `paymentReference` |
| `timestamp` | `string` (ISO 8601) | Date/heure de la transaction |

**⚠️ Note** : `customerObject.phone` est un **nombre** (pas une string) dans le webhook, contrairement à ce que vous envoyez dans la charge.

### Bonnes pratiques d'implémentation webhook

```
1. Recevoir le body en raw Buffer (AVANT le JSON parser global)
   → express.raw() sur la route webhook, AVANT express.json()

2. Vérifier la signature (HMAC ou static key)

3. Logger le webhook en base AVANT tout traitement (debug + audit)

4. Anti-fraude : vérifier que amount + currency correspondent à votre commande

5. Idempotency : ne pas traiter deux fois le même webhook
   → Table de logs avec transactionId + status "processed"
   → Transaction sérialisable (Serializable isolation level)

6. TOUJOURS retourner HTTP 200 — même en cas d'erreur interne
   → Sinon Bictorys réessaiera indéfiniment
```

### Implémentation Express.js

```typescript
import express from "express";
import crypto from "crypto";

const app = express();

// ⚠️ ORDRE CRITIQUE : raw AVANT json
app.use("/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());

app.post("/webhooks/bictorys", async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf-8") : req.body;
    const signature = req.headers["x-webhook-signature"] as string | undefined;
    const timestamp = req.headers["x-webhook-timestamp"] as string | undefined;
    const secretKey = req.headers["x-secret-key"] as string | undefined;

    // Vérifier signature
    let isValid = false;
    if (signature && timestamp) {
      isValid = verifyHmacSignature(rawBody, WEBHOOK_SECRET, signature, timestamp);
    } else if (secretKey) {
      isValid = verifyStaticKey(secretKey, WEBHOOK_SECRET);
    }
    if (!isValid) {
      console.error("Webhook signature invalid");
      res.status(200).json({ received: true }); // 200 quand même
      return;
    }

    const payload = JSON.parse(rawBody);
    const { id, status, paymentReference, amount, currency } = payload;

    // Logger, vérifier anti-fraude, traiter idempotent...
    // ... votre logique métier ici ...

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).json({ received: true }); // TOUJOURS 200
  }
});
```

---

## 7. Créer un retrait (Payout)

Les payouts permettent d'envoyer de l'argent vers un compte mobile money. En mars 2026, seuls **Wave SN** et **Orange Money SN** supportent les payouts (`transferEnabled: true`).

### Endpoint

```
POST {BICTORYS_API_URL}/pay/v1/payouts?payment_type={type}
```

### Headers

| Header | Valeur |
|---|---|
| `X-API-Key` | `BICTORYS_PRIVATE_KEY` (clé **privée** — obligatoire) |
| `Content-Type` | `application/json` |
| `accept` | `application/json` |
| `idempotency-key` | UUID unique par retrait (empêche les doublons) |

**⚠️ La clé publique retourne 401 sur les payouts. Seule la clé privée fonctionne.**

### Payment types payout

| Valeur | Description |
|---|---|
| `wave_money` | Retrait vers Wave SN |
| `orange_money` | Retrait vers Orange Money SN |

### Body (JSON)

```json
{
  "amount": 10000,
  "currency": "XOF",
  "country": "SN",
  "customerObject": {
    "name": "Amadou Fall",
    "phone": "+221771234567",
    "email": "amadou@example.com",
    "country": "SN",
    "locale": "fr-FR"
  },
  "transactionType": "payment",
  "paymentReason": "Appel de fonds",
  "merchantReference": "WD-ABC123",
  "merchant": {
    "secretCode": "1234"
  }
}
```

### Paramètres du body

| Champ | Type | Requis | Description |
|---|---|---|---|
| `amount` | `integer` | ✅ | Montant en FCFA (entier) |
| `currency` | `string` | ✅ | `"XOF"` |
| `country` | `string` | ✅ | `"SN"` (seul pays payout activé en mars 2026) |
| `customerObject` | `object` | ✅ | Destinataire du payout |
| `customerObject.phone` | `string` | ✅ | Téléphone format `"+221771234567"` |
| `customerObject.name` | `string` | ✅ | Nom du destinataire |
| `transactionType` | `string` | ✅ | `"payment"` |
| `paymentReason` | `string` | ✅ | Motif du retrait |
| `merchantReference` | `string` | ✅ | Votre référence unique |
| `merchant.secretCode` | `string` | ✅ | `BICTORYS_MERCHANT_SECRET_CODE` |

### Réponse succès — `200 OK` ou `201 Created`

```json
{
  "id": "abc123-def456",
  "merchantId": "d2d2053b-...",
  "amount": -10000,
  "merchantFee": 150,
  "customerFee": 0,
  "currency": "XOF",
  "paymentReference": "...",
  "customerName": "Amadou Fall",
  "customerPhone": "221771234567",
  "customerCountry": "SN",
  "pspName": "wave_money",
  "merchantReference": "WD-ABC123",
  "status": 0,
  "createdAt": "2026-03-01T12:00:00Z"
}
```

**Notes** :
- `amount` est **négatif** (argent sortant du marchand)
- `status: 0` = succès
- `merchantFee` = frais Bictorys sur le transfert

### Erreurs courantes payout

| HTTP | Body contient | Signification |
|---|---|---|
| `401` | — | Mauvaise clé (utiliser PRIVATE_KEY, pas API_KEY) |
| `400` | `"balance"` | Solde Bictorys insuffisant |
| `400` | `"plafon"` ou `"limit"` | Plafond mobile money du destinataire atteint |
| `400` | `"phone"` | Numéro de téléphone invalide |
| `400` | `"secretCode"` | Code marchand incorrect |
| `500+` | — | Erreur serveur Bictorys |

### Recommandations payout

- Toujours envoyer un `idempotency-key` (UUID) pour éviter les double-envois
- Mettre un **timeout de 30 secondes** sur la requête (les payouts peuvent être lents)
- Gérer les réponses non-JSON (le WAF peut retourner du HTML)
- Logger la réponse brute pour le debug

---

## 8. Moyens de paiement supportés

### Endpoint pour lister vos opérateurs activés

```
GET {BICTORYS_API_URL}/onboarding/v1/payment-methods/me
Header: X-API-Key: BICTORYS_PRIVATE_KEY
```

### Catalogue complet Bictorys (mars 2026)

| Nom interne | payment_type | Pays | Pay-in | Pay-out | Téléphone requis |
|---|---|---|---|---|---|
| `wave_money` | `wave_money` | **SN** | ✅ | ✅ | non |
| `wave_money_civ` | `wave_money` | **CI, BF** | ✅ | ❌ | oui |
| `orange_money_sn` | `orange_money` | **SN** | ✅ | ✅ | non |
| `orange_money_civ` | `orange_money` | **CI** | ✅ | ❌ | oui |
| `orange_money_ml` | `orange_money` | **ML** | ✅ | ❌ | oui |
| `orange_money_bk` | `orange_money` | **BK** | ✅ | ❌ | oui |
| `mtn_money` | `mtn_money` | **CI, BJ** | ✅ | ❌ | oui |
| `moov` | `moov` | **TG, CI, BF, BJ** | ✅ | ❌ | oui |
| `togocell` | `togocell` | **TG** | ✅ | ❌ | oui |
| `mobicash` | `mobicash` | **BF, ML** | ✅ | ❌ | oui |
| `maxit` | `maxit` | **SN** | ✅ | ❌ | non |
| `card` | `card` | **SN, CI** | ✅ | ❌ | non |

### Résultats des tests réels (mars 2026, environnement test)

| Opérateur + Pays | Résultat | Remarque |
|---|---|---|
| Wave SN | ✅ | — |
| Wave CI | ✅ | — |
| Orange Money SN | ✅ | — |
| Orange Money CI (OTP) | ✅ | Requiert `otp` dans le body |
| MTN Money CI | ✅ | — |
| Card SN | ✅ | `&payment_category=card` |
| Card CI | ✅ | `&payment_category=card` |
| Card BF | ✅ | `&payment_category=card` |
| Wave BF | ❌ | `"wrong payment type"` |
| Orange Money BK (Burkina) | ❌ | `"wrong payment type"` |
| Orange Money ML | ❌ | `"country not available"` |
| MTN Money BJ | ❌ | `"country not available"` |
| Moov CI | ❌ | `"Unexpected value 'moov'"` |
| Moov TG/BF/BJ | ❌ | `"country not available"` |
| Togocell TG | ❌ | `"country not available"` |
| Mobicash BF/ML | ❌ | `"wrong payment type"` / `"country not available"` |

**Conclusion** : en mars 2026, les opérateurs fonctionnels en sandbox sont Wave (SN, CI), Orange Money (SN, CI), MTN Money (CI), et Carte (SN, CI, BF). Les autres pays/opérateurs retournent des erreurs — à vérifier sur le compte production.

**Note** : la carte fonctionne pour **tous les pays** car Bictorys normalise le pays en interne. Vous pouvez toujours envoyer `country: "SN"` pour les paiements carte quel que soit le pays du client.

---

## 9. Normalisation pays

### Codes pays Bictorys

| Code Bictorys | Pays | Indicatif téléphonique |
|---|---|---|
| `SN` | Sénégal | +221 |
| `CI` | Côte d'Ivoire | +225 |
| `BK` | Burkina Faso | +226 |
| `ML` | Mali | +223 |
| `TG` | Togo | +228 |
| `BJ` | Bénin | +229 |

**⚠️ Le Burkina Faso utilise `"BK"` chez Bictorys, pas `"BF"` (code ISO standard)**. C'est une convention Bictorys spécifique.

### Pays supportés par opérateur

```
wave_money:    ["SN", "CI", "BF"]     ← BF fonctionne pas encore en test (mars 2026)
orange_money:  ["SN", "CI", "BK", "ML"]  ← BK = Burkina chez Bictorys
mtn_money:     ["CI", "BJ"]
moov:          ["TG", "CI", "BF", "BJ"]
togocell:      ["TG"]
mobicash:      ["BF", "ML"]
maxit:         ["SN"]
card:          ["SN", "CI"]           ← mais fonctionne pour tous les pays en pratique
```

### Normalisation recommandée

Avant d'envoyer le pays à Bictorys, appliquez ces règles :

```
1. Si payment_type === "card" → toujours envoyer "SN"
   (Bictorys normalise en interne, pas besoin du vrai pays)

2. Si payment_type === "orange_money" ET pays === "BF" → envoyer "BK"
   (Convention Bictorys pour Burkina Faso sur Orange Money)

3. Sinon → envoyer le code pays tel quel
```

### Détection du pays par indicatif téléphonique

Pour détecter automatiquement le pays du client à partir de son numéro :

```
+221... → SN (Sénégal)
+225... → CI (Côte d'Ivoire)
+226... → BF (Burkina Faso)
+223... → ML (Mali)
+228... → TG (Togo)
+229... → BJ (Bénin)
```

---

## 10. Erreurs courantes & Debugging

### ❌ WAF 403 — Réponse HTML au lieu de JSON

**Cause** : Rate limit AWS WAF. La réponse est du HTML `<html>... Forbidden ...`.
**Solution** : Retry avec backoff exponentiel (voir §3). En test, espacer les requêtes de 5 secondes.

### ❌ 403 JSON — `"Access right not sufficient"`

**Cause** : Mauvaise clé. Clé publique utilisée pour un payout, ou clé privée d'un autre compte.
**Solution** : Vérifier que vous utilisez la bonne clé pour l'opération (voir §2).

### ❌ 400 — `"wrong payment type"`

**Cause** : L'opérateur n'est pas activé pour ce pays sur votre compte Bictorys.
**Solution** : Vérifier via `GET /onboarding/v1/payment-methods/me`.

### ❌ 400 — `"country not available"`

**Cause** : Le pays n'est pas activé pour cet opérateur sur votre compte.
**Solution** : Contacter Bictorys pour activer le pays.

### ❌ `ErrorRedirectUrl` ne fonctionne pas

**Cause** : Mauvaise casse. Bictorys attend `ErrorRedirectUrl` (E majuscule).
**Solution** : S'assurer que le E est en majuscule dans le body.

### ❌ Webhook non reçu

**Causes possibles** :
- Webhook pas configuré (ou configuré en test mais pas en prod)
- URL non accessible depuis Internet
- Secret Key ne correspond pas
- Le mode (test/prod) ne correspond pas aux clés API utilisées

**Solution** : Vérifier dans le dashboard Bictorys → Developers → Webhooks que l'URL et le secret sont corrects pour le bon environnement.

### ❌ 500 sur `GET /charges/{id}` en test

**Cause** : Comportement connu de la sandbox Bictorys.
**Solution** : Se baser sur les webhooks en environnement test. Le status check fonctionne en production.

### ❌ OTP invalide / expiré (Orange Money CI)

**Cause** : Le code OTP expire rapidement.
**Solution** : L'utilisateur doit recomposer `#144*82#` pour générer un nouveau code.

### ❌ Réponse 200 vide (pas de JSON)

**Cause** : WAF en mode test qui bloque silencieusement les requêtes trop rapides.
**Solution** : Ajouter un délai de 5 secondes entre les requêtes en test.

---

## 11. Checklist de mise en production

### Dashboard Bictorys

- [ ] Mode **Production** activé dans le dashboard
- [ ] Clés API de production obtenues (pas de préfixe `test_`)
- [ ] Webhook configuré en mode production avec la bonne URL et le bon secret
- [ ] Micro-paiement test validé (500 FCFA) en production

### Variables d'environnement

- [ ] `BICTORYS_API_URL` → `https://api.bictorys.com` (pas `api.test.bictorys.com`)
- [ ] `BICTORYS_API_KEY` → clé publique production (préfixe `public-`, pas `test_public-`)
- [ ] `BICTORYS_PRIVATE_KEY` → clé privée production (préfixe `secret-`, pas `test_secret-`)
- [ ] `BICTORYS_WEBHOOK_SECRET` → secret webhook production
- [ ] `BICTORYS_MERCHANT_SECRET_CODE` → code marchand (si payouts utilisés)

### Sécurité

- [ ] Webhook : validation signature (HMAC-SHA256 ou static key avec `timingSafeEqual`)
- [ ] Anti-fraude webhook : vérification montant + devise
- [ ] Idempotency webhook : transaction sérialisable + table de logs
- [ ] Retry WAF 403 : backoff exponentiel implémenté
- [ ] Payout : `idempotency-key` envoyé + timeout 30s
- [ ] `express.raw()` AVANT `express.json()` pour les webhooks
- [ ] Toujours retourner 200 sur le webhook (même en cas d'erreur)
- [ ] Clé privée jamais exposée côté client
- [ ] Polling fallback implémenté si webhook n'arrive pas

---

## 12. Exemples de code complets

### Provider TypeScript complet (Node.js / Express)

```typescript
// bictorys-provider.ts
import crypto from "crypto";

const API_URL = process.env.BICTORYS_API_URL!;
const API_KEY = process.env.BICTORYS_API_KEY!;
const PRIVATE_KEY = process.env.BICTORYS_PRIVATE_KEY!;
const WEBHOOK_SECRET = process.env.BICTORYS_WEBHOOK_SECRET!;
const MERCHANT_SECRET_CODE = process.env.BICTORYS_MERCHANT_SECRET_CODE!;

// ─── Créer un paiement ───

interface CreateChargeParams {
  amount: number;
  currency: "XOF";
  country: string;
  paymentType: string;
  paymentReference: string;
  successRedirectUrl: string;
  errorRedirectUrl: string;
  customer?: { name: string; phone: string; email: string; country: string };
  otp?: string;
}

interface ChargeResult {
  transactionId: string;
  redirectUrl: string;
  link?: string;
  qrCode?: string;
  message?: string;
}

async function createCharge(params: CreateChargeParams): Promise<ChargeResult> {
  const queryParams = params.paymentType === "card"
    ? `payment_type=card&payment_category=card`
    : `payment_type=${params.paymentType}`;

  const url = `${API_URL}/pay/v1/charges?${queryParams}`;
  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: params.currency,
    country: params.country,
    paymentReference: params.paymentReference,
    successRedirectUrl: params.successRedirectUrl,
    ErrorRedirectUrl: params.errorRedirectUrl, // ⚠️ E majuscule
    customerObject: params.customer,
  };
  if (params.otp) body.otp = params.otp;

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
    const response = await fetch(url, {
      method: "POST",
      headers: { "X-Api-Key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return await response.json();

    const errorText = await response.text();
    if (response.status === 403 && errorText.includes("Forbidden") && attempt < MAX_RETRIES) {
      continue; // WAF → retry
    }
    throw new Error(`Bictorys charge error (${response.status}): ${errorText}`);
  }
  throw new Error("Bictorys charge: max retries reached");
}

// ─── Vérifier le statut ───

async function checkChargeStatus(transactionId: string): Promise<string> {
  const response = await fetch(`${API_URL}/pay/v1/charges/${transactionId}`, {
    headers: { "X-Api-Key": API_KEY },
  });
  if (!response.ok) throw new Error(`Status check error: ${response.status}`);
  const data = await response.json();
  return data.status; // "succeeded", "pending", "failed", etc.
}

// ─── Créer un payout ───

interface PayoutParams {
  amount: number;
  paymentType: "wave_money" | "orange_money";
  phone: string;
  name: string;
  email: string;
  merchantReference: string;
}

async function createPayout(params: PayoutParams, idempotencyKey: string) {
  const url = `${API_URL}/pay/v1/payouts?payment_type=${params.paymentType}`;
  const body = {
    amount: params.amount,
    currency: "XOF",
    country: "SN",
    customerObject: {
      name: params.name,
      phone: params.phone,
      email: params.email,
      country: "SN",
      locale: "fr-FR",
    },
    transactionType: "payment",
    paymentReason: "Appel de fonds",
    merchantReference: params.merchantReference,
    merchant: { secretCode: MERCHANT_SECRET_CODE },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": PRIVATE_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) return { success: true, data: await response.json() };
    const errorText = await response.text();
    return { success: false, error: errorText, httpStatus: response.status };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// ─── Vérifier un webhook ───

function verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean {
  const signature = headers["x-webhook-signature"];
  const timestamp = headers["x-webhook-timestamp"];
  const secretKey = headers["x-secret-key"];

  if (signature && timestamp) {
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;
    const expected = crypto.createHmac("sha256", WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch { return false; }
  }

  if (secretKey) {
    try {
      return crypto.timingSafeEqual(Buffer.from(secretKey), Buffer.from(WEBHOOK_SECRET));
    } catch { return false; }
  }

  return false;
}
```

### Normalisation pays

```typescript
function normalizeBictorysCountry(paymentType: string, country: string): string {
  if (paymentType === "card") return "SN";
  if (paymentType === "orange_money" && country === "BF") return "BK";
  return country;
}

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

*Dernière mise à jour : mars 2026*
*Basé sur des tests réels avec Bictorys API v1 — environnements test et production*
