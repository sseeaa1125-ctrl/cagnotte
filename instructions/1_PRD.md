# Fari.store — Product Requirements Document (PRD)

## Vue d'ensemble

**Produit** : Fari.store
**Type** : Plateforme link-in-bio avec vente intégrée et paiement mobile money pour l'Afrique francophone
**Cible** : Créateurs, freelances, coaches, commerçants Instagram/TikTok (18-35 ans) en Afrique de l'Ouest francophone
**Problème** : Les créateurs africains n'ont aucun outil pour vendre depuis leur bio Instagram. Stan Store exige Stripe/PayPal (indisponibles), coûte $29/mois (18 000 FCFA — trop cher), est en anglais, et n'est pas optimisé mobile. Linktree n'a pas de paiement. Gumroad n'accepte pas le mobile money.
**Solution** : Un lien unique (amadou.fari.store) qui combine Linktree + Gumroad + Calendly, avec paiement mobile money (Wave, Orange Money, Free Money). Mobile-first, en français, prix en FCFA.
**Monétisation** : Freemium (gratuit limité) + abonnement Pro à 3 000 FCFA/mois + commission de 5% sur chaque transaction.
**URL** : https://fari.store

---

## Critères de succès (MVP)

| Métrique | Objectif |
|---|---|
| Temps de création d'une page | ≤ 5 minutes (inscription → page live) |
| Temps de chargement page publique (3G) | < 2 secondes |
| Taux de conversion visiteur → achat | > 3% |
| Score Lighthouse mobile | Performance > 90, SEO > 95 |
| Uptime | > 99.5% |
| Nombre de vendeurs actifs M1 | 50 |
| Nombre de vendeurs actifs M6 | 1 000 |
| Volume de transactions M6 | 15M FCFA/mois |

---

## Architecture en blocs

Fari.store est construit sur une **architecture modulaire de blocs**. Chaque page de vendeur est composée d'un empilement de blocs configurables. Cela permet d'ajouter de nouveaux types de blocs dans le futur sans modifier la structure existante.

### Principe

```
Page publique du vendeur (amadou.fari.store)
├── Header (photo + nom + bio + réseaux sociaux)
├── Bloc 1 (type: lien)
├── Bloc 2 (type: vente)
├── Bloc 3 (type: booking)
├── Bloc 4 (type: paiement_libre)
├── Bloc 5 (type: lien)
└── Footer ("Propulsé par Fari" + lien création gratuite)
```

Chaque bloc a : un `type`, un `position` (ordre d'affichage), un `config` (JSON flexible selon le type), et un `is_active` (on/off).

---

## Fonctionnalités — IN SCOPE (V1)

### F1 — Inscription et onboarding

- Inscription par email + mot de passe uniquement (pas d'OAuth V1)
- Onboarding en 3 étapes maximum :
  1. Choisis ton nom de page (→ amadou.fari.store)
  2. Ajoute ta photo + bio
  3. Ajoute ton premier bloc
- Vérification email par code à 6 chiffres
- Le vendeur peut commencer à utiliser sa page immédiatement (la vérification email est requise uniquement pour recevoir des paiements)

### F2 — Dashboard vendeur

- Vue d'ensemble : revenus du jour / semaine / mois, nombre de ventes, nombre de visiteurs
- Liste des commandes récentes (statut : payé, en attente, échoué)
- Gestion des blocs (ajouter, supprimer, réordonner par drag & drop, activer/désactiver)
- Aperçu live de la page publique
- Paramètres : nom de page, photo, bio, réseaux sociaux, informations de paiement
- Responsive : le dashboard est utilisable sur mobile (les vendeurs n'ont souvent qu'un téléphone)

### F3 — Bloc Lien

- Type le plus simple : un bouton qui redirige vers une URL externe
- Configuration : titre, URL, icône (choix parmi : Instagram, WhatsApp, TikTok, YouTube, Facebook, Telegram, Twitter/X, Site web, Autre)
- Optionnel : compteur de clics
- Affichage : bouton pleine largeur avec icône + titre

### F4 — Bloc Vente (produit digital)

- Le vendeur crée un produit digital à vendre
- Configuration :
  - Titre du produit
  - Description (texte court, max 500 caractères)
  - Prix en FCFA (minimum 500 FCFA)
  - Image de couverture (upload, max 5 MB)
  - Fichier à livrer (PDF, ZIP, MP3, MP4 — max 100 MB)
- Parcours client :
  1. Client clique "Acheter" sur la page publique
  2. Modal de paiement : email + choix opérateur mobile money
  3. Client paye via mobile money (Bictorys)
  4. Webhook confirme le paiement
  5. Client reçoit le fichier par email + lien de téléchargement direct
  6. Le vendeur reçoit une notification (email + notification in-app)
- Le lien de téléchargement expire après 72h et 3 téléchargements max
- Commission Fari : 5% prélevée automatiquement avant versement au vendeur

### F5 — Bloc Paiement Libre

- Le client choisit le montant à payer (minimum 500 FCFA)
- Cas d'usage : factures freelance, tips/pourboires, dons, paiements personnalisés
- Configuration :
  - Titre (ex: "Envoie-moi un paiement", "Paye ta facture")
  - Description optionnelle
  - Montants suggérés (ex: 5 000, 10 000, 25 000 FCFA) — le client peut entrer un montant libre
  - Montant minimum et maximum optionnels
- Parcours client :
  1. Client entre le montant (ou choisit un montant suggéré)
  2. Entre son email
  3. Choisit l'opérateur mobile money
  4. Paye
  5. Reçoit un reçu par email
  6. Le vendeur est notifié
- Commission Fari : 5%

### F6 — Bloc Booking (réservation + paiement)

- Le vendeur définit des créneaux disponibles pour des rendez-vous payants
- Configuration :
  - Titre du service (ex: "Coaching privé 1h", "Séance photo")
  - Description
  - Durée du créneau (30 min, 45 min, 1h, 1h30, 2h)
  - Prix en FCFA
  - Disponibilités : jours de la semaine + horaires (ex: Lun-Ven, 9h-17h)
  - Délai minimum avant réservation (ex: 24h)
  - Lieu : texte libre (ex: "Mon studio à Almadies" ou "Appel Google Meet")
- Parcours client :
  1. Client clique "Réserver"
  2. Voit un calendrier avec les créneaux disponibles
  3. Choisit un créneau
  4. Entre son nom + email + numéro de téléphone
  5. Paye via mobile money
  6. Reçoit une confirmation par email avec les détails (date, heure, lieu)
  7. Le vendeur reçoit une notification avec les détails du client
- Le vendeur peut annuler un créneau (le client est remboursé automatiquement)
- Pas de rappels automatiques en V1 (prévu V2)
- Commission Fari : 5%

### F7 — Page publique du vendeur

- URL : `[slug].fari.store`
- Design mobile-first, optimisé 3G
- Éléments :
  - Photo de profil (ronde, 96px)
  - Nom du vendeur
  - Bio courte (max 150 caractères)
  - Icônes réseaux sociaux cliquables
  - Liste des blocs actifs, dans l'ordre défini par le vendeur
- Le vendeur choisit ses couleurs principales (couleur primaire + couleur de fond) parmi un set de thèmes prédéfinis (8 thèmes)
- Footer : "Propulsé par Fari — Crée ta page gratuitement" → lien vers fari.store
- Meta tags OG dynamiques (titre, description, image) pour un beau partage sur WhatsApp/Instagram
- Pas de publicité. Jamais.

### F8 — Paiement (Bictorys)

- Intégration Bictorys Direct API
- Opérateurs V1 : Wave, Orange Money, Free Money
- Flux : création transaction → redirect ou push USSD → webhook confirmation → livraison
- Architecture provider-agnostic : le module paiement est isolé derrière une interface. Ajouter un nouveau provider (ex: CinetPay, PayDunya, Stripe) = créer un adaptateur sans toucher au reste du code
- Gestion des échecs : retry automatique webhook (3 tentatives), page d'état pour le client
- Reversement vendeur : l'argent arrive directement sur le mobile money du vendeur via Bictorys (pas de wallet interne en V1)

### F9 — Notifications

- Email transactionnel (Resend) :
  - Au client : confirmation d'achat + fichier / confirmation de réservation / reçu de paiement
  - Au vendeur : nouvelle vente / nouvelle réservation / nouveau paiement
- Notification in-app : badge sur le dashboard + liste des événements récents
- Pas de SMS en V1 (coût trop élevé)
- Pas de notification WhatsApp en V1 (dépendance Meta)

---

## Fonctionnalités — OUT OF SCOPE (V1)

| Fonctionnalité | Raison | Version prévue |
|---|---|---|
| Custom domain (awa.com au lieu de awa.fari.store) | Complexité DNS, pas prioritaire | V2 |
| Bloc Abonnement (paiements récurrents) | Nécessite gestion billing récurrent côté Bictorys | V2 |
| Bloc Événement (billetterie + QR code) | Scope trop large pour V1 | V2 |
| Bloc Formulaire (email capture, questionnaire) | Pas critique pour la proposition de valeur | V2 |
| Analytics avancés (sources de trafic, taux conversion par bloc) | Dashboard basique suffit en V1 | V2 |
| Rappels automatiques pré-booking | Nécessite job scheduler + templates | V2 |
| Multi-langue (anglais, wolof) | Français seul en V1 | V2 |
| App mobile native | Le site responsive suffit | V3 |
| Marketplace / annuaire de vendeurs | Pas de valeur ajoutée avant 1 000 vendeurs | V3 |
| API publique pour développeurs | Pas de demande avant scale | V3 |
| Wallet interne / versements groupés | Nécessite licence EME — voir roadmap long terme | V4+ |
| Notifications WhatsApp | Dépendance Meta, coût API | V2 |
| Notifications SMS | Coût élevé par SMS | V2 |
| OAuth (Google, Facebook) | Pas prioritaire, le formulaire email suffit | V2 |
| Mode hors-ligne | Complexité disproportionnée | Non planifié |

---

## Pricing

### Plan Gratuit

- 1 page
- 3 blocs maximum
- Blocs Lien illimités (les liens ne génèrent pas de revenu)
- Bloc Vente : 1 produit max
- Bloc Paiement Libre : oui
- Bloc Booking : 1 service max
- Badge "Propulsé par Fari" visible
- Commission : 5% sur chaque transaction

### Plan Pro — 3 000 FCFA/mois (~4,50€)

- 1 page
- Blocs illimités
- Produits illimités
- Services booking illimités
- Badge "Propulsé par Fari" retiré
- Thèmes premium (couleurs personnalisées)
- Analytics détaillés
- Commission : 3% sur chaque transaction
- Support prioritaire

---

## Personas

### Awa — Coach fitness (persona principale)

- 26 ans, Dakar, 12K followers Instagram
- Vend un programme PDF "Été 2026" à 15 000 FCFA
- Propose des séances de coaching privé à 10 000 FCFA/h
- Aujourd'hui : envoie le PDF par WhatsApp après screenshot Orange Money. Gère ses RDV dans sa tête.
- Avec Fari : awa.fari.store → le client achète le PDF et réserve une séance en 2 clics

### Ibrahima — Freelance designer

- 30 ans, Abidjan, fait des logos et flyers
- Aujourd'hui : négocie par WhatsApp, envoie le travail, attend le paiement parfois des jours
- Avec Fari : ibrahima.fari.store → bloc Paiement Libre pour recevoir ses factures

### Mariam — Vendeuse Instagram

- 23 ans, Bamako, vend des vêtements importés
- Aujourd'hui : poste sur Instagram, reçoit des DM, répond un par un
- Avec Fari : mariam.fari.store → bloc Vente pour ses lookbooks PDF, bloc Lien pour WhatsApp/Instagram

### Ousmane — Prof de maths

- 28 ans, Dakar, donne des cours particuliers
- Aujourd'hui : trouve ses élèves par bouche-à-oreille, pas de site web
- Avec Fari : ousmane.fari.store → bloc Booking pour les cours, bloc Vente pour ses fiches PDF

---

## Contraintes techniques

- **Mobile-first** : 85%+ du trafic sera sur mobile. Chaque écran doit être conçu d'abord pour un écran de 375px
- **Performance 3G** : la page publique doit charger en < 2s sur une connexion 3G (1.5 Mbps). Pas de JS lourd, pas de fonts custom lourdes, images optimisées WebP
- **Léger** : bundle JS de la page publique < 50 KB gzipped
- **SEO** : chaque page vendeur est SSR (Server-Side Rendered) pour l'indexation Google et les previews WhatsApp/Facebook
- **FCFA uniquement** en V1 : pas de multi-devise
- **Français uniquement** en V1 : mais architecture i18n-ready (toutes les chaînes de texte dans des fichiers de traduction)
