# Prompt : Intégration Bictorys Payment API

## Contexte

Tu dois intégrer **Bictorys**, une API de paiement Mobile Money pour l'Afrique de l'Ouest (Orange Money, Wave, Free Money, MTN Money, carte bancaire).

---

## 1. Configuration Environnement

```env
# Test
BICTORYS_API_URL=https://api.test.bictorys.com
BICTORYS_API_KEY=test_public-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.xxxxxxxxxx
BICTORYS_WEBHOOK_SECRET=test_secret-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.xxxxxxxxxx

# Production
BICTORYS_API_URL=https://api.bictorys.com
BICTORYS_API_KEY=public-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.xxxxxxxxxx
BICTORYS_WEBHOOK_SECRET=secret-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.xxxxxxxxxx
```

---

## 2. Créer un Paiement (Charge)

### Endpoint
```
POST {BICTORYS_API_URL}/pay/v1/charges?payment_type={payment_type}
```

### Payment Types
| Opérateur | payment_type |
|-----------|--------------|
| Orange Money | `orange_money` |
| Wave | `wave_money` |
| Free Money | `free_money` |
| MTN Money | `mtn_money` |
| Carte bancaire | `card` (ajouter `&payment_category=card`) |

### Headers
```
X-Api-Key: {BICTORYS_API_KEY}
Content-Type: application/json
```

### Body (JSON)
```json
{
  "amount": 1000,
  "currency": "XOF",
  "country": "SN",
  "paymentReference": "ORDER-123456",
  "successRedirectUrl": "https://monsite.com/commande/ORDER-123456",
  "ErrorRedirectUrl": "https://monsite.com/commande/ORDER-123456",
  "customer": {
    "name": "John Doe",
    "phone": "771234567",
    "email": "john@example.com",
    "country": "SN"
  }
}
```

> ⚠️ **IMPORTANT** : `ErrorRedirectUrl` a un **E majuscule** (convention Bictorys).

### Réponse Succès (200)
```json
{
  "transactionId": "abc123-def456-...",
  "link": "https://pay.wave.com/c/xxx?a=1000&c=XOF&m=...",
  "checkoutUrl": "https://checkout.bictorys.com/...",
  "qrCode": "iVBORw0KGgoAAAANSUhEUgAA...",
  "redirectUrl": null,
  "type": "MobilePaymentObject",
  "message": null,
  "state": null
}
```

### Champs importants de la réponse
- **`transactionId`** : ID unique Bictorys → stocker en DB comme `bictorysChargeId`
- **`link`** : URL de paiement direct (ouvrir dans navigateur/WebView)
- **`qrCode`** : Image QR code en base64 (pour desktop)

### Code TypeScript
```typescript
const BICTORYS_API_URL = process.env.BICTORYS_API_URL;
const BICTORYS_API_KEY = process.env.BICTORYS_API_KEY;

type PaymentType = 'orange_money' | 'wave_money' | 'free_money' | 'mtn_money' | 'card';

interface CreateChargeInput {
  amount: number;
  currency?: string;
  country?: string;
  paymentType: PaymentType;
  paymentReference: string;
  successRedirectUrl: string;
  errorRedirectUrl: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    country?: string;
  };
}

async function createCharge(input: CreateChargeInput) {
  let url = `${BICTORYS_API_URL}/pay/v1/charges?payment_type=${input.paymentType}`;
  if (input.paymentType === 'card') {
    url += '&payment_category=card';
  }

  const body = {
    amount: input.amount,
    currency: input.currency || 'XOF',
    country: input.country || 'SN',
    paymentReference: input.paymentReference,
    successRedirectUrl: input.successRedirectUrl,
    ErrorRedirectUrl: input.errorRedirectUrl, // E majuscule !
    customer: input.customer,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Api-Key': BICTORYS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Bictorys error: ${response.status}`);
  }

  return response.json();
}
```

---

## 3. Webhook (Notification de Paiement)

Bictorys envoie un webhook POST quand le statut du paiement change.

### Endpoint à créer
```
POST /api/webhooks/bictorys
```

### Headers reçus
```
X-Secret-Key: {BICTORYS_WEBHOOK_SECRET}
Content-Type: application/json
```

### Body reçu (JSON)
```json
{
  "event": "charge.succeeded",
  "data": {
    "transactionId": "abc123-def456-...",
    "paymentReference": "ORDER-123456",
    "amount": 1000,
    "currency": "XOF",
    "status": "succeeded",
    "fee": 15.5,
    "paymentMethod": "wave_money"
  }
}
```

### Événements possibles
| Event | Description |
|-------|-------------|
| `charge.succeeded` | Paiement réussi ✅ |
| `charge.authorized` | Paiement autorisé (CB) |
| `charge.failed` | Paiement échoué ❌ |
| `charge.cancelled` | Paiement annulé |

### Code TypeScript (Webhook Handler)
```typescript
const BICTORYS_WEBHOOK_SECRET = process.env.BICTORYS_WEBHOOK_SECRET;

interface BictorysWebhookPayload {
  event: string;
  data: {
    transactionId: string;
    paymentReference: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'cancelled' | 'authorized' | 'pending';
    fee?: number;
    paymentMethod?: string;
  };
}

async function handleBictorysWebhook(req: Request) {
  // 1. Vérifier le secret
  const secretKey = req.headers.get('X-Secret-Key');
  if (secretKey !== BICTORYS_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parser le body
  const payload: BictorysWebhookPayload = await req.json();
  const { event, data } = payload;

  // 3. Trouver la commande par paymentReference
  const order = await db.order.findUnique({
    where: { reference: data.paymentReference }
  });

  if (!order) {
    return new Response('Order not found', { status: 404 });
  }

  // 4. Vérifier montant et devise (sécurité anti-fraude)
  if (data.amount !== order.totalXOF || data.currency !== 'XOF') {
    return new Response('Amount mismatch', { status: 400 });
  }

  // 5. Traiter selon l'événement
  switch (event) {
    case 'charge.succeeded':
    case 'charge.authorized':
      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          status: 'payment_confirmed',
          bictorysFee: data.fee,
        }
      });
      // → Déclencher la livraison (ex: commander clés chez fournisseur)
      break;

    case 'charge.failed':
    case 'charge.cancelled':
      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'failed',
          status: 'payment_failed',
        }
      });
      break;
  }

  // 6. Toujours retourner 200 pour confirmer réception
  return new Response('OK', { status: 200 });
}
```

---

## 4. Flux Complet

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Backend   │────▶│  Bictorys   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                    │
      │  1. Passer        │                    │
      │     commande      │                    │
      │──────────────────▶│                    │
      │                   │                    │
      │                   │  2. Créer charge   │
      │                   │───────────────────▶│
      │                   │                    │
      │                   │  3. transactionId  │
      │                   │     + link + qrCode│
      │                   │◀───────────────────│
      │                   │                    │
      │  4. Redirect vers │                    │
      │     link ou       │                    │
      │     afficher QR   │                    │
      │◀──────────────────│                    │
      │                   │                    │
      │  5. Client paie   │                    │
      │     sur app       │                    │
      │     mobile money  │                    │
      │─────────────────────────────────────▶ │
      │                   │                    │
      │                   │  6. Webhook        │
      │                   │     charge.succeeded
      │                   │◀───────────────────│
      │                   │                    │
      │  7. Commande      │                    │
      │     confirmée     │                    │
      │◀──────────────────│                    │
```

---

## 5. Bonnes Pratiques

### Sécurité
- ✅ Toujours vérifier `X-Secret-Key` sur les webhooks
- ✅ Vérifier `amount` et `currency` avant de valider une commande
- ✅ Stocker `transactionId` en DB pour réconciliation
- ✅ Logger tous les webhooks (même en cas d'erreur)
- ❌ Ne jamais exposer `BICTORYS_API_KEY` côté client

### UX
- Mobile : rediriger vers `link` (ouvre l'app mobile money)
- Desktop : afficher le `qrCode` (base64 → `<img src="data:image/png;base64,{qrCode}">`)
- Polling : vérifier le statut de la commande toutes les 3-5 secondes pendant que le client paie

### Gestion d'erreurs
- 403 Forbidden → Clé API invalide ou mauvais environnement (test vs prod)
- 400 Bad Request → Body mal formaté ou champs manquants
- Timeout → Réessayer avec exponential backoff

---

## 6. Test en Local

1. Utiliser **ngrok** pour exposer ton backend :
   ```bash
   ngrok http 4000
   ```

2. Configurer le webhook dans le dashboard Bictorys :
   ```
   https://xxx.ngrok-free.dev/api/webhooks/bictorys
   ```

3. Utiliser les clés **test** (`test_public-...`, `test_secret-...`)

4. Tester avec des montants réels mais sans débit réel

---

## 7. Checklist Déploiement Prod

- [ ] Changer `BICTORYS_API_URL` vers `https://api.bictorys.com`
- [ ] Utiliser les clés prod (sans préfixe `test_`)
- [ ] Configurer le webhook prod dans le dashboard Bictorys
- [ ] Vérifier que le webhook retourne 200 (sinon Bictorys retry)
- [ ] Tester un paiement réel de petit montant

---

## Ressources

- Documentation officielle : https://docs.bictorys.com
- Dashboard : https://dashboard.bictorys.com
- Support : support@bictorys.com
