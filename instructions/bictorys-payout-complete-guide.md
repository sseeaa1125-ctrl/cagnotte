# Intégration Bictorys — Système de Payout Complet

## Contexte

Ce document couvre l'intégration complète du système de **payout** (déboursement) avec Bictorys. Le payout permet d'envoyer de l'argent depuis le wallet marchand Bictorys vers le mobile money d'un destinataire.

**Opérateurs supportés :** Orange Money, Wave.
**Devise :** XOF (Franc CFA CEDEAO).
**Pays :** SN (Sénégal).
**Stack :** Next.js 15 (App Router), TypeScript, Tailwind CSS, Drizzle ORM.

---

## 1. Configuration

### Variables d'environnement

```env
# Bictorys
BICTORYS_API_URL=https://api.test.bictorys.com              # Test
# BICTORYS_API_URL=https://api.bictorys.com                  # Production

BICTORYS_API_KEY=test_private-xxxxxxxx-xxxx-xxxx-xxxx        # Clé privée unique
BICTORYS_MERCHANT_SECRET_CODE=1234                           # Secret code marchand (body payout)
```

### Clé API — IMPORTANT

**UNE SEULE CLÉ** pour tout : checkout ET payout. C'est la **clé privée** (secrète).

- Dashboard Bictorys → Settings → API Keys → Générer une clé secrète.
- **Activer la permission "payout"** sur cette clé. Sans cette permission, les requêtes payout retournent 403.
- La clé publique sert UNIQUEMENT pour l'encaissement (checkout). Pour le payout, c'est la clé privée obligatoirement.
- Cette même clé privée est utilisée dans le header `X-API-Key` pour TOUTES les requêtes.

### Secret Code Marchand

- Se configure dans Dashboard → Entreprise → Préférences.
- C'est un code à 4 chiffres passé dans le body de chaque payout (`merchant.secretCode`).
- En production, utiliser un code fort (pas `1234`).

---

## 2. Endpoint Payout

### URL

```
POST {BICTORYS_API_URL}/pay/v1/payouts?payment_type={operator}
```

### Query Param

| Opérateur | `payment_type` |
|-----------|----------------|
| Orange Money | `orange_money` |
| Wave | `wave_money` |

### Headers

```
Content-Type: application/json
accept: application/json
X-API-Key: {BICTORYS_API_KEY}
idempotency-key: {UUID_UNIQUE_PAR_TRANSACTION}
```

### Body

```json
{
  "amount": 500,
  "currency": "XOF",
  "country": "SN",
  "customerObject": {
    "name": "Amadou Fall",
    "phone": "221772543344",
    "email": "amadou@email.com",
    "country": "SN",
    "locale": "fr-FR"
  },
  "transactionType": "payment",
  "paymentReason": "Appel de fonds",
  "merchantReference": "payout_abc123",
  "merchant": {
    "secretCode": "1234"
  }
}
```

### Champs du body

| Champ | Requis | Type | Description |
|-------|--------|------|-------------|
| `amount` | **Oui** | number | Montant en FCFA (entier) |
| `currency` | **Oui** | string | `"XOF"` |
| `country` | **Oui** | string | `"SN"` ou `"CI"` |
| `customerObject.name` | **Oui** | string | Nom complet du destinataire |
| `customerObject.phone` | **Oui** | string | Numéro mobile money, format international, uniquement dispo pour Senegal et CIV pour le moment donc selon le pays par exemple senegal _ `221XXXXXXXXX` | 
| `customerObject.email` | Non | string | Email du destinataire (optionnel) |
| `customerObject.country` | **Oui** | string | `"SN"` ou `"CI"` |
| `customerObject.locale` | Non | string | `"fr-FR"` |
| `transactionType` | **Oui** | string | `"payment"` |
| `paymentReason` | Non | string | `"Appel de fonds"` |
| `merchantReference` | **Oui** | string | Référence unique côté serveur |
| `merchant.secretCode` | **Oui** | string | Code secret du marchand |

---

## 3. Réponse Payout (201 — Succès)

Quand la requête réussit, Bictorys retourne **200 ou 201** avec ce JSON :

```json
{
  "id": "f412a017-648f-425d-b7db-7aa54e867f8c",
  "merchantId": "d5687952-7527-4c7c-8309-5d7b7eeae70f",
  "partnerId": "f78d92b4-f279-414d-8c06-08ea00aec4dc",
  "amount": -500,
  "merchantFee": 5,
  "customerFee": 0,
  "partnerCommissionAmount": null,
  "transactionFeeTax": null,
  "currency": "XOF",
  "paymentReference": "33e1c83b-7cb0-437b-bc50-a7a58e...",
  "customerId": null,
  "customerName": "amadou fall",
  "customerEmail": "amadoufinances@gmail.com",
  "customerPhone": "+221772543344",
  "customerCountry": "Sénégal",
  "customerLocale": "en-US",
  "transactionType": "transfer",
  "pspName": "wave_money",
  "paymentCategory": 0,
  "pspTransactionId": "simu-encxHjJuuKUdo",
  "merchantReference": null,
  "paymentMeans": "+221772543344",
  "paymentChannel": null,
  "orderType": null,
  "orderId": null,
  "deviceId": null,
  "originIp": null,
  "status": 4,
  "createdAt": "2026-03-01T07:45:34.627+00:00"
}
```

### Champs importants de la réponse

| Champ | Description |
|-------|-------------|
| `id` | UUID unique de la transaction Bictorys — à sauvegarder en base |
| `amount` | **Négatif** (-500) car c'est de l'argent qui sort du wallet marchand |
| `merchantFee` | Frais facturés au marchand (ici 5 FCFA) |
| `customerFee` | Frais facturés au destinataire (ici 0) |
| `customerPhone` | Numéro du destinataire, format `+221...` |
| `pspName` | Opérateur utilisé (`wave_money`, `orange_money`) |
| `pspTransactionId` | ID de transaction côté opérateur (préfixé `simu-` en test) |
| `status` | Code statut (4 = succès) |
| `createdAt` | Date/heure de la transaction ISO 8601 |

### Codes de statut dans la réponse

| `status` | Signification |
|----------|---------------|
| 4 | Succès — l'argent a été envoyé |
| Autre | Échec — voir les erreurs ci-dessous |

### Codes HTTP

| HTTP | Signification |
|------|---------------|
| **200 / 201** | **Payout réussi.** L'argent est envoyé au destinataire. Pas de redirect. |
| **400** | Bad Request — champ manquant, montant invalide, numéro incorrect |
| **401** | Non authentifié — clé API manquante ou invalide |
| **403** | Permission refusée — la clé n'a pas la permission "payout" |
| **500** | Erreur serveur Bictorys |

---

## 4. Gestion des Erreurs

Bictorys remonte les erreurs soit après validation des inputs, soit depuis l'opérateur mobile money.

### Erreurs courantes et messages à afficher

| Erreur | Cause | Message à afficher à l'utilisateur |
|--------|-------|-------------------------------------|
| Solde insuffisant | Le wallet Bictorys du marchand n'a pas assez de fonds | "Le retrait est temporairement indisponible. Réessaie plus tard." |
| Compte plafonné | Le destinataire a atteint le plafond de réception de son mobile money | "Le compte mobile money est plafonné. Essaie un montant inférieur ou utilise un autre numéro." |
| Numéro invalide | Le numéro n'est pas un mobile money valide | "Ce numéro de téléphone est invalide. Vérifie et réessaie." |
| Opérateur indisponible | L'opérateur est temporairement en panne | "L'opérateur est temporairement indisponible. Réessaie dans quelques minutes." |
| Montant trop faible | Montant en dessous du minimum | "Le montant minimum de retrait est de 500 FCFA." |
| Montant trop élevé | Montant au-dessus du maximum | "Le montant maximum par retrait est de X FCFA." |
| Idempotency-key dupliquée | La même clé a déjà été utilisée | Retry transparent côté serveur avec une nouvelle clé |

### Logique de gestion côté serveur

```typescript
// Analyser la réponse Bictorys et retourner un message user-friendly
function parseBictorysError(httpStatus: number, responseBody: any): string {
  if (httpStatus === 401) {
    console.error('CRITIQUE: Clé API Bictorys invalide');
    return "Le retrait est temporairement indisponible. Réessaie plus tard.";
  }

  if (httpStatus === 403) {
    console.error('CRITIQUE: Permission payout manquante sur la clé API');
    return "Le retrait est temporairement indisponible. Réessaie plus tard.";
  }

  if (httpStatus === 400) {
    const msg = responseBody?.message || responseBody?.error || '';
    const msgLower = msg.toLowerCase();

    if (msgLower.includes('balance') || msgLower.includes('insufficient')) {
      return "Le retrait est temporairement indisponible. Réessaie plus tard.";
    }
    if (msgLower.includes('plafon') || msgLower.includes('limit') || msgLower.includes('cap')) {
      return "Ton compte mobile money est plafonné. Essaie un montant inférieur ou un autre numéro.";
    }
    if (msgLower.includes('phone') || msgLower.includes('number') || msgLower.includes('numéro')) {
      return "Numéro de téléphone invalide. Vérifie et réessaie.";
    }
    if (msgLower.includes('operator') || msgLower.includes('opérateur')) {
      return "L'opérateur est temporairement indisponible. Réessaie dans quelques minutes.";
    }

    return "Une erreur est survenue. Vérifie tes informations et réessaie.";
  }

  if (httpStatus >= 500) {
    return "Le service de paiement est temporairement indisponible. Réessaie dans quelques minutes.";
  }

  return "Une erreur inattendue est survenue. Réessaie plus tard.";
}
```

---

## 5. Idempotency Key — CRITIQUE

L'`idempotency-key` est le mécanisme le plus important pour éviter les **double débits**.

### Règles

1. **Générer un UUID unique pour CHAQUE transaction** — ne JAMAIS réutiliser la même clé pour deux transactions différentes.
2. **En cas de retry (timeout, erreur réseau)** — réutiliser la MÊME idempotency-key. Bictorys reconnaîtra que c'est un retry et ne débitera pas deux fois.
3. **Ne JAMAIS utiliser une valeur fixe** en production. Toujours `crypto.randomUUID()`.
4. **Sauvegarder l'idempotency-key** en base à côté de la transaction pour pouvoir retry correctement.

### Implémentation

```typescript
import { randomUUID } from 'crypto';

// Quand on crée un nouveau payout → nouvelle clé
const idempotencyKey = randomUUID();
// Sauvegarder en base : payouts.idempotency_key = idempotencyKey

// Quand on retry un payout échoué (timeout réseau) → MÊME clé
const existingPayout = await db.query.payouts.findFirst({
  where: eq(payouts.id, payoutId)
});
const retryKey = existingPayout.idempotencyKey; // Réutiliser l'ancienne
```

---

## 6. Sécurité

### 6.1 — Protection de la clé API

```typescript
// ❌ JAMAIS côté client (React component, page browser)
const response = await fetch('/api/bictorys/payout', {
  headers: { 'X-API-Key': process.env.BICTORYS_API_KEY } // JAMAIS ça
});

// ✅ TOUJOURS côté serveur (API route, server action)
// src/app/api/payout/route.ts
export async function POST(request: NextRequest) {
  // La clé API est utilisée ici, côté serveur uniquement
  const response = await fetch(`${BICTORYS_API_URL}/pay/v1/payouts`, {
    headers: { 'X-API-Key': process.env.BICTORYS_API_KEY! }
  });
}
```

- La clé API ne doit JAMAIS être exposée côté client.
- Toujours appeler Bictorys depuis une API route Next.js (serveur).
- Le frontend appelle `/api/payout`, qui lui-même appelle Bictorys.

### 6.2 — Validation côté serveur (avant d'appeler Bictorys)

Chaque demande de payout doit être validée AVANT d'appeler Bictorys. Ne jamais faire confiance au frontend.

```typescript
// Checklist de validation serveur avant payout
async function validatePayoutRequest(sellerId: string, amount: number, phone: string, operator: string) {
  const errors: string[] = [];

  // 1. Vérifier que l'utilisateur est authentifié
  // → Vérifier le token de session / JWT

  // 2. Vérifier que l'utilisateur a le droit de faire un payout
  // → Vérifier que c'est bien un vendeur actif

  // 3. Vérifier le montant
  if (!amount || typeof amount !== 'number') {
    errors.push('Montant invalide');
  }
  if (amount < 500) {
    errors.push('Le montant minimum est de 500 FCFA');
  }
  if (amount > 1000000) {
    errors.push('Le montant maximum est de 1 000 000 FCFA');
  }

  // 4. Vérifier que le solde du vendeur est suffisant
  const seller = await getSellerBalance(sellerId);
  if (seller.balance < amount) {
    errors.push('Solde insuffisant');
  }

  // 5. Vérifier le numéro de téléphone
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    errors.push('Numéro de téléphone invalide');
  }

  // 6. Vérifier l'opérateur
  if (!['Orange Money', 'Wave'].includes(operator)) {
    errors.push('Opérateur non supporté');
  }

  // 7. Vérifier le rate limit (pas plus de X payouts par jour par vendeur)
  const todayPayouts = await countTodayPayouts(sellerId);
  if (todayPayouts >= 10) {
    errors.push('Tu as atteint la limite de retraits pour aujourd\'hui');
  }

  // 8. Vérifier qu'il n'y a pas de payout en cours pour ce vendeur
  const pendingPayout = await getPendingPayout(sellerId);
  if (pendingPayout) {
    errors.push('Un retrait est déjà en cours. Attends qu\'il soit terminé.');
  }

  return { valid: errors.length === 0, errors };
}
```

### 6.3 — Anti-fraude

```typescript
// Mécanismes anti-fraude à implémenter

// 1. Rate limit par vendeur
const PAYOUT_LIMITS = {
  maxPerDay: 10,            // Max 10 payouts par jour
  maxAmountPerDay: 500000,  // Max 500 000 FCFA par jour
  maxPerTransaction: 200000, // Max 200 000 FCFA par transaction
  minPerTransaction: 500,    // Min 500 FCFA par transaction
  cooldownMinutes: 5,        // 5 minutes entre deux payouts
};

// 2. Vérifier que le numéro appartient au vendeur
// → Le vendeur doit enregistrer son numéro mobile money dans son profil
// → Le payout ne peut aller QUE vers ce numéro vérifié
// → Changement de numéro = vérification SMS + délai de 24h avant payout

// 3. Alerte sur les patterns suspects
// → Plusieurs payouts consécutifs vers des numéros différents
// → Payout juste après un changement de mot de passe
// → Payout depuis une nouvelle IP / appareil

// 4. Double confirmation pour les gros montants
// → Au-dessus de 50 000 FCFA : demander le code PIN / mot de passe
// → Au-dessus de 100 000 FCFA : envoyer un code SMS de confirmation

// 5. Logger TOUT
// → Chaque demande de payout, chaque réponse, chaque erreur
// → IP de l'utilisateur, user-agent, timestamp
```

### 6.4 — Chiffrement et stockage

```typescript
// Ne JAMAIS stocker en clair :
// - La clé API Bictorys → .env uniquement, jamais en base
// - Le merchant secret code → .env uniquement
// - Les numéros de téléphone complets → masquer en base (221XXXX3344)

// Affichage masqué du numéro
function maskPhone(phone: string): string {
  if (phone.length < 8) return '***';
  return phone.slice(0, 6) + '****' + phone.slice(-2);
  // +221772543344 → +22177****44
}
```

---

## 7. Service Bictorys Payout

Fichier : `src/lib/bictorys.ts`

```typescript
import { randomUUID } from 'crypto';

const BICTORYS_API_URL = process.env.BICTORYS_API_URL!;
const BICTORYS_API_KEY = process.env.BICTORYS_API_KEY!;
const MERCHANT_SECRET_CODE = process.env.BICTORYS_MERCHANT_SECRET_CODE!;

const PAYOUT_PAYMENT_TYPES: Record<string, string> = {
  'Orange Money': 'orange_money',
  'Wave': 'wave_money',
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PayoutParams {
  amount: number;
  phone: string;              // Format +221XXXXXXXXX
  operator: string;           // "Orange Money" ou "Wave"
  recipientName: string;
  recipientEmail?: string;    // Optionnel
  merchantReference: string;
  reason?: string;
}

interface BictorysPayoutResponse {
  id: string;
  merchantId: string;
  partnerId: string;
  amount: number;             // Négatif (argent sortant)
  merchantFee: number;
  customerFee: number;
  currency: string;
  paymentReference: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  customerCountry: string;
  transactionType: string;
  pspName: string;
  pspTransactionId: string;
  merchantReference: string | null;
  paymentMeans: string;
  status: number;
  createdAt: string;
}

interface PayoutResult {
  success: boolean;
  data?: BictorysPayoutResponse;
  idempotencyKey: string;
  error?: string;
  httpStatus?: number;
}

// ─────────────────────────────────────────────
// Payout
// ─────────────────────────────────────────────

export async function initiatePayout(
  params: PayoutParams,
  idempotencyKey?: string   // Passer une clé existante pour les retries
): Promise<PayoutResult> {
  const paymentType = PAYOUT_PAYMENT_TYPES[params.operator];
  if (!paymentType) {
    return { success: false, error: 'Opérateur non supporté', idempotencyKey: '' };
  }

  // Générer ou réutiliser l'idempotency key
  const idemKey = idempotencyKey || randomUUID();

  const body = {
    amount: params.amount,
    currency: 'XOF',
    country: 'SN',
    customerObject: {
      name: params.recipientName,
      phone: params.phone,  // Format +221XXXXXXXXX
      ...(params.recipientEmail && { email: params.recipientEmail }),
      country: 'SN',
      locale: 'fr-FR',
    },
    transactionType: 'payment',
    paymentReason: params.reason || 'Appel de fonds',
    merchantReference: params.merchantReference,
    merchant: {
      secretCode: MERCHANT_SECRET_CODE,
    },
  };

  try {
    const response = await fetch(
      `${BICTORYS_API_URL}/pay/v1/payouts?payment_type=${paymentType}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'X-API-Key': BICTORYS_API_KEY,
          'idempotency-key': idemKey,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    // 200 ou 201 = succès, l'argent est envoyé
    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        data,
        idempotencyKey: idemKey,
      };
    }

    // Erreur
    return {
      success: false,
      error: data?.message || data?.error || `HTTP ${response.status}`,
      httpStatus: response.status,
      idempotencyKey: idemKey,
    };

  } catch (error: any) {
    // Erreur réseau / timeout
    return {
      success: false,
      error: error.message || 'Erreur réseau',
      idempotencyKey: idemKey,
    };
  }
}
```

---

## 8. Utilitaire Téléphone

Fichier : `src/lib/phone.ts`

```typescript
/**
 * Normaliser un numéro sénégalais au format international +221XXXXXXXXX
 * Accepte : 770000000, 221770000000, +221770000000, 00221770000000
 */
export function normalizePhone(phone: string): string | null {
  let clean = phone.replace(/[\s\-\.\(\)]/g, '');

  // Retirer le 00 devant
  if (clean.startsWith('00')) {
    clean = '+' + clean.slice(2);
  }

  // Ajouter le + si manquant mais commence par 221
  if (clean.startsWith('221') && clean.length === 12) {
    clean = '+' + clean;
  }

  // Ajouter +221 si numéro local (7XXXXXXXX)
  if (/^7[0-9]{8}$/.test(clean)) {
    clean = '+221' + clean;
  }

  // Validation finale : +221 suivi de 9 chiffres
  if (/^\+221[0-9]{9}$/.test(clean)) {
    return clean;
  }

  return null; // Numéro invalide
}

/**
 * Masquer un numéro pour l'affichage
 * +221772543344 → +221 77 *** ** 44
 */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return '***';
  return phone.slice(0, 7) + '****' + phone.slice(-2);
}

/**
 * Formater un numéro pour l'affichage lisible
 * +221772543344 → +221 77 254 33 44
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/[^0-9+]/g, '');
  if (clean.startsWith('+221') && clean.length === 13) {
    const num = clean.slice(4); // 772543344
    return `+221 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5, 7)} ${num.slice(7)}`;
  }
  return phone;
}
```

---

## 9. API Route Payout

Fichier : `src/app/api/payout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { initiatePayout } from '@/lib/bictorys';
import { normalizePhone } from '@/lib/phone';
import { randomUUID } from 'crypto';
// import { auth } from '@/lib/auth';  // Ton système d'auth
// import { db } from '@/db';
// import { payouts, sellers } from '@/db/schema';

const PAYOUT_LIMITS = {
  minAmount: 500,
  maxAmount: 200000,
  maxPerDay: 10,
  maxAmountPerDay: 500000,
  cooldownMinutes: 5,
};

export async function POST(request: NextRequest) {
  try {
    // ──────────────────────────────────────
    // 1. Authentification
    // ──────────────────────────────────────
    // const session = await auth();
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }
    // const sellerId = session.user.id;

    // ──────────────────────────────────────
    // 2. Parser le body
    // ──────────────────────────────────────
    const body = await request.json();
    const { amount, phone, operator, recipientName, recipientEmail } = body;

    // ──────────────────────────────────────
    // 3. Validation des inputs
    // ──────────────────────────────────────
    const errors: string[] = [];

    // Montant
    if (!amount || typeof amount !== 'number' || !Number.isInteger(amount)) {
      errors.push('Le montant doit être un nombre entier en FCFA');
    } else if (amount < PAYOUT_LIMITS.minAmount) {
      errors.push(`Le montant minimum est de ${PAYOUT_LIMITS.minAmount} FCFA`);
    } else if (amount > PAYOUT_LIMITS.maxAmount) {
      errors.push(`Le montant maximum est de ${PAYOUT_LIMITS.maxAmount.toLocaleString('fr-FR')} FCFA`);
    }

    // Numéro de téléphone
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    if (!normalizedPhone) {
      errors.push('Numéro de téléphone invalide. Format : +221 7X XXX XX XX');
    }

    // Opérateur
    if (!operator || !['Orange Money', 'Wave'].includes(operator)) {
      errors.push('Choisis Orange Money ou Wave');
    }

    // Nom du destinataire
    if (!recipientName || recipientName.trim().length < 2) {
      errors.push('Le nom du destinataire est requis');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0], errors }, { status: 400 });
    }

    // ──────────────────────────────────────
    // 4. Vérifications métier
    // ──────────────────────────────────────

    // TODO: Vérifier le solde du vendeur
    // const seller = await db.query.sellers.findFirst({ where: eq(sellers.id, sellerId) });
    // if (seller.balance < amount) {
    //   return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 });
    // }

    // TODO: Vérifier que le numéro est le numéro vérifié du vendeur
    // if (normalizedPhone !== seller.verifiedPhone) {
    //   return NextResponse.json({
    //     error: 'Le retrait ne peut être fait que vers ton numéro vérifié'
    //   }, { status: 400 });
    // }

    // TODO: Rate limit — pas plus de X payouts par jour
    // const todayCount = await countTodayPayouts(sellerId);
    // if (todayCount >= PAYOUT_LIMITS.maxPerDay) {
    //   return NextResponse.json({
    //     error: 'Tu as atteint la limite de retraits pour aujourd\'hui'
    //   }, { status: 429 });
    // }

    // TODO: Cooldown — pas de payout si le dernier date de moins de X minutes
    // const lastPayout = await getLastPayout(sellerId);
    // if (lastPayout && differenceInMinutes(new Date(), lastPayout.createdAt) < PAYOUT_LIMITS.cooldownMinutes) {
    //   return NextResponse.json({
    //     error: 'Attends quelques minutes avant de refaire un retrait'
    //   }, { status: 429 });
    // }

    // ──────────────────────────────────────
    // 5. Créer le payout en base (status = pending)
    // ──────────────────────────────────────
    const merchantReference = `payout_${randomUUID().slice(0, 12)}`;
    const idempotencyKey = randomUUID();

    // TODO: Insérer en base
    // const [newPayout] = await db.insert(payouts).values({
    //   sellerId,
    //   amount,
    //   currency: 'XOF',
    //   operator,
    //   recipientPhone: normalizedPhone,
    //   recipientName: recipientName.trim(),
    //   recipientEmail: recipientEmail || null,
    //   reference: merchantReference,
    //   idempotencyKey,
    //   status: 'pending',
    // }).returning();

    // TODO: Déduire le montant du solde du vendeur immédiatement
    //       (si le payout échoue, on re-crédite)
    // await db.update(sellers)
    //   .set({ balance: sql`balance - ${amount}` })
    //   .where(eq(sellers.id, sellerId));

    // ──────────────────────────────────────
    // 6. Appeler Bictorys
    // ──────────────────────────────────────
    const result = await initiatePayout(
      {
        amount,
        phone: normalizedPhone!,
        operator,
        recipientName: recipientName.trim(),
        recipientEmail,
        merchantReference,
        reason: 'Appel de fonds',
      },
      idempotencyKey
    );

    // ──────────────────────────────────────
    // 7. Gérer la réponse
    // ──────────────────────────────────────
    if (result.success) {
      // TODO: Mettre à jour le payout en base
      // await db.update(payouts)
      //   .set({
      //     status: 'completed',
      //     bictorysTransactionId: result.data?.id,
      //     merchantFee: result.data?.merchantFee,
      //     completedAt: new Date(),
      //   })
      //   .where(eq(payouts.reference, merchantReference));

      return NextResponse.json({
        success: true,
        message: 'Retrait effectué ! Tu vas recevoir l\'argent sur ton mobile money.',
        reference: merchantReference,
        transactionId: result.data?.id,
        amount,
        fee: result.data?.merchantFee || 0,
      });
    }

    // ÉCHEC — re-créditer le vendeur
    // TODO: await db.update(sellers)
    //   .set({ balance: sql`balance + ${amount}` })
    //   .where(eq(sellers.id, sellerId));

    // TODO: Mettre à jour le payout en base
    // await db.update(payouts)
    //   .set({ status: 'failed', failureReason: result.error })
    //   .where(eq(payouts.reference, merchantReference));

    // Message user-friendly selon l'erreur
    let userMessage = 'Une erreur est survenue. Réessaie plus tard.';

    if (result.httpStatus === 400) {
      const err = (result.error || '').toLowerCase();
      if (err.includes('balance') || err.includes('insufficient') || err.includes('fonds')) {
        userMessage = 'Le retrait est temporairement indisponible. Réessaie plus tard.';
      } else if (err.includes('plafon') || err.includes('limit') || err.includes('cap')) {
        userMessage = 'Ton compte mobile money est plafonné. Essaie un montant inférieur ou un autre numéro.';
      } else if (err.includes('phone') || err.includes('numéro') || err.includes('number')) {
        userMessage = 'Numéro de téléphone invalide. Vérifie et réessaie.';
      }
    }

    return NextResponse.json(
      { error: userMessage, reference: merchantReference },
      { status: result.httpStatus || 500 }
    );

  } catch (error: any) {
    console.error('Payout route error:', error);
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue. Réessaie plus tard.' },
      { status: 500 }
    );
  }
}
```

---

## 10. Frontend — Formulaire de Retrait

Fichier : `src/components/dashboard/PayoutForm.tsx`

### Wireframe

```
┌─────────────────────────────────────────┐
│  💰 Retirer tes gains                   │
│                                         │
│  Solde disponible                       │
│  ┌─────────────────────────────────┐    │
│  │        45 000 FCFA              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Montant à retirer *                    │
│  ┌─────────────────────────────────┐    │
│  │ FCFA    5 000                   │    │
│  └─────────────────────────────────┘    │
│  Min 500 · Max 200 000 FCFA            │
│                                         │
│  Montants rapides                       │
│  [1 000] [5 000] [10 000] [Tout]       │
│                                         │
│  Envoyer vers *                         │
│  ┌───────────┐ ┌───────────┐           │
│  │  Orange   │ │   Wave    │           │
│  │  Money ✓  │ │           │           │
│  └───────────┘ └───────────┘           │
│                                         │
│  Numéro mobile money *                  │
│  ┌─────────────────────────────────┐    │
│  │ +221  77 254 33 44              │    │
│  └─────────────────────────────────┘    │
│  ℹ Le retrait sera envoyé à ce numéro  │
│                                         │
│  Nom du titulaire *                     │
│  ┌─────────────────────────────────┐    │
│  │ Amadou Fall                     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📋 Récapitulatif               │    │
│  │                                 │    │
│  │ Montant         5 000 FCFA      │    │
│  │ Frais           ~5 FCFA         │    │
│  │ Tu recevras     4 995 FCFA      │    │
│  │ Sur             +221 77****44   │    │
│  │ Via             Orange Money    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Retirer 5 000 FCFA →]                │
│                                         │
│  🔒 Transfert sécurisé via Bictorys    │
└─────────────────────────────────────────┘
```

### Code React

```tsx
'use client';

import { useState } from 'react';

interface PayoutFormProps {
  sellerBalance: number;        // Solde actuel du vendeur en FCFA
  sellerPhone: string;          // Numéro vérifié du vendeur
  sellerName: string;           // Nom du vendeur
  defaultOperator?: string;     // Opérateur par défaut
}

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000];
const MIN_AMOUNT = 500;
const MAX_AMOUNT = 200000;
const ESTIMATED_FEE_PERCENT = 0.01; // ~1% de frais (à ajuster)

export default function PayoutForm({
  sellerBalance,
  sellerPhone,
  sellerName,
  defaultOperator = 'Orange Money',
}: PayoutFormProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [operator, setOperator] = useState(defaultOperator);
  const [phone, setPhone] = useState(sellerPhone);
  const [name, setName] = useState(sellerName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const numericAmount = typeof amount === 'number' ? amount : 0;
  const estimatedFee = Math.ceil(numericAmount * ESTIMATED_FEE_PERCENT);
  const netAmount = numericAmount - estimatedFee;

  const canSubmit =
    numericAmount >= MIN_AMOUNT &&
    numericAmount <= MAX_AMOUNT &&
    numericAmount <= sellerBalance &&
    phone.length >= 9 &&
    name.trim().length >= 2 &&
    !loading;

  async function handleSubmit() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numericAmount,
          phone,
          operator,
          recipientName: name.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message || 'Retrait effectué !');
        setAmount('');
      } else {
        setError(data.error || 'Une erreur est survenue');
      }
    } catch (err) {
      setError('Erreur réseau. Vérifie ta connexion et réessaie.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">💰 Retirer tes gains</h2>

        {/* Solde */}
        <div className="bg-teal-50 rounded-xl p-4 mb-5">
          <p className="text-xs text-teal-600 font-medium">Solde disponible</p>
          <p className="text-2xl font-bold text-teal-700">
            {sellerBalance.toLocaleString('fr-FR')} FCFA
          </p>
        </div>

        {/* Montant */}
        <label className="text-xs font-semibold text-gray-500 block mb-1">
          Montant à retirer *
        </label>
        <div className="relative mb-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
            FCFA
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              setAmount(val === '' ? '' : parseInt(val, 10));
              setError(null);
            }}
            placeholder="0"
            className="w-full pl-14 pr-4 py-3 rounded-xl border border-gray-200 text-lg font-semibold
                       focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Min {MIN_AMOUNT.toLocaleString('fr-FR')} · Max {MAX_AMOUNT.toLocaleString('fr-FR')} FCFA
        </p>

        {/* Montants rapides */}
        <div className="flex gap-2 flex-wrap mb-5">
          {QUICK_AMOUNTS.filter((a) => a <= sellerBalance).map((a) => (
            <button
              key={a}
              onClick={() => { setAmount(a); setError(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition
                ${amount === a
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
            >
              {a.toLocaleString('fr-FR')}
            </button>
          ))}
          <button
            onClick={() => { setAmount(Math.min(sellerBalance, MAX_AMOUNT)); setError(null); }}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200
                       text-gray-500 hover:border-gray-300 transition"
          >
            Tout
          </button>
        </div>

        {/* Opérateur */}
        <label className="text-xs font-semibold text-gray-500 block mb-1">
          Envoyer vers *
        </label>
        <div className="flex gap-3 mb-5">
          {[
            { name: 'Orange Money', color: 'orange', icon: '🟠' },
            { name: 'Wave', color: 'blue', icon: '🔵' },
          ].map((op) => (
            <button
              key={op.name}
              onClick={() => setOperator(op.name)}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition
                ${operator === op.name
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
            >
              {op.icon} {op.name}
            </button>
          ))}
        </div>

        {/* Numéro */}
        <label className="text-xs font-semibold text-gray-500 block mb-1">
          Numéro mobile money *
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+221 77 000 00 00"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base font-medium
                     focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none mb-1"
        />
        <p className="text-xs text-gray-400 mb-4">
          ℹ️ Le retrait sera envoyé à ce numéro
        </p>

        {/* Nom */}
        <label className="text-xs font-semibold text-gray-500 block mb-1">
          Nom du titulaire *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prénom Nom"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base font-medium
                     focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none mb-5"
        />

        {/* Récapitulatif */}
        {numericAmount >= MIN_AMOUNT && (
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-gray-500 mb-2">📋 Récapitulatif</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Montant</span>
                <span className="font-semibold">{numericAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frais estimés</span>
                <span className="text-gray-400">~{estimatedFee.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                <span className="font-semibold text-gray-700">Tu recevras</span>
                <span className="font-bold text-teal-600">{netAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Via</span>
                <span>{operator}</span>
              </div>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        {/* Succès */}
        {success && (
          <div className="bg-green-50 text-green-700 text-sm rounded-xl p-3 mb-4">
            ✅ {success}
          </div>
        )}

        {/* Solde insuffisant */}
        {numericAmount > sellerBalance && (
          <div className="bg-amber-50 text-amber-600 text-sm rounded-xl p-3 mb-4">
            Solde insuffisant. Tu as {sellerBalance.toLocaleString('fr-FR')} FCFA disponible.
          </div>
        )}

        {/* Bouton */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3.5 rounded-xl text-white font-bold text-base transition
            ${canSubmit
              ? 'bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-200'
              : 'bg-gray-300 cursor-not-allowed'
            }`}
        >
          {loading
            ? '⏳ Retrait en cours...'
            : numericAmount > 0
              ? `Retirer ${numericAmount.toLocaleString('fr-FR')} FCFA →`
              : 'Retirer →'
          }
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          🔒 Transfert sécurisé via Bictorys
        </p>
      </div>
    </div>
  );
}
```

---

## 11. Base de données

### Table payouts

```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(5) NOT NULL DEFAULT 'XOF',
  operator VARCHAR(30) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(200) NOT NULL,
  recipient_email VARCHAR(255),
  reference VARCHAR(255) NOT NULL UNIQUE,
  idempotency_key UUID NOT NULL,
  bictorys_transaction_id VARCHAR(255),
  merchant_fee INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, completed, failed
  failure_reason TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_seller ON payouts(seller_id);
CREATE INDEX idx_payouts_reference ON payouts(reference);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_created ON payouts(created_at);
```

---

## 12. Structure des fichiers

```
src/
├── lib/
│   ├── bictorys.ts               # Service Bictorys (initiatePayout)
│   └── phone.ts                  # normalizePhone, maskPhone, formatPhone
├── app/
│   └── api/
│       └── payout/
│           └── route.ts          # POST — retrait vendeur
├── components/
│   └── dashboard/
│       └── PayoutForm.tsx        # Formulaire de retrait
├── db/
│   └── schema/
│       └── payouts.ts            # Table Drizzle
```

---

## 13. Checklist de sécurité

- [ ] La clé API Bictorys est dans `.env`, JAMAIS dans le code client
- [ ] La permission "payout" est activée sur la clé dans le dashboard Bictorys
- [ ] Le `merchantSecretCode` est changé depuis le dashboard (pas `1234` en prod)
- [ ] L'`idempotency-key` est un UUID généré FRAIS pour chaque nouvelle transaction
- [ ] L'`idempotency-key` est RÉUTILISÉE pour les retries de la même transaction
- [ ] Toutes les requêtes Bictorys passent par une API route serveur
- [ ] Le solde du vendeur est vérifié AVANT d'appeler Bictorys
- [ ] Le solde est déduit AVANT l'appel et re-crédité en cas d'échec
- [ ] Les numéros de téléphone sont validés (format +221 + 9 chiffres)
- [ ] Le payout ne peut aller que vers le numéro vérifié du vendeur
- [ ] Rate limit : max 10 payouts/jour par vendeur
- [ ] Cooldown : 5 minutes entre deux payouts
- [ ] Les gros montants (>50 000) demandent une confirmation supplémentaire
- [ ] Toutes les transactions sont loggées en base avec statut et timestamps
- [ ] Les erreurs Bictorys sont interceptées et transformées en messages user-friendly
- [ ] Les numéros sont affichés masqués dans l'interface (+221 77****44)
- [ ] Le formulaire frontend a des validations côté client (montant min/max, format téléphone)
- [ ] Le bouton de soumission est désactivé pendant le chargement (anti double-clic)
- [ ] En production : `api.bictorys.com` (pas `api.test.bictorys.com`)
