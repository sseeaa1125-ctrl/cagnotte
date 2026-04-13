# Audit Complet — Communautés, Relances, Queues Email

**Date** : 2 mars 2026  
**Scope** : Booking slots, durée abonnement communauté, système de relance, queues email

---

## 1. Booking Slots — Créneaux grisés ✅ CORRIGÉ

### Problème
Les créneaux déjà réservés (payés) étaient **cachés** de la liste. L'utilisateur ne voyait que les créneaux libres sans comprendre pourquoi certains horaires manquaient.

### Correction
- **`TimeSlotSheet.tsx`** : Les créneaux réservés sont maintenant **visibles mais grisés** (`opacity: 0.5`, `line-through`, `disabled`, `cursor-not-allowed`).
- Le backend (`GET /api/sellers/:slug/availability`) retourne déjà les bookings avec status `PAID` et `PENDING` — aucun changement backend nécessaire.
- **UX** : L'utilisateur voit clairement "09:00 ~~barré~~" et comprend que le créneau est pris.

### Fichiers modifiés
- `src/components/store/TimeSlotSheet.tsx` — type `string[]` → `{ time: string; booked: boolean }[]`, rendu avec style grisé

---

## 2. Durée d'abonnement communauté ✅ IMPLÉMENTÉ

### Avant
Durée hardcodée à 30 jours partout : `new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)`.

### Après
Le vendeur peut choisir parmi **5 durées** :

| Enum | Durée | Label FR |
|------|-------|----------|
| `WEEKLY` | 7 jours | / semaine |
| `BIWEEKLY` | 15 jours | / 15 jours |
| `MONTHLY` | 30 jours | / mois (défaut) |
| `QUARTERLY` | 90 jours | / trimestre |
| `YEARLY` | 365 jours | / an |

### Fichiers modifiés

**Schema & Prisma** :
- `prisma/schema.prisma` — Ajout enum `BillingPeriod` + champ `billingPeriod` sur `Community` (default `MONTHLY`)

**Backend** :
- `backend/src/lib/utils.ts` — Ajout `billingPeriodToMs()` et `billingPeriodLabel()`
- `backend/src/routes/communities.ts` — Create, Update, Subscribe, Public info : utilisent `billingPeriod`
- `backend/src/lib/cron/communityBilling.ts` — `createPaymentLink()` utilise `billingPeriodToMs()` au lieu de 30j hardcodé

**Frontend** :
- `src/types/index.ts` — Ajout `BillingPeriod` type + champ dans `Community` interface
- `src/components/dashboard/CommunitySetupWizard.tsx` — Sélecteur de durée à l'étape 3
- `src/app/dashboard/communities/[id]/edit/page.tsx` — Sélecteur de durée dans le formulaire d'édition
- `src/components/store/blocks/CommunityBlock.tsx` — Affichage dynamique "/ mois", "/ semaine", "/ an" etc.

### Migration requise
```bash
cd backend && npx prisma db push
```
Le champ a un default `MONTHLY`, donc les communautés existantes ne sont pas affectées.

---

## 3. Système de relance communauté ✅ EXCELLENT — Déjà en place

### Architecture
Le fichier `backend/src/lib/cron/communityBilling.ts` (757 lignes) contient **7 jobs** exécutés toutes les heures via `setInterval` dans `index.ts`.

### Jobs détaillés

| # | Job | Trigger | Actions |
|---|-----|---------|---------|
| 1 | **Rappel J-3** | `currentPeriodEnd` dans 3-4 jours | Email + Telegram DM + lien paiement Bictorys |
| 2 | **Expiration (Jour J)** | `currentPeriodEnd <= now` | Si payé → renouvelle. Sinon → GRACE_PERIOD (3j) + email + TG DM + notif vendeur |
| 3 | **Grace period** | Status `GRACE_PERIOD` | Rappels quotidiens (J1/J2/J3) par email + TG. Jour 3 écoulé → **KICK** (ban Telegram) + email |
| 4 | **Annulations** | Status `CANCELED` + période terminée | Kick Telegram + email confirmation + EXPIRED |
| 5 | **Nettoyage PENDING** | Subscriptions PENDING > 24h | Expire les abonnements abandonnés |
| 6 | **Health check Telegram** | Toutes les communautés actives | Vérifie que le bot a accès au groupe. Si non → désactive + email vendeur |
| 7 | **Détection membres partis** | Subscriptions ACTIVE/GRACE | Vérifie via `getChatMember` que le membre est toujours dans le groupe. Si `left`/`kicked` → CANCELED |

### Telegram Bot — Capacités
- **DM aux membres** via `sendMessage(userId, text)` — fonctionne car le membre a interagi avec le bot (lien invite)
- **Rate limiting** : 50ms entre chaque message (20 msg/s, bien sous la limite Telegram de 30 msg/s)
- **Ban/Kick** via `banChatMember` et `unbanChatMember`
- **Invitation** via `createChatInviteLink` avec expiration et limite de 1 usage
- **Health check** via `getChatMemberCount`

### Anti-doublons
- Table `CommunityNotification` avec `(subscriptionId, type)` pour éviter d'envoyer le même rappel 2 fois
- Enum `CommunityNotifType` : `RENEWAL_REMINDER`, `PAYMENT_FAILED`, `GRACE_DAY_1/2/3`, `KICKED`, `WELCOME`, `CANCELED`

### Points forts
- ✅ Email **ET** Telegram DM pour chaque relance
- ✅ Lien de paiement Bictorys pré-généré dans chaque rappel
- ✅ Lien d'annulation HMAC-sécurisé
- ✅ Grace period déterministe (basée sur `currentPeriodEnd`, pas `now`)
- ✅ Notification vendeur quand un paiement échoue
- ✅ Détection automatique si le bot est retiré du groupe
- ✅ Détection des membres partis (rattrapage webhook raté)

### Point d'attention
- Le cron tourne via `setInterval` dans le process Node.js. Si le serveur redémarre, le timer repart. **Pas de persistance** — mais le cron s'exécute aussi au démarrage (`setTimeout(..., 30_000)`), donc aucun cycle n'est raté.
- En production multi-instance, il faudrait un lock distribué (Redis) pour éviter les doublons. Avec une seule instance Railway, c'est OK.

---

## 4. Système de queues email 🔴 INEXISTANT

### Constat
**Aucune queue email n'existe.** Tous les emails sont envoyés **de manière synchrone** via `sendEmail()` qui appelle directement `resend.emails.send()`.

### Architecture actuelle
```
sendEmail() → Resend API (HTTP) → email envoyé
```
Pas de Bull, BullMQ, Agenda, node-cron queue, ni aucun système de file d'attente.

### Tous les points d'envoi d'email (25 appels)

| Fichier | Contexte | Criticité |
|---------|----------|-----------|
| `auth.ts:136` | Code vérification inscription | 🔴 CRITIQUE — bloque la réponse HTTP |
| `auth.ts:218` | Renvoi code vérification | 🔴 CRITIQUE |
| `auth.ts:514` | Code mot de passe oublié | 🔴 CRITIQUE |
| `orders.ts` | Confirmation lead magnet | 🟡 MOYEN |
| `webhooks.ts` (×6) | Confirmation paiement + notif vendeur + download link | 🟠 IMPORTANT |
| `communities.ts` (×3) | Welcome + confirmation subscription | 🟠 IMPORTANT |
| `communityBilling.ts` (×8) | Rappels, grace period, kick, annulation, bot retiré, notif vendeur | 🟡 MOYEN (déjà async dans le cron) |

### Problèmes
1. **Latence utilisateur** : L'inscription/connexion attend que l'email soit envoyé avant de répondre HTTP. Si Resend est lent (2-3s), l'UX en souffre.
2. **Pas de retry** : Si Resend échoue, l'email est perdu. Pas de retry automatique.
3. **Pas de priorisation** : Un email d'inscription (critique) a la même priorité qu'un rappel de renouvellement.
4. **Single point of failure** : Si Resend est down, toutes les opérations qui envoient des emails échouent.

### Recommandation — Architecture avec BullMQ

```
Tier 1 — CRITIQUE (auth) :
  Queue "email:critical" — concurrency: 10, retry: 3, backoff: exponential
  → Inscription, vérification, mot de passe oublié

Tier 2 — IMPORTANT (transactionnel) :
  Queue "email:transactional" — concurrency: 5, retry: 3
  → Confirmation paiement, welcome communauté, download link

Tier 3 — STANDARD (marketing/cron) :
  Queue "email:standard" — concurrency: 3, retry: 2, delay: jitter
  → Rappels renouvellement, grace period, notifications vendeur
```

**Dépendances requises** :
- `bullmq` + `ioredis` (Redis)
- Ou alternative sans Redis : `p-queue` (in-memory, perd les jobs au restart)

**Effort estimé** : ~2-3 jours de développement.

### Solution minimale immédiate (sans Redis)
Remplacer les appels `await sendEmail(...)` critiques (auth) par des appels fire-and-forget :
```typescript
// Ne pas bloquer la réponse HTTP
sendEmail({ to, subject, html }).catch(err => logger.error("Email failed", err));
```
Cela résout le problème de latence pour l'inscription, mais ne résout pas le retry.

---

## Résumé des changements effectués

| # | Changement | Status | Fichiers |
|---|-----------|--------|----------|
| 1 | Créneaux booking grisés | ✅ Fait | `TimeSlotSheet.tsx` |
| 2 | `BillingPeriod` enum + champ | ✅ Fait | `schema.prisma` |
| 3 | Utility `billingPeriodToMs()` | ✅ Fait | `backend/src/lib/utils.ts` |
| 4 | Backend communities: create/update/subscribe | ✅ Fait | `communities.ts` |
| 5 | Backend cron: period dynamique | ✅ Fait | `communityBilling.ts` |
| 6 | Frontend: type `Community.billingPeriod` | ✅ Fait | `src/types/index.ts` |
| 7 | Frontend: sélecteur durée (create) | ✅ Fait | `CommunitySetupWizard.tsx` |
| 8 | Frontend: sélecteur durée (edit) | ✅ Fait | `communities/[id]/edit/page.tsx` |
| 9 | Frontend: affichage dynamique prix | ✅ Fait | `CommunityBlock.tsx` |
| 10 | Queues email | 🔴 Non fait | Nécessite Redis ou alternative |

### Prochaine étape obligatoire
```bash
cd backend && npx prisma db push
```
Pour appliquer le nouveau champ `billingPeriod` à la base de données.
