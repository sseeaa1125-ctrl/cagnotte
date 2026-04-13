───────────────────────────────────────────────────────────────────────
  AUDIT V2 — IZY.STORE — 27 Février 2026
───────────────────────────────────────────────────────────────────────

  Cet audit remplace l'audit V1. Les items précédemment identifiés
  ont été vérifiés et marqués comme corrigés ou toujours ouverts.
  De nouveaux problèmes ont été identifiés.

  Légende : ✅ = corrigé depuis V1, 🔴 = toujours ouvert, 🆕 = nouveau

═══════════════════════════════════════════════════════════════════════
  PARTIE 1 : SÉCURITÉ (Backend)
═══════════════════════════════════════════════════════════════════════

  CORRIGÉS DEPUIS V1 :
  ✅ S1  — Ancien mot de passe vérifié avant changement (auth.ts:531)
  ✅ S3  — Webhook idempotency en transaction Serializable (webhooks.ts:152)
  ✅ S4  — Suppression compte robuste avec $transaction + cascade (auth.ts:562)
  ✅ S5  — JWT retiré du body JSON — cookie httpOnly seul (auth.ts:264, google-auth.ts:159)
  ✅ S7  — timingSafeCompare pour codes vérification (auth.ts:21-24)
  ✅ S8  — Length guard avant timingSafeEqual partout (webhooks.ts:61, orders.ts:634)
  ✅ S9  — Messages d'erreur upload génériques (upload.ts:134)
  ✅ S10 — Validation config bloc pour tous les types (blocks.ts:174)
  ✅ S11 — fileUrl exclu de la réponse publique seller (sellers.ts:337)
  ✅ S12 — Proxy fichiers R2 avec validation stricte regex (files.ts:15)
  ✅ S13 — Slugs réservés vérifiés au signup (auth.ts:49-53)
  ✅ S14 — Mot de passe max 128 caractères (auth.ts:29)

  TOUJOURS OUVERTS :

  #: S2 🔴
  Problème: Comptes Google créés avec password="" au lieu de null
  Fichier: backend/src/routes/google-auth.ts:201
  Impact: Code smell — password: "" devrait être password: null ou un champ
    authMethod discriminant. Empêche une vérification propre côté
    change-password pour les users Google-only.
  Fix: Ajouter `password: null` (rendre le champ nullable dans Prisma)
    ou ajouter un champ `authMethod: "email" | "google"`.
  ────────────────────────────────────────
  #: S6 🔴
  Problème: Pas de protection CSRF — sameSite:"none" + credentials:true
  Fichier: backend/src/lib/auth.ts:25, backend/src/index.ts:41-51
  Impact: En production, les cookies sont sameSite:"none" + secure pour
    le cross-origin Vercel↔Railway. Un site malveillant peut forger des
    requêtes POST authentifiées (ex: créer un retrait).
  Fix: Ajouter un header CSRF custom (X-CSRF-Token) vérifié côté serveur
    sur toutes les mutations, ou utiliser le double-submit cookie pattern.
  ────────────────────────────────────────

  NOUVEAUX :

  #: S15 🆕
  Problème: Google auth ne vérifie pas les slugs réservés
  Fichier: backend/src/routes/google-auth.ts:176-195
  Impact: Un utilisateur Google nommé "admin" obtient le slug "admin",
    qui est réservé pour le signup email mais pas vérifié ici.
  Fix: Réutiliser RESERVED_SLUGS dans le flow Google auto-slug.
  ────────────────────────────────────────
  #: S16 🆕
  Problème: Google auth slug loop sans limite d'itérations
  Fichier: backend/src/routes/google-auth.ts:190-195
  Impact: `while(true)` pour trouver un slug unique. Théoriquement
    boucle infinie si tous les slugs dérivés sont pris.
  Fix: Ajouter un `maxAttempts = 20` et fallback cuid.
  ────────────────────────────────────────
  #: S17 🆕
  Problème: Booking double-réservation race condition
  Fichier: backend/src/routes/orders.ts:104-116
  Impact: Le check "créneau déjà réservé" (findFirst PAID) n'est pas
    dans une transaction. Deux requêtes concurrentes peuvent toutes
    deux passer le check et réserver le même créneau.
  Fix: Déplacer la vérification + création de commande dans une
    transaction Serializable, ou ajouter un unique constraint.
  ────────────────────────────────────────
  #: S18 🆕
  Problème: Endpoint download expose l'URL directe du fichier R2
  Fichier: backend/src/routes/orders.ts:655-657
  Impact: Le client reçoit `product.fileUrl` (URL proxy R2). L'acheteur
    peut partager cette URL directement — elle est publique et sans
    expiration (cache 1 an).
  Fix: Utiliser un signed URL temporaire ou un redirect serveur
    (res.redirect) au lieu de renvoyer l'URL au client.

═══════════════════════════════════════════════════════════════════════
  PARTIE 2 : API & BASE DE DONNÉES
═══════════════════════════════════════════════════════════════════════

  CORRIGÉS DEPUIS V1 :
  ✅ A1  — Rate limit 10/min/IP sur création commandes (orders.ts:35)
  ✅ A2  — Revenue chart GROUP BY SQL (sellers.ts:257)
  ✅ A3  — Analytics GROUP BY SQL (analytics.ts:106)
  ✅ A4  — PAYMENT vérifie bloc actif (orders.ts:121-128)
  ✅ A5  — Booking validation serveur (date, dispo, minAdvanceHours) (orders.ts:83-116)
  ✅ A6  — Lead magnet vérifie prix=0 (orders.ts:298-301)
  ✅ A7  — Availability vérifie seller ownership (sellers.ts:396)
  ✅ A8  — Endpoint annulation booking (orders.ts:512-543)
  ✅ A9  — Expiration PENDING auto (index.ts:152-173)
  ✅ A10 — Lead magnet stats en transaction (orders.ts:326-360)
  ✅ D1-D5 — Schéma Prisma corrigé (cascades, indexes, Int pour commission)

  NOUVEAUX :

  #: A11 🆕
  Problème: Unique visitors charge tous les groupes en mémoire
  Fichier: backend/src/routes/analytics.ts:98-105
  Impact: `groupBy(["ip"])` retourne une row par IP distincte.
    Pour un site populaire (10k+ visiteurs/mois), ça charge 10k+
    objets en mémoire juste pour faire `.length`.
  Fix: `SELECT COUNT(DISTINCT ip) FROM "PageView" WHERE ...`
  ────────────────────────────────────────
  #: A12 🆕
  Problème: Availability ignore les slots specificDate
  Fichier: backend/src/routes/sellers.ts:408
  Impact: `daySlots = service.slots.filter(s => s.dayOfWeek === dayOfWeek)`
    ne retourne que les récurrents. Un slot avec specificDate correspondant
    à la date demandée est ignoré.
  Fix: Filtrer aussi les slots où `specificDate` matche `targetDate`.
  ────────────────────────────────────────
  #: A13 🆕
  Problème: downloadCount jamais vérifié (limite non appliquée)
  Fichier: backend/src/routes/orders.ts:649-653
  Impact: Le compteur de téléchargements est incrémenté mais jamais
    comparé à une limite. Un acheteur peut télécharger indéfiniment.
  Fix: Ajouter un check `if (order.downloadCount >= MAX_DOWNLOADS)`
    avant d'autoriser le téléchargement.
  ────────────────────────────────────────
  #: A14 🆕
  Problème: Expiration download à 7 jours au lieu de 72h
  Fichier: backend/src/routes/webhooks.ts:147, orders.ts:322
  Impact: Le PRD spécifie 72h. Le code utilise 7 jours (vente) et
    30 jours (lead magnet).
  Fix: Aligner sur le PRD (72h pour vente, 30j pour lead magnet OK).
  ────────────────────────────────────────
  #: A15 🆕
  Problème: Pas de nettoyage des VerificationCode expirés
  Fichier: backend/prisma/schema.prisma:393-405
  Impact: Les codes expirés s'accumulent indéfiniment en base.
  Fix: Ajouter un cron (comme A9) qui supprime les codes où
    expiresAt < now() périodiquement.
  ────────────────────────────────────────
  #: A16 🆕
  Problème: Analytics track sans déduplication ni rate limit efficace
  Fichier: backend/src/routes/analytics.ts:17-59
  Impact: Un bot peut insérer des milliers de PageView par minute
    (le rate limit global est 300/15min, le track limiter 30/min/IP).
    Pas de déduplication par IP+path (même visite comptée N fois).
  Fix: Ajouter une dédup par IP hashé + path + fenêtre 1h.
  ────────────────────────────────────────
  #: A17 🆕
  Problème: File proxy bufferise tout le fichier en mémoire
  Fichier: backend/src/routes/files.ts:21-41, lib/storage.ts:72-93
  Impact: Pour un fichier de 50 MB, le serveur alloue 50 MB de RAM
    par requête. Sous charge, cela peut épuiser la mémoire.
  Fix: Utiliser le streaming S3 (GetObjectCommand → pipe vers res)
    au lieu de buffer complet.

═══════════════════════════════════════════════════════════════════════
  PARTIE 3 : UX (Frontend)
═══════════════════════════════════════════════════════════════════════

  CORRIGÉS DEPUIS V1 :
  ✅ UX1  — window.location.href au lieu de window.open (PaymentModal.tsx:119)
  ✅ UX2  — Loading gate dans dashboard layout (layout.tsx:54-59)
  ✅ UX3  — setAuthToken n'est plus appelé depuis les composants
  ✅ UX4  — Calendrier supporte specificDate slots (BookingCalendar.tsx:89-127)
  ✅ UX5  — Touch targets sociaux h-11 w-11 (44px) (SellerHeader.tsx)
  ✅ UX6  — Empty state booking quand pas de créneau (BookingBlock.tsx)
  ✅ UX7  — PaymentBlock NaN validation (PaymentBlock.tsx:25-47)
  ✅ UX8  — ARIA dialog, Escape key, aria-modal (TimeSlotSheet, BookingBlock)
  ✅ UX9  — Boutons up/down clavier pour réordonner (blocks/page.tsx)
  ✅ UX10 — Retry button erreur réseau (dashboard/layout.tsx:81-88)

  NOUVEAUX :

  #: UX11 🆕
  Problème: Pas de feedback visuel après copie du lien sur la page store
  Fichier: src/app/dashboard/page.tsx:80-85
  Impact: La copie du lien fonctionne mais le feedback "Copié !" est
    court (2s) et le bouton ne change pas de couleur.
  Sévérité: Basse
  ────────────────────────────────────────
  #: UX12 🆕
  Problème: Footer social icons trop petites (h-9 w-9 = 36px)
  Fichier: src/components/store/IzyFooter.tsx:69
  Impact: Les icônes sociales dans le footer font 36px, en-dessous
    du minimum 44px (48px recommandé) pour les touch targets.
  Fix: Augmenter à h-11 w-11 comme dans SellerHeader.
  ────────────────────────────────────────
  #: UX13 🆕
  Problème: Modal paiement ne reset pas l'état si on ferme et rouvre
  Fichier: src/components/store/PaymentModal.tsx:136-145
  Impact: handleClose() reset tout, mais si l'utilisateur est à
    l'étape "processing" et fait retour, il n'y a pas de moyen
    d'annuler — la page va déjà rediriger vers Bictorys.
  Sévérité: Basse (le redirect est synchrone)

═══════════════════════════════════════════════════════════════════════
  PARTIE 4 : UI
═══════════════════════════════════════════════════════════════════════

  CORRIGÉS DEPUIS V1 :
  ✅ UI1 — Texture externe remplacée par CSS pattern (auth/layout.tsx:39)
  ✅ UI3 — CSS utility classes pour thème dans globals.css
  ✅ UI4 — Spacer h-10 ajouté avant le footer fixed (IzyFooter.tsx:83-84)
  ✅ UI5 — Prix barré corrigé : discountPrice < price (SaleBlock.tsx:242-246)
  ✅ UI6 — Calendrier commence le lundi (BookingCalendar.tsx:24-25, :39)
  ✅ UI7 — Landing widgets extraits (LandingWidgets.tsx)

  TOUJOURS OUVERTS :

  #: UI2 🔴
  Problème: Google Fonts chargé via <link> au lieu de next/font
  Fichier: src/components/store/StoreThemeProvider.tsx:47-63
  Impact: Les fonts de thème sont chargées via <link> HTML classique
    (render-blocking sur 3G). next/font optimise avec preload + swap.
  Note: Complexe car les fonts sont dynamiques (dépendent du thème
    vendeur). Un <link rel="preload"> + display=swap est déjà en place.
    Impact réduit par rapport à V1.

  NOUVEAUX :

  #: UI9 🆕
  Problème: Footer fixed utilise bg-gradient from-white/80 — illisible sur thèmes dark
  Fichier: src/components/store/IzyFooter.tsx:88
  Impact: Le footer "Propulsé par Izy.store" a un gradient blanc semi-
    transparent. Sur les thèmes sombres (Nuit, Okapi, Eclipse), le
    texte et le fond se mélangent et deviennent illisibles.
  Fix: Utiliser `var(--theme-bg)` au lieu de white hardcodé.
  ────────────────────────────────────────
  #: UI10 🆕
  Problème: StoreThemeProvider inline styles massifs (30+ CSS variables)
  Fichier: src/components/store/StoreThemeProvider.tsx:66-102
  Impact: L'élément wrapper a 30+ CSS custom properties en inline style.
    Fonctionnel mais rend le HTML lourd et le debugging difficile.
  Sévérité: Basse — c'est le pattern choisi et il fonctionne.

═══════════════════════════════════════════════════════════════════════
  PARTIE 5 : FLOW (Parcours utilisateur)
═══════════════════════════════════════════════════════════════════════

  CORRIGÉS DEPUIS V1 :
  ✅ FL1 — Auth guard sur login/signup → redirect si connecté (auth/layout.tsx:18-26)
  ✅ FL2 — Onboarding check dans dashboard layout (layout.tsx:48-52)
  ✅ FL3 — Payment error page avec retry + retour (error/page.tsx)
  ✅ FL4 — Transition booking fluide (fadeIn animation)
  ✅ FL5 — Bottom tab bar à 5 items (BottomTabBar.tsx)

  NOUVEAUX :

  #: FL6 🆕
  Problème: Pas de confirmation avant suppression de bloc
  Fichier: src/app/dashboard/blocks/page.tsx
  Impact: La suppression d'un bloc (et son produit/service) est
    irréversible. Pas de modal "Es-tu sûr ?".
  Fix: Ajouter un modal de confirmation avant DELETE.
  ────────────────────────────────────────
  #: FL7 🆕
  Problème: Pas de gestion du offline/réseau instable sur la page store
  Fichier: src/components/store/PaymentModal.tsx, BookingBlock.tsx
  Impact: Sur un réseau 3G instable (Afrique francophone = cible),
    les appels API échouent silencieusement ou affichent "Erreur réseau"
    sans option de retry dans le contexte du store public.
  Fix: Ajouter un retry automatique (1-2 tentatives) sur les erreurs
    réseau dans la fonction api(), ou un bouton retry dans le modal.

═══════════════════════════════════════════════════════════════════════
  PARTIE 6 : FONCTIONNALITÉS MANQUANTES
═══════════════════════════════════════════════════════════════════════

  ┌──────────────────────────────────────────┬─────────────┬────────────────────────┐
  │             Fonctionnalité               │   Statut    │       Remarque         │
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ Notifications in-app                     │ Absent      │ Pas de modèle DB       │
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ Compteur de clics sur les liens          │ Absent      │                        │
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ Limite téléchargements (3 max/achat)     │ Partiel     │ Compteur ++ mais       │
  │                                          │             │ jamais vérifié (A13)   │
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ Webhook retry (3 tentatives)             │ Absent      │ Bictorys retry côté    │
  │                                          │             │ provider si configuré  │
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ sitemap.xml dynamique                    │ Absent      │ robots OK via metadata │
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ Templates React Email                    │ Absent      │ HTML brut fonctionnel  │
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ Sous-domaine (awa.izy.store)             │ Absent      │ /store/[slug] only     │
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ Export CSV des commandes                 │ Présent     │ lib/exportCsv.ts       │
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ Annulation booking                       │ ✅ Ajouté   │ PUT /:id/cancel-booking│
  ├──────────────────────────────────────────┼─────────────┼────────────────────────┤
  │ Expiration commandes PENDING             │ ✅ Ajouté   │ Cron 5min (A9)         │
  └──────────────────────────────────────────┴─────────────┴────────────────────────┘

═══════════════════════════════════════════════════════════════════════
  PARTIE 7 : ARCHITECTURE
═══════════════════════════════════════════════════════════════════════

  ┌──────────┬──────────────────┬────────────────────────────┬────────────────────┐
  │  Aspect  │       Spec       │          Réalité           │      Verdict       │
  ├──────────┼──────────────────┼────────────────────────────┼────────────────────┤
  │ Backend  │ Next.js API      │ Express.js séparé (port    │ Déviation majeure  │
  │          │ routes           │ 4000)                      │ (acceptable)       │
  ├──────────┼──────────────────┼────────────────────────────┼────────────────────┤
  │ Stockage │ Vercel Blob      │ Cloudflare R2 (AWS SDK S3) │ Déviation          │
  ├──────────┼──────────────────┼────────────────────────────┼────────────────────┤
  │ Next.js  │ v14 + React 18   │ v16 + React 19             │ Upgrade OK         │
  ├──────────┼──────────────────┼────────────────────────────┼────────────────────┤
  │ Prisma   │ v5               │ v7                         │ Upgrade OK         │
  └──────────┴──────────────────┴────────────────────────────┴────────────────────┘

═══════════════════════════════════════════════════════════════════════
  TOP 10 — CORRECTIONS PRIORITAIRES (V2)
═══════════════════════════════════════════════════════════════════════

  Ship-blockers (à corriger avant la prod)

  1. S17 — Race condition booking double-réservation → transaction Serializable
  2. S18 — Download expose URL R2 directe → redirect serveur ou signed URL
  3. S6  — Protection CSRF manquante → header custom X-CSRF-Token
  4. A13 — Limite téléchargements non appliquée → check downloadCount
  5. S15 — Google auth bypasse RESERVED_SLUGS → réutiliser la validation

  Haute priorité

  6. A11 — Unique visitors groupBy en mémoire → COUNT(DISTINCT ip) SQL
  7. A12 — Availability ignore specificDate slots → filtrer les deux types
  8. A17 — File proxy buffer mémoire → streaming S3
  9. S2  — password="" pour Google users → nullable ou authMethod
  10. UI9 — Footer illisible sur thèmes sombres → var(--theme-bg)

  Priorité moyenne

  11. A14 — Expiration download 7j→72h (aligner sur PRD)
  12. A15 — Nettoyage VerificationCode expirés (cron)
  13. A16 — Analytics déduplication par IP+path
  14. UX12 — Footer social icons touch targets trop petites
  15. FL6 — Confirmation avant suppression de bloc
  16. UI2 — Google Fonts → next/font (complexe, impact réduit)
  17. FL7 — Retry réseau sur la page store publique

═══════════════════════════════════════════════════════════════════════
  BILAN V2
═══════════════════════════════════════════════════════════════════════

  Progrès depuis V1 : 35/47 items corrigés (74%)

  Points forts :
  • Auth robuste : bcrypt 12 rounds, JWT httpOnly, timing-safe comparisons
  • Webhook idempotent en transaction Serializable
  • Validation Zod systématique sur tous les endpoints
  • IP hashée SHA-256 pour RGPD
  • Rate limiting sur auth, orders, analytics, status polling
  • Commission calculée côté serveur (anti-fraude)
  • Cascades Prisma correctement configurées
  • Download signé HMAC avec expiration

  Points à améliorer (5 ship-blockers restants) :
  • Race condition sur les réservations booking (S17)
  • URL fichier digital exposée au client (S18)
  • Pas de CSRF protection (S6)
  • Limite de téléchargements non appliquée (A13)
  • Google auth bypasse les slugs réservés (S15)

  Le codebase est globalement solide et prêt pour un soft-launch
  avec les 5 ship-blockers ci-dessus corrigés.