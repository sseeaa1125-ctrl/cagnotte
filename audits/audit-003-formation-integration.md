# Audit 003 — Intégration bloc FORMATION + Systeme.io

**Date** : 2026-03-22
**Scope** : Nouveau bloc FORMATION avec inscription automatique aux cours Systeme.io après paiement

---

## 1. Résumé

Le bloc **FORMATION** permet aux vendeurs de vendre des formations hébergées sur Systeme.io. Après paiement, l'acheteur est automatiquement inscrit au cours Systeme.io associé.

---

## 2. Fichiers modifiés

### Backend
| Fichier | Changement |
|---------|-----------|
| `backend/prisma/schema.prisma` | `FORMATION` dans `BlockType` enum + `systemeioCourseId String?` sur `Product` |
| `backend/src/lib/blocks/schemas.ts` | `formationBlockConfigSchema` + ajout dans `blockTypeToSchema` |
| `backend/src/routes/blocks.ts` | FORMATION dans `createBlockSchema`, plan limits, `typesWithProduct`, create + update product |
| `backend/src/lib/email-marketing.ts` | `systemeioFetchCourses()`, `systemeioEnrollStudent()`, `enrollStudentInCourse()` |
| `backend/src/routes/integrations.ts` | `GET /api/integrations/systemeio/courses` |
| `backend/src/routes/webhooks.ts` | Inscription Systeme.io après paiement confirmé pour FORMATION |

### Frontend
| Fichier | Changement |
|---------|-----------|
| `src/types/index.ts` | `FORMATION` dans `BlockType` union |
| `src/lib/productTypes.ts` | Définition FORMATION (icon 🎓, tabs, defaultButtonText "Accéder") |
| `src/components/dashboard/AddBlockModal/constants.tsx` | FORMATION dans catégorie ecommerce |
| `src/components/dashboard/AddBlockModal/index.tsx` | `systemeioCourseId` dans `handleFullFormSave` |
| `src/components/dashboard/ProductForm/types.ts` | `systemeioCourseId` dans `ProductFormData`, `EMPTY_FORM`, `TAB_LABELS_BY_TYPE` |
| `src/components/dashboard/ProductForm/CheckoutTab.tsx` | Section FORMATION (description + prix + cours) |
| `src/components/dashboard/ProductForm/SystemeioCourseSelector.tsx` | **Nouveau** — dropdown de cours Systeme.io |
| `src/components/dashboard/ProductForm/OptionsTab.tsx` | Template email FORMATION |
| `src/components/dashboard/ProductForm/index.tsx` | Tab errors FORMATION + landing optionnel |
| `src/app/dashboard/blocks/page.tsx` | Icon, label, subtitle pour FORMATION |
| `src/app/dashboard/blocks/[id]/edit/page.tsx` | Load + save `systemeioCourseId` |
| `src/app/dashboard/statistics/page.tsx` | Labels, icons, colors, isTransactional |
| `src/app/dashboard/settings/integrations/page.tsx` | Section "Formations" (connecté + connexion) |
| `src/components/store/CheckoutCTA.tsx` | FORMATION traité comme SALE (PaymentModal) |
| `src/components/store/blocks/StoreCard.tsx` | FORMATION dans BLOCK_ICONS |
| `src/app/store/[slug]/page.tsx` | `getBlockSubtitle`, `ALWAYS_DETAIL_TYPES`, `defaultButtonText` |
| `src/app/store/[slug]/[blockId]/page.tsx` | `defaultButtonText` "Accéder" |

---

## 3. Statut : ✅ Pas de bug bloquant

- **Backend `tsc --noEmit`** : 0 erreurs
- **Frontend `tsc --noEmit`** : 0 erreurs
- **DB push** : OK (schema synchronisé)

---

## 4. Bug corrigé durant l'audit

### 🔴 Mauvais endpoint Systeme.io (CRITIQUE)

**Problème** : Les appels API utilisaient `/api/courses` et `/api/courses/{id}/enrollments` alors que la vraie API Systeme.io utilise `/api/school/courses` et `/api/school/courses/{id}/enrollments`.

**Impact** : Les cours Systeme.io n'étaient jamais récupérés → le dropdown affichait toujours une erreur.

**Fix** : `backend/src/lib/email-marketing.ts` — URLs corrigées :
- `https://api.systeme.io/api/courses` → `https://api.systeme.io/api/school/courses`
- `https://api.systeme.io/api/courses/{id}/enrollments` → `https://api.systeme.io/api/school/courses/{id}/enrollments`

### 🟡 SystemeioCourseSelector — message d'erreur générique (MINEUR)

**Problème** : Le catch affichait toujours "Connecte d'abord Systeme.io" même quand le vrai problème était différent (clé invalide, erreur réseau, etc.).

**Fix** : `SystemeioCourseSelector.tsx` — utilise maintenant `ApiError.message` pour afficher le vrai message d'erreur du backend.

---

## 5. Points d'attention mineurs

### FORMATION dans `typesWithConfigUpdate` (sans impact)

Dans `blocks.ts` ligne 433, FORMATION est dans `typesWithConfigUpdate` pour la validation du config en update. Le config schema FORMATION est minimal (`{ productId? }`). Ça ne pose pas de problème car les données réelles sont dans `product`, pas dans `config`. Mais c'est inutile — FORMATION pourrait être retiré de cette liste.

### `orderType` toujours "SALE" pour FORMATION

Les commandes FORMATION utilisent `orderType: "SALE"` dans le `PaymentModal` et dans le schéma `createOrderSchema`. C'est correct car :
- Le prix est vérifié côté serveur via `productId`
- La page succès utilise `type=SALE` et affiche correctement (pas de fichier → fallback email)
- Le webhook identifie le FORMATION via `order.product.block.type === "FORMATION"` pour l'inscription Systeme.io

### Pas de validation `systemeioCourseId` côté serveur

Le backend accepte n'importe quel string comme `systemeioCourseId`. Pas de vérification que le cours existe réellement sur Systeme.io au moment de la création du bloc. L'erreur ne sera détectée qu'au moment du webhook post-paiement. C'est acceptable en V1 mais à améliorer si des vendeurs se plaignent de cours non trouvés.

---

## 6. Flux complet vérifié

```
Vendeur connecte Systeme.io (Paramètres → Intégrations)
    → API key chiffrée en base
    → Section "Formations incluses" visible

Vendeur crée bloc Formation
    → CheckoutTab affiche description + prix + dropdown cours
    → SystemeioCourseSelector → GET /api/integrations/systemeio/courses
    → systemeioCourseId sauvegardé sur Product

Acheteur visite la page store
    → FORMATION dans ALWAYS_DETAIL_TYPES → page détail
    → CTA "Accéder" → PaymentModal (orderType: "SALE")

Paiement confirmé (webhook Bictorys)
    → Commande marquée PAID
    → Contact sync vers Systeme.io (tag "formation")
    → enrollStudentInCourse() → POST /api/school/courses/{id}/enrollments
    → Email de confirmation personnalisé envoyé
```
