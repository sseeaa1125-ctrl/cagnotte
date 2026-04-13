# Fari.store — Implementation Plan

## Principe

Ce document décrit la séquence exacte de développement, étape par étape. Chaque étape est autonome et testable avant de passer à la suivante. L'agent AI doit suivre cet ordre strictement.

**Règle** : ne jamais commencer une étape avant que la précédente soit fonctionnelle.

**Durée estimée** : 4-5 semaines à temps plein.

---

## PHASE 1 — Setup & Infrastructure (Jours 1-3)

### Étape 1.1 : Initialisation du projet

**Objectif** : un projet Next.js qui démarre sans erreur.

**Actions** :
1. `npx create-next-app@14 fari-store --typescript --tailwind --app --src-dir=false --import-alias="@/*"`
2. Nettoyer les fichiers par défaut (vider `app/page.tsx`, supprimer les styles par défaut)
3. Installer les dépendances :
   ```bash
   npm install @prisma/client @vercel/blob zod bcryptjs jose resend @react-email/components lucide-react tailwind-merge clsx @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities date-fns nanoid sharp
   npm install -D prisma @types/bcryptjs @types/node @tailwindcss/typography prettier prettier-plugin-tailwindcss
   ```
4. Configurer `tailwind.config.ts` avec la palette Fari (voir doc 3_DESIGN_SYSTEM) :
   - Pas de couleurs custom dans tailwind.config (on utilise les classes Tailwind natives : `teal-600`, `gray-200`, etc.)
   - Font `sans` → Inter
5. Configurer la font dans `app/layout.tsx` (Inter uniquement via `next/font/google`)
6. Mettre `<html lang="fr">` et le fond `bg-gray-50`
7. Créer `.env.local` avec toutes les variables (valeurs placeholder) :
   ```
   DATABASE_URL=
   BICTORYS_API_KEY=
   BICTORYS_SECRET_KEY=
   RESEND_API_KEY=
   BLOB_READ_WRITE_TOKEN=
   JWT_SECRET=
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

**Vérification** : `npm run dev` démarre. La page affiche un fond gris clair (#FAFAFA).

---

### Étape 1.2 : Base de données et Prisma

**Objectif** : toutes les tables créées et connectées.

**Actions** :
1. `npx prisma init`
2. Coller le schema complet dans `prisma/schema.prisma` (voir doc 4_DATABASE_SCHEMA — les 10 tables)
3. Configurer `DATABASE_URL` dans `.env.local` (Neon)
4. `npx prisma db push`
5. Créer `lib/prisma.ts` (singleton Prisma client) :
   ```typescript
   import { PrismaClient } from "@prisma/client";
   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
   export const prisma = globalForPrisma.prisma || new PrismaClient();
   if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
   ```
6. Créer `prisma/seed.ts` avec le vendeur Awa et ses 4 blocs (voir doc 4_DATABASE_SCHEMA → seeds)
7. `npx prisma db seed`

**Vérification** : `npx prisma studio` montre les 10 tables. Seller contient "Awa Fitness" avec 4 blocs.

---

### Étape 1.3 : Utilitaires et types

**Objectif** : les fonctions helpers et types globaux sont prêts.

**Actions** :
1. `lib/utils.ts` :
   - `formatPrice(15000)` → `"15 000 FCFA"`
   - `generateReference()` → `"FA-A1B2C3"` (préfixe FA + 6 caractères alphanumériques)
   - `cn(...classes)` → merge Tailwind (clsx + tailwind-merge)
2. `lib/auth.ts` :
   - `hashPassword(plain)` → bcrypt hash (12 rounds)
   - `verifyPassword(plain, hash)` → boolean
   - `createToken(payload)` → JWT signé (7 jours)
   - `verifyToken(token)` → payload ou null
3. `lib/blocks/schemas.ts` :
   - Schemas Zod pour chaque type de bloc (voir doc 4_DATABASE_SCHEMA → Schemas Zod)
   - `validateBlockConfig(type, config)` → validated config ou throw
4. `types/index.ts` : types globaux (Seller, Block, Order, BlockType, OrderType, PaymentStatus, etc.)

**Vérification** : importer et appeler chaque fonction. Les retours sont corrects.

---

### Étape 1.4 : Middleware sous-domaines

**Objectif** : les sous-domaines vendeurs fonctionnent en dev.

**Actions** :
1. Créer `middleware.ts` à la racine :
   ```typescript
   import { NextRequest, NextResponse } from "next/server";

   export function middleware(request: NextRequest) {
     const hostname = request.headers.get("host") || "";
     
     // En dev : utiliser un header custom ou un query param pour simuler les sous-domaines
     // En prod : lire le sous-domaine de *.fari.store
     let slug: string | null = null;

     if (hostname.includes(".fari.store")) {
       slug = hostname.split(".fari.store")[0];
     }
     // Dev : localhost:3000/store/awa simule awa.fari.store
     
     if (slug && !["www", "app", "api"].includes(slug)) {
       return NextResponse.rewrite(
         new URL(`/store/${slug}${request.nextUrl.pathname}`, request.url)
       );
     }

     // Routes dashboard : vérifier le JWT
     if (request.nextUrl.pathname.startsWith("/dashboard")) {
       const token = request.cookies.get("fari-token")?.value;
       if (!token) {
         return NextResponse.redirect(new URL("/login", request.url));
       }
     }
   }

   export const config = {
     matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
   };
   ```

2. Créer la structure de routes :
   ```
   app/
   ├── (marketing)/        → Pages marketing (landing, pricing)
   │   ├── page.tsx         → Landing page fari.store
   │   └── layout.tsx
   ├── (auth)/              → Auth pages
   │   ├── login/page.tsx
   │   ├── signup/page.tsx
   │   └── layout.tsx
   ├── dashboard/           → Dashboard vendeur (protégé)
   │   ├── page.tsx         → Vue d'ensemble
   │   ├── orders/page.tsx  → Commandes
   │   ├── revenue/page.tsx → Revenus
   │   ├── customers/page.tsx → Clients
   │   ├── settings/page.tsx  → Paramètres
   │   └── layout.tsx       → Layout dashboard (sidebar + topbar)
   ├── store/[slug]/        → Page publique vendeur (réécrite depuis sous-domaine)
   │   ├── page.tsx         → Page principale
   │   ├── checkout/page.tsx → Page de paiement
   │   └── layout.tsx
   └── api/
       ├── auth/
       │   ├── signup/route.ts
       │   ├── login/route.ts
       │   └── verify-email/route.ts
       ├── blocks/
       │   ├── route.ts          → CRUD blocs
       │   └── reorder/route.ts  → Réordonner
       ├── orders/route.ts
       ├── upload/route.ts
       └── webhooks/
           └── bictorys/route.ts
   ```

**Vérification** : `localhost:3000/store/awa` affiche une page (même vide). `localhost:3000/dashboard` redirige vers `/login`.

---

## PHASE 2 — Authentification & Dashboard Shell (Jours 4-7)

### Étape 2.1 : Composants UI de base

**Objectif** : toutes les briques visuelles réutilisables existent.

**Actions** :
1. `components/ui/Button.tsx` — variantes : primary, secondary, ghost. Tailles : sm, md, lg. Loading state.
2. `components/ui/Input.tsx` — label, placeholder, error message, helper text
3. `components/ui/Badge.tsx` — variantes : success, warning, error, info
4. `components/ui/Card.tsx` — container avec border + shadow
5. `components/ui/Modal.tsx` — overlay + bottom sheet (mobile) / centered (desktop)
6. `components/ui/Spinner.tsx` — loader animé
7. `components/ui/Avatar.tsx` — photo ronde avec fallback initiales

Chaque composant suit exactement les specs du doc 3_DESIGN_SYSTEM (border-radius, couleurs, tailles, transitions).

**Vérification** : créer une page `/test` qui affiche chaque composant dans toutes ses variantes.

---

### Étape 2.2 : Inscription

**Objectif** : un vendeur peut créer un compte.

**Actions** :
1. Page `app/(auth)/signup/page.tsx` :
   - Formulaire : nom de page (slug), email, mot de passe
   - Vérification en temps réel de la disponibilité du slug (`/api/check-slug`)
   - Affichage du preview : "ta-page.fari.store"
2. API `app/api/auth/signup/route.ts` :
   - Validation Zod (email, password min 8 chars, slug format alphanumérique)
   - Vérifier unicité email + slug
   - Hash password (bcrypt)
   - Créer Seller dans la DB
   - Envoyer code de vérification email (6 chiffres) via Resend
   - Créer JWT → cookie `fari-token` (httpOnly, secure, 7 jours)
   - Redirect vers `/dashboard`
3. API `app/api/auth/verify-email/route.ts` :
   - Vérifier le code 6 chiffres
   - Marquer `emailVerified = true`
4. Bannière dans le dashboard : "Vérifie ton email pour recevoir des paiements"

**Vérification** : créer un compte → arriver sur le dashboard → recevoir l'email de vérification.

---

### Étape 2.3 : Connexion

**Objectif** : un vendeur peut se connecter.

**Actions** :
1. Page `app/(auth)/login/page.tsx` :
   - Formulaire : email, mot de passe
   - Lien "Créer un compte" vers `/signup`
2. API `app/api/auth/login/route.ts` :
   - Vérifier email + password (bcrypt)
   - Créer JWT → cookie
   - Redirect vers `/dashboard`
3. Bouton déconnexion dans le dashboard (supprime le cookie)

**Vérification** : login → dashboard. Token invalide → redirect login.

---

### Étape 2.4 : Layout dashboard

**Objectif** : le shell du dashboard est en place (sidebar, topbar, navigation mobile).

**Actions** :
1. `app/dashboard/layout.tsx` :
   - Desktop : sidebar gauche (64rem) + contenu principal
   - Mobile : topbar + bottom tab bar
   - Sidebar items : Ma Page, Commandes, Revenus, Clients, Paramètres (voir doc 3_DESIGN_SYSTEM)
   - Item actif highlight en teal
2. `components/dashboard/Sidebar.tsx`
3. `components/dashboard/MobileNav.tsx` — bottom tab bar fixe
4. `components/dashboard/TopBar.tsx` — hamburger (mobile) + titre page + lien "Voir ma page →"

**Vérification** : naviguer entre les pages du dashboard. La sidebar highlight l'item actif. Le bottom tab bar fonctionne sur mobile.

---

## PHASE 3 — Page publique vendeur (Jours 8-12)

### Étape 3.1 : Page publique — Header vendeur

**Objectif** : la page `amadou.fari.store` affiche le profil du vendeur.

**Actions** :
1. `app/store/[slug]/page.tsx` :
   - Server component (SSR pour SEO + OG tags)
   - Fetch le seller + ses blocs actifs (voir requête doc 4_DATABASE_SCHEMA)
   - Si slug n'existe pas → 404
2. `components/store/SellerHeader.tsx` :
   - Photo de profil (96px, ronde)
   - Nom
   - Bio
   - Icônes réseaux sociaux
3. Meta tags OG dynamiques :
   ```typescript
   export async function generateMetadata({ params }): Promise<Metadata> {
     const seller = await getSeller(params.slug);
     return {
       title: `${seller.displayName} | Fari`,
       description: seller.bio,
       openGraph: { images: [seller.avatarUrl || "/og-default.png"] },
     };
   }
   ```
4. Appliquer le thème du vendeur (CSS variables → `--theme-primary`, `--theme-bg`)

**Vérification** : `localhost:3000/store/awa` affiche le profil d'Awa avec ses réseaux sociaux. Le preview WhatsApp est correct.

---

### Étape 3.2 : Bloc Lien

**Objectif** : les blocs lien s'affichent sur la page publique.

**Actions** :
1. `components/store/blocks/LinkBlock.tsx` :
   - Bouton pleine largeur avec icône + titre + flèche
   - Icône colorée selon le réseau (voir doc 3_DESIGN_SYSTEM → icônes réseaux)
   - Clic → redirige vers l'URL externe
   - `active:scale-[0.98]` feedback

**Vérification** : le bloc "Mon Instagram" d'Awa est cliquable et redirige vers Instagram.

---

### Étape 3.3 : Bloc Vente

**Objectif** : les blocs vente s'affichent avec image + prix + bouton "Acheter".

**Actions** :
1. `components/store/blocks/SaleBlock.tsx` :
   - Image de couverture (h-40, object-cover)
   - Titre + description
   - Prix en FCFA (gras)
   - Bouton "Acheter" (couleur du thème vendeur)
   - Clic → ouvre la modal de paiement (Étape 4.1)

**Vérification** : le bloc "Programme Été 2026" d'Awa affiche l'image, le prix, et le bouton.

---

### Étape 3.4 : Bloc Booking

**Objectif** : les blocs booking s'affichent avec le titre du service + prix + bouton "Réserver".

**Actions** :
1. `components/store/blocks/BookingBlock.tsx` :
   - Icône 📅 + titre + description + lieu
   - Prix en FCFA
   - Bouton "Réserver" (couleur du thème vendeur)
   - Clic → ouvre le sélecteur de créneau (Étape 3.5)

---

### Étape 3.5 : Sélecteur de créneaux booking

**Objectif** : le client peut voir les créneaux disponibles et en choisir un.

**Actions** :
1. `components/store/BookingCalendar.tsx` :
   - Afficher les 14 prochains jours en grille horizontale scrollable
   - Au clic sur un jour → afficher les créneaux disponibles (boutons)
   - Les créneaux déjà réservés sont grisés
   - Le créneau sélectionné est highlight en teal
   - API `app/api/store/[slug]/availability/route.ts` :
     - Input : serviceId, date
     - Output : liste de créneaux libres (heures de début)
     - Logique : croiser BookingSlot (récurrent) avec Orders existantes
2. Utiliser `date-fns` + locale `fr` pour les dates en français ("Lun 3 mars", "14h00")

**Vérification** : sélectionner un créneau pour le coaching d'Awa. Les jours sans dispo ne sont pas cliquables. Les créneaux pris sont grisés.

---

### Étape 3.6 : Bloc Paiement Libre

**Objectif** : les blocs paiement libre s'affichent avec montants suggérés.

**Actions** :
1. `components/store/blocks/PaymentBlock.tsx` :
   - Icône 💸 + titre + description
   - Grille de montants suggérés (boutons) + bouton "Autre"
   - Input montant libre (visible si "Autre" cliqué)
   - Bouton "Payer" (couleur du thème vendeur)
   - Clic → ouvre la modal de paiement

---

### Étape 3.7 : Footer Fari

**Objectif** : le footer "Propulsé par Fari" est affiché sur toutes les pages vendeurs.

**Actions** :
1. `components/store/FariFooter.tsx` :
   - "Propulsé par **Fari** — Crée ta page gratuitement"
   - Lien vers `https://fari.store`
   - Masqué si le vendeur est Pro (plan check)

**Vérification** : le footer apparaît pour le plan gratuit, disparaît pour le plan Pro.

---

## PHASE 4 — Paiement (Jours 13-18)

### Étape 4.1 : Modal de paiement

**Objectif** : une modal de paiement universelle (utilisée par les 3 types de blocs transactionnels).

**Actions** :
1. `components/store/PaymentModal.tsx` :
   - Bottom sheet sur mobile / modal centrée sur desktop
   - Résumé : titre du produit/service + montant
   - Champ email (requis)
   - Champ nom + téléphone (requis pour booking uniquement)
   - Sélecteur d'opérateur : grille 3 colonnes (Wave, Orange Money, Free Money)
   - Bouton CTA : "Payer — XX XXX FCFA" avec le prix formaté
   - Loading state pendant le paiement
   - La modal est un composant réutilisable qui reçoit : `type` (sale/booking/payment), `amount`, `title`, `sellerId`, `productId?`, `bookingDate?`, etc.

**Vérification** : cliquer "Acheter" sur un produit → la modal s'ouvre avec le bon montant et le bon titre.

---

### Étape 4.2 : Module paiement Bictorys

**Objectif** : le paiement via Bictorys fonctionne end-to-end.

**Actions** :
1. `lib/payments/types.ts` — interface PaymentProvider :
   ```typescript
   interface PaymentProvider {
     createTransaction(params: CreateTransactionParams): Promise<{ externalId: string; redirectUrl?: string }>;
     verifyWebhook(headers: Headers, body: string): boolean;
   }
   ```
2. `lib/payments/bictorys.ts` — implémentation BictorysProvider
3. `lib/payments/index.ts` — registry des providers :
   ```typescript
   export function getPaymentProvider(name: string): PaymentProvider {
     switch (name) {
       case "bictorys": return new BictorysProvider();
       default: throw new Error(`Unknown payment provider: ${name}`);
     }
   }
   ```
4. API `app/api/orders/route.ts` (POST) :
   - Validation Zod des inputs
   - Vérifier les limites du vendeur (plan gratuit : produits max, etc.)
   - Créer la commande (transaction Prisma — voir doc 4_DATABASE_SCHEMA)
   - Appeler Bictorys pour lancer le paiement
   - Retourner l'URL de redirect ou l'instruction USSD

**Vérification** : créer une commande en mode sandbox Bictorys. L'order apparaît dans la DB avec status PENDING.

---

### Étape 4.3 : Webhook Bictorys

**Objectif** : recevoir la confirmation de paiement et finaliser la commande.

**Actions** :
1. API `app/api/webhooks/bictorys/route.ts` :
   - Vérifier la signature du webhook (`X-Secret-Key`)
   - Logger le webhook dans `WebhookLog`
   - Trouver l'order par `paymentExternalId`
   - Mettre à jour `paymentStatus = PAID`, `paidAt = now()`
   - Selon le `orderType` :
     - **SALE** : générer le lien de téléchargement temporaire (72h, 3 downloads max). Envoyer email au client avec le lien. Incrémenter `totalSales` et `totalRevenue` du produit.
     - **BOOKING** : envoyer email de confirmation au client (date, heure, lieu). Envoyer notification au vendeur.
     - **PAYMENT** : envoyer reçu par email au client. Envoyer notification au vendeur.
   - Mettre à jour `Customer.totalSpent` et `Customer.orderCount`

**Vérification** : simuler un webhook Bictorys → l'order passe en PAID → le client reçoit l'email.

---

### Étape 4.4 : Page de téléchargement

**Objectif** : le client peut télécharger son fichier après achat.

**Actions** :
1. `app/store/[slug]/download/[orderId]/page.tsx` :
   - Vérifier que l'order existe, est payé, n'est pas expiré
   - Vérifier downloadCount < 3
   - Afficher : produit acheté, bouton "Télécharger", compteur de téléchargements restants
   - Au clic : incrémenter downloadCount, streamer le fichier
2. Si expiré ou max downloads atteint → message "Ce lien a expiré"

**Vérification** : acheter un produit → recevoir l'email → cliquer le lien → télécharger le fichier. Après 3 downloads, le lien est désactivé.

---

### Étape 4.5 : Emails transactionnels

**Objectif** : tous les emails sont beaux et fonctionnels.

**Actions** :
1. Créer les templates React Email (voir doc 2_TECH_STACK → Emails transactionnels V1) :
   - `emails/SaleConfirmation.tsx` — confirmation achat + bouton téléchargement
   - `emails/BookingConfirmation.tsx` — date, heure, lieu, vendeur
   - `emails/PaymentReceipt.tsx` — montant, vendeur, référence
   - `emails/SellerNotification.tsx` — nouvelle vente/réservation/paiement (template partagé)
   - `emails/VerificationCode.tsx` — code 6 chiffres
2. `lib/email.ts` — fonction `sendEmail(template, to, data)` via Resend
3. Tous les emails sont en français, mobile-optimisés, avec le logo Fari en header

**Vérification** : déclencher chaque type d'email. Vérifier le rendu sur Gmail mobile.

---

## PHASE 5 — Dashboard vendeur (Jours 19-25)

### Étape 5.1 : Dashboard — Vue d'ensemble

**Objectif** : le vendeur voit ses stats en un coup d'œil.

**Actions** :
1. `app/dashboard/page.tsx` :
   - 3 cards de stats : revenus du jour / revenus du mois / nombre de clients
   - Liste des 5 dernières commandes (type, client, montant, statut, date)
   - Lien "Voir ma page →" (ouvre slug.fari.store dans un nouvel onglet)
   - Si aucune commande : empty state avec illustration + "Partage ta page pour recevoir tes premières ventes"

---

### Étape 5.2 : Dashboard — Gestion des blocs

**Objectif** : le vendeur peut ajouter, modifier, supprimer et réordonner ses blocs.

**Actions** :
1. Section "Mes blocs" dans `/dashboard` :
   - Liste des blocs avec : icône du type, titre, statut (actif/inactif), toggle on/off
   - Drag & drop pour réordonner (@dnd-kit)
   - Bouton "Ajouter un bloc" → ouvre un picker de type (Lien, Vente, Booking, Paiement)
2. API `app/api/blocks/route.ts` :
   - POST : créer un bloc (valider config Zod selon le type, vérifier limites du plan)
   - PUT : modifier un bloc
   - DELETE : supprimer un bloc
3. API `app/api/blocks/reorder/route.ts` :
   - PATCH : recevoir l'array de positions `[{ id, position }]`, mettre à jour en batch
4. Formulaires de création/modification par type :
   - `components/dashboard/blocks/LinkBlockForm.tsx` — titre, URL, icône
   - `components/dashboard/blocks/SaleBlockForm.tsx` — titre, description, prix, upload couverture, upload fichier
   - `components/dashboard/blocks/BookingBlockForm.tsx` — titre, description, prix, durée, lieu, disponibilités (grille jour/heure)
   - `components/dashboard/blocks/PaymentBlockForm.tsx` — titre, description, montants suggérés
5. Pour le bloc SALE : upload de fichier via `app/api/upload/route.ts` → Vercel Blob

**Vérification** : ajouter un bloc Lien → il apparaît sur la page publique. Drag & drop → l'ordre change sur la page publique. Désactiver → disparaît de la page publique.

---

### Étape 5.3 : Dashboard — Commandes

**Objectif** : le vendeur voit toutes ses commandes avec détails.

**Actions** :
1. `app/dashboard/orders/page.tsx` :
   - Tableau : référence, type (badge), client, montant, statut (badge), date
   - Filtres : tous / ventes / réservations / paiements
   - Filtre par statut : tous / payé / en attente / échoué
   - Pagination (20 par page)
   - Clic sur une commande → détails (modal ou page)

---

### Étape 5.4 : Dashboard — Revenus

**Objectif** : le vendeur voit ses revenus et commissions.

**Actions** :
1. `app/dashboard/revenue/page.tsx` :
   - Total revenus (net après commission)
   - Total commission Fari
   - Revenus par période (ce mois, mois dernier, total)
   - Liste des transactions payées avec montant brut / commission / montant net

---

### Étape 5.5 : Dashboard — Clients

**Objectif** : le vendeur voit sa liste de clients.

**Actions** :
1. `app/dashboard/customers/page.tsx` :
   - Tableau : nom, email, total dépensé, nombre de commandes, dernière commande
   - Tri par total dépensé (desc par défaut)
   - Recherche par email

---

### Étape 5.6 : Dashboard — Paramètres

**Objectif** : le vendeur peut modifier son profil et ses paramètres.

**Actions** :
1. `app/dashboard/settings/page.tsx` :
   - **Profil** : nom, bio, photo (upload), réseaux sociaux
   - **Page** : slug (avec vérification disponibilité), thème (8 choix avec preview)
   - **Paiement** : numéro mobile money pour les versements, opérateur
   - **Compte** : email, mot de passe, supprimer le compte
2. Upload photo de profil → Vercel Blob → sharp resize 256x256

---

### Étape 5.7 : Dashboard — Aperçu mobile

**Objectif** : le vendeur voit un aperçu live de sa page dans un cadre de téléphone.

**Actions** :
1. `components/dashboard/MobilePreview.tsx` :
   - Frame de téléphone (border arrondi, notch)
   - Iframe ou rendu direct de la page publique
   - Mise à jour en temps réel quand le vendeur modifie ses blocs
   - Affiché à droite du formulaire sur desktop, caché sur mobile (le vendeur peut cliquer "Aperçu")

---

## PHASE 6 — Landing page & Finitions (Jours 26-30)

### Étape 6.1 : Landing page fari.store

**Objectif** : une landing page qui convertit les visiteurs en vendeurs inscrits.

**Actions** :
1. `app/(marketing)/page.tsx` :
   - Hero : "Ton lien qui vend" + sous-titre + bouton "Crée ta page gratuitement" + preview mockup
   - Section "Comment ça marche" : 3 étapes (1. Crée ta page, 2. Ajoute tes produits, 3. Partage et encaisse)
   - Section "Tout ce dont tu as besoin" : 4 cards (Lien, Vente, Booking, Paiement)
   - Section opérateurs : logos Wave, Orange Money, Free Money
   - Section pricing : Gratuit vs Pro
   - Footer : liens, réseaux sociaux Fari
2. Design conforme au doc 3_DESIGN_SYSTEM (couleurs Fari, Inter, border-radius, etc.)
3. Performance : toutes les images en WebP, lazy loading, pas de JS inutile

**Vérification** : Lighthouse mobile > 90 performance, > 95 SEO.

---

### Étape 6.2 : SEO & OG Tags

**Objectif** : chaque page a des meta tags parfaits.

**Actions** :
1. `app/layout.tsx` : meta tags par défaut pour fari.store
2. `app/store/[slug]/page.tsx` : meta tags dynamiques par vendeur (nom, bio, avatar)
3. Créer une image OG par défaut (`public/og-default.png`) — 1200x630
4. `app/sitemap.ts` : sitemap dynamique avec toutes les pages vendeurs actifs
5. `app/robots.ts` : autoriser l'indexation

---

### Étape 6.3 : Gestion des erreurs

**Objectif** : les erreurs sont gérées proprement.

**Actions** :
1. `app/not-found.tsx` : page 404 custom
2. `app/error.tsx` : page d'erreur globale
3. `app/store/[slug]/not-found.tsx` : "Ce vendeur n'existe pas" + lien "Crée ta page"
4. Gestion des erreurs API : réponses JSON standardisées `{ error: string, code: string }`
5. Toast de notification dans le dashboard pour les actions (succès, erreur)

---

### Étape 6.4 : Performance

**Objectif** : la page publique charge en < 2s sur 3G.

**Actions** :
1. Vérifier le bundle size : `next build` + analyzer
2. Images : tout en WebP via sharp, lazy loading, sizes correctes
3. Page publique : aucun JS côté client sauf pour la modal de paiement (islands architecture)
4. Fonts : Inter via next/font (subset, swap, preload)
5. Caching : `Cache-Control` headers sur les pages publiques (revalidate 60s)

**Vérification** : Chrome DevTools → Network → Slow 3G → la page charge en < 2s. Lighthouse > 90.

---

### Étape 6.5 : Déploiement

**Objectif** : fari.store est live.

**Actions** :
1. Créer le repo GitHub
2. Connecter à Vercel
3. Configurer les variables d'environnement en production
4. Configurer le domaine `fari.store` :
   - A record → Vercel
   - Wildcard CNAME `*.fari.store` → `cname.vercel-dns.com`
5. Configurer SSL (automatique avec Vercel)
6. Tester le signup → création de page → paiement en prod avec Bictorys live
7. Envoyer le lien à 5 personnes de confiance pour un test beta

**Vérification** : `awa.fari.store` est accessible publiquement. Le paiement Wave fonctionne. L'email arrive.

---

## Résumé des phases

| Phase | Jours | Contenu |
|---|---|---|
| Phase 1 | 1-3 | Setup, DB, middleware, utilitaires |
| Phase 2 | 4-7 | Auth, composants UI, dashboard shell |
| Phase 3 | 8-12 | Page publique vendeur (header + 4 blocs) |
| Phase 4 | 13-18 | Paiement Bictorys, webhooks, emails, téléchargement |
| Phase 5 | 19-25 | Dashboard complet (stats, blocs, commandes, revenus, settings) |
| Phase 6 | 26-30 | Landing page, SEO, performance, déploiement |

**Total estimé** : 30 jours de développement (4-5 semaines).
