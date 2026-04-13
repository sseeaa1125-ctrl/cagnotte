# Fari.store — Database Schema

## Vue d'ensemble

Base de données PostgreSQL (hébergée sur Neon), gérée via Prisma ORM.

10 tables :
- `Seller` — Vendeurs (ceux qui créent une page Fari)
- `Block` — Blocs de contenu (lien, vente, booking, paiement libre). Architecture modulaire : le champ `config` (JSON) contient la configuration spécifique à chaque type de bloc
- `Product` — Produits digitaux à vendre (associés à un bloc de type SALE)
- `BookingService` — Services réservables (associés à un bloc de type BOOKING)
- `BookingSlot` — Créneaux horaires récurrents (disponibilités du vendeur)
- `Order` — Commandes (achat, réservation, paiement libre)
- `Customer` — Clients des vendeurs (collectés automatiquement lors des achats)
- `FileUpload` — Fichiers uploadés (couvertures, fichiers digitaux, avatars)
- `WebhookLog` — Journal des webhooks (audit paiements)
- `VerificationCode` — Codes de vérification email temporaires

---

## Diagramme des relations

```
Seller (1) ─────── (N) Block
   │                     │
   │                     ├── (0..1) Product       [si type = SALE]
   │                     └── (0..1) BookingService [si type = BOOKING]
   │                                    │
   │                                    └── (N) BookingSlot
   │
   ├── (N) Order ──── (0..1) Customer
   │                   
   ├── (N) Customer
   │
   └── (N) FileUpload

WebhookLog (standalone)
VerificationCode (standalone, lié à Seller par email)
```

---

## Principes d'architecture

### 1. Blocs modulaires via JSON config

Chaque bloc a un `type` (enum) et un `config` (JSON). Le JSON est validé par un schema Zod côté serveur selon le type. Cela permet d'ajouter un nouveau type de bloc sans migration de base de données — il suffit de :
1. Ajouter une valeur à l'enum `BlockType`
2. Créer le schema Zod de validation
3. Créer le composant React de rendu

```
Block (type: LINK)     → config: { title, url, icon }
Block (type: SALE)     → config: { productId }  + relation Product
Block (type: BOOKING)  → config: { serviceId }  + relation BookingService
Block (type: PAYMENT)  → config: { title, description, suggestedAmounts, minAmount, maxAmount }
```

### 2. Paiement provider-agnostic

La table `Order` stocke un `paymentProvider` (enum) et un `paymentExternalId` (string). Le code de paiement est isolé derrière une interface. Ajouter un nouveau provider = ajouter une valeur à l'enum + un adaptateur.

### 3. Pas de wallet interne

L'argent va directement du client au mobile money du vendeur via Bictorys. Fari ne garde jamais l'argent. La commission est calculée et affichée, mais prélevée par Bictorys au moment du versement.

---

## Schema Prisma complet

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =============================================
// SELLER — Vendeur (créateur de page Fari)
// =============================================
// Le vendeur s'inscrit avec email + mot de passe.
// Il choisit un slug unique qui devient son sous-domaine : slug.fari.store
model Seller {
  id              String    @id @default(cuid())
  email           String    @unique
  password        String    // Hash bcrypt. Toujours requis (contrairement à PSNBox)
  emailVerified   Boolean   @default(false)

  // Profil public
  slug            String    @unique // amadou → amadou.fari.store
  displayName     String    // "Awa Fitness"
  bio             String?   // Max 150 caractères
  avatarUrl       String?   // URL Vercel Blob
  
  // Réseaux sociaux (affichés sous le nom)
  instagramUrl    String?
  tiktokUrl       String?
  youtubeUrl       String?
  facebookUrl     String?
  whatsappNumber  String?   // Numéro WhatsApp (ex: "+221771234567")
  twitterUrl      String?
  telegramUrl     String?
  websiteUrl      String?

  // Thème de la page publique
  themeId         String    @default("default") // Référence au thème (default, ocean, forest, sunset, rose, midnight, charcoal, slate)

  // Paiement
  payoutPhone     String?   // Numéro mobile money pour recevoir les versements
  payoutProvider  String?   // "wave", "orange_money", "free_money"

  // Plan
  plan            Plan      @default(FREE)
  planExpiresAt   DateTime? // Null = free. Date d'expiration pour Pro

  // Relations
  blocks          Block[]
  orders          Order[]
  customers       Customer[]
  fileUploads     FileUpload[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([slug])
  @@index([email])
}

enum Plan {
  FREE
  PRO
}

// =============================================
// BLOCK — Bloc de contenu (architecture modulaire)
// =============================================
// Chaque bloc a un type et une configuration JSON.
// L'ordre d'affichage est déterminé par `position`.
// Le vendeur peut activer/désactiver chaque bloc.
model Block {
  id          String    @id @default(cuid())
  sellerId    String
  seller      Seller    @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  type        BlockType
  position    Int       // Ordre d'affichage (0, 1, 2, ...)
  isActive    Boolean   @default(true)
  config      Json      // Configuration spécifique au type (validée par Zod côté serveur)

  // Relations optionnelles selon le type
  product         Product?        // Si type = SALE
  bookingService  BookingService? // Si type = BOOKING

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([sellerId, position])
  @@index([sellerId, isActive])
}

enum BlockType {
  LINK       // Lien externe (Instagram, WhatsApp, etc.)
  SALE       // Vente de produit digital
  BOOKING    // Réservation de service
  PAYMENT    // Paiement libre (montant choisi par le client)
  // Futurs types (V2+) :
  // SUBSCRIPTION  // Abonnement récurrent
  // EVENT         // Billetterie événement
  // FORM          // Formulaire / capture email
}

// =============================================
// PRODUCT — Produit digital à vendre
// =============================================
// Lié à un bloc de type SALE. Un bloc SALE = un produit.
model Product {
  id            String    @id @default(cuid())
  blockId       String    @unique
  block         Block     @relation(fields: [blockId], references: [id], onDelete: Cascade)

  title         String    // "Programme Été 2026"
  description   String?   // Max 500 caractères
  price         Int       // Prix en FCFA (minimum 500). Int car FCFA n'a pas de centimes
  currency      String    @default("XOF")
  
  coverUrl      String?   // Image de couverture (Vercel Blob URL)
  fileUrl       String    // Fichier à livrer (Vercel Blob URL)
  fileName      String    // Nom original du fichier ("programme-ete-2026.pdf")
  fileSize      Int       // Taille en octets

  totalSales    Int       @default(0) // Compteur de ventes (dénormalisé pour perf)
  totalRevenue  Int       @default(0) // Revenu total en FCFA (dénormalisé)

  orders        Order[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// =============================================
// BOOKING SERVICE — Service réservable
// =============================================
// Lié à un bloc de type BOOKING. Un bloc BOOKING = un service.
model BookingService {
  id            String    @id @default(cuid())
  blockId       String    @unique
  block         Block     @relation(fields: [blockId], references: [id], onDelete: Cascade)

  title         String    // "Coaching privé 1h"
  description   String?
  price         Int       // Prix en FCFA
  currency      String    @default("XOF")
  duration      Int       // Durée en minutes (30, 45, 60, 90, 120)
  location      String?   // "Mon studio à Almadies" ou "Google Meet"
  
  // Délai minimum avant réservation (en heures)
  minAdvanceHours Int     @default(24)

  // Créneaux de disponibilité
  slots         BookingSlot[]
  orders        Order[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// =============================================
// BOOKING SLOT — Créneaux de disponibilité
// =============================================
// Définit les jours et heures où le vendeur est disponible.
// Exemple : "Lundi 9h-12h et 14h-17h", "Mardi 10h-16h"
model BookingSlot {
  id                String          @id @default(cuid())
  bookingServiceId  String
  bookingService    BookingService  @relation(fields: [bookingServiceId], references: [id], onDelete: Cascade)

  dayOfWeek     Int       // 0 = Lundi, 1 = Mardi, ..., 6 = Dimanche
  startTime     String    // "09:00" (format HH:mm)
  endTime       String    // "17:00" (format HH:mm)

  createdAt     DateTime  @default(now())

  @@index([bookingServiceId, dayOfWeek])
}

// =============================================
// ORDER — Commande (achat, réservation, paiement libre)
// =============================================
// Table unifiée pour les 3 types de transactions.
// Le type est déterminé par `orderType`.
model Order {
  id              String      @id @default(cuid())
  reference       String      @unique // Référence courte lisible : "FA-A1B2C3"
  sellerId        String
  seller          Seller      @relation(fields: [sellerId], references: [id])

  // Type de commande
  orderType       OrderType

  // Montant
  amount          Int         // Montant payé en FCFA
  currency        String      @default("XOF")
  commissionRate  Float       // 0.05 = 5%, 0.03 = 3%
  commissionAmount Int        // Commission Fari en FCFA
  sellerAmount    Int         // Montant net pour le vendeur (amount - commissionAmount)

  // Paiement
  paymentStatus   PaymentStatus @default(PENDING)
  paymentProvider String      @default("bictorys") // "bictorys", futur: "cinetpay", "stripe"
  paymentExternalId String?   // ID de transaction chez le provider
  paymentOperator String?     // "wave", "orange_money", "free_money"
  paidAt          DateTime?   // Date de confirmation du paiement

  // Client
  customerId      String?
  customer        Customer?   @relation(fields: [customerId], references: [id])
  customerEmail   String      // Email du client (toujours requis)
  customerName    String?     // Nom du client (requis pour booking)
  customerPhone   String?     // Téléphone du client (requis pour booking)

  // Référence au produit/service (selon orderType)
  productId       String?
  product         Product?    @relation(fields: [productId], references: [id])
  bookingServiceId String?
  bookingService  BookingService? @relation(fields: [bookingServiceId], references: [id])

  // Données spécifiques au type
  // Pour SALE : lien de téléchargement
  downloadUrl     String?     // URL temporaire de téléchargement (expire 72h)
  downloadCount   Int         @default(0) // Nombre de téléchargements (max 3)
  downloadExpiresAt DateTime? // Expiration du lien

  // Pour BOOKING : détails du créneau réservé
  bookingDate     DateTime?   // Date + heure du rendez-vous
  bookingDuration Int?        // Durée en minutes
  bookingLocation String?     // Lieu
  bookingCancelled Boolean    @default(false)
  bookingCancelledAt DateTime?

  // Pour PAYMENT : note optionnelle du client
  paymentNote     String?     // "Facture logo Mars 2026"

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([sellerId, createdAt])
  @@index([sellerId, paymentStatus])
  @@index([customerEmail])
  @@index([paymentExternalId])
  @@index([reference])
}

enum OrderType {
  SALE      // Achat de produit digital
  BOOKING   // Réservation de service
  PAYMENT   // Paiement libre
}

enum PaymentStatus {
  PENDING   // En attente de paiement
  PAID      // Payé et confirmé
  FAILED    // Paiement échoué
  REFUNDED  // Remboursé (annulation booking)
  EXPIRED   // Expiré (pas payé dans les 30 min)
}

// =============================================
// CUSTOMER — Client d'un vendeur
// =============================================
// Créé automatiquement lors du premier achat chez un vendeur.
// Un même email peut être client chez plusieurs vendeurs (relation par sellerId).
model Customer {
  id          String    @id @default(cuid())
  sellerId    String
  seller      Seller    @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  email       String
  name        String?
  phone       String?

  totalSpent  Int       @default(0) // Total dépensé chez ce vendeur (dénormalisé)
  orderCount  Int       @default(0) // Nombre de commandes (dénormalisé)

  orders      Order[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([sellerId, email]) // Un email = un client par vendeur
  @@index([sellerId])
}

// =============================================
// FILE UPLOAD — Fichiers uploadés
// =============================================
// Tracking de tous les fichiers pour nettoyage et quotas.
model FileUpload {
  id          String    @id @default(cuid())
  sellerId    String
  seller      Seller    @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  url         String    // URL Vercel Blob
  fileName    String    // Nom original
  fileSize    Int       // Taille en octets
  mimeType    String    // "image/jpeg", "application/pdf", etc.
  purpose     String    // "avatar", "cover", "digital_product"

  createdAt   DateTime  @default(now())

  @@index([sellerId])
}

// =============================================
// WEBHOOK LOG — Journal des webhooks
// =============================================
// Log de chaque webhook reçu de Bictorys (ou autre provider).
// Pour audit et debug. Jamais supprimé.
model WebhookLog {
  id          String    @id @default(cuid())
  provider    String    // "bictorys"
  eventType   String    // "payment.success", "payment.failed"
  externalId  String?   // ID de transaction chez le provider
  payload     Json      // Corps brut du webhook
  status      String    // "processed", "ignored", "error"
  error       String?   // Message d'erreur si status = "error"
  
  createdAt   DateTime  @default(now())

  @@index([provider, externalId])
  @@index([createdAt])
}

// =============================================
// VERIFICATION CODE — Codes email temporaires
// =============================================
// Code à 6 chiffres envoyé par email lors de l'inscription.
// Expire après 10 minutes. Max 5 tentatives.
model VerificationCode {
  id          String    @id @default(cuid())
  email       String
  code        String    // Code à 6 chiffres (stocké en clair, pas de hash nécessaire car expire vite)
  attempts    Int       @default(0) // Nombre de tentatives (max 5)
  expiresAt   DateTime  // now() + 10 minutes
  usedAt      DateTime? // Null = pas encore utilisé

  createdAt   DateTime  @default(now())

  @@index([email, code])
  @@index([expiresAt])
}
```

---

## Schemas Zod de validation par type de bloc

```typescript
// lib/blocks/schemas.ts

import { z } from "zod";

// ── Bloc LINK ──
export const linkBlockConfigSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().url(),
  icon: z.enum([
    "instagram", "whatsapp", "tiktok", "youtube",
    "facebook", "telegram", "twitter", "website", "other"
  ]),
});

// ── Bloc SALE ──
// La config du bloc SALE est minimale car les données sont dans la table Product
export const saleBlockConfigSchema = z.object({
  productId: z.string().cuid(),
});

// ── Bloc BOOKING ──
// Idem, les données sont dans BookingService
export const bookingBlockConfigSchema = z.object({
  serviceId: z.string().cuid(),
});

// ── Bloc PAYMENT ──
export const paymentBlockConfigSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  suggestedAmounts: z.array(z.number().min(500)).max(4).default([5000, 10000, 25000]),
  minAmount: z.number().min(500).default(500),
  maxAmount: z.number().min(500).optional(),
});

// ── Dispatcher ──
export const blockConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("LINK"), config: linkBlockConfigSchema }),
  z.object({ type: z.literal("SALE"), config: saleBlockConfigSchema }),
  z.object({ type: z.literal("BOOKING"), config: bookingBlockConfigSchema }),
  z.object({ type: z.literal("PAYMENT"), config: paymentBlockConfigSchema }),
]);
```

---

## Requêtes critiques

### 1. Charger une page publique vendeur (la requête la plus fréquente)

```typescript
const seller = await prisma.seller.findUnique({
  where: { slug },
  include: {
    blocks: {
      where: { isActive: true },
      orderBy: { position: "asc" },
      include: {
        product: true,
        bookingService: {
          include: { slots: true },
        },
      },
    },
  },
});
```

**Performance** : cette requête est le hot path. Elle doit être < 50ms. L'index sur `slug` + l'index composé sur `[sellerId, position]` garantissent ça.

### 2. Dashboard — Stats du vendeur

```typescript
const [todayOrders, monthOrders, totalCustomers] = await Promise.all([
  prisma.order.aggregate({
    where: { sellerId, paymentStatus: "PAID", createdAt: { gte: startOfToday } },
    _sum: { sellerAmount: true },
    _count: true,
  }),
  prisma.order.aggregate({
    where: { sellerId, paymentStatus: "PAID", createdAt: { gte: startOfMonth } },
    _sum: { sellerAmount: true },
    _count: true,
  }),
  prisma.customer.count({ where: { sellerId } }),
]);
```

### 3. Vérifier les créneaux disponibles (Booking)

```typescript
// 1. Récupérer les créneaux récurrents du jour demandé
const daySlots = await prisma.bookingSlot.findMany({
  where: { bookingServiceId, dayOfWeek: targetDay },
  orderBy: { startTime: "asc" },
});

// 2. Récupérer les réservations existantes ce jour
const existingBookings = await prisma.order.findMany({
  where: {
    bookingServiceId,
    orderType: "BOOKING",
    paymentStatus: "PAID",
    bookingCancelled: false,
    bookingDate: {
      gte: startOfTargetDay,
      lt: endOfTargetDay,
    },
  },
  select: { bookingDate: true, bookingDuration: true },
});

// 3. Calculer les créneaux libres côté serveur
// (soustraire les réservations existantes des disponibilités)
```

### 4. Créer une commande + lancer le paiement

```typescript
const order = await prisma.$transaction(async (tx) => {
  // 1. Créer ou récupérer le customer
  const customer = await tx.customer.upsert({
    where: { sellerId_email: { sellerId, email: customerEmail } },
    create: { sellerId, email: customerEmail, name: customerName, phone: customerPhone },
    update: { name: customerName, phone: customerPhone },
  });

  // 2. Calculer la commission
  const commissionRate = seller.plan === "PRO" ? 0.03 : 0.05;
  const commissionAmount = Math.round(amount * commissionRate);
  const sellerAmount = amount - commissionAmount;

  // 3. Créer la commande
  const order = await tx.order.create({
    data: {
      reference: generateReference(), // "FA-A1B2C3"
      sellerId,
      orderType,
      amount,
      commissionRate,
      commissionAmount,
      sellerAmount,
      customerId: customer.id,
      customerEmail,
      customerName,
      customerPhone,
      productId: orderType === "SALE" ? productId : null,
      bookingServiceId: orderType === "BOOKING" ? serviceId : null,
      bookingDate: orderType === "BOOKING" ? bookingDate : null,
      bookingDuration: orderType === "BOOKING" ? duration : null,
      bookingLocation: orderType === "BOOKING" ? location : null,
      paymentNote: orderType === "PAYMENT" ? note : null,
    },
  });

  return order;
});

// 4. Lancer le paiement via Bictorys (hors transaction)
const payment = await paymentProvider.createTransaction({
  amount: order.amount,
  currency: "XOF",
  operator: selectedOperator,
  reference: order.reference,
  callbackUrl: `${BASE_URL}/api/webhooks/bictorys`,
});

// 5. Mettre à jour l'ID externe
await prisma.order.update({
  where: { id: order.id },
  data: { paymentExternalId: payment.externalId },
});
```

---

## Limites par plan

| Ressource | FREE | PRO |
|---|---|---|
| Blocs actifs | 3 max | Illimité |
| Produits (blocs SALE) | 1 max | Illimité |
| Services booking (blocs BOOKING) | 1 max | Illimité |
| Commission | 5% | 3% |
| Stockage fichiers | 100 MB total | 1 GB total |
| Thème | Default uniquement | Tous les thèmes |

**Vérification** : les limites sont vérifiées côté serveur à chaque création de bloc. Le client affiche aussi les limites dans le dashboard pour éviter la frustration.

---

## Migrations et seeds

### Seed de développement

```typescript
// prisma/seed.ts
async function main() {
  // Vendeur de test : Awa
  const awa = await prisma.seller.create({
    data: {
      email: "awa@test.com",
      password: await bcrypt.hash("password123", 12),
      emailVerified: true,
      slug: "awa",
      displayName: "Awa Fitness",
      bio: "Coach sportive · Dakar ⭐ 4.8",
      instagramUrl: "https://instagram.com/awafitness",
      whatsappNumber: "+221771234567",
      themeId: "default",
      plan: "PRO",
      payoutPhone: "+221771234567",
      payoutProvider: "wave",
    },
  });

  // Bloc lien Instagram
  await prisma.block.create({
    data: {
      sellerId: awa.id,
      type: "LINK",
      position: 0,
      config: { title: "Mon Instagram", url: "https://instagram.com/awafitness", icon: "instagram" },
    },
  });

  // Bloc vente
  const saleBlock = await prisma.block.create({
    data: {
      sellerId: awa.id,
      type: "SALE",
      position: 1,
      config: {},
      product: {
        create: {
          title: "Programme Été 2026 🔥",
          description: "PDF + 12 vidéos d'entraînement pour être au top cet été",
          price: 15000,
          coverUrl: "https://placeholder.com/cover.jpg",
          fileUrl: "https://placeholder.com/programme.pdf",
          fileName: "programme-ete-2026.pdf",
          fileSize: 5242880,
        },
      },
    },
  });

  // Bloc booking
  const bookingBlock = await prisma.block.create({
    data: {
      sellerId: awa.id,
      type: "BOOKING",
      position: 2,
      config: {},
      bookingService: {
        create: {
          title: "Coaching privé 1h",
          description: "Séance personnalisée à mon studio",
          price: 10000,
          duration: 60,
          location: "Studio Almadies, Dakar",
          minAdvanceHours: 24,
          slots: {
            create: [
              { dayOfWeek: 0, startTime: "09:00", endTime: "12:00" }, // Lundi matin
              { dayOfWeek: 0, startTime: "14:00", endTime: "17:00" }, // Lundi après-midi
              { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }, // Mercredi toute la journée
              { dayOfWeek: 4, startTime: "09:00", endTime: "12:00" }, // Vendredi matin
            ],
          },
        },
      },
    },
  });

  // Bloc paiement libre
  await prisma.block.create({
    data: {
      sellerId: awa.id,
      type: "PAYMENT",
      position: 3,
      config: {
        title: "Envoie-moi un paiement",
        description: "Facture, tip, ou montant libre",
        suggestedAmounts: [5000, 10000, 25000],
        minAmount: 1000,
      },
    },
  });
}
```
