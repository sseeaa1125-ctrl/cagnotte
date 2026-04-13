# izy.store — Communautés Telegram Payantes

## Contexte

izy.store est une plateforme de vente pour créateurs africains (clone Stan Store). Les vendeurs ont une page publique (`pseudo.izy.store`) avec des blocs : Lien, Vente, Réserver, Paiement libre. 

Cette feature ajoute un **5ème type de bloc : Communauté Telegram**. Le vendeur connecte un groupe/channel Telegram, met un prix mensuel, et izy.store gère tout : paiement, accès, rappels, et exclusion automatique des impayés.

**Stack existant :** Next.js 15 (App Router), TypeScript, Tailwind CSS (teal-600 comme couleur primaire), Drizzle ORM, Neon DB (PostgreSQL), Supabase Auth, Resend (emails).

**Paiements existants :** Wave, Orange Money, Free Money via Paytech API. Pas de prélèvement automatique — on envoie un lien de paiement chaque mois.

---

## Principe UX

Le vendeur ne doit RIEN savoir de technique. Tout est guidé pas à pas.

---

## Flow Vendeur (création)

### Étape 1 — Ajouter un bloc Communauté

Dans le dashboard → Ma Page → "+ Ajouter un bloc" → sélectionner "Communauté".

### Étape 2 — Connecter Telegram (guidé)

L'écran affiche un guide pas à pas avec illustrations :

```
┌─────────────────────────────────────────┐
│  Connecte ton groupe Telegram           │
│                                         │
│  Étape 1 de 3                           │
│                                         │
│  1. Ouvre Telegram                       │
│  2. Cherche @BotFather                   │
│  3. Envoie /newbot                       │
│  4. Donne un nom (ex: "Awa Fitness Bot")│
│  5. Donne un username (ex: awafitbot)    │
│  6. Copie le token qu'il te donne        │
│                                         │
│  [Illustration / GIF animé]             │
│                                         │
│  Token du bot *                          │
│  ┌─────────────────────────────────┐    │
│  │ 7123456789:AAH...               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Vérifier le bot]                      │
└─────────────────────────────────────────┘
```

Au clic sur "Vérifier le bot" → appel API `getMe` avec le token. Si valide → étape suivante. Sinon → message d'erreur clair.

```
┌─────────────────────────────────────────┐
│  Connecte ton groupe Telegram           │
│                                         │
│  Étape 2 de 3                           │
│                                         │
│  ✅ Bot connecté : @awafitbot           │
│                                         │
│  Maintenant :                            │
│  1. Va dans ton groupe/channel Telegram  │
│  2. Ajoute @awafitbot comme admin        │
│  3. Donne-lui ces permissions :          │
│     ✅ Inviter des utilisateurs          │
│     ✅ Bannir des utilisateurs           │
│                                         │
│  [Illustration]                          │
│                                         │
│  Lien du groupe *                        │
│  ┌─────────────────────────────────┐    │
│  │ https://t.me/awafitnessvip      │    │
│  └─────────────────────────────────┘    │
│  ou                                      │
│  ID du groupe (si privé) *               │
│  ┌─────────────────────────────────┐    │
│  │ -1001234567890                   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Vérifier le groupe]                   │
└─────────────────────────────────────────┘
```

Au clic sur "Vérifier le groupe" → appel `getChat` + `getChatMember` pour vérifier que le bot est admin avec les bonnes permissions. Si OK → étape suivante.

```
┌─────────────────────────────────────────┐
│  Connecte ton groupe Telegram           │
│                                         │
│  Étape 3 de 3                           │
│                                         │
│  ✅ Bot connecté : @awafitbot           │
│  ✅ Groupe : Awa Fitness VIP            │
│                                         │
│  Détails de ta communauté               │
│                                         │
│  Titre affiché sur ta page *             │
│  ┌─────────────────────────────────┐    │
│  │ Communauté VIP Fitness          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Description (courte) *                  │
│  ┌─────────────────────────────────┐    │
│  │ Coaching quotidien + motivation │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Prix mensuel (FCFA) *                   │
│  ┌─────────────────────────────────┐    │
│  │ 5 000                           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Créer la communauté]                  │
└─────────────────────────────────────────┘
```

---

## Flow Acheteur (abonnement)

### Sur la page publique du vendeur

Un bloc Communauté apparaît :

```
┌───────────────────────────────────┐
│ 👥 Communauté VIP Fitness         │
│    Coaching quotidien + motivation│
│    23 membres                     │
│                                   │
│ 5 000 FCFA/mois   [Rejoindre]    │
└───────────────────────────────────┘
```

### Au clic sur "Rejoindre"

Bottom sheet / modal de paiement (même design que les autres blocs) :

```
┌───────────────────────────────────┐
│          ━━━━━                     │
│                                   │
│  👥 Communauté VIP Fitness        │
│  5 000 FCFA / mois                │
│                                   │
│  En rejoignant, tu acceptes un    │
│  abonnement mensuel renouvelé     │
│  chaque mois. Tu peux annuler     │
│  à tout moment.                   │
│                                   │
│  Email *                          │
│  ┌───────────────────────────┐    │
│  │ ton@email.com             │    │
│  └───────────────────────────┘    │
│                                   │
│  Payer avec                       │
│  ┌───────┐┌───────┐┌───────┐    │
│  │ Wave  ││Orange ││ Free  │    │
│  │  ✓   ││       ││       │    │
│  └───────┘└───────┘└───────┘    │
│                                   │
│  [Rejoindre — 5 000 FCFA]        │
│                                   │
│  🔒 Paiement sécurisé            │
└───────────────────────────────────┘
```

### Après paiement réussi

1. izy.store génère un lien d'invitation Telegram unique (1 seule utilisation, expire en 24h)
2. L'acheteur voit :

```
┌───────────────────────────────────┐
│                                   │
│  ✅ Bienvenue !                   │
│                                   │
│  Ton abonnement est actif.        │
│  Clique ci-dessous pour rejoindre │
│  le groupe Telegram.              │
│                                   │
│  [Rejoindre sur Telegram →]       │
│                                   │
│  ⏱ Ce lien expire dans 24h       │
│  📧 Un email de confirmation a    │
│     été envoyé à ton@email.com    │
│                                   │
│  Prochain paiement : 28 mars 2026 │
│                                   │
└───────────────────────────────────┘
```

3. Un email de confirmation est envoyé avec le même lien Telegram
4. L'entrée est créée dans la table `community_subscriptions`

---

## Cycle de vie de l'abonnement

### Timeline mensuelle

```
Jour 0   → Paiement initial. Lien Telegram envoyé. Membre rejoint.
Jour 27  → (J-3) Email + message Telegram : "Ton abonnement se renouvelle dans 3 jours."
           Le message contient un lien de paiement.
Jour 30  → Échéance. On vérifie si le paiement a été fait.
           - Si payé → Rien ne change. Prochain cycle.
           - Si pas payé → Email + message Telegram : "Ton paiement a échoué. 
             Tu as 3 jours pour régulariser." + lien de paiement.
Jour 31  → Rappel 2 : "Plus que 2 jours."
Jour 32  → Rappel 3 (dernier) : "Dernier jour pour rester dans le groupe."
Jour 33  → Kick automatique via banChatMember. 
           Email : "Tu as été retiré de [Communauté]. Tu peux te réabonner à tout moment."
```

### Annulation volontaire

Le membre peut annuler depuis un lien dans l'email mensuel ("Gérer mon abonnement") ou depuis la page du vendeur. L'accès reste actif jusqu'à la fin de la période payée, puis kick automatique.

### Réabonnement

Si un ancien membre veut revenir → même flow que le premier abonnement. Nouveau paiement → nouveau lien d'invitation → il rejoint à nouveau.

---

## Base de données

### Nouvelles tables

```sql
-- Bots Telegram des vendeurs
CREATE TABLE telegram_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_token TEXT NOT NULL,          -- Token chiffré (encrypt at rest)
  bot_username VARCHAR(100) NOT NULL,
  bot_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_telegram_bots_seller ON telegram_bots(seller_id);

-- Communautés (= blocs de type communauté)
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  telegram_bot_id UUID NOT NULL REFERENCES telegram_bots(id),
  telegram_chat_id BIGINT NOT NULL,    -- ID du groupe/channel Telegram
  telegram_chat_title VARCHAR(200),
  title VARCHAR(200) NOT NULL,          -- Titre affiché sur la page
  description TEXT,
  price_amount INTEGER NOT NULL,        -- En FCFA (ex: 5000)
  currency VARCHAR(5) NOT NULL DEFAULT 'XOF',
  is_active BOOLEAN NOT NULL DEFAULT true,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_communities_seller ON communities(seller_id);

-- Abonnements aux communautés
CREATE TABLE community_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_email VARCHAR(255) NOT NULL,
  member_name VARCHAR(200),
  telegram_user_id BIGINT,              -- Rempli quand le membre rejoint
  telegram_username VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- active, past_due, grace_period, canceled, expired
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  canceled_at TIMESTAMP,
  invite_link TEXT,                      -- Lien Telegram unique
  invite_link_expires_at TIMESTAMP,
  last_payment_at TIMESTAMP,
  grace_period_end TIMESTAMP,           -- Date limite après impayé (3 jours)
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_subs_community ON community_subscriptions(community_id);
CREATE INDEX idx_community_subs_status ON community_subscriptions(status);
CREATE INDEX idx_community_subs_period_end ON community_subscriptions(current_period_end);
CREATE UNIQUE INDEX idx_community_subs_unique ON community_subscriptions(community_id, member_email)
  WHERE status IN ('active', 'past_due', 'grace_period');

-- Paiements communautés (historique)
CREATE TABLE community_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES community_subscriptions(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(5) NOT NULL DEFAULT 'XOF',
  provider VARCHAR(20) NOT NULL,        -- 'wave', 'orange_money', 'free_money'
  provider_transaction_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, completed, failed
  payment_url TEXT,                      -- Lien de paiement envoyé au membre
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_payments_sub ON community_payments(subscription_id);

-- Notifications envoyées (pour éviter les doublons)
CREATE TABLE community_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES community_subscriptions(id),
  type VARCHAR(30) NOT NULL,
    -- 'renewal_reminder', 'payment_failed', 'grace_day_1', 'grace_day_2', 
    -- 'grace_day_3', 'kicked', 'welcome', 'canceled'
  channel VARCHAR(10) NOT NULL,         -- 'email', 'telegram'
  sent_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_notifs_sub ON community_notifications(subscription_id, type);
```

### Schéma Drizzle

Crée ces tables dans un nouveau fichier `src/db/schema/communities.ts` en utilisant les types Drizzle correspondants. Utilise `pgTable`, `uuid`, `text`, `varchar`, `integer`, `boolean`, `timestamp`, `bigint`.

---

## API Routes

### Routes vendeur (authentifiées)

```
POST   /api/telegram/verify-bot
       Body: { token: string }
       → Appelle getMe. Retourne { ok, bot_username, bot_name } ou erreur.

POST   /api/telegram/verify-group
       Body: { token: string, chatId: string }
       → Appelle getChat + getChatMember(bot). 
       → Vérifie que le bot est admin avec can_invite_users + can_restrict_members.
       → Retourne { ok, chat_title, chat_type } ou erreur détaillée.

POST   /api/communities
       Body: { botToken, chatId, title, description, priceAmount }
       → Crée telegram_bot (si pas déjà) + community + block.
       → Retourne la communauté créée.

PATCH  /api/communities/[id]
       Body: { title?, description?, priceAmount?, isActive? }
       → Met à jour la communauté.

GET    /api/communities/[id]/members
       → Liste des membres avec statut, date prochain paiement.

DELETE /api/communities/[id]
       → Désactive la communauté (soft delete via isActive=false).
```

### Routes publiques (page vendeur)

```
POST   /api/communities/[id]/subscribe
       Body: { email, name, paymentProvider }
       → Crée community_subscription (status='pending').
       → Crée community_payment (status='pending').
       → Initie le paiement via Paytech.
       → Retourne { paymentUrl } → redirect vers paiement mobile money.

GET    /api/communities/[id]/subscribe/callback?transactionId=xxx
       → Webhook/callback après paiement.
       → Si OK : status='active', génère invite link, envoie email.
       → Retourne page de succès avec le lien Telegram.
```

### Routes webhooks

```
POST   /api/webhooks/community-payment
       → Webhook Paytech pour confirmer les paiements de renouvellement.
       → Met à jour subscription + génère nouveau period.
```

### Route membre

```
GET    /api/communities/subscription/[id]/cancel
       → Page de confirmation d'annulation.
POST   /api/communities/subscription/[id]/cancel
       → Annule l'abonnement. Accès jusqu'à current_period_end.
```

---

## Service Telegram

Crée un fichier `src/lib/telegram.ts` :

```typescript
const TELEGRAM_API = 'https://api.telegram.org/bot';

export class TelegramService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async call(method: string, params?: Record<string, unknown>) {
    const res = await fetch(`${TELEGRAM_API}${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: params ? JSON.stringify(params) : undefined,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Telegram API error');
    return data.result;
  }

  // Vérifier que le token est valide
  async getMe() {
    return this.call('getMe');
  }

  // Infos sur le groupe/channel
  async getChat(chatId: number | string) {
    return this.call('getChat', { chat_id: chatId });
  }

  // Vérifier le statut d'un membre dans le groupe
  async getChatMember(chatId: number | string, userId: number) {
    return this.call('getChatMember', { chat_id: chatId, user_id: userId });
  }

  // Générer un lien d'invitation unique (1 utilisation, expire en 24h)
  async createInviteLink(chatId: number | string) {
    return this.call('createChatInviteLink', {
      chat_id: chatId,
      member_limit: 1,          // 1 seule utilisation
      expire_date: Math.floor(Date.now() / 1000) + 86400, // 24h
    });
  }

  // Révoquer un lien d'invitation
  async revokeInviteLink(chatId: number | string, inviteLink: string) {
    return this.call('revokeChatInviteLink', {
      chat_id: chatId,
      invite_link: inviteLink,
    });
  }

  // Exclure un membre (kick)
  async banMember(chatId: number | string, userId: number) {
    // Ban puis unban pour permettre de rejoindre plus tard
    await this.call('banChatMember', { chat_id: chatId, user_id: userId });
    // Attendre 1 seconde puis unban pour que le membre puisse se réabonner
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.call('unbanChatMember', { 
      chat_id: chatId, 
      user_id: userId,
      only_if_banned: true 
    });
  }

  // Envoyer un message à un utilisateur (via le bot en DM)
  async sendMessage(chatId: number | string, text: string) {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  }

  // Compter les membres du groupe
  async getChatMemberCount(chatId: number | string) {
    return this.call('getChatMemberCount', { chat_id: chatId });
  }
}
```

---

## Cron Jobs (récurrence)

Crée un fichier `src/lib/cron/community-billing.ts`. Ce job tourne **une fois par jour** (via Inngest, Vercel Cron, ou un simple setInterval en production).

### Job 1 : Rappels de renouvellement (J-3)

```typescript
// Trouver tous les abonnements actifs qui expirent dans 3 jours
// Pour chacun :
//   1. Créer un community_payment (status='pending') avec payment_url
//   2. Envoyer email via Resend : "Ton abonnement se renouvelle dans 3 jours"
//      → Inclure le lien de paiement + lien d'annulation
//   3. Envoyer message Telegram via le bot (si telegram_user_id connu)
//   4. Logger dans community_notifications (type='renewal_reminder')
```

### Job 2 : Vérifier les paiements à l'échéance (Jour J)

```typescript
// Trouver tous les abonnements actifs dont current_period_end <= maintenant
// Pour chacun :
//   - Vérifier si un community_payment (status='completed') existe pour cette période
//   - Si OUI → Renouveler :
//       subscription.current_period_start = ancien period_end
//       subscription.current_period_end = +30 jours
//       subscription.status = 'active'
//   - Si NON → Passer en grace_period :
//       subscription.status = 'grace_period'
//       subscription.grace_period_end = maintenant + 3 jours
//       Envoyer email : "Ton paiement a échoué. Tu as 3 jours." + lien paiement
//       Envoyer message Telegram
//       Logger notification (type='payment_failed')
```

### Job 3 : Grace period — rappels quotidiens

```typescript
// Trouver tous les abonnements en grace_period
// Pour chacun :
//   - Calculer le jour de grace (1, 2, ou 3)
//   - Si jour 1 ou 2 : envoyer rappel email + Telegram
//     "Plus que X jour(s) pour rester dans [Communauté]" + lien paiement
//   - Si jour 3 (grace_period_end <= maintenant) : KICK
//     1. TelegramService.banMember(chatId, telegramUserId)
//     2. subscription.status = 'expired'
//     3. Email : "Tu as été retiré de [Communauté]. Tu peux te réabonner."
//     4. Logger notification (type='kicked')
//     5. community.member_count -= 1
```

### Job 4 : Annulations programmées

```typescript
// Trouver tous les abonnements avec status='canceled' 
//   ET current_period_end <= maintenant
// Pour chacun :
//   1. TelegramService.banMember(chatId, telegramUserId)
//   2. subscription.status = 'expired'
//   3. Email de confirmation : "Ton abonnement est terminé."
//   4. community.member_count -= 1
```

---

## Identification du telegram_user_id

**Problème :** quand l'acheteur paie, on a son email mais pas son Telegram user ID. On en a besoin pour le kick et les messages.

**Solution :** Webhook Telegram sur le bot. Quand un nouvel utilisateur rejoint le groupe via un lien d'invitation, Telegram envoie un `chat_member` update au bot.

```typescript
// POST /api/webhooks/telegram/[botId]
// Telegram envoie cet event quand quelqu'un rejoint via un invite link

// 1. Extraire new_chat_member.user.id et invite_link du payload
// 2. Trouver la subscription qui a ce invite_link
// 3. Mettre à jour subscription.telegram_user_id et telegram_username
```

Au moment de la création du bot, on configure le webhook Telegram :

```typescript
await telegram.call('setWebhook', {
  url: `https://izy.store/api/webhooks/telegram/${botId}`,
  allowed_updates: ['chat_member'],
});
```

---

## Templates Emails (Resend)

### Email de bienvenue (après premier paiement)

```
Sujet : ✅ Bienvenue dans [Communauté] !

Salut [Prénom],

Tu as rejoint [Communauté] de [Vendeur] ! 🎉

👉 Rejoins le groupe Telegram : [LIEN]
   ⏱ Ce lien expire dans 24h — clique vite !

📅 Prochain paiement : [DATE] — [MONTANT] FCFA
💳 Tu recevras un rappel 3 jours avant.

Gérer mon abonnement : [LIEN_GESTION]

— izy.store
```

### Email de rappel (J-3)

```
Sujet : 📅 Ton abonnement [Communauté] se renouvelle bientôt

Salut [Prénom],

Ton abonnement à [Communauté] se renouvelle le [DATE].

💰 Montant : [MONTANT] FCFA
📲 Payer maintenant : [LIEN_PAIEMENT]

Si tu ne souhaites pas continuer :
Annuler mon abonnement : [LIEN_ANNULATION]

— izy.store
```

### Email impayé (grace period)

```
Sujet : ⚠️ Paiement échoué — [Communauté]

Salut [Prénom],

Ton paiement de [MONTANT] FCFA pour [Communauté] n'a pas été effectué.

Tu as [X] jour(s) pour régulariser, sinon tu seras retiré(e) du groupe Telegram.

📲 Payer maintenant : [LIEN_PAIEMENT]

— izy.store
```

### Email de kick

```
Sujet : Tu as été retiré(e) de [Communauté]

Salut [Prénom],

Ton abonnement à [Communauté] a expiré et tu as été retiré(e) du groupe Telegram.

Tu peux te réabonner à tout moment :
👉 [LIEN_PAGE_VENDEUR]

— izy.store
```

---

## Templates Messages Telegram (via le bot)

Les messages sont envoyés en DM par le bot au membre (si le membre a déjà interagi avec le bot — condition Telegram).

**Rappel J-3 :**
```
📅 Ton abonnement à « [Communauté] » se renouvelle le [DATE].

💰 [MONTANT] FCFA
👉 Payer : [LIEN]

Pour annuler : [LIEN]
```

**Impayé :**
```
⚠️ Ton paiement pour « [Communauté] » a échoué.

Tu as [X] jour(s) pour payer, sinon tu seras retiré(e) du groupe.

👉 Payer maintenant : [LIEN]
```

**Important :** Si le membre n'a jamais interagi avec le bot en DM, Telegram bloque l'envoi. Dans ce cas, on se fie uniquement aux emails. Le message Telegram est un bonus, pas une garantie — toujours envoyer l'email EN PLUS.

---

## Composants UI

### Bloc Communauté (page publique vendeur)

Crée `src/components/blocks/CommunityBlock.tsx` :

```
┌───────────────────────────────────────┐
│                                       │
│  👥  [Titre de la communauté]         │  ← icône 40x40 bg-teal-50 rounded-[10px]
│      [Description courte]             │
│      [X] membres                      │  ← text-xs text-gray-400
│                                       │
│  [MONTANT] FCFA/mois    [Rejoindre]   │  ← bouton bg-teal-600 rounded-xl
│                                       │
└───────────────────────────────────────┘
```

Style : même design que les autres blocs (rounded-2xl, border-2 border-gray-100, px-5 py-4).

### Wizard de connexion Telegram (dashboard vendeur)

Crée `src/components/dashboard/CommunitySetupWizard.tsx` :

- 3 étapes avec progress indicator
- Chaque étape a un bouton de vérification
- Feedback immédiat (✅ ou ❌ avec message d'erreur clair)
- Illustrations/GIFs pour chaque étape (placeholder images OK en V1)

### Gestion des membres (dashboard vendeur)

Crée `src/components/dashboard/CommunityMembers.tsx` :

```
┌─────────────────────────────────────────────────┐
│  Communauté VIP Fitness          23 membres     │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │ Nom        │ Email      │ Statut  │ Prochain ││
│  │────────────│────────────│─────────│──────────││
│  │ Moussa D.  │ mou@..     │ 🟢 Actif│ 28 mars  ││
│  │ Fatou S.   │ fat@..     │ 🟡 Impayé│ Expiré  ││
│  │ Ibra N.    │ ibr@..     │ 🔴 Expiré│ —       ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## Sécurité

### Chiffrement du bot token

Le bot token donne un accès complet au bot. Il DOIT être chiffré en base.

```typescript
// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(data: string): string {
  const [ivHex, authTagHex, encrypted] = data.split(':');
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

Ajouter `ENCRYPTION_KEY` dans `.env` (générer avec `openssl rand -hex 32`).

### Validation webhook Telegram

Vérifier que les requêtes webhook viennent bien de Telegram en utilisant un secret token :

```typescript
// À la config du webhook
await telegram.call('setWebhook', {
  url: `https://izy.store/api/webhooks/telegram/${botId}`,
  secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
  allowed_updates: ['chat_member'],
});

// Dans le handler du webhook
const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## Variables d'environnement à ajouter

```env
ENCRYPTION_KEY=            # openssl rand -hex 32
TELEGRAM_WEBHOOK_SECRET=   # openssl rand -hex 16
```

---

## Structure des fichiers à créer

```
src/
├── db/schema/
│   └── communities.ts              # Tables Drizzle
├── lib/
│   ├── telegram.ts                 # TelegramService class
│   ├── crypto.ts                   # Encrypt/decrypt bot tokens
│   └── cron/
│       └── community-billing.ts    # Les 4 jobs quotidiens
├── app/
│   ├── api/
│   │   ├── telegram/
│   │   │   ├── verify-bot/route.ts
│   │   │   └── verify-group/route.ts
│   │   ├── communities/
│   │   │   ├── route.ts                    # POST create
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts                # PATCH, DELETE
│   │   │   │   ├── members/route.ts        # GET members
│   │   │   │   └── subscribe/
│   │   │   │       ├── route.ts            # POST subscribe
│   │   │   │       └── callback/route.ts   # GET payment callback
│   │   │   └── subscription/
│   │   │       └── [id]/cancel/route.ts    # GET + POST cancel
│   │   └── webhooks/
│   │       └── telegram/
│   │           └── [botId]/route.ts        # Webhook Telegram
│   └── (dashboard)/
│       └── dashboard/
│           └── store/
│               └── community/
│                   └── page.tsx             # Setup wizard
└── components/
    ├── blocks/
    │   └── CommunityBlock.tsx              # Bloc page publique
    └── dashboard/
        ├── CommunitySetupWizard.tsx        # Wizard 3 étapes
        └── CommunityMembers.tsx            # Liste des membres
```

---

## Ordre d'implémentation recommandé

1. **Tables + Drizzle schema** — Migrer la DB
2. **TelegramService** — Le service avec tous les appels API
3. **Crypto** — Chiffrement des tokens
4. **API verify-bot + verify-group** — Tester avec un vrai bot
5. **CommunitySetupWizard** — Interface vendeur
6. **API create community** — Créer la communauté en base
7. **CommunityBlock** — Affichage sur la page publique
8. **API subscribe + payment flow** — Paiement et génération du lien
9. **Webhook Telegram** — Capturer le telegram_user_id
10. **Cron jobs** — Billing, rappels, kicks
11. **Templates emails** — Via Resend
12. **CommunityMembers** — Dashboard vendeur

**Estimation : 3-4 jours de dev.**

---

## Cas limites à gérer

| Cas | Comportement |
|-----|-------------|
| Le vendeur supprime le bot de son groupe | Les kicks ne fonctionneront plus. Afficher un warning dans le dashboard. Vérifier périodiquement via getChatMember(bot). |
| Le membre quitte le groupe lui-même | L'abonnement continue. Au prochain rappel, on détecte que le membre n'est plus dans le groupe. On annule automatiquement. |
| Le membre bloque le bot | Les messages Telegram ne passent plus. L'email reste le canal principal. |
| Le vendeur change le prix | Ne s'applique qu'aux nouveaux abonnés. Les existants gardent leur prix. |
| Paiement reçu pendant la grace period | Annuler le kick prévu. Remettre status='active'. Recalculer period. |
| Le lien d'invitation expire (24h) | Le membre peut demander un nouveau lien via l'email ou la page de gestion. |
| Double abonnement (même email) | L'index unique empêche ça. Retourner une erreur "Tu es déjà abonné(e)." |
