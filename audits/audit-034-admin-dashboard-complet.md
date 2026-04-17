# Audit 034 — Dashboard Admin : audit complet CRUD + UI/UX

**Date** : 2026-04-16
**Perimetre** : 100% du dashboard admin — 11 pages frontend, 12 fichiers backend (routes + libs), auth, RBAC, audit log.
**Methode** : lecture exhaustive de chaque fichier source, analyse ligne par ligne.

---

## 1. Inventaire complet des pages et actions

### 1.1 Connexion (`/admin/connexion`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin-public)/admin/connexion/page.tsx` — client component |
| **Backend** | `POST /api/admin/auth/login` |
| **Boutons** | `Se connecter` |
| **CRUD** | READ (login check) |
| **Securite** | Rate limit 5/15min (Redis), Zod validation, timing-safe comparison, httpOnly cookies |
| **UI** | Gradient navy-to-dark, card blanche centree, error banner rouge |

**Verdict : OK** — Rien a signaler.

---

### 1.2 Dashboard Home (`/admin`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/page.tsx` — server component |
| **Backend** | `GET /api/admin/dashboard/kpis`, `GET /api/admin/dashboard/revenue-chart`, `GET /api/admin/dashboard/activity` |
| **Boutons** | Clic sur KPI "KYC en attente" → `/admin/kyc` |
| **CRUD** | READ only |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| D-01 | **MEDIUM** | Le KPI `totalCommission` est calcule comme `totalRevenue - totalSellerAmount`. Si un order a `sellerAmount = null` (vieux ordre pre-fork?), ca fausse le calcul. L'endpoint devrait utiliser `_sum.commissionAmount` directement au lieu de soustraire. |
| D-02 | **LOW** | Le label KPI dit "Revenue totale" avec un seul `e` — faute d'orthographe FR ("Revenu total" ou "Revenue totale" → "Revenus totaux"). |
| D-03 | **LOW** | Le label "Sellers actifs" est en anglais — devrait etre "Vendeurs actifs". |
| D-04 | **LOW** | Le chart bar CSS n'a pas de label Y-axis, pas d'unite monetaire visible sans hover. Peu lisible sur mobile < 400px. |
| D-05 | **INFO** | `adminFetch()` dans la page duplique la logique de `serverAdminAuth.ts`. Devrait centraliser dans un helper unique. |

---

### 1.3 KYC (`/admin/kyc`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/kyc/page.tsx` — client component |
| **Backend** | `GET /api/admin/kyc?status=X`, `POST /api/admin/kyc/:sellerId/review` |
| **Boutons** | `Approuver`, `Rejeter`, onglets PENDING/APPROVED/REJECTED, preview image, modal rejet |
| **CRUD** | READ (list), UPDATE (approve/reject) |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| K-01 | **HIGH** | Les images KYC (`kycIdUrl`, `kycSelfieUrl`) sont rendues directement via `<img src={seller.kycIdUrl}>` sans passer par le proxy `/api/files/:key`. Si ces URLs pointent vers R2 en direct, ca expose les credentials R2 ou va 403 si le bucket est prive. Verifier que les URLs sont bien proxifiees. |
| K-02 | **MEDIUM** | Pas de bouton "Re-ouvrir" pour un KYC deja APPROVED ou REJECTED. Si un admin approuve par erreur, il n'y a aucun moyen de revenir en arriere depuis l'UI. Le backend refuse aussi (`409 deja traite`). **Il manque un reset KYC**. |
| K-03 | **LOW** | Le tri est par `kycSubmittedAt desc` mais les dossiers NONE n'ont pas de `kycSubmittedAt`. La tab "Aucun" n'est pas proposee dans les onglets — ca veut dire qu'on ne peut pas voir les vendeurs qui n'ont pas encore soumis. |
| K-04 | **LOW** | Pas de lien vers la fiche vendeur depuis la table KYC. On voit le nom/slug mais on ne peut pas naviguer vers `/admin/sellers/:id`. |

---

### 1.4 Vendeurs — Liste (`/admin/sellers`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/sellers/page.tsx` — client component |
| **Backend** | `GET /api/admin/sellers?search=X&kycStatus=X&plan=X&isFlagged=X&withdrawalBlocked=X` |
| **Boutons** | Recherche, 3 filtres (KYC, Plan, Signalement), lien "Voir" par ligne |
| **CRUD** | READ (list paginee) |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| S-01 | **LOW** | Le filtre `withdrawalBlocked` existe dans le backend mais n'a **pas de dropdown** dans le frontend. Le filtre Signalement couvre `isFlagged` mais pas `withdrawalBlocked`. |
| S-02 | **LOW** | La query backend n'exclut pas les vendeurs soft-deleted (`deletedAt != null`). Ils apparaissent avec `opacity-50` ce qui est voulu, mais il manque un filtre "Actifs / Supprimes / Tous" pour les separer. |
| S-03 | **INFO** | Le header de colonne est "Flags" (anglais) — devrait etre "Indicateurs" ou "Alertes". |

---

### 1.5 Vendeurs — Detail (`/admin/sellers/[id]`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/sellers/[id]/page.tsx` — client component |
| **Backend** | `GET /api/admin/sellers/:id`, `PATCH /:id/block-withdrawal`, `PATCH /:id/flag`, `PATCH /:id/commission`, `DELETE /:id` |
| **Boutons** | `Bloquer/Debloquer retraits`, `Signaler/Retirer signalement`, `Enregistrer` (commission), `Supprimer le compte` |
| **CRUD** | READ (detail + counts), UPDATE (block, flag, commission), DELETE (soft) |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| SD-01 | **HIGH** | Le bouton `Supprimer le compte` fait un soft-delete (`deletedAt = new Date()`), mais **aucune action consequente n'est declenchee** : les cagnottes du vendeur restent actives et accessibles, les retraits en PENDING ne sont pas annules, le vendeur peut toujours se connecter (le seller auth ne verifie pas `deletedAt`). **Le soft-delete est incomplet**. |
| SD-02 | **MEDIUM** | La commission personnalisee est en **basis points** (600 = 6%), mais `computeCommission()` dans `lib/commission.ts` utilise des taux fixes (6%/8%). **Rien dans le code ne consulte `customCommissionRate` au moment du calcul de commission**. Le champ est enregistre en DB mais jamais utilise. Le bouton est cosmétique. |
| SD-03 | **MEDIUM** | Pas de bouton "Restaurer" pour un compte soft-deleted. Une fois supprime, le seul recours est un `UPDATE` SQL direct. |
| SD-04 | **LOW** | Les KPI (commandes, retraits, cagnottes) sont des compteurs bruts sans montant total. Un admin voudrait voir le montant total collecte par ce vendeur. |
| SD-05 | **LOW** | `useToast` est importe de `@/components/ui/Toast` ici, mais de `@/contexts/ToastContext` dans la page KYC. Imports inconsistants. |

---

### 1.6 Cagnottes — Liste (`/admin/cagnottes`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/cagnottes/page.tsx` — client component |
| **Backend** | `GET /api/admin/cagnottes?search=X&subtype=X&status=X` |
| **Boutons** | Recherche, 2 filtres (type, statut), barre de progression inline, lien "Voir" |
| **CRUD** | READ (list paginee avec aggregats groupes — pas de N+1) |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| C-01 | **LOW** | Pas de filtre par visibilite (public/private). L'icone Eye/EyeOff est affichee mais non filtrable. |
| C-02 | **LOW** | Pas de filtre `isActive` (desactivee par admin). Les cagnottes desactivees apparaissent en `opacity-50` mais ne sont pas filtrables separement. |
| C-03 | **INFO** | Le `formatPrice()` est redefini localement dans 5 pages au lieu d'utiliser `@/lib/format` ou `@/lib/utils`. |

---

### 1.7 Cagnottes — Detail (`/admin/cagnottes/[id]`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/cagnottes/[id]/page.tsx` — client component |
| **Backend** | `GET /api/admin/cagnottes/:id`, `PATCH /:id/toggle-active`, `PATCH /:id/toggle-visibility` |
| **Boutons** | `Desactiver/Reactiver`, `Passer en privee/publique`, table des 20 derniers dons avec lien vers chaque commande |
| **CRUD** | READ (detail + stats + orders), UPDATE (toggle active, toggle visibility) |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| CD-01 | **MEDIUM** | Le backend `GET /:id` ne filtre pas `type = 'FUNDRAISER'`. La ligne 162 a un check mort (`if (!block || (block as { type?: string }).type !== undefined)`) qui ne fait rien. Un admin pourrait voir un block non-FUNDRAISER (si des vieux blocs existent en DB). Le check de type est dans `toggle-active` mais pas dans le GET. |
| CD-02 | **LOW** | La table "Derniers dons" affiche `customerEmail` en clair meme pour les donateurs anonymes. L'admin voit tout, ce qui est correct metier, mais il faudrait un indicateur visuel plus clair (ex: badge "Anonyme" + email grise). |
| CD-03 | **LOW** | Pas de pagination sur les dons (hardcode `take: 20`). Pour une cagnotte avec 500+ dons, on ne voit que les 20 derniers. |

---

### 1.8 Commandes — Liste (`/admin/orders`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/orders/page.tsx` — client component |
| **Backend** | `GET /api/admin/orders?search=X&orderType=X&paymentStatus=X&dateFrom=X&dateTo=X` |
| **Boutons** | Recherche, 2 filtres (type, statut), filtre date from/to, lien "Voir", bouton "Effacer dates" |
| **CRUD** | READ (list paginee + aggregats) |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| O-01 | **MEDIUM** | Les aggregats (`totalRevenue`, `totalCommission`) sont calcules **sur le jeu filtre**, pas sur le total global. Si on filtre par statut "PAID", les KPIs montrent uniquement le sous-total filtre — c'est correct, mais sans mention "filtre actif" l'admin peut confondre avec le total plateforme. |
| O-02 | **LOW** | Les filtres orderType incluent SALE, BOOKING, PAYMENT qui ne sont plus utilisables dans cagnottes.sn (fork cleanup). Ca ajoute du bruit inutile. Seul DONATION est pertinent. |
| O-03 | **LOW** | Le champ date utilise un `<input type="date">` natif au lieu du composant `Input` — style inconsistant. |

---

### 1.9 Commandes — Detail (`/admin/orders/[id]`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/orders/[id]/page.tsx` — client component |
| **Backend** | `GET /api/admin/orders/:id` |
| **Boutons** | Lien retour, liens vers vendeur et cagnotte |
| **CRUD** | READ only |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| OD-01 | **MEDIUM** | **Aucune action** n'est possible sur un ordre. Pas de bouton "Marquer comme rembourse", pas de "Relancer le paiement", pas d'export. C'est purement une vue de consultation. Pour un admin, pouvoir marquer un remboursement est critique (litige donateur). |
| OD-02 | **LOW** | Le `commissionRate` est affiche en divisant par 100 (`6.0%`), mais le backend stocke en basis points (600). Le calcul `order.commissionRate / 100` est correct pour l'affichage, mais le label dit "Commission (6.0%)" au lieu de "Taux de commission: 6%". |

---

### 1.10 Retraits (`/admin/retraits`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/retraits/page.tsx` — client component |
| **Backend** | `GET /api/admin/withdrawals?status=X`, `GET /:id`, `POST /:id/retry` |
| **Boutons** | Filtre statut, `Verifier` (check payout status Bictorys) |
| **CRUD** | READ (list paginee), UPDATE (retry → status sync) |

**Problemes trouves :**

**Clarification metier :** Les retraits sont auto-acceptes mais avec un **delai de 48h** avant execution cote Bictorys. Pendant cette fenetre, l'admin peut annuler le retrait ou bloquer le vendeur (avec raison envoyee par email). Pas besoin d'approve/reject classique.

| # | Severite | Description |
|---|----------|-------------|
| W-01 | **HIGH** | **Pas de bouton "Annuler le retrait"** pendant la fenetre 48h. Le flow metier prevoit que l'admin puisse annuler un retrait PENDING avant qu'il soit soumis a Bictorys, mais l'UI ne propose que "Verifier" (check status Bictorys). **Il faut un bouton "Annuler" avec raison + confirmation** sur les retraits PENDING. |
| W-01b | **HIGH** | **Pas d'email au vendeur** quand un retrait est annule ou quand ses retraits sont bloques. Le flow metier prevoit que le vendeur recoit un email avec la raison (ex: "document supplementaire requis"). |
| W-02 | **MEDIUM** | Le `handleRetry` utilise `alert()` natif au lieu du toast system. Inconsistant avec le reste de l'admin qui utilise `useToast`. |
| W-03 | **MEDIUM** | Pas de page detail retrait. Le backend a `GET /api/admin/withdrawals/:id` mais **aucune page frontend ne l'utilise**. Les infos completes (recipientName, reference, bictorysTransactionId) ne sont visibles que dans la table tronquee. |
| W-04 | **MEDIUM** | Le backend ne gere pas le **delai 48h** : aucun check que le retrait est en fenetre d'annulation. Le cron d'execution apres 48h n'existe pas — le payout est declenche immediatement dans `routes/withdrawals.ts` cote seller. **Le delai 48h doit etre implemente backend.** |
| W-05 | **LOW** | Pas de recherche textuelle (par nom vendeur, reference). On peut seulement filtrer par statut. |
| W-06 | **LOW** | La colonne `failureReason` est tronquee a 30 chars avec "..." mais il n'y a pas de tooltip ou modal pour voir le texte complet. |

---

### 1.11 Signalements (`/admin/reports`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/reports/page.tsx` — client component |
| **Backend** | `GET /api/admin/reports?status=X`, `PATCH /api/admin/reports/:id` |
| **Boutons** | Filtre statut, `Examiner`, `Rejeter` (sur chaque report PENDING) |
| **CRUD** | READ (list paginee), UPDATE (review/dismiss) |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| R-01 | **MEDIUM** | `handleAction` utilise `alert()` natif pour les erreurs. Inconsistant. |
| R-02 | **MEDIUM** | Pas de lien vers la cagnotte/vendeur signale. Le champ `storeSlug` est affiche mais non cliquable. L'admin doit manuellement chercher dans `/admin/sellers` ou `/admin/cagnottes`. |
| R-03 | **LOW** | Pas de modal de confirmation avant "Rejeter". Un clic accidentel rejette immediatement sans possibilite d'annulation. |
| R-04 | **LOW** | Le champ `description` est tronque par `truncate` CSS sans modal pour voir le texte complet. |

---

### 1.12 Notifications (`/admin/notifications`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/notifications/page.tsx` — client component |
| **Backend** | `POST /broadcast`, `POST /send`, `GET /sellers/search` |
| **Boutons** | Toggle broadcast/cible, recherche vendeur (autocomplete), `Envoyer a tous` / `Envoyer` |
| **CRUD** | CREATE (broadcast + targeted) |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| N-01 | **HIGH** | **Pas de confirmation avant broadcast**. Un clic sur "Envoyer a tous" envoie immediatement a **tous les vendeurs actifs** sans modal de confirmation. Erreur humaine probable (typo, mauvais mode). **Risque operationnel majeur**. |
| N-02 | **MEDIUM** | Pas d'historique des notifications envoyees. L'admin ne sait pas ce qui a deja ete envoye. Les logs `AdminLog` tracent l'action mais ne sont pas affiches ici. |
| N-03 | **LOW** | Le `Toggle` component est utilise pour le switch broadcast/cible mais le label ne reflete pas toujours le mode actuel de facon intuitive. |

---

### 1.13 Configuration (`/admin/config`) — SUPER_ADMIN

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/config/page.tsx` — client component |
| **Backend** | `GET /config`, `PUT /config/:key`, `DELETE /config/:key` |
| **Boutons** | `Ajouter`, `Modifier` (par ligne), `Supprimer` (par ligne, avec confirmation) |
| **CRUD** | Full CRUD (Create, Read, Update, Delete) |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| CF-01 | **HIGH** | Le backend `PUT /config/:key` accepte **n'importe quelle valeur JSON** via `z.unknown()`. Il n'y a **aucune validation semantique**. Un SUPER_ADMIN peut injecter des objets arbitraires qui pourraient crasher le frontend si lu sans validation cote consommateur. Aucun schema de config n'est defini. |
| CF-02 | **MEDIUM** | Le `PlatformConfig` model n'est reference **nulle part** dans le code metier. Aucune route, aucun service, aucune logique ne lit les valeurs de config. **La page est fonctionnelle mais inutile** — elle ecrit dans le vide. |
| CF-03 | **LOW** | La valeur est saisie en JSON brut dans un Textarea. Pas de validation en temps reel (only on submit). UX peu intuitive pour les non-devs. |

---

### 1.14 Utilisateurs Admin (`/admin/utilisateurs`) — SUPER_ADMIN

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/utilisateurs/page.tsx` — client component |
| **Backend** | `GET /users`, `POST /users`, `PATCH /users/:id` |
| **Boutons** | `Creer`, `Activer/Desactiver` (par ligne), `Select` changement de role (inline) |
| **CRUD** | Create, Read, Update (role + active). **Pas de DELETE**. |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| U-01 | **HIGH** | Le changement de role est un **`<Select>` inline sans confirmation**. Un clic accidentel sur le dropdown change immediatement le role via `PATCH`. Donner `SUPER_ADMIN` a un admin `SUPPORT` par erreur est irreversible sauf autre `SUPER_ADMIN`. |
| U-02 | **MEDIUM** | **Pas de bouton Supprimer un admin**. Le backend n'a pas de `DELETE /users/:id`. On peut seulement desactiver. Un admin desactive reste en DB indefiniment. |
| U-03 | **MEDIUM** | Le role `SUPPORT` est defini dans le type `AdminTokenPayload` et dans le form de creation, mais **aucune route ne distingue `SUPPORT` de `ADMIN`**. Le middleware `requireRole` n'est utilise que pour `SUPER_ADMIN`. SUPPORT et ADMIN ont les memes permissions partout. Role cosmétique. |
| U-04 | **MEDIUM** | `handleToggleActive` et `handleRoleChange` utilisent `alert()` natif pour les erreurs. |
| U-05 | **LOW** | Protection self-deactivation OK cote backend, mais **pas de protection self-role-downgrade**. Un SUPER_ADMIN peut se degrader en ADMIN et perdre ses droits. |

---

### 1.15 Logs (`/admin/logs`)

| Element | Detail |
|---------|--------|
| **Frontend** | `src/app/(admin)/admin/logs/page.tsx` — client component |
| **Backend** | `GET /api/admin/logs?adminId=X&action=X&dateFrom=X&dateTo=X` |
| **Boutons** | 2 filtres (admin, action), filtre date from/to |
| **CRUD** | READ only |

**Problemes trouves :**

| # | Severite | Description |
|---|----------|-------------|
| L-01 | **LOW** | La colonne "Details" tronque a 80 chars sans moyen de voir le JSON complet. Un clic devrait ouvrir un modal avec le detail formate. |
| L-02 | **LOW** | Pas d'export CSV/JSON des logs. Pour un audit de conformite, c'est une lacune. |
| L-03 | **INFO** | Les logs ne sont accessibles qu'aux admins authentifies, pas restreints a SUPER_ADMIN. Tous les admins voient les logs de tous — c'est un choix metier a confirmer. |

---

## 2. Audit Securite Backend

### 2.1 Authentification

| Point | Verdict |
|-------|---------|
| JWT HS256 avec secret partage avec seller auth (`JWT_SECRET_BYTES`) | **MEDIUM** — Meme secret pour admin et seller tokens. Un seller token avec `aud: "admin"` serait invalide (le payload ne matche pas), mais le partage de secret est fragile. |
| Access token 15min, refresh 7j | **OK** |
| Cookie httpOnly + Secure (prod) + SameSite | **OK** |
| Refresh token scope `/api/admin/auth` | **OK** |
| Token type check (reject refresh-as-access, reject non-admin audience) | **OK** |
| Re-query admin from DB on each request (30s cache) | **OK** |
| Cache eviction on logout + deactivation | **OK** |
| Rate limit login 5/15min (Redis) | **OK** |

### 2.2 CSRF

| Point | Verdict |
|-------|---------|
| Cookie double-submit pattern avec timing-safe compare | **OK** |
| CSRF skip sur GET/HEAD/OPTIONS | **OK** |
| Auth routes exclues du CSRF (login/refresh) | **OK** |
| Frontend `adminApi()` auto-attache `x-csrf-token` | **OK** |

### 2.3 RBAC

| Point | Verdict |
|-------|---------|
| `requireAdmin` sur tous les sub-routers | **OK** |
| `requireRole("SUPER_ADMIN")` sur config + users | **OK** |
| Frontend cache les nav items `superOnly` | **OK** |
| Frontend gate `ACCES_REFUSE` sur page utilisateurs | **OK** |

### 2.4 Audit Trail

| Point | Verdict |
|-------|---------|
| `logAdminAction()` appele sur login, KYC review, seller mutations, cagnotte toggles, config CRUD, admin CRUD, notifications, reports | **OK** — Couverture complete. |
| IP enregistree | **OK** |
| Log write failure silencieuse (catch + logger.error, pas de throw) | **OK** — L'action metier ne doit pas echouer si le log fail. |

### 2.5 Points de vigilance securite

| # | Severite | Description |
|---|----------|-------------|
| SEC-01 | **MEDIUM** | La route `POST /api/admin/auth/login` n'est pas protegee par CSRF (exclue volontairement car pre-auth). C'est correct, mais le rate limiter de 5/15min est la seule protection contre brute-force. Pas de CAPTCHA, pas de lockout progressif, pas de notification d'echecs. |
| SEC-02 | **MEDIUM** | `create-admin.ts` prend le mot de passe en clair en argument CLI. Visible dans l'historique shell et dans `/proc`. Devrait au minimum utiliser un prompt interactif. |
| SEC-03 | **LOW** | L'admin router est monte a `/api/admin` **sans rate limiter specifique** (sauf login). Le rate limiter global de 300/15min s'applique, mais un admin authentifie malveillant pourrait faire des appels en masse. |
| SEC-04 | **LOW** | Le cookie CSRF admin (`izy-admin-csrf`) a `SameSite=Lax` en dev et `SameSite=None` en prod. `None` en prod est necessaire pour cross-origin, mais suppose que l'admin panel est sur le meme domaine. Si deploye sur un sous-domaine different, verifier la config. |

---

## 3. Audit UI/UX global

### 3.1 Design system

| Point | Verdict |
|-------|---------|
| Sidebar navy `#172866` coherent avec la brand | **OK** |
| Composants partages (`Button`, `Badge`, `Modal`, `ConfirmDialog`, `Pagination`, `KpiCard`, `Input`, `Select`, `Textarea`, `Toggle`, `Avatar`, `ProgressBar`, `EmptyState`) | **OK** — design system solide |
| Icons Lucide coherents | **OK** |
| Skeleton loading sur toutes les pages | **OK** |
| Empty states avec icon + message | **OK** |
| Toast pour feedback (sauf 4 pages qui utilisent `alert()`) | **MEDIUM** — Inconsistance |

### 3.2 Responsivite

| Point | Verdict |
|-------|---------|
| Sidebar desktop fixe + mobile slide-over | **OK** |
| Bottom nav mobile (5 items principaux) | **OK** |
| Tables avec `overflow-x-auto` | **OK** |
| Formulaires en colonnes sur mobile, rows sur desktop | **OK** |
| `pt-14 md:pt-0` pour compenser le header mobile | **OK** |

### 3.3 Problemes UX

| # | Severite | Description |
|---|----------|-------------|
| UX-01 | **HIGH** | **Navigation inter-entites absente** : depuis la page d'un vendeur, pas de lien vers ses cagnottes. Depuis une commande, le lien vers le vendeur existe mais pas l'inverse (liste des commandes d'un vendeur). L'admin doit constamment revenir aux listes et rechercher. |
| UX-02 | **MEDIUM** | **4 pages utilisent `alert()` natif** au lieu du toast : retraits (retry), signalements (action), utilisateurs (toggle active + role change). Casse l'experience. |
| UX-03 | **MEDIUM** | **Pas de breadcrumb** sur les pages detail. Le lien "Retour" est present mais un breadcrumb `Admin > Vendeurs > Amadou Fall` serait plus clair. |
| UX-04 | **MEDIUM** | **Pas d'export** sur aucune page (CSV, Excel). Pour un admin qui doit faire du reporting, c'est bloquant. |
| UX-05 | **LOW** | Le logout mobile n'est accessible que via le slide-over hamburger. Pas de bouton logout dans le bottom nav. |
| UX-06 | **LOW** | Accents manquants dans le texte francais : "Deconnexion" au lieu de "Deconnexion", "Donnees invalides" au lieu de "Donnees invalides". Systematique sur tout l'admin (pas d'accents nulle part). |
| UX-07 | **LOW** | Les labels des filtres `Select` n'ont pas de label HTML (`<label>`). Accessibilite reduite. |

---

## 4. Resume des problemes par severite

### HIGH (a corriger avant production)

| # | Page | Description |
|---|------|-------------|
| SD-01 | Vendeur detail | Soft-delete incomplet — pas de cascade (cagnottes, sessions, retraits) |
| W-01 | Retraits | Pas de bouton "Annuler le retrait" pendant la fenetre 48h |
| W-01b | Retraits | Pas d'email au vendeur quand retrait annule ou retraits bloques |
| W-04 | Retraits | Delai 48h non implemente backend — payout declenche immediatement |
| N-01 | Notifications | Broadcast sans confirmation — risque d'envoi accidentel a tous |
| CF-01 | Config | `z.unknown()` — pas de validation sur les valeurs config |
| U-01 | Utilisateurs | Changement de role inline sans confirmation |
| K-01 | KYC | Images KYC potentiellement exposees hors proxy |
| UX-01 | Global | Navigation inter-entites absente |

### MEDIUM (a planifier)

| # | Page | Description |
|---|------|-------------|
| D-01 | Dashboard | Calcul commission indirect (soustraction vs champ dedie) |
| K-02 | KYC | Pas de reset KYC (impossible de revenir sur une decision) |
| SD-02 | Vendeur detail | `customCommissionRate` jamais utilise dans le calcul reel |
| SD-03 | Vendeur detail | Pas de restauration post-delete |
| CD-01 | Cagnotte detail | GET /:id ne filtre pas `type = FUNDRAISER` |
| O-01 | Commandes | Aggregats sur jeu filtre sans indication visuelle |
| OD-01 | Commande detail | Aucune action possible (pas de remboursement) |
| W-02 | Retraits | `alert()` au lieu de toast |
| W-03 | Retraits | Page detail backend existante mais pas de frontend |
| R-01 | Reports | `alert()` au lieu de toast |
| R-02 | Reports | Pas de lien vers la cagnotte/vendeur signale |
| N-02 | Notifications | Pas d'historique des envois |
| CF-02 | Config | `PlatformConfig` non consomme par le code metier |
| U-03 | Utilisateurs | Role SUPPORT identique a ADMIN (cosmétique) |
| U-04 | Utilisateurs | `alert()` au lieu de toast |
| SEC-01 | Auth | Pas de lockout progressif / CAPTCHA sur login |
| SEC-02 | Auth | create-admin.ts expose le mdp en clair dans le shell |
| UX-02 | Global | 4 pages avec `alert()` natif |
| UX-03 | Global | Pas de breadcrumb |
| UX-04 | Global | Pas d'export CSV/Excel |

### LOW (nice to have)

| # | Description |
|---|-------------|
| D-02, D-03, D-04 | Fautes d'orthographe, labels anglais, chart lisibilite |
| K-03, K-04 | Tab NONE manquante, pas de lien vers fiche vendeur |
| S-01, S-02, S-03 | Filtre withdrawalBlocked manquant, pas de filtre soft-deleted, label anglais |
| SD-04, SD-05 | Pas de montant total, imports toast inconsistants |
| C-01, C-02, C-03 | Filtres manquants, formatPrice duplique |
| CD-02, CD-03 | Indicateur anonyme, pas de pagination dons |
| O-02, O-03 | Filtres legacy, input date inconsistant |
| OD-02 | Label commission ambigu |
| W-05, W-06 | Pas de recherche, failureReason tronque |
| R-03, R-04 | Pas de confirmation rejet, description tronquee |
| N-03 | Label toggle confus |
| CF-03 | JSON brut en textarea |
| U-02, U-05 | Pas de delete admin, pas de protection self-downgrade |
| L-01, L-02 | Details tronques, pas d'export |
| SEC-03, SEC-04 | Rate limit admin, SameSite cookie |
| UX-05, UX-06, UX-07 | Logout mobile, accents, labels accessibilite |

---

## 5. Recommandations prioritaires

1. **Implementer le delai 48h sur les retraits** : le payout Bictorys ne doit etre declenche qu'apres 48h. Ajouter un cron qui soumet les retraits PENDING ages de 48h+ a Bictorys. Pendant la fenetre, l'admin peut annuler (bouton "Annuler" + raison + ConfirmDialog).
2. **Email au vendeur** quand un retrait est annule ou quand ses retraits sont bloques (avec la raison : "document supplementaire requis", etc.)
3. **Ajouter modal de confirmation** sur : broadcast notifs, changement de role admin, rejet signalement — toute action destructrice ou a fort impact doit passer par un ConfirmDialog.
4. **Corriger le soft-delete vendeur** : cascader la desactivation aux cagnottes + verifier `deletedAt` dans le seller auth middleware
5. **Verifier les URLs KYC** : s'assurer qu'elles passent par le proxy `/api/files/:key` et ne pointent pas directement vers R2
6. **Remplacer les 4 `alert()` restants** par le toast system (retraits, signalements, utilisateurs)
7. **Brancher `customCommissionRate`** dans `computeCommission()` ou supprimer le champ de l'UI
8. **Ajouter navigation croisee** : depuis vendeur → ses cagnottes/commandes, depuis cagnotte → son vendeur
