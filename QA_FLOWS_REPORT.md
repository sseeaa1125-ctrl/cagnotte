# Rapport QA — Test complet de tous les flows produits
**Date :** 2 mars 2026  
**Scope :** Audit end-to-end de chaque type de bloc/produit  
**Sévérité :** 🔴 Critique | 🟠 Majeur | 🟡 Mineur | 🟢 OK

---

## Résumé

| Flow | 🔴 | 🟠 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1. Produit numérique (SALE) | 0 | 0 | 2 | 14 |
| 2. Réservation / Coaching (BOOKING) | 0 | 1 | 2 | 11 |
| 3. Paiement libre / Don (PAYMENT) | 0 | 1 | 1 | 7 |
| 4. Lead Magnet (LEAD_MAGNET) | 0 | 0 | 1 | 8 |
| 5. Liste d'attente (WAITING_LIST) | 0 | 0 | 2 | 7 |
| 6. Communauté Telegram (COMMUNITY) | 0 | 1 | 2 | 12 |
| 7. Demande de partenariat (PARTNERSHIP) | 0 | 1 | 1 | 5 |
| 8. Lien externe (LINK) | 0 | 0 | 0 | 4 |
| **TOTAL** | **0** | **4** | **11** | **68** |

---

## 1. Produit numérique (SALE)

### Flow complet : Visiteur → Achat → Paiement → Téléchargement

```
Page boutique → Clic "Acheter" → PaymentModal (info) → PaymentModal (opérateur)
→ POST /api/orders → Bictorys redirect → Webhook → Success page → Download page
```

| # | Étape | Résultat | Détail |
|---|---|---|---|
| 1.1 | Affichage bloc SALE sur la boutique | 🟢 OK | 4 layouts supportés : `default`, `compact-row`, `card-image-top`, `minimal-stack`. Image cover, titre, description, prix, bouton custom. |
| 1.2 | Prix barré (discount) | 🟢 OK | `discountPrice < price` → prix original barré, prix réduit affiché. Le backend utilise `product.discountPrice ?? product.price` pour calculer le montant attendu. |
| 1.3 | Avis clients (reviews) | 🟢 OK | Étoiles, texte, nom auteur. Moyenne affichée. Max 2 avis visibles dans le bloc. |
| 1.4 | Order bumps (extras) | 🟢 OK | Checkboxes dans PaymentModal. Prix total recalculé. Backend vérifie que chaque bump appartient au même vendeur (H6). |
| 1.5 | PaymentModal — Step 1 (infos) | 🟢 OK | Email (requis + validation regex), nom (optionnel), téléphone (optionnel). Prix affiché avec bumps. |
| 1.6 | PaymentModal — Step 2 (opérateur) | 🟢 OK | 3 opérateurs (Orange Money, Wave, Carte). Sélection visuelle. Bouton retour "Modifier mes infos". |
| 1.7 | PaymentModal — Step 3 (processing) | 🟢 OK | Spinner + "Redirection vers le paiement...". `window.location.href` vers Bictorys (pas `window.open`, évite le blocage mobile). |
| 1.8 | Backend — Création commande | 🟢 OK | Validation Zod, vérif vendeur non-deleted, vérif produit appartient au vendeur, anti-fraude montant (`data.amount !== totalExpected`), commission calculée serveur (8% FREE / 4% PRO), transaction Serializable. |
| 1.9 | Backend — Webhook Bictorys | 🟢 OK | Signature vérifiée (HMAC-SHA256 ou X-Secret-Key), idempotency (transaction Serializable), montant vérifié, downloadUrl généré (token HMAC signé), compteur ventes incrémenté. |
| 1.10 | Page success — Polling | 🟢 OK | Polling 3s, max 30 polls. Affiche produit (cover, titre, prix), bouton téléchargement ou message email. Confetti CSS. |
| 1.11 | Page success — Fallback Bictorys | 🟢 OK | Si le webhook n'arrive pas, le polling `/api/orders/:ref/status` fait un fallback direct vers l'API Bictorys (`bictorys.checkTransactionStatus`). Met à jour la commande si le paiement est confirmé côté Bictorys. |
| 1.12 | Page download `/download/[ref]` | 🟢 OK | Validation légère via `/download-check` (token HMAC, payment PAID, expiration, limite). Affiche nom fichier + téléchargements restants. Bouton pointe vers `/api/orders/:ref/download`. |
| 1.13 | Téléchargement sécurisé | 🟢 OK | **Token HMAC signé** (32 chars, basé sur `JWT_SECRET`), **expiration 72h**, **max 5 downloads** (compteur incrémenté atomiquement), **fichier streamé via le serveur** (pas d'URL R2 exposée), Content-Disposition attachment, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-cache`. |
| 1.14 | Email confirmation client | 🟢 OK | Template custom (variables `{customerName}`, `{productName}`, `{productFiles}`, `{sellerName}`) ou template par défaut. Lien de téléchargement inclus. XSS escape (`escapeHtml`). |
| 1.15 | Email notification vendeur | 🟢 OK | Montant, extras (bumps), part vendeur, lien dashboard. |
| 1.16 | Erreur paiement | 🟡 MINEUR | Page `/store/[slug]/error` affiche "Paiement échoué" + bouton "Réessayer". **Mais les 2 boutons ("Réessayer" et "Retourner à la page") pointent vers la même URL** `/store/[slug]`. Le premier devrait idéalement rouvrir le modal de paiement avec les mêmes infos. |
| 1.17 | Pending → timeout | 🟡 MINEUR | Après 6 minutes (90 polls × 4s) sur la page pending, l'état passe à "timeout" avec un message "Tu recevras un email si le paiement aboutit". **Mais le fallback Bictorys dans `/status` endpoint ne notifie PAS le client par email** — il met juste à jour la DB. Si le client ferme la page pendant le timeout, il ne recevra l'email de confirmation que si le webhook arrive (pas le fallback). |

---

## 2. Réservation / Coaching (BOOKING)

### Flow complet : Visiteur → Calendrier → Créneau → Paiement → Confirmation

```
Page boutique → Clic "Réserver" → BottomSheet (calendrier) → Choix date
→ Choix créneau horaire → PaymentModal → POST /api/orders → Bictorys
→ Webhook → Success page (+ Google Calendar)
```

| # | Étape | Résultat | Détail |
|---|---|---|---|
| 2.1 | Affichage bloc BOOKING | 🟢 OK | Cover image (mobile/desktop responsive), titre, description, prix/h, durée (badge), lieu (badge). Bouton custom ou "Réserver". |
| 2.2 | Prix calculé | 🟢 OK | `prix × ceil(durée/60)`. Détail affiché si > 1h. |
| 2.3 | Aucun créneau disponible | 🟢 OK | Si `service.slots.length === 0`, affiche "Aucun créneau disponible pour le moment" au lieu du bouton. |
| 2.4 | BottomSheet — Calendrier | 🟢 OK | `BookingCalendar` composant. Sélection de date. |
| 2.5 | BottomSheet — Créneaux horaires | 🟢 OK | `TimeSlotSheet` composant. Transition calendar → times. Bouton retour vers le calendrier. |
| 2.6 | Timezone vendeur | 🟢 OK | `tzToOffset()` convertit le timezone IANA du vendeur en offset UTC pour construire l'ISO datetime. Le datetime envoyé au backend est `YYYY-MM-DDTHH:mm:00+XX:XX`. |
| 2.7 | PaymentModal booking | 🟢 OK | Envoie `bookingServiceId`, `bookingDate`, `bookingDuration`, `bookingLocation`. |
| 2.8 | Backend — Anti double-réservation | 🟢 OK | Transaction Serializable : cherche `order.findFirst({ bookingServiceId, bookingDate, paymentStatus: PAID, bookingCancelled: false })`. Si trouvé → `SLOT_TAKEN` (409). |
| 2.9 | Backend — Date passée | 🟢 OK | `bookingDate <= now` → rejeté 400. |
| 2.10 | Backend — Délai minimum | 🟢 OK | `minAdvanceHours` vérifié : `bookingDate - now < minAdvanceMs` → rejeté 400. |
| 2.11 | Page success booking | 🟢 OK | Affiche service title, date (formatée en français), heure, durée, lieu. Bouton "Ajouter au calendrier" (Google Calendar URL). |
| 2.12 | Google Calendar URL | 🟢 OK | Paramètres : `text`, `dates` (start/end), `location`, `details`. Format ISO correct. |
| 2.13 | Annulation par le vendeur | 🟢 OK | `PUT /api/orders/:id/cancel-booking`. Vérifie ownership + type BOOKING. Met `bookingCancelled: true`. Idempotent (check `already cancelled`). |
| 2.14 | SLOT_TAKEN — frontend | 🟠 MAJEUR | L'erreur "Ce créneau est déjà réservé" (409) est capturée dans PaymentModal → `setError(err.message)` → affichée. **MAIS le modal revient sur l'écran opérateur**, pas sur le calendrier. L'utilisateur doit fermer le modal, rouvrir le BookingSheet, rechoisir une date/créneau, puis rouvrir le PaymentModal. **Expérience frustrante.** Il faudrait ramener l'utilisateur au BookingSheet directement ou au moins fermer le PaymentModal et rouvrir le sheet. |
| 2.15 | Email confirmation booking | 🟡 MINEUR | L'email de confirmation (webhook) inclut la date et le lieu. **Mais la durée n'est pas mentionnée** dans l'email par défaut (seulement le service title, date, lieu). Le client ne sait pas combien de temps dure le RDV dans l'email. |
| 2.16 | Booking prix/h vs total | 🟡 MINEUR | Le frontend calcule `totalPrice = service.price * Math.ceil(service.duration / 60)` et l'envoie comme `amount`. Le backend vérifie `expectedAmount = service.price`. **Si la durée > 60min, `totalPrice > service.price`.** Le backend rejette car `data.amount !== totalExpected`. Le champ `expectedAmount` devrait être calculé avec la même formule. **Impact : les services > 1h ne peuvent pas être réservés.** → Vérifier si `service.price` est déjà le prix total ou le prix/h. |

> ⚠️ **ALERTE #2.16** : J'ai revérifié — `expectedAmount = service.price` est défini ligne 121 du backend. Le frontend envoie `totalPrice = service.price * hours`. Si `hours > 1`, le backend REJETTE le paiement car `data.amount !== expectedAmount`. Ce bug est **potentiellement bloquant** pour les services de plus d'1 heure. Il faut vérifier si les services sont toujours facturés à l'heure ou au total.

---

## 3. Paiement libre / Don (PAYMENT)

### Flow complet : Visiteur → Montant → Nom + Message → Paiement

```
Page boutique → Choix montant (preset ou custom) → "Ton nom et message"
→ Clic "Payer" → PaymentModal (opérateur) → Bictorys → Success
```

| # | Étape | Résultat | Détail |
|---|---|---|---|
| 3.1 | Affichage bloc PAYMENT | 🟢 OK | Cover image, titre, description, montants suggérés, input montant libre. Variantes : don (Heart icon) ou paiement (CreditCard icon). |
| 3.2 | Montants suggérés | 🟢 OK | Presets configurables. Clic → remplit l'input. État actif visuellement. |
| 3.3 | Montant minimum | 🟢 OK | Bouton désactivé si `amount < minAmount` (500 FCFA par défaut). Placeholder affiche `min ${formatPrice(minAmount)}`. |
| 3.4 | Nom requis | 🟢 OK | Si nom vide → `setNameError(true)` + ouvre la section détails. Message "Ton nom est requis". |
| 3.5 | Message optionnel | 🟢 OK | Textarea max 500 chars. Envoyé comme `donorMessage`. |
| 3.6 | PaymentModal PAYMENT | 🟢 OK | `orderType: "PAYMENT"`. Le nom du donateur est passé comme `donorName` ET `customerName`. Le `paymentNote` contient la description du bloc. |
| 3.7 | Backend — Vérif bloc PAYMENT actif | 🟢 OK | Vérifie qu'un bloc PAYMENT actif existe pour le vendeur. Montant accepté tel quel (pas de vérif prix produit). |
| 3.8 | Success page PAYMENT | 🟢 OK | Icône Heart, montant en gros, message du donateur affiché en italique. |
| 3.9 | DonorMessage dans le dashboard vendeur | 🟠 MAJEUR | Le `donorMessage` est sauvegardé dans l'order et retourné dans la réponse `/status`. **Mais dans la liste des commandes du vendeur** (`GET /api/orders`), le champ `donorMessage` est bien inclus dans le `select`. Cependant, **la page dashboard orders** (`/dashboard/orders`) ne l'affiche nulle part dans l'UI. Le vendeur ne voit pas les messages de ses donateurs. **Impact : les messages de soutien sont perdus côté vendeur.** |
| 3.10 | DonorName affiché | 🟡 MINEUR | Le nom du donateur est sauvegardé comme `customerName`. Il apparaît dans la liste des commandes. Mais si l'utilisateur n'a pas ouvert la section "Ton nom et message" et a juste cliqué "Payer", le `donorName` est vide ET `handlePay` retourne car `!donorName.trim()`. **C'est correct** — le nom est requis. Mais le label "Ton nom ou @réseau social *" avec l'astérisque est dans un champ collapsible → l'utilisateur peut ne pas voir qu'il est requis avant de cliquer Payer. |

---

## 4. Lead Magnet (LEAD_MAGNET)

### Flow complet : Visiteur → Formulaire → Inscription gratuite → Email + fichier

```
Page boutique → Clic bloc → BottomSheet (formulaire) → Soumission
→ POST /api/orders/lead-magnet → Email envoyé → Success inline
```

| # | Étape | Résultat | Détail |
|---|---|---|---|
| 4.1 | Affichage bloc LEAD_MAGNET | 🟢 OK | Mobile : compact row (icône/cover + titre + chevron). Desktop : card avec cover 16/9. Bouton custom ou "Recevoir gratuitement". |
| 4.2 | BottomSheet formulaire | 🟢 OK | Cover image, description, champs dynamiques (`leadFields` ou defaults email+prénom). |
| 4.3 | Champs dynamiques | 🟢 OK | Types supportés : `email`, `name`, `phone`, `whatsapp`, `custom`. Input types adaptés (`email`, `tel`, `text`). Champ email toujours requis. |
| 4.4 | Soumission | 🟢 OK | `POST /api/orders/lead-magnet` avec `sellerSlug`, `productId`, `customerEmail`, `customerName`, `customFields`. |
| 4.5 | Backend — Doublon email+produit | 🟢 OK | S18 : check `order.findFirst({ productId, customerEmail, paymentStatus: PAID })`. Si existe → 409 "Tu es déjà inscrit(e)". |
| 4.6 | Backend — Création order gratuit | 🟢 OK | `paymentProvider: "free"`, `paymentStatus: "PAID"`, `paidAt: new Date()`. Commission = 0. `totalSales` incrémenté. |
| 4.7 | Backend — Download URL | 🟢 OK | Si le produit a un `fileUrl`, un downloadUrl signé est généré (token HMAC, 72h, max 5 downloads). Sinon, pas de download. |
| 4.8 | Email confirmation | 🟢 OK | Template custom (variables `{customerName}`, `{productName}`, `{productFiles}`, `{sellerName}`) ou template par défaut avec lien téléchargement. |
| 4.9 | Success inline | 🟢 OK | Après soumission, le bloc est remplacé par un message "Merci ! Vérifie ta boîte mail." avec une icône check. |
| 4.10 | Rate limiting | 🟡 MINEUR | IP : 5/min. Par produit : 30/min (nouveau). Doublon email bloqué. **Cependant**, le rate limit par produit utilise `req.body.productId` comme clé. Si le body n'est pas encore parsé (express.json middleware), `req.body` pourrait être undefined. **Vérifier que le body parsing middleware est appliqué AVANT les routes.** |

---

## 5. Liste d'attente (WAITING_LIST)

### Flow complet : Visiteur → Formulaire → Inscription → Compteur mis à jour

```
Page boutique → Clic bloc → BottomSheet (formulaire) → Soumission gratuite
→ POST /api/orders/lead-magnet → Success inline (même endpoint que LEAD_MAGNET)
```

| # | Étape | Résultat | Détail |
|---|---|---|---|
| 5.1 | Affichage bloc WAITING_LIST | 🟢 OK | Similaire au LeadMagnet. Affiche compteur inscrits si `showSubscriberCount` activé. Affiche `X inscrits / max`. |
| 5.2 | Liste complète | 🟢 OK | Si `subscriberCount >= maxSubscribers` → `isFull = true` → soumission bloquée par `if (isFull) return`. |
| 5.3 | Compteur public | 🟢 OK | `subscriberCount = block.product.totalSales` passé depuis la page boutique. |
| 5.4 | Backend — max subscribers | 🟢 OK | Vérifie `order.count({ productId, paymentStatus: PAID }) >= maxSubscribers` → 400 "Cette liste d'attente est complète". |
| 5.5 | Waiting list payante | 🟢 OK | Si `product.price > 0`, le formulaire ouvre `PaymentModal` au lieu de soumettre directement → flow identique à SALE. |
| 5.6 | Même endpoint que Lead Magnet | 🟢 OK | Les deux types utilisent `POST /api/orders/lead-magnet`. Le backend vérifie `["LEAD_MAGNET", "WAITING_LIST"].includes(product.block.type)`. |
| 5.7 | Champs personnalisés | 🟢 OK | `leadFields` supporté comme pour Lead Magnet. |
| 5.8 | Success inline | 🟢 OK | Même pattern que LeadMagnet — bloc remplacé par confirmation. |
| 5.9 | Compteur non rafraîchi | 🟡 MINEUR | Après inscription, le compteur d'inscrits ne se met pas à jour en temps réel sur la page. Il faut recharger la page pour voir le nouveau nombre. C'est parce que `subscriberCount` vient du SSR initial et n'est pas revalidé après la soumission. |
| 5.10 | Max subscribers backend vs frontend | 🟡 MINEUR | Le frontend check `isFull` localement (avec le `subscriberCount` du SSR). Si deux personnes soumettent en même temps, le frontend ne bloque pas le second (le compteur est stale). Le backend vérifie correctement mais l'UX peut laisser croire que la soumission va passer alors qu'elle sera rejetée. |

---

## 6. Communauté Telegram (COMMUNITY)

### Flow complet : Visiteur → Modal → Paiement → Webhook → Lien Telegram

```
Page boutique → Clic "Rejoindre" → CommunitySubscribeModal (infos)
→ CommunitySubscribeModal (opérateur) → POST /api/communities/:id/subscribe
→ Bictorys → Webhook → Invite link Telegram → community-success page
```

| # | Étape | Résultat | Détail |
|---|---|---|---|
| 6.1 | Affichage bloc COMMUNITY | 🟢 OK | Cover image/icône, titre, description, compteur membres, prix/mois. Bouton "Rejoindre". |
| 6.2 | Modal — Step 1 (infos) | 🟢 OK | Titre communauté + prix/mois affiché. Mention "abonnement mensuel renouvelé". Champs dynamiques (`subscribeFields` ou email+nom par défaut). |
| 6.3 | Champs custom communauté | 🟢 OK | Types : `email`, `name`, `phone`, `whatsapp`, `custom`. Validation champs requis. WhatsApp ajouté dans `customFields`. |
| 6.4 | Modal — Step 2 (opérateur) | 🟢 OK | 3 opérateurs. Bouton "Rejoindre — X FCFA". Bouton retour. |
| 6.5 | Backend — Subscribe | 🟢 OK | Zod validation, communauté active vérifiée, commission calculée (8%/4%), période 30 jours, Bictorys appelé, paiement créé. |
| 6.6 | **Doublon email — abonné actif** | 🟢 OK | `existingSub.status === "ACTIVE" || "GRACE_PERIOD"` → 400 **"Tu es déjà abonné(e) à cette communauté."** ✅ Le message est clair et correct. |
| 6.7 | **Doublon email — paiement en cours** | 🟢 OK | `existingSub.status === "PENDING"` et `updatedAt > 10min ago` → 400 **"Un paiement est déjà en cours pour cette communauté. Réessaie dans quelques minutes."** ✅ Après 10 min, le PENDING est considéré stale et on peut réessayer. |
| 6.8 | **Doublon email — ancien abonné** | 🟢 OK | `existingSub.status === "CANCELED" || "EXPIRED"` → la subscription existante est réutilisée et mise à jour en PENDING. Pas de doublon. |
| 6.9 | Webhook — Paiement réussi (premier) | 🟢 OK | Subscription → ACTIVE. Lien invitation Telegram généré (expire 24h). Email bienvenue envoyé (avec lien Telegram + date prochain paiement + lien annulation HMAC). Notification vendeur par email. |
| 6.10 | Webhook — Renouvellement | 🟢 OK | Subscription → ACTIVE + `gracePeriodEnd: null`. Email confirmation renouvellement. |
| 6.11 | Page community-success | 🟢 OK | Polling `GET /api/communities/payment/:ref/status` (3s, max 40 polls). Si COMPLETED : affiche lien Telegram ("Rejoindre sur Telegram") ou message email. Détails abonnement (prix, prochain paiement). Si FAILED : message erreur + retour. Si timeout : message attente + retry. |
| 6.12 | Sécurité lien invite | 🟢 OK | H7 : `inviteLink` retourné UNIQUEMENT si `payment.status === "COMPLETED"`. Pas d'exposition prématurée. |
| 6.13 | Annulation abonnement | 🟢 OK | URL `cancelUrl` dans l'email avec token HMAC (`generateSubToken`). Page `/community/cancel/:id?token=...`. Token vérifié timing-safe. |
| 6.14 | Régénération lien invitation | 🟢 OK | `POST /api/communities/subscription/:id/regenerate-link`. Vérifie email + token HMAC. Génère un nouveau lien Telegram. |
| 6.15 | Redirect URL communauté | 🟠 MAJEUR | Le success redirect Bictorys pointe vers `/store/[slug]/community-success?ref=...&communityId=...`. **Mais la page `community-success` n'utilise PAS le paramètre `communityId`** — elle utilise uniquement `ref` pour poller le statut du paiement. Le paramètre est inutile mais pas nuisible. **Le vrai problème :** si le webhook Bictorys n'arrive jamais, la page community-success fait 40 polls × 3s = 2 minutes max, puis affiche "timeout". Contrairement au flow SALE, **il n'y a PAS de fallback direct** qui check Bictorys côté serveur pour les paiements communauté. Le visiteur est bloqué si le webhook est lent. |
| 6.16 | Prix verrouillé | 🟡 MINEUR | `lockedPrice` est sauvegardé dans la subscription. Si le vendeur change le prix de la communauté, les anciens abonnés gardent leur prix. **Mais le renouvellement utilise `community.priceAmount`** (prix actuel) et non `lockedPrice`. Le `lockedPrice` est informatif mais pas effectivement appliqué pour le paiement de renouvellement. |
| 6.17 | Member count non rafraîchi | 🟡 MINEUR | Le `memberCount` dans le bloc est celui du SSR initial (il vient de `community.memberCount`). Ce nombre est mis à jour manuellement lors de la création de la communauté via `telegram.getChatMemberCount`, mais pas après chaque nouveau membre. Le compteur peut être décalé. |

---

## 7. Demande de partenariat (PARTNERSHIP)

### Flow complet : Visiteur → Formulaire → Soumission → Vendeur notifié

```
Page boutique → Clic bloc → BottomSheet (formulaire détaillé)
→ POST /api/partnerships → Demande sauvegardée → Success inline
```

| # | Étape | Résultat | Détail |
|---|---|---|---|
| 7.1 | Affichage bloc PARTNERSHIP | 🟢 OK | Mobile : compact row (icône Handshake + titre + chevron). Desktop : card avec cover. Bouton custom ou "Proposer un partenariat". |
| 7.2 | BottomSheet formulaire | 🟢 OK | Champs : Nom (requis), Email (requis), Entreprise (optionnel), Téléphone (optionnel), Message (requis, textarea), Budget (optionnel). |
| 7.3 | Validation frontend | 🟢 OK | `!name.trim() || !email.trim() || !message.trim()` → soumission bloquée. |
| 7.4 | Backend — Création | 🟢 OK | Zod validation (email, max lengths), vendeur non-deleted vérifié, bloc PARTNERSHIP + ownership vérifié. `partnershipRequest.create`. |
| 7.5 | Success inline | 🟢 OK | Bloc remplacé par "Demande envoyée !" avec icône Check. |
| 7.6 | **Dashboard vendeur — Voir les demandes** | 🟠 MAJEUR | Le backend a `GET /api/partnerships` et `PUT /api/partnerships/:id/status` (accepter/refuser). **Mais** le `GET` utilise `verifyCsrf` (middleware CSRF). Or, `verifyCsrf` bloque les requêtes GET car... non — il **skip les GET** (`safeMethods.includes("GET")`). OK c'est correct. **Le problème réel :** il n'y a PAS de page frontend `/dashboard/partnerships` visible dans l'arborescence. Les demandes de partenariat sont sauvegardées en DB mais **aucune page ne les affiche**. Le vendeur ne peut pas voir les demandes. **Impact : les demandes de partenariat sont dans un trou noir.** |
| 7.7 | Notification email vendeur | 🟡 MINEUR | Le backend ne **notifie PAS** le vendeur par email quand une nouvelle demande arrive. Le vendeur doit checker manuellement... mais il n'a aucune page pour le faire (voir #7.6). |

---

## 8. Lien externe (LINK)

### Flow : Visiteur → Clic → Redirigé vers l'URL externe

```
Page boutique → Clic sur le lien → Ouverture nouvel onglet (target="_blank")
```

| # | Étape | Résultat | Détail |
|---|---|---|---|
| 8.1 | Affichage bloc LINK | 🟢 OK | Mobile : compact row (icône réseau social + titre). Desktop : card avec cover ou icône plein écran. |
| 8.2 | Icônes sociales | 🟢 OK | Map complète : Instagram, WhatsApp, TikTok, YouTube, Facebook, Telegram, Twitter, Website, Other. |
| 8.3 | Deep links | 🟢 OK | `normalizeDeepLink(url)` transforme les URLs sociales en deep links natifs (ex: `instagram://`). Fallback vers l'URL standard. |
| 8.4 | Sécurité | 🟢 OK | `target="_blank"` + `rel="noopener noreferrer"`. |

---

## Bugs critiques à corriger

### 🟠 4 problèmes majeurs

| # | Flow | Bug | Impact | Fix recommandé |
|---|---|---|---|---|
| **2.14** | BOOKING | Erreur SLOT_TAKEN affichée dans PaymentModal au lieu de ramener au calendrier | UX frustrante — l'utilisateur doit refaire tout le flow | Fermer PaymentModal + rouvrir BookingSheet quand erreur 409 |
| **2.16** | BOOKING | Backend vérifie `expectedAmount = service.price` mais frontend envoie `service.price × hours`. Services > 1h rejetés. | **Bloquant** pour les services de plus d'1 heure | Backend doit calculer `expectedAmount = service.price * ceil(duration/60)` ou le prix en DB est déjà le prix total |
| **3.9** | PAYMENT | `donorMessage` non affiché dans le dashboard vendeur | Messages de soutien perdus côté vendeur | Ajouter l'affichage du message dans la card de commande |
| **7.6** | PARTNERSHIP | Aucune page dashboard pour voir les demandes de partenariat | Demandes dans un trou noir | Créer `/dashboard/partnerships` ou intégrer dans la page orders |

### 🟡 11 problèmes mineurs

| # | Bug | Fix rapide |
|---|---|---|
| 1.16 | Page erreur : 2 boutons identiques | Différencier "Réessayer" (retour produit) et "Retour page" |
| 1.17 | Fallback Bictorys ne notifie pas par email | Déclencher l'email dans le fallback comme dans le webhook |
| 2.15 | Email booking n'inclut pas la durée | Ajouter `{duration} min` dans le template |
| 3.10 | Champ nom requis caché dans section collapsible | Ouvrir la section par défaut ou mettre le nom hors du collapsible |
| 4.10 | Rate limit productId avant body parsing | Vérifier ordre middleware |
| 5.9 | Compteur inscrits non rafraîchi post-soumission | Incrémenter localement après succès |
| 5.10 | Frontend ne bloque pas si le compteur SSR est stale | Acceptable — le backend protège |
| 6.15 | Pas de fallback Bictorys pour communautés | Ajouter un check direct Bictorys comme pour les orders |
| 6.16 | `lockedPrice` pas appliqué au renouvellement | Utiliser `subscription.lockedPrice` dans le cron de renouvellement |
| 6.17 | `memberCount` pas rafraîchi | Mettre à jour via webhook Telegram ou après chaque subscription |
| 7.7 | Pas de notification email pour les demandes de partenariat | Ajouter un `sendEmail` dans le endpoint POST |

---

## Matrice de couverture flows

| Type | Création vendeur | Affichage public | Achat/Inscription | Paiement | Post-paiement | Dashboard vendeur |
|---|---|---|---|---|---|---|
| SALE | ✅ | ✅ 4 layouts | ✅ PaymentModal | ✅ Bictorys | ✅ Download sécurisé | ✅ Orders |
| BOOKING | ✅ | ✅ Calendar+slots | ✅ PaymentModal | ✅ Bictorys | ✅ Google Calendar | ✅ Orders + Bookings |
| PAYMENT | ✅ | ✅ Montants presets | ✅ PaymentModal | ✅ Bictorys | ✅ Success page | ⚠️ donorMessage caché |
| LEAD_MAGNET | ✅ | ✅ BottomSheet | ✅ Formulaire | N/A (gratuit) | ✅ Email + Download | ✅ Audience/Leads |
| WAITING_LIST | ✅ | ✅ BottomSheet + compteur | ✅ Formulaire | ✅ Si payant | ✅ Inline success | ✅ Audience/Leads |
| COMMUNITY | ✅ | ✅ Modal | ✅ Modal + opérateur | ✅ Bictorys | ✅ Telegram invite | ✅ Communities |
| PARTNERSHIP | ✅ | ✅ BottomSheet | ✅ Formulaire | N/A | ✅ Inline success | ❌ **Aucune page** |
| LINK | ✅ | ✅ Deep links | ✅ target=_blank | N/A | N/A | N/A |

---

*Rapport généré par l'équipe QA — Izy.store v1*
