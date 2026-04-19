# `@amadou/*` Starter Kit — Design

**Date** : 2026-04-19
**Statut** : Spec validée, plan d'implémentation à suivre
**Source** : extraction depuis cagnottes.sn (lecture seule — le repo source n'est pas modifié)

---

## 1. Objectif

Construire un **monorepo de packages npm privés** publié sur GitHub Packages sous le scope `@amadou/*`, qui mutualise toute la plomberie réutilisable identifiée dans cagnottes.sn (auth, paiements, queue, storage, notifications, webhook, frontend headless), de manière à pouvoir démarrer un nouveau projet de la même stack en quelques heures plutôt qu'en quelques semaines.

**Stack ciblée** (figée pour tous les projets utilisant ce starter) :

- Frontend : Next.js 16 + React 19 + Tailwind CSS 4
- Backend : Express 5 + Prisma 7 + PostgreSQL (Neon)
- Infra : Upstash Redis (queue + rate limit), Cloudflare R2 (storage), Resend (email), Bictorys (paiements)
- TypeScript strict partout, Node 20 LTS

---

## 2. Forme du livrable

### 2.1 Monorepo unique

```
amadou-starter/
├── packages/                    ← briques publiées
│   ├── core/                    @amadou/core
│   ├── infra/                   @amadou/infra
│   ├── auth/                    @amadou/auth
│   ├── storage/                 @amadou/storage
│   ├── email/                   @amadou/email
│   ├── notifications/           @amadou/notifications
│   ├── webhook/                 @amadou/webhook
│   ├── payments/                @amadou/payments
│   ├── payments-bictorys/       @amadou/payments-bictorys
│   └── react-api/               @amadou/react-api
├── apps/
│   └── template/                ← app de validation + template clonable
│       ├── backend/             Express minimal qui monte chaque package
│       └── frontend/            Next.js minimal qui consomme react-api
├── .changeset/                  versioning
├── .github/workflows/           CI (lint+test+build sur PR, publish sur tag)
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

### 2.2 Outillage

| Concern | Choix | Raison |
|---|---|---|
| Workspace | **pnpm workspaces** | rapide, strict sur les hoists, standard 2025 |
| Build orchestration | **turborepo** | cache local + remote, `turbo run build` parallèle |
| Versioning | **changesets** | PR-based versioning, parse Conventional Commits |
| Build TS | **tsup** | dual ESM+CJS sans config, rapide, sourcemaps |
| Lint | ESLint + `@typescript-eslint` (config partagée) | standard |
| Test | **Vitest** (par package) + smoke-test E2E dans `apps/template/backend` | léger, ESM-friendly |
| TS config | `tsconfig.base.json` partagé, strict, target ES2022, moduleResolution NodeNext |
| Node | 20 LTS minimum | aligné Vercel/Neon |

### 2.3 Registry & publish

**GitHub Packages** sous le scope `@amadou/*`. Tokens via `GITHUB_TOKEN` en CI, `~/.npmrc` local pour devs.

`.npmrc` template projet :
```
@amadou:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Publication automatique sur tag `vX.Y.Z` via GitHub Actions (changesets release flow).

### 2.4 Workflow nouveau projet

1. `gh repo create new-project --template=amadou-org/amadou-starter-template`
   (le `apps/template` est extrait comme template repo séparé via une action de sync)
2. `cd new-project && pnpm install`
3. Supprimer les routes et imports correspondant aux modules non-utilisés (auth toujours présent, payments optionnel, etc.)
4. Configurer `.env`, `prisma/schema.prisma`, déployer.

---

## 3. Packages — contenu détaillé

### 3.1 `@amadou/core` — fondations sans dépendances

**Exports** :
- `logger` — structured JSON logger avec **redaction prod** (emails, téléphones, refs paiement). Inspiré directement de [backend/src/lib/logger.ts](backend/src/lib/logger.ts).
- `crypto` — wrappers AES-256-GCM (`encrypt(plaintext, key)`, `decrypt(ciphertext, key)`). Source : [backend/src/lib/crypto.ts](backend/src/lib/crypto.ts).
- `slug` — `slugify(input)` + `ensureUniqueSlug(base, createFn, opts)` avec reserved-words guard et numeric-suffix fallback. Source : [backend/src/lib/cagnottes/slug.ts](backend/src/lib/cagnottes/slug.ts).
- Helpers Zod génériques (`zEmail`, `zPhone`, `zCuid`, `zPositiveInt`).

**Dépendances** : `zod` (peer), aucune autre.

### 3.2 `@amadou/infra` — clients d'infra Redis

**Exports** :
- `createRedisClient(env)` — Upstash REST client wrapper. Source : [backend/src/lib/redis.ts](backend/src/lib/redis.ts).
- `RedisRateLimitStore` — store compatible `express-rate-limit`. Source : [backend/src/lib/rateLimitStore.ts](backend/src/lib/rateLimitStore.ts).
- `JobQueue<T>` — base class persistent Redis-backed queue (push, pop, retry, dead-letter). Source : [backend/src/lib/queues/JobQueue.ts](backend/src/lib/queues/JobQueue.ts).

**Dépendances** : `@upstash/redis` (peer), `@amadou/core`.

### 3.3 `@amadou/auth` — authentification complète

**Exports** :
- `createAuthRouter({ prisma, env, mailer? })` — retourne un `express.Router` avec : `POST /signup`, `POST /login`, `POST /logout`, `POST /refresh`, `GET /me`, `POST /verify-email`, `POST /forgot-password`, `POST /reset-password`, **`PUT /change-password`** (verbe critique). Le `mailer` est **requis** si les routes `verify-email` / `forgot-password` sont montées (sinon throw au setup) ; optionnel sinon.
- `requireAuth` middleware — DB re-query du seller pour empêcher stale-JWT bypass. Source : [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts).
- `verifyCsrf` middleware.
- `signAccessToken / signRefreshToken / verifyToken` — helpers JWT (jose). Source : [backend/src/lib/auth.ts](backend/src/lib/auth.ts).
- `hashPassword / comparePassword` (bcrypt 12 rounds).

**Couplage Prisma** : `PrismaClient` injecté au setup (DI). Le projet consommateur fournit son `User` model conforme à un fragment de référence documenté.

**Fragment Prisma de référence** documenté dans le README :
```prisma
model User {
  id                    String   @id @default(cuid())
  email                 String   @unique
  passwordHash          String
  emailVerifiedAt       DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
model VerificationCode {
  id        String   @id @default(cuid())
  userId    String
  code      String
  type      String   // EMAIL_VERIFY | PASSWORD_RESET
  expiresAt DateTime
  usedAt    DateTime?
  @@index([userId, type])
}
```

**Cookies** : `<app>-token` (httpOnly, 15min) + `<app>-refresh` (httpOnly, scoped to `/api/auth`, 7j) + `<app>-csrf` (readable, 7j). Préfixe configurable via env `AUTH_COOKIE_PREFIX`.

**Dépendances** : `jose`, `bcryptjs`, `cookie-parser` (peer), `express` (peer), `@prisma/client` (peer), `@amadou/core`.

### 3.4 `@amadou/storage` — R2 / S3

**Exports** :
- `createStorageClient({ env })` — wrapper `@aws-sdk/client-s3` config R2. Source : [backend/src/lib/storage.ts](backend/src/lib/storage.ts).
- `createUploadRouter({ storage, prisma, requireAuth })` — `POST /upload` (multipart, validation type/taille).
- `createFilesRouter({ storage })` — `GET /files/:key` proxy avec headers cache appropriés.

**Dépendances** : `@aws-sdk/client-s3`, `multer` (peer), `express` (peer), `@amadou/core`.

### 3.5 `@amadou/email` — Resend + queue persistente

**Exports** :
- `createMailer({ env })` — `send({ to, subject, html, text, listUnsubscribe? })` avec headers RFC 2369.
- `EmailQueue` — extends `JobQueue<EmailJob>`, retry exponentiel, dead-letter. Source : [backend/src/lib/queues/emailQueue.ts](backend/src/lib/queues/emailQueue.ts).
- Templates engine simple basé sur fonctions TS (`(data) => { subject, html, text }`), pas de moteur de templating tiers.

**Fragment Prisma de référence** :
```prisma
model EmailJob {
  id          String   @id @default(cuid())
  to          String
  subject     String
  html        String
  text        String?
  status      String   @default("PENDING") // PENDING | SENT | FAILED | DEAD
  attempts    Int      @default(0)
  lastError   String?
  scheduledAt DateTime @default(now())
  sentAt      DateTime?
  createdAt   DateTime @default(now())
  @@index([status, scheduledAt])
}
```

**Dépendances** : `resend`, `@amadou/core`, `@amadou/infra`.

### 3.6 `@amadou/notifications` — dispatcher dédupliqué

**Exports** :
- `createNotificationService({ prisma })` — single entry point `createNotification({ userId, type, title, body, data, dedupeKey, ... })` avec catch P2002 sur `dedupeKey @unique` (at-most-once delivery). Source : [backend/src/lib/notifications/](backend/src/lib/notifications/).
- `createNotificationsRouter({ prisma, requireAuth })` — `GET /`, `GET /count`, `POST /mark-read`, `GET/PATCH /prefs`. Filtre toujours par `req.user!.sub` (cross-user leak guard).
- Helpers `detectCrossed(prevTotal, newTotal, milestones)` (pure).

**NB** : le moteur est générique. Les wrappers métier (`fireDonationReceived`, `firePayoutCompleted`, etc.) restent dans chaque projet, pas dans le package.

**Fragment Prisma de référence** :
```prisma
model Notification {
  id         String   @id @default(cuid())
  userId     String
  type       String
  title      String
  body       String
  data       Json?
  dedupeKey  String   @unique
  readAt     DateTime?
  createdAt  DateTime @default(now())
  @@index([userId, readAt])
}
```

**Dépendances** : `@prisma/client` (peer), `express` (peer), `@amadou/core`.

### 3.7 `@amadou/webhook` — handler idempotent

**Exports** :
- `createWebhookHandler({ prisma, providers })` — dispatcher générique sur `eventType`. Logge dans `WebhookLog` via `upsert` sur `@@unique([externalId, eventType])` à l'intérieur d'un `$transaction({ isolationLevel: Serializable })`. Hooks post-commit pour les side-effects (notifications, emails) — la transaction reste **strictement DB-only** pour respecter le ceiling Neon 2s. Source : [backend/src/routes/webhooks.ts](backend/src/routes/webhooks.ts).
- `verifySignature(rawBody, headers, secret, opts)` — timing-safe HMAC-SHA256 avec replay window 5min.

**Fragment Prisma de référence** :
```prisma
model WebhookLog {
  id          String   @id @default(cuid())
  provider    String
  externalId  String
  eventType   String
  payload     Json
  processedAt DateTime?
  createdAt   DateTime @default(now())
  @@unique([externalId, eventType])
  @@index([createdAt])
}
```

**Dépendances** : `@prisma/client` (peer), `express` (peer), `@amadou/core`.

### 3.8 `@amadou/payments` — interface + circuit breaker + commission

**Exports** :
- Interface `PaymentProvider` :
  ```ts
  interface PaymentProvider {
    name: string;
    charge(input: ChargeInput): Promise<ChargeResult>;
    refund?(input: RefundInput): Promise<RefundResult>;
    payout?(input: PayoutInput): Promise<PayoutResult>;
    verifyWebhook(rawBody: Buffer, headers: Record<string,string>): WebhookVerifyResult;
  }
  ```
- `CircuitBreaker` — in-memory rolling-window breaker (`failures`, `windowMs`, `cooldownMs`). Source : [backend/src/lib/payments/circuitBreaker.ts](backend/src/lib/payments/circuitBreaker.ts). **Limitation documentée** : single-instance only ; un swap Redis est hors scope du starter v1.
- `composeOrderRateLimiters({ store })` — retourne les 3 rate limiters cagnottes-style (ip-min, ip-hour, email-min) configurables, à composer avec `express-rate-limit`. Source : [backend/src/routes/orders.ts](backend/src/routes/orders.ts).
- `computeCommission(gross: number, rateBp: number)` — **export optionnel** (pas tous les projets ont des commissions). `rateBp` en basis points (600 = 6%, 800 = 8%). `Math.floor`, invariant `commission + net === gross` enforced. Source : [backend/src/lib/commission.ts](backend/src/lib/commission.ts).

**Dépendances** : `express-rate-limit` (peer), `@amadou/core`, `@amadou/infra`.

### 3.9 `@amadou/payments-bictorys` — adapter Bictorys

**Exports** :
- `createBictorysProvider({ env })` — implémente `PaymentProvider` :
  - `charge` avec 3 retries exponentiels sur 403 WAF (2s, 4s, 8s)
  - `payout` via clé séparée `BICTORYS_PRIVATE_KEY` (jamais mélangée avec `BICTORYS_API_KEY`)
  - `verifyWebhook` timing-safe `x-secret-key` ou HMAC-SHA256 via `x-webhook-signature` + `x-webhook-timestamp`
- Sources : [backend/src/lib/payments/bictorys.ts](backend/src/lib/payments/bictorys.ts), [backend/src/lib/payout.ts](backend/src/lib/payout.ts).

**Dépendances** : `@amadou/payments`, `@amadou/core`.

### 3.10 `@amadou/react-api` — frontend headless

**Exports** :
- `createApi({ baseUrl, csrfCookie, authCookie })` → fonction `api<T>(path, options)` battle-tested : auto-refresh 401, CSRF auto, **retry GET/HEAD only** (jamais POST/PUT/PATCH/DELETE pour éviter doubles charges), 30s timeout, lock anti-concurrent-refresh. Source : [src/lib/api.ts](src/lib/api.ts).
- `createUseApi(api)` → hook `useApi<T>(path)` avec cache mémoire SWR 2min + `invalidateCache(path)`. Source : [src/lib/useApi.ts](src/lib/useApi.ts).
- `createAuthContext(api)` → `<AuthProvider>` + `useAuth()`. Source : [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx).
- `<ToastProvider>` + `useToast()`. Source : [src/contexts/ToastContext.tsx](src/contexts/ToastContext.tsx).
- Helpers : `cn()` (clsx + twMerge), `formatPrice(n, currency)`, `isInAppBrowser()`, `isTikTokBrowser()`. Source : [src/lib/utils.ts](src/lib/utils.ts).

**Dépendances** : `react` ^19 (peer), `clsx`, `tailwind-merge`. Aucune dépendance UI (pas de composant visuel).

---

## 4. Ce qui n'est PAS embarqué (volontairement)

| Élément | Raison |
|---|---|
| Commission 6%/8% hardcoded | Métier cagnottes — `computeCommission` paramétré par basis points à la place |
| Schema `Block` + `FUNDRAISER` config Zod | Métier cagnottes pur |
| `SlugHistory`, `PageView`, `BlockClick` | Métier cagnottes |
| KYC workflow + `withdrawalPinHash` | Use-case "seller avec payout" trop spécifique — laissé à chaque projet |
| Pay-redirect TikTok proxy ([src/app/api/pay-redirect/route.ts](src/app/api/pay-redirect/route.ts)) | Workaround spécifique cagnottes — copié dans `apps/template/frontend` comme exemple, pas packagé |
| Composants UI (login form, dashboard…) | Décision validée : la liberté design vaut plus que la mutualisation |
| Tous les modèles Prisma morts (Product, Community, TelegramBot…) | Non extraits |
| Scripts métier ([backend/scripts/seed-dev.ts](backend/scripts/seed-dev.ts), [smoke-test.ts](backend/scripts/smoke-test.ts), [approve-kyc.ts](backend/scripts/approve-kyc.ts)) | Restent inspirations, leur équivalent générique vit dans `apps/template` |

---

## 5. Stratégie d'extraction (ordre topologique)

| Vague | Contenu | Bloque |
|---|---|---|
| 1 | Bootstrap monorepo (pnpm + turborepo + changesets + tsup + tsconfig + ESLint + Vitest + GH Actions CI/publish) | Tout |
| 2 | `@amadou/core`, `@amadou/infra` (aucune dépendance entre packages) | Vagues 3+ |
| 3 | `@amadou/auth`, `@amadou/storage`, `@amadou/email` | Vagues 4+ |
| 4 | `@amadou/notifications`, `@amadou/webhook`, `@amadou/payments` | Vague 5 |
| 5 | `@amadou/payments-bictorys`, `@amadou/react-api` | Vague 6 |
| 6 | `apps/template/backend` (Express minimal montant chaque package) + `apps/template/frontend` (Next.js minimal) + smoke-test E2E (signup → login → upload → notification dispatch dédupliquée → webhook idempotent → payment via mock provider + circuit breaker) + README quickstart | Vague 7 |
| 7 | Publish v0.1.0 sur GitHub Packages via tag changesets | — |

**Important** : cagnottes.sn n'est **jamais modifié**. La validation se fait exclusivement via `apps/template/backend` qui dogfood synthétiquement chaque package. Le smoke-test du starter s'inspire du pattern de [backend/scripts/smoke-test.ts](backend/scripts/smoke-test.ts) (15+ assertions, cleanup propre, reset rate-limit Redis au démarrage).

---

## 6. Décisions par défaut

| Question | Choix par défaut |
|---|---|
| TS strict | `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true` |
| Module format | dual ESM + CJS via tsup |
| Node target | 20 LTS |
| React peer | ^19 |
| Prisma peer | ^7 |
| Express peer | ^5 |
| Versioning | semver via changesets, manual bump majors |
| Commits | Conventional Commits (changesets parse) |
| Bictorys en tests | mock provider, jamais d'appel réel |
| Documentation | README par package + un README racine quickstart |

---

## 7. Risques & limitations connus

1. **Circuit breaker in-memory** — pas de scaling multi-instance. Documenté ; swap Redis = enhancement v2.
2. **Pas de UI components** — chaque projet refait son login/signup/dashboard. Décision assumée.
3. **Cron `setInterval`** dans cagnottes.sn n'est **pas extrait** — pas de package "cron". Chaque projet gère ses jobs comme il veut (BullMQ, cron Vercel, Inngest…). Le `JobQueue` de `@amadou/infra` couvre les tâches déclenchées par événement, pas les tâches récurrentes.
4. **Pas de framework de test dans cagnottes.sn** — le starter introduit Vitest, donc les patterns extraits n'ont pas de tests d'origine. À écrire au fur et à mesure de l'extraction.
5. **`apps/template` extraction comme template repo séparé** — nécessite une GH Action de sync (workflow à écrire) ou simple copie manuelle au début.
6. **Schema Prisma laissé à chaque projet** — pas de package Prisma, juste des fragments de référence dans les README. Risque de drift entre projets ; documentation soignée requise.

---

## 8. Critères de succès

- [ ] Les 10 packages compilent et publient sur GitHub Packages
- [ ] `apps/template/backend` démarre, sert chaque route packagée, passe le smoke-test (≥15 assertions GREEN)
- [ ] `apps/template/frontend` se connecte au backend via `@amadou/react-api`, login/logout/refresh fonctionnent
- [ ] Un nouveau projet créé depuis le template peut être déployé en < 1h après config `.env`
- [ ] cagnottes.sn n'a subi **aucune modification** pendant la construction du starter
