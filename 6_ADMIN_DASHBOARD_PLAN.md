# 6 — Plan du Dashboard Admin Izy

## Audit complet de la codebase

### Entités existantes (Prisma schema)

| Modèle | Description | Admin nécessaire |
|---|---|---|
| `Seller` | Vendeurs (créateurs de pages) | CRUD, KYC review, ban, plan upgrade |
| `Block` | Blocs de contenu (14 types) | Modération, stats |
| `Product` | Produits digitaux | Modération, stats |
| `BookingService` | Services réservables | Vue d'ensemble |
| `Order` | Commandes (SALE, BOOKING, PAYMENT) | Vue, remboursement manuel, debug |
| `Customer` | Clients des vendeurs | Vue globale |
| `Community` | Communautés Telegram payantes | Vue, gestion |
| `CommunitySubscription` | Abonnements communauté | Vue, annulation manuelle |
| `CommunityPayment` | Paiements communauté | Vue, résolution paiements bloqués |
| `Withdrawal` | Demandes de retrait vendeur | Review manuelle, approbation |
| `FileUpload` | Fichiers uploadés | Stockage, modération |
| `WebhookLog` | Journal des webhooks Bictorys | Debug, monitoring |
| `VerificationCode` | Codes email temporaires | Debug |
| `PageView` | Visites pages publiques | Analytics globales |
| `BlockClick` | Clics sur les blocs | Analytics globales |
| `PartnershipRequest` | Demandes de partenariat | Vue globale |
| `TelegramBot` | Bots Telegram des vendeurs | Monitoring |
| `CommunityNotification` | Notifications envoyées | Monitoring |

### Ce qui manque côté admin

1. **Aucun système admin** — pas de modèle Admin, pas de routes, pas de middleware, pas de frontend
2. **KYC sans review** — les vendeurs peuvent soumettre leurs pièces d'identité (`kycStatus`, `kycIdUrl`, `kycSelfieUrl`) mais **aucun endpoint pour valider/rejeter**
3. **Retraits auto-traités** — pas de validation manuelle avant payout
4. **Pas d'analytics plateforme** — seulement des stats par vendeur
5. **Pas de modération** — impossible de suspendre un vendeur ou bloquer un contenu
6. **Pas de gestion des plans** — FREE/PRO géré manuellement en DB

---

## Architecture technique

### Backend

```
backend/src/
├── middleware/
│   └── adminAuth.ts          # NEW — middleware requireAdmin
├── routes/
│   └── admin/
│       ├── index.ts           # Router principal admin
│       ├── auth.ts            # Login admin (email + password)
│       ├── dashboard.ts       # KPIs plateforme
│       ├── sellers.ts         # CRUD vendeurs, KYC review, ban
│       ├── orders.ts          # Toutes les commandes, remboursements
│       ├── withdrawals.ts     # Review retraits, approbation manuelle
│       ├── communities.ts     # Communautés, subscriptions, payments
│       ├── communityBilling.ts # Relances, paiements, taux, cron status
│       ├── telegram.ts        # Bots Telegram, groupes, health check
│       ├── analytics.ts       # Stats globales plateforme
│       ├── webhooks.ts        # Logs webhooks, debug
│       ├── system.ts          # Queues, cron status, health
│       └── moderation.ts      # Signalements, blocage contenu
└── prisma/schema.prisma       # + model Admin, model AdminLog
```

### Frontend

```
src/app/admin/
├── layout.tsx                 # Layout admin (sidebar + topbar)
├── page.tsx                   # Dashboard KPIs
├── login/page.tsx             # Connexion admin
├── sellers/
│   ├── page.tsx               # Liste vendeurs
│   └── [id]/page.tsx          # Détail vendeur
├── kyc/page.tsx               # File d'attente KYC
├── orders/page.tsx            # Toutes les commandes
├── withdrawals/page.tsx       # File d'attente retraits
├── communities/
│   ├── page.tsx               # Toutes les communautés
│   ├── [id]/page.tsx          # Détail communauté
│   ├── billing/page.tsx       # Community Billing — relances, paiements, taux
│   └── telegram/page.tsx      # Communautés Telegram — bots, groupes, health
├── analytics/page.tsx         # Analytics plateforme
├── webhooks/page.tsx          # Logs webhooks
├── system/page.tsx            # Santé système
└── moderation/page.tsx        # Contenu signalé
```

---

## Modèles Prisma à ajouter

```prisma
// =============================================
// ADMIN — Administrateur plateforme
// =============================================
model Admin {
  id       String @id @default(cuid())
  email    String @unique
  password String // bcrypt hash
  name     String
  role     AdminRole @default(ADMIN)
  isActive Boolean   @default(true)

  logs AdminLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum AdminRole {
  SUPER_ADMIN  // Accès total + gestion des admins
  ADMIN        // Gestion vendeurs, commandes, retraits
  SUPPORT      // Lecture seule + actions support basiques
}

// =============================================
// ADMIN LOG — Journal des actions admin
// =============================================
model AdminLog {
  id      String @id @default(cuid())
  adminId String
  admin   Admin  @relation(fields: [adminId], references: [id])

  action    String   // "KYC_APPROVED", "SELLER_BANNED", "WITHDRAWAL_APPROVED", etc.
  target    String   // "seller:cuid123", "order:cuid456"
  details   Json?    // Métadonnées de l'action
  ip        String?

  createdAt DateTime @default(now())

  @@index([adminId, createdAt])
  @@index([action])
  @@index([target])
}

// =============================================
// PLATFORM CONFIG — Configuration globale
// =============================================
model PlatformConfig {
  id    String @id @default("global")
  key   String @unique
  value Json

  updatedAt DateTime @updatedAt
}
// Exemples de clés :
// "commissionRate" → { "orders": 500, "community": 300 }  (basis points)
// "withdrawalReviewThreshold" → { "amount": 100000 }  (FCFA)
```

### Champs à ajouter sur le modèle Seller existant

```prisma
// Ajouter dans model Seller :
  withdrawalBlocked    Boolean @default(false)   // Admin peut bloquer les retraits
  withdrawalBlockedAt  DateTime?
  withdrawalBlockReason String?
  customCommissionRate Int?    // Taux personnalisé en basis points (null = taux global)
  hardDeletedAt        DateTime?                 // Suppression définitive par admin
```

---

## Fonctionnalités détaillées

### Phase 1 — Fondations (priorité critique)

#### 1.1 Auth admin
- Login email + mot de passe (bcrypt, JWT séparé `izy-admin-token`)
- Cookie httpOnly + secure, séparé du cookie vendeur
- Middleware `requireAdmin` avec vérification du rôle
- Pas de signup public — seul un SUPER_ADMIN peut créer d'autres admins
- Audit log de chaque connexion

#### 1.2 Dashboard KPIs
- **Boutiques en temps réel** :
  - Nombre total de boutiques actives (vendeurs avec `onboardingCompleted && !deletedAt`)
  - Nouveaux aujourd'hui / cette semaine / ce mois
  - Trafic global en temps réel (via Google Analytics Data API ou nos PageView)
  - Graphique « boutiques actives vs trafic » sur 30 jours
- **Revenus plateforme** (commissions orders + community payments)
  - Total, aujourd'hui, cette semaine, ce mois
  - Graphique revenus quotidiens (commissions Izy)
- **Vendeurs** : total, nouveaux aujourd'hui/semaine, actifs (ont reçu une commande ce mois)
- **Commandes** : total, aujourd'hui, montant total, taux de conversion
- **Communautés** : total actives, total abonnés actifs, MRR (Monthly Recurring Revenue)
- **Retraits** : total en attente, total traité aujourd'hui
- **KYC** : nombre en attente de review
- **Alertes** :
  - Webhooks en erreur (dernières 24h)
  - Paiements communauté PENDING > 6h
  - Retraits PENDING (si passage en mode review manuelle)
  - Queues email en backlog

#### 1.2b Intégration Google Analytics (trafic temps réel)
- Installer `@google-analytics/data` sur le backend
- Créer un service account Google + partager la propriété GA4 avec
- Endpoint `/api/admin/analytics/realtime` → appel GA4 Data API `runRealtimeReport`
- Métriques : visiteurs actifs, pages vues / 30 min, top pages, top pays
- Fallback si GA pas configuré : utiliser nos `PageView` (agrégation SQL)

#### 1.3 Gestion vendeurs
- **Liste** : tableau paginé, trié, filtrable
  - Colonnes : avatar, nom, slug, email, plan, KYC status, date inscription, revenus totaux, nb commandes
  - Filtres : plan (FREE/PRO), KYC status, actif/supprimé, date range
  - Recherche : email, slug, displayName
- **Détail vendeur** :
  - Profil complet (toutes les infos)
  - Stats : revenus, commandes, clients, visites
  - Liste des blocs actifs
  - Liste des commandes récentes
  - Liste des retraits
  - Communautés
  - Historique d'actions admin (logs)
- **Actions** :
  - Changer le plan (FREE → PRO, PRO → FREE)
  - Approuver/rejeter KYC (avec motif de rejet)
  - Suspendre le compte (soft ban — met `deletedAt`)
  - Réactiver le compte
  - **Supprimer définitivement** un vendeur (hard delete — met `hardDeletedAt`, anonymise les données personnelles, conserve les commandes/revenus pour la comptabilité). Nécessite confirmation double + SUPER_ADMIN.
  - **Bloquer les retraits** pour un vendeur spécifique (`withdrawalBlocked = true`) — le vendeur voit un message "Retraits suspendus, contacte le support" dans son dashboard. Avec motif obligatoire.
  - **Changer le taux de commission** par vendeur (`customCommissionRate` en basis points). Ex: 300 = 3%, 500 = 5%, null = taux global. L'admin voit le taux actuel et peut le modifier.
  - Reset mot de passe (envoie un email)
  - Impersonation (générer un token temporaire pour debug — SUPER_ADMIN only)

### Phase 2 — Finance & Opérations

#### 2.1 Gestion KYC
- **File d'attente** : liste des vendeurs avec `kycStatus = "PENDING"`
  - Affichage des pièces : photo ID + selfie (images affichées directement)
  - Nom complet déclaré vs nom sur la pièce
  - Date de soumission
  - Boutons : Approuver / Rejeter (avec motif)
- **Historique** : tous les KYC traités (APPROVED + REJECTED)
- Les changements de statut sont loggés dans AdminLog

#### 2.2 Gestion commandes
- **Liste globale** : toutes les commandes de la plateforme
  - Colonnes : référence, vendeur, client, type, montant, commission Izy, statut, date
  - Filtres : statut (PAID/PENDING/FAILED/EXPIRED/REFUNDED), type (SALE/BOOKING/PAYMENT), vendeur, date range
  - Recherche : référence, email client
- **Détail commande** :
  - Toutes les infos (vendeur, client, produit, montant, commission, statut, dates)
  - Bump selections
  - Booking details (si booking)
  - Webhook logs liés (par paymentExternalId)
- **Actions** :
  - Marquer comme PAID manuellement (cas webhook manqué)
  - Marquer comme REFUNDED
  - Note admin

#### 2.3 Gestion retraits
- **Liste globale** : tous les retraits
  - Colonnes : vendeur, montant, opérateur (wave/orange), téléphone, statut, date, référence
  - Filtres : statut (PENDING/PROCESSING/COMPLETED/REJECTED), opérateur, date range
- **Actions** :
  - Approuver un retrait PENDING (lance le payout Bictorys)
  - Rejeter un retrait PENDING (avec motif)
  - Re-tenter un retrait REJECTED
  - Voir le détail Bictorys (transactionId, fee, failureReason)
- **Option future** : mode review obligatoire (les retraits > X FCFA nécessitent une approbation admin)

#### 2.4 Revenus plateforme & Configuration taux
- **Vue finance** : tableau de bord financier
  - Revenus commissions (orders) par période
  - Revenus commissions (community) par période
  - Total retraits effectués
  - Solde plateforme (commissions collectées - frais)
  - Graphique revenus vs retraits
  - Top vendeurs par revenus
  - Répartition par type de bloc (SALE, BOOKING, PAYMENT, COMMUNITY)
- **Configuration taux global** :
  - Taux commission orders (défaut : 5% = 500 bp)
  - Taux commission communautés (défaut : 3% = 300 bp)
  - Stocké dans `PlatformConfig` (clé `commissionRate`)
  - Modification loggée dans AdminLog
  - Les vendeurs avec `customCommissionRate != null` ne sont PAS affectés par le changement global
- **Liste des taux personnalisés** :
  - Tableau des vendeurs avec un taux custom (vendeur, taux actuel, date modification)
  - Action rapide : remettre au taux global

### Phase 3 — Communautés & Analytics

#### 3.1 Gestion communautés
- **Liste** : toutes les communautés
  - Colonnes : titre, vendeur, prix, période, membres actifs, MRR, statut
  - Filtres : actif/inactif, période billing, range prix
- **Détail communauté** :
  - Infos : titre, vendeur, bot Telegram, prix, période
  - Abonnés : liste paginée (email, statut, dernier paiement, date fin période)
  - Paiements : historique paginé (référence, montant, statut, date)
  - Stats : MRR, churn rate, LTV moyen
- **Actions** :
  - Désactiver/réactiver une communauté
  - Annuler un abonnement manuellement
  - Résoudre un paiement PENDING (marquer COMPLETED/FAILED)
  - Régénérer un lien d'invitation Telegram

#### 3.1b Page Community Billing (cron monitoring)

Page dédiée pour superviser le cron `communityBilling.ts` et ses 8 jobs :

**KPIs en haut de page :**
- Nombre total de relances envoyées (aujourd'hui / cette semaine / ce mois)
- Taux de paiement global : % des relances qui aboutissent à un paiement COMPLETED
- Taux de churn : % des abonnés qui finissent EXPIRED après grace period
- Commission totale collectée sur les paiements communauté (période sélectionnable)
- Paiements PENDING en attente (potentiellement bloqués)

**Tableau des relances (CommunityNotification) :**
- Colonnes : date, type de relance, communauté, vendeur, membre (email), canal (email/telegram), statut paiement résultant
- Types visibles :
  - `RENEWAL_REMINDER` — Rappel J-3
  - `PAYMENT_FAILED` — Paiement échoué (début grace period)
  - `GRACE_DAY_1` / `GRACE_DAY_2` / `GRACE_DAY_3` — Rappels quotidiens grace period
  - `KICKED` — Membre retiré du groupe
  - `CANCELED` — Annulation volontaire effective
- Filtres : type de relance, communauté, vendeur, date range
- Recherche : email membre

**Tableau des liens de paiement (CommunityPayment) :**
- Colonnes : référence, communauté, membre, montant, lien de paiement (tronqué + copie), statut (PENDING/COMPLETED/FAILED), date création, date completion
- Filtres : statut, communauté, date range
- Vue : lien cliquable pour ouvrir l'URL de paiement Bictorys
- **Taux de conversion** : % des liens créés → paiement COMPLETED

**Qui paye — Tableau des paiements COMPLETED :**
- Colonnes : date, membre (nom + email), communauté, vendeur, montant, commission Izy, montant vendeur, référence
- Filtres : communauté, vendeur, date range
- Total en bas : somme montants, somme commissions

**Taux de commission :**
- Vue par communauté : taux appliqué (global ou custom vendeur), montant total commissions
- Comparaison FREE (8%) vs PRO (4%) — ou custom si `customCommissionRate` défini
- Possibilité de voir l'impact d'un changement de taux (simulation)

**Statut du cron :**
- Dernier run : timestamp + durée
- Résultat par job :
  - `recheckPendingPayments` — X vérifiés, Y confirmés
  - `cleanupStalePending` — X abonnements expirés
  - `healthCheckCommunities` — X communautés vérifiées, Y désactivées
  - `detectLeftMembers` — X membres partis détectés
  - `processRenewalReminders` — X rappels J-3 envoyés
  - `processExpirations` — X expirés, Y en grace period
  - `processGracePeriod` — X rappels envoyés, Y kickés
  - `processCancelations` — X annulations effectives
- Bouton : **Forcer un run maintenant** (SUPER_ADMIN only, déclenche `runCommunityBilling()` manuellement)

#### 3.1c Page Communautés Telegram

Vue de toutes les communautés Telegram connectées à la plateforme :

**Liste des communautés Telegram :**
- Colonnes : titre du groupe, chat ID, vendeur, bot utilisé, membres actifs, statut (active/désactivée), dernier health check
- Filtres : statut, vendeur

**Liste des bots Telegram :**
- Colonnes : nom du bot, bot username, vendeur, nombre de communautés liées, date création
- Info : token masqué (affichage partiel `xxxx...xxxx`)

**Health check :**
- Résultat du dernier `healthCheckCommunities` pour chaque communauté
- Statut : OK / Bot retiré / Groupe supprimé / Erreur
- Bouton : **Relancer le health check** pour une communauté spécifique

**Actions :**
- Désactiver une communauté depuis cette vue
- Voir le détail (lien vers page détail communauté)
- Copier le chat ID pour debug

#### 3.2 Analytics plateforme
- **Trafic temps réel** (Google Analytics Data API) :
  - Visiteurs actifs maintenant sur toutes les boutiques
  - Pages vues / 30 dernières minutes
  - Top boutiques par trafic en ce moment
  - Top pays en temps réel
- **Trafic historique** (nos PageView + GA4) :
  - Total visites par jour (graphique)
  - Géographie : répartition des visiteurs par pays
  - Sources : répartition par source de trafic
- **Performance boutiques** :
  - Nombre total de boutiques actives (avec trend)
  - Top vendeurs par visites, par revenus, par commandes
  - Boutiques inactives (pas de visite depuis X jours)
- **Conversion** : taux global visiteurs → commandes
- **Croissance** : nouveaux vendeurs par semaine/mois, nouveaux clients

### Phase 4 — Système & Monitoring

#### 4.1 Webhook logs
- **Liste** : tous les webhooks reçus
  - Colonnes : provider, eventType, externalId, status, date
  - Filtres : provider, status (ok/error), date range
  - Recherche : externalId
- **Détail** : payload JSON complet, erreur si applicable
- **Action** : rejouer un webhook (re-traitement)

#### 4.2 Santé système
- **Queues** : stats email queue + community queue (taille, processing, failed)
- **Cron jobs** : dernier run, durée, erreurs
- **Base de données** : nombre d'enregistrements par table
- **Stockage** : total fichiers uploadés, taille totale
- **Rate limiting** : IPs bloquées, endpoints les plus sollicités

#### 4.3 Audit logs
- **Journal complet** : toutes les actions admin
  - Qui, quoi, quand, sur quoi, détails
  - Filtrable par admin, action, cible, date

### Phase 5 — Modération & Support

#### 5.1 Modération contenu
- **Signalements** (future) : système de report par les visiteurs
- **Revue manuelle** : parcourir les pages vendeurs pour vérifier le contenu
- **Actions** :
  - Désactiver un bloc spécifique
  - Suspendre un vendeur avec motif
  - Notification email au vendeur

#### 5.2 Outils support
- **Recherche globale** : chercher par email, slug, référence commande, téléphone
- **Impersonation** : se connecter en tant qu'un vendeur pour debug (SUPER_ADMIN only, loggé)
- **Debug paiement** : vérifier le statut d'une transaction Bictorys par transactionId
- **Regénérer lien** : créer un nouveau lien de téléchargement pour un client

---

## UI/UX Design

### Layout
- **Sidebar fixe** (gauche) : navigation par section, collapsible sur mobile
- **TopBar** : nom admin, notifications (alertes), bouton déconnexion
- **Couleurs** : fond gris-50, sidebar gris-900/teal-accent, cards blanches, alertes rouge/amber
- **Mobile** : sidebar se transforme en drawer, tableaux en mode "cards empilées"
- **Responsive** : breakpoints `sm` (cards), `md` (tableau compact), `lg` (tableau complet)

### Composants réutilisables à créer
- `AdminTable` — tableau paginé, trié, filtrable (avec skeleton loading)
- `AdminCard` — carte KPI avec icône, valeur, variation
- `AdminFilter` — barre de filtres (chips, date range picker, select)
- `AdminSearch` — recherche globale avec résultats groupés
- `AdminModal` — modal de confirmation pour actions destructives
- `AdminBadge` — badge coloré pour statuts (PAID=vert, PENDING=ambre, FAILED=rouge)
- `AdminChart` — graphique réutilisable (revenus, visites)
- `AdminDetailRow` — ligne label:valeur pour les pages détail
- `AdminActionButton` — bouton d'action avec confirmation et loading

### Navigation sidebar
```
📊 Dashboard
👥 Vendeurs
  → Liste
  → KYC en attente
💳 Commandes
💸 Retraits
👥 Communautés
  → Liste
  → Community Billing (relances, paiements, taux)
  → Telegram (bots, groupes, health)
📈 Analytics
🔧 Système
  → Webhooks
  → Queues
  → Audit logs
```

---

## Plan d'implémentation

### Sprint 1 — Auth + Dashboard + Vendeurs (1-2 semaines)
1. Ajouter modèles `Admin` + `AdminLog` + `PlatformConfig` + champs Seller (`withdrawalBlocked`, `customCommissionRate`, `hardDeletedAt`) au schema Prisma
2. Créer middleware `requireAdmin` + routes auth admin
3. Créer le layout admin (sidebar, topbar, responsive)
4. Page dashboard KPIs (dont boutiques en temps réel + trafic via GA4 ou PageView)
5. Page liste vendeurs (tableau paginé, filtres, recherche)
6. Page détail vendeur (avec actions : supprimer, bloquer retraits, changer taux commission)

### Sprint 2 — KYC + Finance (1 semaine)
7. Page KYC review (file d'attente + approve/reject)
8. Page liste commandes (tableau global)
9. Page détail commande
10. Page liste retraits + actions (approve/reject)
11. Page revenus plateforme (graphiques, top vendeurs) + configuration taux global + liste taux custom

### Sprint 3 — Communautés + Analytics (1-2 semaines)
12. Page liste communautés
13. Page détail communauté (abonnés, paiements)
14. **Page Community Billing** (relances, liens paiement, qui paye, taux, statut cron, bouton force run)
15. **Page Communautés Telegram** (bots, groupes, health check, statuts)
16. Page analytics plateforme (trafic temps réel GA4, visites, géo, sources, performance boutiques, croissance)

### Sprint 4 — Système + Polish (1 semaine)
17. Page webhook logs
18. Page santé système (queues, cron, DB stats)
19. Page audit logs
20. Recherche globale
21. Tests, polish UI, responsive final

---

## Sécurité

- JWT admin **séparé** du JWT vendeur (cookie `izy-admin-token`)
- CSRF protection sur toutes les mutations admin
- Rate limiting strict sur le login admin (5 tentatives / 15 min)
- **Toute action admin est loggée** dans `AdminLog` avec IP
- Impersonation uniquement pour SUPER_ADMIN, loggée, avec token de durée limitée (15 min)
- Les routes admin sont sur un préfixe séparé `/api/admin/*`
- En production : whitelist IP optionnelle via middleware
- Hard delete : anonymise email/nom/téléphone, conserve les données financières pour comptabilité
- Bloquer retraits : le backend vérifie `withdrawalBlocked` dans `POST /api/withdrawals` AVANT le payout
- Taux commission : le backend lit `customCommissionRate` du seller, ou fallback vers `PlatformConfig.commissionRate`

---

## Pré-requis réalisés (avant Sprint 1)

### Infrastructure Redis (Upstash)

Toute l'infrastructure Redis a été mise en place avant de démarrer le dashboard admin.

| Composant | Fichier(s) | Clés Redis |
|---|---|---|
| **Client Redis** | `backend/src/lib/redis.ts` | — |
| **Job Queues** (email + community) | `backend/src/lib/queues/JobQueue.ts` | `queue:{name}:waiting`, `queue:{name}:delayed`, `queue:{name}:dead`, `queue:{name}:stats` |
| **Rate Limiting** (15 limiters) | `backend/src/lib/rateLimitStore.ts` | `rl:{prefix}:{ip}` avec TTL = windowMs |
| **Analytics Dedup** | `backend/src/routes/analytics.ts` | `dedup:pv:{sellerId}:{ip}:{path}` (TTL 1h), `dedup:bc:{ip}:{blockId}` (TTL 5min) |
| **Cron Status** | `backend/src/lib/cron/communityBilling.ts` | `cron:communityBilling:lastRun` (TTL 25h) |

**Rate limiters migrés** (15 au total dans 6 fichiers) :
- `index.ts` : `global`, `auth`, `track`, `write`
- `auth.ts` : `signup`, `login`, `verify-email`, `resend-code`, `reset-password`
- `orders.ts` : `create-order`, `lead-magnet`, `lead-product`, `status-poll`
- `communities.ts` : `subscribe`
- `partnerships.ts` : `partnership`
- `withdrawals.ts` : `withdrawal`

### Audit sécurité — corrections appliquées

| ID | Sévérité | Fichier | Correction |
|---|---|---|---|
| SEC-1 | 🔴 | `communities.ts:562` | `err.message` interne ne fuit plus vers le client |
| SEC-2 | 🔴 | `index.ts:189` | `/api/queues/stats` protégé par `requireAuth` |

### Audit bugs logiques — corrections appliquées

| ID | Sévérité | Fichier | Correction |
|---|---|---|---|
| BUG-2 | 🟡 | `communities.ts:460` | Souscription communauté dans transaction `Serializable` (anti-doublon) |
| BUG-3 | 🟡 | `webhooksTelegram.ts:172` | `memberCount` protégé par `GREATEST(0, ...)` (jamais négatif) |
| BUG-4 | 🟡 | `orders.ts:229` | Booking slot check inclut les commandes `PENDING` < 30min (anti double-booking) |
| BUG-5 | 🟡 | `orders.ts:978` | Download count atomique via `UPDATE ... WHERE "downloadCount" < 5` |

### Audit code — nettoyage appliqué

| ID | Fichier | Correction |
|---|---|---|
| FRAG-1 | `orders.ts:14` | Import dynamique `await import()` → import statique |
| FRAG-2 | `index.ts` | `console.log/error` → `logger.log/error` dans les 3 crons |
| FRAG-3 | `index.ts` | Import dupliqué `prisma as cleanupPrisma` supprimé |
| DEAD-2 | `auth.ts` | `clearAuthCookie` deprecated wrapper supprimé |

### Impact sur le dashboard admin

Ces changements facilitent le Sprint 4 (Système & Monitoring) :
- **Page Queues** : les stats sont déjà dans Redis (`queue:{name}:stats`), lisibles via `getEmailQueueStats()` / `getCommunityQueueStats()`
- **Page Cron Status** : le statut du dernier run est dans Redis (`cron:communityBilling:lastRun`), format JSON `{ timestamp, durationMs, results: { job: "ok"|"error" } }`
- **Page Rate Limiting** : les compteurs sont dans Redis (`rl:{prefix}:{ip}`), possibilité de lister les clés pour monitoring
- **`/api/queues/stats`** est déjà protégé par `requireAuth`, à migrer vers `requireAdmin` au Sprint 1.2

---

## Résumé des nouvelles fonctionnalités ajoutées

| Fonctionnalité | Modèle impacté | Phase |
|---|---|---|
| Supprimer définitivement un vendeur | `Seller.hardDeletedAt` | Sprint 1 |
| Bloquer les retraits par vendeur | `Seller.withdrawalBlocked` + check dans withdrawals.ts | Sprint 1 |
| Taux commission personnalisé par vendeur | `Seller.customCommissionRate` | Sprint 1 |
| Taux commission global configurable | `PlatformConfig` | Sprint 2 |
| Boutiques en temps réel + trafic | Google Analytics Data API + PageView | Sprint 1+3 |
