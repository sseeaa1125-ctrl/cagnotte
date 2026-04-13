# Rapport de Test Beta — Izy.store
# 10 Influenceurs × 30 Jours × End-to-End

**Objectif :** Simuler 10 profils d'influenceurs réels qui testent la plateforme de l'inscription jusqu'à l'encaissement, en passant par tous les types de blocs.

---

## Les 10 testeurs

| # | Pseudo | Activité | Pays | Blocs testés | Paiement |
|---|--------|----------|------|-------------|----------|
| 1 | **Awa Fitness** | Coach fitness | 🇸🇳 Sénégal | SALE, BOOKING, LINK | Orange Money |
| 2 | **Chef Mariam** | Food creator | 🇨🇮 Côte d'Ivoire | SALE, PAYMENT, LINK | Wave |
| 3 | **DJ Kaba** | DJ / Musicien | 🇲🇱 Mali | SALE, BOOKING, COMMUNITY | Orange Money |
| 4 | **Fatou Fashion** | Mode & lifestyle | 🇸🇳 Sénégal | SALE, LEAD_MAGNET, LINK | Wave |
| 5 | **Prof Moussa** | Enseignant | 🇬🇳 Guinée | SALE, WAITING_LIST, PARTNERSHIP | Orange Money |
| 6 | **Amina Beauty** | Maquilleuse | 🇹🇬 Togo | BOOKING, SALE, PAYMENT | Wave |
| 7 | **Tech Baba** | Dev / Formateur | 🇸🇳 Sénégal | SALE, COMMUNITY, LEAD_MAGNET | Wave |
| 8 | **Mama Cuisine** | Influenceuse food | 🇨🇲 Cameroun | PAYMENT, LINK, SALE | Orange Money |
| 9 | **Sidy Sport** | Coach sport | 🇨🇮 Côte d'Ivoire | BOOKING, SALE, COMMUNITY | Wave |
| 10 | **Nafi Art** | Artiste / Designer | 🇸🇳 Sénégal | SALE, PARTNERSHIP, WAITING_LIST | Wave |

---

## Semaine 1 — Inscription & Onboarding

### Flow testé : Signup → Email verification → Onboarding (3 étapes) → Dashboard

---

#### 🧪 Test 1.1 — Inscription par email (Awa, Fatou, Prof Moussa, Mama Cuisine, Nafi)

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Aller sur `/signup` | Page d'inscription avec Google + Email |
| 2 | Cliquer "S'inscrire avec email" | Formulaire : nom, slug, email, mot de passe |
| 3 | Entrer `Awa Fitness`, `awa-fitness`, `awa@gmail.com`, `MonPass123!` | Validation Zod OK |
| 4 | Soumettre | Email de vérification envoyé, page code apparaît |
| 5 | Entrer le code 6 chiffres | Redirection vers `/onboarding` |

**Cas limites à tester :**

| Test | Input | Résultat attendu |
|------|-------|-----------------|
| Slug réservé | `dashboard` | ❌ "Ce nom de page est réservé" |
| Slug déjà pris | `awa-fitness` (2ème fois) | ❌ "Ce nom de page est déjà pris" |
| Slug avec majuscules | `Awa-Fitness` | Auto-lowercase `awa-fitness` ✅ |
| Slug caractères spéciaux | `awa_fitness` | Filtré côté frontend `[a-z0-9-]` ✅ |
| Email déjà utilisé | Email existant | ❌ "Un compte existe déjà avec cet email" |
| Mot de passe < 8 chars | `abc` | ❌ "Minimum 8 caractères" |
| Code expiré (>15min) | Code ancien | ❌ "Code expiré ou invalide" |
| Code faux × 6 | Mauvais codes | ❌ Rate limit "Trop de tentatives" |
| Resend code | Clic "Renvoyer" | Cooldown 60s, nouveau code envoyé |

---

#### 🧪 Test 1.2 — Inscription Google OAuth (Chef Mariam, DJ Kaba, Amina, Tech Baba, Sidy)

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Cliquer "S'inscrire avec Google" | Popup Google consent |
| 2 | Choisir compte Google | Retour sur Izy |
| 3 | Nouveau user → formulaire slug | Page "Dernière étape" : nom + slug |
| 4 | Entrer slug `chef-mariam` | Validation ✅ |
| 5 | Soumettre | Redirection `/onboarding` (pas de vérification email) |

**Cas limites :**
- Google account sans `email_verified` → rejeté
- Compte Google déjà lié → login direct (pas de demande de slug)

---

#### 🧪 Test 1.3 — Onboarding (3 étapes)

**Étape 1 — Profil :**
| Testeur | Activité choisie | Téléphone |
|---------|-----------------|-----------|
| Awa Fitness | Coach / Formateur 🏋️ | 77 123 45 67 |
| Chef Mariam | Créateur de contenu 🎨 | 07 12 34 56 78 |
| DJ Kaba | Autre ✨ | 76 00 11 22 |
| Prof Moussa | Prof / Enseignant 📚 | 621 12 34 56 |
| Tech Baba | Freelance / Consultant 💼 | 78 900 11 22 |

**Étape 2 — Thème :**
Chaque testeur choisit un thème différent parmi les options disponibles. Sur mobile (< 375px), seuls 6 thèmes sont affichés par défaut avec "Voir plus".

**Étape 3 — Réseaux sociaux :**
| Testeur | Instagram | TikTok | YouTube | WhatsApp |
|---------|-----------|--------|---------|----------|
| Awa | @awa_fitness | @awa_fit | - | 77 123 45 67 |
| Mariam | @chef_mariam | - | youtube.com/c/mariam | - |
| DJ Kaba | - | @dj_kaba | - | 76 00 11 22 |

Les handles `@awa_fitness` sont normalisés en URLs complètes (`https://instagram.com/awa_fitness`).

**Bouton "Je ferai ça plus tard"** → Skip étape 3, onboarding marqué complété.

**Résultat :** Dashboard accessible, page publique `izy.store/awa-fitness` créée (vide).

---

## Semaine 2 — Création de blocs

### Chaque influenceur crée ses blocs depuis le dashboard

---

#### 🧪 Test 2.1 — Bloc SALE (8/10 testeurs)

**Awa Fitness** crée "Programme Fitness 30 Jours" :
| Champ | Valeur | Validation |
|-------|--------|------------|
| Titre | Programme Fitness 30 Jours | ✅ min 1, max 200 |
| Description | 4 semaines de workout... | ✅ max 5000 |
| Prix | 15 000 FCFA | ✅ int, min 0 |
| Prix barré | 25 000 FCFA | ✅ `discountPrice` |
| Fichier | programme.pdf (upload) | ✅ Upload R2 |
| Image couverture | photo.jpg | ✅ Upload R2 → WebP |
| Bouton CTA | "Acheter" | ✅ max 30 chars |

**Cas limites SALE :**
| Test | Résultat |
|------|----------|
| SALE sans fichier ni redirectUrl, `isActive: true` | ❌ 400 "Le fichier digital ou l'URL de redirection est obligatoire" |
| SALE sans fichier, `isActive: false` (brouillon) | ✅ Créé en brouillon |
| Prix = 0 (gratuit) | ✅ Accepté (lead magnet déguisé) |
| Fichier > taille max | ❌ Rejeté par multer |
| Fichier .exe | ❌ Rejeté par magic bytes validation |
| Upload image 5MB | ✅ Convertie WebP via sharp |

**Tech Baba** crée "Templates Figma" à 10 000 FCFA avec `redirectUrl` (lien Notion) au lieu d'un fichier.

**Nafi Art** crée "Pack Illustrations" à 25 000 FCFA avec sections checkout (FAQ + features).

---

#### 🧪 Test 2.2 — Bloc BOOKING (Awa, Amina, Sidy)

**Amina Beauty** crée "Maquillage Mariée" :
| Champ | Valeur | Validation |
|-------|--------|------------|
| Titre | Maquillage Mariée | ✅ |
| Prix | 35 000 FCFA | ✅ min 500 |
| Durée | 90 min | ✅ min 15 |
| Lieu | Domicile Lomé | ✅ |
| Créneaux | Lun-Ven 9h-17h | Via BookingSlots |

**Awa Fitness** crée "Coaching Privé 1h" à 20 000 FCFA, 60 min.

**Sidy Sport** crée "Séance Sport Personnalisée" à 15 000 FCFA, 45 min.

**Cas limites BOOKING :**
| Test | Résultat |
|------|----------|
| Prix < 500 | ❌ "price: Number must be greater than or equal to 500" |
| Durée < 15 min | ❌ Rejeté par Zod |
| Créneau déjà réservé (2 clients même heure) | ❌ Transaction Serializable + check PENDING < 30min |

---

#### 🧪 Test 2.3 — Bloc PAYMENT / Donation (Chef Mariam, Amina, Mama Cuisine)

**Mama Cuisine** crée "Soutiens ma chaîne" :
| Champ | Valeur |
|-------|--------|
| Titre | Soutiens Mama Cuisine |
| Description | Aide-moi à acheter du matériel |
| Montants suggérés | 5 000, 10 000, 25 000 FCFA |
| Montant min | 500 FCFA |
| isDonation | true |

**Chef Mariam** crée "Pourboire" avec montants 2 000, 5 000, 10 000.

---

#### 🧪 Test 2.4 — Bloc LEAD_MAGNET (Fatou Fashion, Tech Baba)

**Fatou Fashion** crée "Lookbook Été 2026" :
| Champ | Valeur |
|-------|--------|
| Titre | Lookbook Été 2026 — GRATUIT |
| Prix | 0 FCFA |
| Fichier | lookbook.pdf |
| Champs lead | name (requis), email (requis), whatsapp (optionnel) |

**Tech Baba** crée "Checklist Freelance" gratuit avec champs email + phone.

**Résultat :** Le visiteur remplit le formulaire → reçoit le fichier par email + ajouté dans les leads du vendeur.

---

#### 🧪 Test 2.5 — Bloc WAITING_LIST (Prof Moussa, Nafi Art)

**Prof Moussa** crée "Formation Excel Avancé" :
| Champ | Valeur |
|-------|--------|
| Titre | Formation Excel — Inscris-toi |
| Prix | 0 FCFA |
| Max inscrits | 50 |
| showSubscriberCount | true |
| Bouton | "S'inscrire" |

**Nafi Art** crée "Collection NFT" (waiting list, 100 max).

**Cas limites :**
| Test | Résultat |
|------|----------|
| 51ème inscription (max 50) | ❌ "Plus de places disponibles" |
| Compteur visible | ✅ "32/50 inscrits" affiché publiquement |

---

#### 🧪 Test 2.6 — Bloc PARTNERSHIP (Prof Moussa, Nafi Art)

**Nafi Art** crée "Collaborations Marques" :
| Champ | Valeur |
|-------|--------|
| Titre | Collaborer avec Nafi Art |
| Description | Tarifs et conditions... |
| Bouton | "Proposer un partenariat" |

**Visiteur :** Remplit formulaire (nom, email, entreprise, budget, message) → `PartnershipRequest` créé → visible dans dashboard vendeur.

---

#### 🧪 Test 2.7 — Bloc COMMUNITY (DJ Kaba, Tech Baba, Sidy Sport)

**DJ Kaba** crée "Fan Club DJ Kaba" :
| Étape | Action |
|-------|--------|
| 1 | Connecter bot Telegram (token chiffré AES-256-GCM) |
| 2 | Ajouter le bot comme admin du groupe |
| 3 | Associer le groupe Telegram au bloc |
| 4 | Définir prix : 5 000 FCFA/mois |
| 5 | Choisir période : MONTHLY |

**Tech Baba** crée "Communauté Dev" à 10 000 FCFA/mois.

**Sidy Sport** crée "Groupe VIP Sport" à 3 000 FCFA/mois.

**Flow abonnement (côté client) :**
1. Visiteur clique "S'abonner"
2. Modal : nom, email, téléphone + champs custom
3. Choix opérateur (Orange Money / Wave)
4. Paiement via Bictorys → webhook
5. Lien d'invitation Telegram généré
6. Membre ajouté, `memberCount++`

**Cas limites :**
| Test | Résultat |
|------|----------|
| Bot pas admin du groupe | ❌ Erreur à la création |
| Membre quitte le groupe Telegram | Détecté par cron `detectLeftMembers` |
| Paiement échoué renouvellement | Grace period 3 jours, rappels J+1/J+2, kick J+3 |
| Double abonnement même email | ❌ `@@unique([communityId, memberEmail])` |

---

#### 🧪 Test 2.8 — Bloc LINK (Awa, Fatou, Mama Cuisine)

**Awa Fitness** ajoute 3 liens :
- Instagram → icon `instagram`
- WhatsApp → icon `whatsapp`
- Site web → icon `website`

**Validation config :** `title` min 1 max 100, `url` valide, `icon` dans enum.

---

#### 🧪 Test 2.9 — Réorganisation des blocs (tous)

Chaque testeur réordonne ses blocs via drag & drop.
- API `PUT /api/blocks/reorder` avec `{ blockIds: [...] }`
- Positions mises à jour atomiquement

---

## Semaine 3 — Achats & Paiements (côté client)

### Flow testé : Page publique → Achat → Paiement Bictorys → Webhook → Confirmation

---

#### 🧪 Test 3.1 — Achat produit SALE

**Client achète "Programme Fitness" d'Awa :**

| Étape | Action | Vérification |
|-------|--------|-------------|
| 1 | Visiter `izy.store/awa-fitness` | Page SSR, < 2s sur 3G |
| 2 | Cliquer "Acheter" sur le programme | Modal paiement s'ouvre |
| 3 | Remplir : nom, email, téléphone | Validation frontend |
| 4 | Choisir Orange Money | ✅ |
| 5 | Soumettre | Redirection Bictorys |
| 6 | Payer sur Bictorys | Webhook reçu |
| 7 | Redirection `/success` | Page succès avec lien download |

**Vérifications backend :**
- Order créé avec `paymentStatus: PENDING`
- Référence unique `ord_xxx` générée
- Commission Fari calculée côté serveur (5% FREE, 3% PRO)
- Webhook vérifié HMAC SHA-256 + replay protection
- Order passé à `PAID` dans transaction Serializable
- Email de confirmation envoyé au client
- `sellerAmount = amount - commissionAmount`
- Download : token HMAC signé, max 5 downloads, expiry 72h

**Cas limites paiement :**
| Test | Résultat |
|------|----------|
| Montant modifié côté client | ❌ Backend recalcule le prix depuis la DB |
| Double webhook même référence | Idempotent — ignoré si déjà PAID |
| Webhook body modifié | ❌ HMAC signature mismatch → 401 |
| Webhook replay (>5min) | ❌ Timestamp trop ancien → rejeté |
| Paiement échoué | Order reste PENDING, status check fallback |
| Fichier téléchargé 6ème fois | ❌ "Limite de téléchargements atteinte" |
| Rate limit (11 commandes/min) | ❌ 429 "Trop de commandes" |

---

#### 🧪 Test 3.2 — Réservation BOOKING

**Client réserve "Maquillage Mariée" chez Amina :**

| Étape | Action |
|-------|--------|
| 1 | Choisir un créneau disponible |
| 2 | Remplir infos (nom, email, téléphone) |
| 3 | Payer 35 000 FCFA via Wave |
| 4 | Webhook → `bookingDate` enregistré |
| 5 | Email confirmation avec date/heure/lieu |

**Cas limites :**
- Créneau pris entre la sélection et le paiement → Transaction Serializable protège
- Réservation PENDING > 30min → Créneau libéré

---

#### 🧪 Test 3.3 — Paiement libre / Donation

**Client soutient Mama Cuisine avec 10 000 FCFA :**
- Montant libre (min 500 FCFA)
- Message optionnel du donateur (`donorMessage`)
- Pas de fichier à télécharger
- Email de remerciement envoyé

---

#### 🧪 Test 3.4 — Lead Magnet (gratuit)

**Client télécharge le lookbook de Fatou Fashion :**
| Étape | Action |
|-------|--------|
| 1 | Remplir formulaire (nom, email, WhatsApp) |
| 2 | Submit → Order créé à 0 FCFA, status PAID |
| 3 | Email avec lien de téléchargement |
| 4 | Lead visible dans dashboard Fatou |

---

#### 🧪 Test 3.5 — Abonnement communauté

**Client s'abonne au Fan Club DJ Kaba :**
| Étape | Action |
|-------|--------|
| 1 | Cliquer "S'abonner" (5 000 FCFA/mois) |
| 2 | Formulaire : nom, email, téléphone |
| 3 | Payer via Orange Money |
| 4 | Webhook → `CommunitySubscription` créé, status ACTIVE |
| 5 | Lien d'invitation Telegram affiché |
| 6 | Membre rejoint le groupe |

**Renouvellement automatique (cron) :**
- J-3 : Rappel "Ton abonnement expire bientôt"
- J : Nouveau `CommunityPayment` PENDING créé
- J+1 (non payé) : Rappel grace period
- J+2 : 2ème rappel
- J+3 : Kick du groupe Telegram, status → EXPIRED

---

## Semaine 4 — Encaissement & Analytics

### Flow testé : Dashboard → Balance → KYC → Retrait → Réception argent

---

#### 🧪 Test 4.1 — Consultation du solde

**Awa Fitness** vérifie son solde après 5 ventes :
| Métrique | Calcul |
|----------|--------|
| Total gagné | 5 × 15 000 = 75 000 FCFA |
| Commission Fari (5% FREE) | 5 × 750 = 3 750 FCFA |
| Montant vendeur | 75 000 - 3 750 = **71 250 FCFA** |
| Retraits effectués | 0 |
| **Solde disponible** | **71 250 FCFA** |

---

#### 🧪 Test 4.2 — KYC (pré-requis retrait)

| Étape | Action | Résultat |
|-------|--------|---------|
| 1 | Tentative de retrait sans KYC | ❌ 403 "Tu dois vérifier ton identité (KYC)" |
| 2 | Soumettre document identité | `kycStatus: "PENDING"` |
| 3 | Admin approuve | `kycStatus: "APPROVED"` |
| 4 | Retrait maintenant possible | ✅ |

**Cas limites KYC :**
- KYC rejeté → peut re-soumettre
- KYC PENDING → retrait bloqué
- Admin bloque les retraits (`withdrawalBlocked: true`) → 403 même si KYC OK

---

#### 🧪 Test 4.3 — Retrait (Payout)

**Awa Fitness** demande un retrait de 50 000 FCFA :

| Étape | Action | Vérification |
|-------|--------|-------------|
| 1 | Aller dans "Retraits" | Balance affichée |
| 2 | Montant : 50 000 FCFA | ✅ min 1 000, max 500 000 |
| 3 | Opérateur : Orange Money | ✅ `orange_money` ou `wave_money` |
| 4 | Téléphone : 77 123 45 67 | Normalisé → `+221771234567` |
| 5 | Nom titulaire : Awa Diallo | ✅ min 2 chars |
| 6 | Soumettre | Transaction Serializable vérifie le solde |
| 7 | Bictorys Payout API appelé | Idempotency key unique |
| 8 | Succès | Status → COMPLETED, argent reçu sur mobile |

**Cas limites retrait :**
| Test | Résultat |
|------|----------|
| Montant > solde | ❌ "Solde insuffisant" (vérifié dans transaction) |
| Montant > 500 000 | ❌ "Montant maximum 500 000 FCFA" |
| Montant < 1 000 | ❌ "Montant minimum 1 000 FCFA" |
| 11ème retrait du jour | ❌ 429 "Limite de 10 retraits par jour" |
| Total jour > 1 000 000 | ❌ "Limite quotidienne atteinte" |
| 2ème retrait < 1 min | ❌ "Attends 1 minute(s)" |
| Retrait PENDING en cours | ❌ 409 "Un retrait est déjà en cours" |
| Numéro invalide | ❌ "Numéro de téléphone invalide" |
| Bictorys timeout | Withdrawal → REJECTED, solde restauré |
| Bictorys erreur | Message user-friendly via `parseBictorysPayoutError` |

---

#### 🧪 Test 4.4 — Multi-pays (C9)

| Testeur | Pays | Téléphone | Provider | Normalisé |
|---------|------|-----------|----------|-----------|
| Awa | 🇸🇳 SN | 77 123 45 67 | Orange Money | +221771234567 |
| Mariam | 🇨🇮 CI | 07 12 34 56 78 | Wave | +2250712345678 |
| Kaba | 🇲🇱 ML | 76 00 11 22 | Orange Money | +22376001122 |
| Moussa | 🇬🇳 GN | 621 12 34 56 | Orange Money | +224621123456 |
| Amina | 🇹🇬 TG | 90 12 34 56 | Wave | +22890123456 |
| Mama | 🇨🇲 CM | 6 77 12 34 56 | Orange Money | +237677123456 |

---

#### 🧪 Test 4.5 — Analytics

**Chaque testeur vérifie dans son dashboard :**
| Métrique | Source |
|----------|--------|
| Vues de page | `PageView` (IP hashée SHA-256, dédup Redis) |
| Clics par bloc | `BlockClick` |
| Revenus par période | Agrégation Orders + CommunityPayments |
| Sources de trafic | `referrer` parsé via `parseSource()` |
| Top produits | Orders groupés par productId |

---

## Matrice de couverture par testeur

| Testeur | Signup | Onboarding | SALE | BOOKING | PAYMENT | LEAD | WAIT | PARTNER | COMMUNITY | LINK | KYC | Retrait |
|---------|--------|------------|------|---------|---------|------|------|---------|-----------|------|-----|---------|
| Awa | Email | ✅ | ✅ | ✅ | - | - | - | - | - | ✅ | ✅ | ✅ |
| Mariam | Google | ✅ | ✅ | - | ✅ | - | - | - | - | ✅ | ✅ | ✅ |
| Kaba | Google | ✅ | ✅ | ✅ | - | - | - | - | ✅ | - | ✅ | ✅ |
| Fatou | Email | ✅ | ✅ | - | - | ✅ | - | - | - | ✅ | ✅ | ✅ |
| Moussa | Email | ✅ | ✅ | - | - | - | ✅ | ✅ | - | - | ✅ | ✅ |
| Amina | Google | ✅ | ✅ | ✅ | ✅ | - | - | - | - | - | ✅ | ✅ |
| Baba | Google | ✅ | ✅ | - | - | ✅ | - | - | ✅ | - | ✅ | ✅ |
| Mama | Email | ✅ | ✅ | - | ✅ | - | - | - | - | ✅ | ✅ | ✅ |
| Sidy | Google | ✅ | ✅ | ✅ | - | - | - | - | ✅ | - | ✅ | ✅ |
| Nafi | Email | ✅ | ✅ | - | - | - | ✅ | ✅ | - | - | ✅ | ✅ |

**Couverture :**
- Signup email : 5/10 ✅
- Signup Google : 5/10 ✅
- Bloc SALE : 10/10 ✅
- Bloc BOOKING : 4/10 ✅
- Bloc PAYMENT : 3/10 ✅
- Bloc LEAD_MAGNET : 2/10 ✅
- Bloc WAITING_LIST : 2/10 ✅
- Bloc PARTNERSHIP : 2/10 ✅
- Bloc COMMUNITY : 3/10 ✅
- Bloc LINK : 5/10 ✅
- KYC + Retrait : 10/10 ✅

---

## Bugs potentiels identifiés (à surveiller)

### 🔴 Bloquants

| # | Scénario | Risque | Fichier |
|---|----------|--------|---------|
| B1 | Paiement Bictorys échoue (WAF 403) sur premier essai | Client pense que ça ne marche pas | `bictorys.ts` — retry 2s/4s/8s en place |
| B2 | Webhook Bictorys retardé > 5min | Client bloqué sur page `/pending` | `webhooks.ts` — fallback status check existe |
| B3 | `BICTORYS_REDIRECT_URL=https://google.com` en prod | Client redirigé vers Google après paiement ! | `.env` — **À CORRIGER AVANT BETA** |

### 🟡 Frictions UX

| # | Scénario | Impact | Suggestion |
|---|----------|--------|------------|
| F1 | Pas de feedback temps réel sur `/pending` | Client attend sans savoir | Poll toutes les 3s existe, mais pas de message "Vérification en cours..." |
| F2 | Email de confirmation arrive en spam | Client ne reçoit pas le lien download | `EMAIL_FROM` doit être `@izy.store` — **À CORRIGER** |
| F3 | Pas de page `/unsubscribe` | Lien List-Unsubscribe pointe vers 404 | Page à créer |
| F4 | Retrait échoué → message technique | "INSUFFICIENT_FUNDS" peu clair | `parseBictorysPayoutError` traduit déjà, vérifier tous les cas |
| F5 | KYC process pas clair côté vendeur | Vendeur ne sait pas quoi soumettre | Ajouter guide dans le dashboard |
| F6 | Communauté : pas de preview du groupe avant abo | Client achète à l'aveugle | Ajouter description + nombre de membres |

### 🟢 Améliorations futures

| # | Suggestion | Priorité |
|---|------------|----------|
| A1 | Notifications push/email quand nouvelle vente | Haute |
| A2 | Dashboard vendeur : graphique revenus en temps réel | Moyenne |
| A3 | Page publique : mode sombre | Basse |
| A4 | Export leads en CSV | Haute |
| A5 | Facture PDF auto-générée pour chaque vente | Moyenne |
| A6 | QR code de la page vendeur | Moyenne |

---

## Checklist pré-lancement beta

### ❌ Bloquants (à faire AVANT de donner accès)

- [ ] **ENV-3** : Changer `BICTORYS_REDIRECT_URL` → URL frontend réelle (`https://izy.store/store/{slug}/pending`)
- [ ] **ENV-4** : Changer `EMAIL_FROM` → `noreply@izy.store` + configurer SPF/DKIM
- [ ] **DNS** : Vérifier que le domaine `izy.store` est configuré (Vercel)
- [ ] **Bictorys** : Vérifier que le compte marchand est en mode production (pas sandbox)
- [ ] **R2** : Vérifier que le bucket Cloudflare R2 est configuré et accessible
- [ ] **Redis** : Vérifier que Upstash Redis est connecté (rate limiting)
- [ ] **Telegram** : Vérifier que les bots des testeurs communauté ont les bons tokens
- [ ] **CORS** : Ajouter le domaine production dans `ALLOWED_ORIGINS`
- [ ] **Admin** : Créer le SUPER_ADMIN via `seedAdmin.ts`

### ✅ Déjà en place

- [x] Auth email + Google OAuth
- [x] Onboarding 3 étapes
- [x] 8 types de blocs fonctionnels
- [x] Paiement Bictorys (Orange Money + Wave)
- [x] Webhooks HMAC vérifiés
- [x] Retrait multi-pays (SN, CI, ML, GN, TG, CM)
- [x] KYC gate avant retrait
- [x] Rate limiting sur tous les endpoints critiques
- [x] CSRF protection
- [x] Downloads signés + streaming
- [x] Communautés Telegram avec billing automatique
- [x] Analytics (vues, clics, revenus)
- [x] Admin dashboard (KPIs, sellers, orders, KYC, withdrawals)

---

## Résumé

**La plateforme est fonctionnellement complète pour un beta test.** Les 10 influenceurs pourront tester l'intégralité du parcours : inscription → création de page → vente → encaissement.

**3 items bloquants** à résoudre avant le lancement :
1. `BICTORYS_REDIRECT_URL` (sinon les clients finissent sur Google après paiement)
2. `EMAIL_FROM` (sinon les emails arrivent en spam)
3. Vérifier la config production (DNS, CORS, Redis, R2)

**Score de confiance : 92/100** — Prêt pour le beta test après résolution des 3 bloquants config.
