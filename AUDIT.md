# Audit Complet — Izy.store (v2)
**Date** : 1 mars 2026  
**Périmètre** : Backend (Express 5 / Prisma 7), Frontend (Next.js 16 / React 19), Schema PostgreSQL, Sécurité, Performance, UX/UI, Scalabilité

---

## Résumé Exécutif

Le codebase est **solide et bien structuré**. Toutes les corrections critiques et haute priorité ont été appliquées.

**Score global** : ███████████ **9.5/10**

### Ce qui est bien fait ✅
- Auth : cookies httpOnly + refresh token rotation (15min/7j) + CSRF double-submit (timing-safe)
- Webhooks : HMAC-SHA256 + replay protection (5min tolerance) + idempotency (serializable tx)
- Passwords : bcrypt 12 rounds, timing-safe code comparison
- Transactions sérialisables sur toutes les opérations critiques (paiements, retraits, webhooks)
- Rate limiting granulaire sur toutes les routes (auth 20/15min, write 30/min, withdrawal 5/h, community subscribe 10/min)
- Upload : validation MIME par magic bytes (file-type), pas juste le header client
- XSS : escapeHtml dans tous les emails, Zod validation systématique
- Soft-delete avec conservation légale des données financières
- Chiffrement AES-256-GCM des tokens Telegram bot
- Gzip compression, stale-while-revalidate cache frontend (useApi avec race condition fix)
- Index DB optimisés sur toutes les tables critiques
- SEO complet (OG tags, sitemap, metadata dynamiques)
- Phone normalization multi-pays (15 pays africains) + payout country dynamique
- WebhookLog auto-cleanup (> 90 jours)

---

## ✅ CORRIGÉS — Tous les critiques et haute priorité

| ID | Description | Fix appliqué |
|---|---|---|
| **C9** | normalizePhone ne supportait que le Sénégal | ✅ Supporte 15 pays africains + country dynamique dans payout |
| **C10** | Revenue chart ne comptait pas les communautés | ✅ Déjà corrigé (vérifié dans sellers.ts:280-307) |
| **H1** | Rate limit community subscribe insuffisant | ✅ `subscribeLimiter` 10/min dédié (communities.ts:406) |
| **H3** | Fuite err.message dans telegram.ts | ✅ Messages génériques déjà en place |
| **H6** | Email subjects HTML-escaped | ✅ Utilise titre brut dans webhooks.ts:111 |
| **H7** | inviteLink exposé avant paiement COMPLETED | ✅ Conditionné sur payment.status (communities.ts:570) |
| **H8** | Pas de pagination sur leads | ✅ Cursor pagination + take:500 (leads.ts:139) |
| **H10** | memberCount jamais décrémenté | ✅ Decrement dans left/kicked (webhooksTelegram.ts:172) |
| **H11** | Cron billing traite communautés désactivées | ✅ Filtre `isActive: true` dans toutes les queries cron |
| **H14** | WebhookLog grandit indéfiniment | ✅ Cron cleanup > 90 jours ajouté (index.ts) |
| **H15** | useApi race condition | ✅ fetchIdRef counter (useApi.ts:46) |
| **M1** | DevTools visible si NODE_ENV pas défini | ✅ Check `!== "production"` (DevTools.tsx) |
| **M2** | customFields sans validation profondeur | ✅ Déjà corrigé : `.max(500)` + `.refine(<=20 keys)` (orders.ts:292) |
| **M7** | OrderBumps sans take limit | ✅ `take: 10` ajouté (sellers.ts:398) |
| **M11** | backward compat tokens sans type | ✅ Stricter check : bloque `type === "refresh"` (auth.ts:119) |
| **M14** | setAuthToken/getAuthToken no-ops | ✅ Supprimés (api.ts) |

---

## 🟡 RESTANTS — Priorité moyenne/basse (non bloquants)

### M3 — themeColors JSON pas typé strictement en Prisma
Le champ `themeColors Json?` accepte n'importe quel JSON. La validation Zod côté route est correcte (`.strict()`).

### M5 — Order.downloadUrl stocke l'URL complète avec token HMAC
Impact limité (72h d'expiration). **Fix à terme** : Stocker la référence, re-signer à la volée.

### M6 — Pas de limite sur les reviews par produit
Un vendeur peut créer un nombre illimité d'avis. **Fix à terme** : Limiter à 20 par produit.

### M8 — PATCH /api/blocks/reorder silencieux sur blockId invalide
`updateMany` met à jour 0 lignes sans erreur.

### M9 — Booking date validation timezone-unaware
Correct pour Africa/Dakar (UTC+0) mais fragile pour d'autres fuseaux.

### M10 — Webhook Telegram : pas de vérification du botId en base
Le `botId` du path param n'est pas vérifié avant traitement.

### M12 — Balance calculation fait 4 requêtes agrégées
**Fix à terme** : Champ `cachedBalance` sur Seller, recalculé par les webhooks.

### M13 — formatPrice dupliqué frontend/backend
Même logique dans les deux `utils.ts`.

### L1 — Cron functions dans index.ts
Déplacer vers `lib/cron/`.

### L2 — Pas de health check frontend
Pas de route `/api/health` côté Next.js.

### L3 — logger.log pas structuré
**Fix à terme** : Logger JSON structuré pour Railway.

### L5 — LandingWidgets.tsx animations CSS lourdes
Pas critique.

### L6 — PhoneInput dropdown z-index
Utilise déjà `z-50`, OK dans la plupart des cas.

---

## 📊 Tableau Sécurité

| Aspect | Statut | Détail |
|---|---|---|
| Auth cookies httpOnly | ✅ | secure + sameSite none en prod |
| Refresh token rotation | ✅ | 15min access / 7j refresh |
| CSRF double-submit | ✅ | timing-safe comparison |
| Webhook HMAC + replay | ✅ | SHA256 + 5min timestamp tolerance |
| Webhook idempotency | ✅ | Serializable tx + WebhookLog check |
| Password hashing | ✅ | bcrypt 12 rounds |
| Code comparison | ✅ | timingSafeCompare |
| Rate limiting | ✅ | Global + par route, community subscribe 10/min |
| XSS emails | ✅ | escapeHtml systématique |
| File upload MIME | ✅ | Magic bytes via file-type |
| Download token | ✅ | HMAC + 72h expiry |
| Cancel subscription | ✅ | HMAC token requis |
| Soft-delete | ✅ | deletedAt + filtrage systématique |
| Telegram bot tokens | ✅ | AES-256-GCM chiffrement |
| SQL injection | ✅ | Prisma ORM, params positionnels |
| Input validation | ✅ | Zod sur toutes les routes |
| Trust proxy | ✅ | `app.set("trust proxy", 1)` |
| CORS | ✅ | Whitelist multi-origin |
| Helmet | ✅ | Headers sécurité HTTP |
| Compression | ✅ | Gzip via compression() |
| Token type enforcement | ✅ | Refresh tokens bloqués comme access |
| WebhookLog cleanup | ✅ | Cron auto > 90 jours |

---

## 📱 Tableau UX/UI

| Aspect | Statut | Détail |
|---|---|---|
| Mobile-first | ✅ | Bottom sheet modals, bottom tab bar |
| Loading states | ✅ | DashboardSkeleton, Spinner |
| Empty states | ✅ | EmptyState composant réutilisable |
| Error handling | ✅ | Toast notifications + error boundaries |
| Formulaire retrait | ✅ | 4 étapes (form→confirm→processing→success) |
| PhoneInput multi-pays | ✅ | 15 pays africains, auto-format, country selector |
| Opérateurs avec logos | ✅ | Wave/OM avec images, checkmark sélection |
| Filtres période | ✅ | DateRangePicker sur stats, chart, paiements |
| Touch targets | ✅ | ≥ 48px (py-3.5 = 52px) |
| Accessibilité modals | ✅ | Focus trap, aria-modal, aria-labelledby |
| Anti-double-click | ✅ | useRef lock frontend + rate limit backend |
| Themes | ✅ | 16 thèmes, 4 layouts, fonts, cover images |

---

## 🚀 Tableau Scalabilité

| Aspect | Statut | Détail |
|---|---|---|
| DB indexes | ✅ | Composés sur toutes les tables critiques |
| Pagination | ✅ | Cursor-based sur orders, images, leads |
| Rate limiting | ✅ | Global + par route |
| Gzip | ✅ | compression() middleware |
| Frontend cache | ✅ | useApi stale-while-revalidate + race condition fix |
| WebhookLog cleanup | ✅ | Cron auto-suppression > 90 jours |
| OrderBumps publics | ✅ | take: 10 limit |
| Balance cache | ⚠️ | 4 aggregates par appel (M12 — fix à terme) |
| Cron robustesse | ⚠️ | setInterval (perdu au restart, mais Railway restart vite) |
| Connection pooling | ✅ | Prisma gère le pool nativement |
