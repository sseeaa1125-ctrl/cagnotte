# Audit 028 — Dashboard Admin (Security + Code Quality)

**Date** : 2026-04-16
**Scope** : 37 fichiers admin (14 backend + 14 frontend + scripts)
**Résultat** : 5 CRITICAL, 8 HIGH, 10 MEDIUM, 10 LOW

---

## CRITICAL

| # | Issue | Fichier |
|---|-------|---------|
| C-1 | `verifyAdminCsrf` laisse passer quand cookie absent | `adminAuth.ts:166-176` |
| C-2 | CSRF non appliqué sur aucune route mutation admin | `admin/index.ts` |
| C-3 | Login ne renvoie pas le csrfToken → frontend stocke `undefined` | `admin/auth.ts` + `connexion/page.tsx` |
| C-4 | `/refresh` ne renouvelle pas le CSRF cookie | `admin/auth.ts:103-148` |
| C-5 | Script create-admin importe hashPassword de auth.ts au lieu d'adminAuth.ts | `create-admin.ts:3` (LOW maintenance) |

## HIGH

| # | Issue |
|---|-------|
| H-1 | Soft-delete seller ne cascade pas (withdrawals, sessions, cagnottes) |
| H-2 | KYC review pas de guard idempotency (re-approve fire duplicate notifs) |
| H-3 | Withdrawal status filter non validé |
| H-4 | Broadcast notification type `DONATION_RECEIVED` au lieu d'un type admin dédié |
| H-5 | `logAdminAction` fire-and-forget → 500 si DB down |
| H-6 | Config PUT accepte n'importe quelle clé/valeur sans allow-list |
| H-7 | RBAC frontend delayed sur utilisateurs page |
| H-8 | Dead code cagnotte type check |

## MEDIUM

M-1 CSRF token dans localStorage. M-2 Logout sans CSRF header. M-3 Cookie forwarding partiel. M-4 Dashboard duplique auth logic. M-5 Logs query expensive. M-6 alert() au lieu de toast. M-7 Commission tracking gap. M-8 Password en CLI arg. M-9 Timezone UTC boundaries. M-10 Config nav visible non-SUPER_ADMIN.

## LOW

L-1 CSRF cookie TTL 7j. L-2 Bearer header fallback. L-3 Logs open à tous admins. L-4 Proxy IP. L-5 Duplicate formatPrice. L-6 KYC approve sans documents. L-7 No password reset admin. L-8 No self-demotion guard. L-9 Login page styling. L-10 Cagnotte orders non paginés.

---

## PRIORITÉ DE FIX

1. C-1 + C-2 + C-3 + C-4 → CSRF chain complet
2. H-2 → KYC idempotency guard
3. H-4 → Notification type dédié
4. H-1 → Cascade soft-delete
5. Reste HIGH → H-3, H-5, H-6, H-7, H-8
