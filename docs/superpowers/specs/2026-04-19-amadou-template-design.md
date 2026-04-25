# `amadou-template` — Design

**Date** : 2026-04-19
**Statut** : Spec validée — pivot depuis l'approche packages npm (archivée à `amadou-starter-packages-archive/`)
**Source** : extraction depuis cagnottes.sn (lecture seule) + récup du code battle-tested de `amadou-starter-packages-archive/packages/`

---

## 1. Objectif

Construire un **repo template GitHub** (`amadou-template`) que l'utilisateur clone via `gh repo create --template` à chaque nouveau projet. Le template embarque la stack complète déjà câblée et fonctionnelle : auth, paiements Bictorys, upload R2, email queue, notifications, webhooks. Workflow nouveau projet : 30 secondes pour cloner, < 1h pour avoir un projet déployable.

**Pourquoi ce pivot** : l'approche packages npm (10 packages) impose un coût d'infrastructure (monorepo, changesets, GitHub Packages auth, version bumps, propagation cross-projets) qui n'est pas rentable pour 3-5 projets/an en solo. Le clone template a un coût initial bas et une maintenance par "porting manuel" tout à fait gérable à cette échelle.

**Stack figée** :
- Frontend : Next.js 16 + React 19 + Tailwind CSS 4
- Backend : Express 5 + Prisma 7 + PostgreSQL (Neon serverless)
- Infra : Upstash Redis (queue + rate limit), Cloudflare R2 (storage), Resend (email), Bictorys (paiements)
- TypeScript strict partout, Node 20 LTS, pnpm workspaces

---

## 2. Forme du livrable

**Un seul repo GitHub privé `amadou-template`**, configuré comme **template repository** dans GitHub (Settings → Template repository ✓).

```
amadou-template/
├── .github/workflows/ci.yml
├── .gitignore
├── .nvmrc
├── .prettierrc.json
├── .prettierignore
├── README.md                       ← le quickstart
├── eslint.config.mjs
├── package.json                    ← root (scripts pour démarrer frontend + backend)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example                    ← exhaustif, toutes les variables requises
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma           ← modèles génériques (User, WebhookLog, etc.)
│   ├── scripts/
│   │   ├── seed-dev.ts             ← fixtures idempotentes
│   │   └── smoke-test.ts           ← assertions E2E
│   └── src/
│       ├── index.ts                ← Express server + middleware chain
│       ├── lib/
│       │   ├── auth.ts             ← JWT (jose) + CSRF
│       │   ├── crypto.ts           ← AES-256-GCM
│       │   ├── logger.ts           ← redaction prod (jamais throw, fail-safe NODE_ENV)
│       │   ├── slug.ts             ← slugify + ensureUniqueSlug
│       │   ├── zod-helpers.ts      ← zEmail, zPhone, zCuid, zPositiveInt
│       │   ├── redis.ts            ← Upstash client
│       │   ├── rate-limit-store.ts ← express-rate-limit + Redis
│       │   ├── storage.ts          ← R2 S3 wrapper
│       │   ├── email.ts            ← Resend + List-Unsubscribe
│       │   ├── queues/
│       │   │   ├── job-queue.ts    ← base class générique
│       │   │   └── email-queue.ts  ← extends JobQueue<EmailJob>
│       │   ├── notifications/
│       │   │   ├── index.ts        ← createNotification (single entry, dedup)
│       │   │   └── templates.ts    ← exemple template à adapter
│       │   ├── payments/
│       │   │   ├── circuit-breaker.ts
│       │   │   ├── provider.ts     ← interface PaymentProvider
│       │   │   ├── bictorys.ts     ← implémentation Bictorys
│       │   │   └── commission.ts   ← computeCommission(gross, rateBp) — optional
│       │   └── webhook/
│       │       └── handler.ts      ← scaffold idempotent
│       ├── middleware/
│       │   └── auth.ts             ← requireAuth (DB re-query)
│       └── routes/
│           ├── auth.ts             ← signup, login, refresh, password reset, PUT change-password
│           ├── upload.ts           ← R2 upload multipart
│           ├── files.ts            ← /files/:key proxy
│           ├── webhooks.ts         ← Bictorys handler exemple
│           └── health.ts           ← GET /health
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    └── src/
        ├── app/
        │   ├── layout.tsx          ← root + ToastProvider + AuthProvider
        │   ├── page.tsx            ← homepage placeholder
        │   ├── login/page.tsx      ← form fonctionnel basique (pas stylé fancy)
        │   ├── signup/page.tsx
        │   ├── dashboard/page.tsx  ← skeleton derrière requireAuth
        │   └── api/pay-redirect/route.ts  ← workaround TikTok
        ├── lib/
        │   ├── api.ts              ← fetch wrapper battle-tested
        │   ├── useApi.ts           ← cache 2min
        │   ├── utils.ts            ← cn, formatPrice, isInAppBrowser
        │   └── constants.ts
        ├── contexts/
        │   ├── AuthContext.tsx
        │   └── ToastContext.tsx
        └── middleware.ts           ← slug lowercase normalization
```

---

## 3. Workflow nouveau projet

```bash
gh repo create mon-projet --template=<org>/amadou-template --private --clone
cd mon-projet
cp .env.example .env
# remplir DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, BICTORYS_*, R2_*, RESEND_*, UPSTASH_*
pnpm install
pnpm db:push       # applique schema Prisma à Neon
pnpm dev           # démarre frontend (3000) + backend (4000) en parallèle
```

Pour personnaliser : modifie le nom dans les `package.json`, ajoute tes routes/composants, ajuste `prisma/schema.prisma`, c'est tout.

---

## 4. Modèles Prisma génériques inclus

Aucun modèle métier (cagnottes-spécifique). Seulement la plomberie :

- `User` (id, email, passwordHash, emailVerifiedAt, timestamps)
- `VerificationCode` (email verify + password reset)
- `FileUpload` (R2 file metadata)
- `EmailJob` (queue persistente)
- `Notification` (avec `dedupeKey @unique`)
- `Order` (paiement générique : amount, currency, status, externalRef)
- `Withdrawal` (payout générique)
- `WebhookLog` (avec `@@unique([externalId, eventType])`)

Pas de `Block`, pas de `SlugHistory`, pas de tables d'analytics, pas de KYC (à ajouter par projet si besoin).

---

## 5. Source du code (chemins copy-from)

| Brique template | Source |
|---|---|
| logger, crypto, slug, zod-helpers | `~/Desktop/K-gnote/amadou-starter-packages-archive/packages/core/src/*` (déjà testés, 44 tests) |
| redis, rate-limit-store, job-queue | `~/Desktop/K-gnote/amadou-starter-packages-archive/packages/infra/src/*` (déjà testés, 15 tests) |
| auth, upload, files, webhooks, storage, email | `~/Desktop/K-gnote/cagnottes-sn/backend/src/{routes,lib,middleware}/...` (READ-ONLY copy) |
| Bictorys + circuit breaker + commission | `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/payments/*` + `commission.ts` |
| api wrapper, AuthContext, ToastContext, utils | `~/Desktop/K-gnote/cagnottes-sn/src/{lib,contexts}/*` |
| pay-redirect | `~/Desktop/K-gnote/cagnottes-sn/src/app/api/pay-redirect/route.ts` |
| seed-dev, smoke-test patterns | inspirés de `~/Desktop/K-gnote/cagnottes-sn/backend/scripts/*` |

**Cagnottes-sn reste READ-ONLY** — on extrait, on adapte (générique, pas de FUNDRAISER/Block/KYC), on jette dans le template.

---

## 6. Stratégie de construction (3 phases)

**Phase 1 — Squelette + auth + libs fondations** (livrable : un projet qui démarre, login/signup fonctionnel)
- Bootstrap pnpm workspace + frontend Next.js + backend Express + Prisma schema minimal (User, VerificationCode)
- Copie depuis archive : logger, crypto, slug, zod-helpers, redis, rate-limit-store, job-queue
- Copie depuis cagnottes-sn : auth.ts (lib + route + middleware)
- Frontend : api.ts, AuthContext, ToastContext, login + signup pages basiques
- README quickstart, .env.example, ESLint + Prettier + Vitest
- Smoke test : signup → login → /me → logout

**Phase 2 — Storage + email + notifications + webhooks**
- Ajout des modèles Prisma : FileUpload, EmailJob, Notification, WebhookLog
- Copie depuis cagnottes-sn : storage.ts, email.ts (+ EmailQueue), notifications/, webhook/, upload + files routes
- Smoke test : upload + email queue + notification dispatch + webhook idempotent

**Phase 3 — Paiements Bictorys**
- Ajout des modèles Prisma : Order, Withdrawal
- Copie depuis cagnottes-sn : payments/ (provider interface + Bictorys + circuit breaker + commission), payments routes (charge + payout), pay-redirect frontend
- Smoke test : charge mock + circuit breaker behavior + webhook payment flow

---

## 7. Décisions techniques

| Question | Choix |
|---|---|
| Workspace | pnpm workspaces (root = `package.json` + `pnpm-workspace.yaml` listant `frontend` et `backend`) |
| Lancement parallèle | Script root `pnpm dev` qui lance les 2 serveurs en parallèle (via `concurrently` ou `npm-run-all`) |
| Tests | Vitest dans backend (smoke E2E) ; pas de framework de test frontend dans v1 |
| Lint/Format | ESLint 9 flat config + Prettier (mêmes conventions que amadou-starter-archive) |
| Versioning | Pas de changesets, pas de versions — c'est un template, pas un package |
| CI | 1 workflow `ci.yml` qui run lint + typecheck + build + smoke-test sur PR. Pas de release workflow. |
| Cron | `setInterval` dans `backend/src/index.ts` (pareil que cagnottes-sn) — note dans README qu'en prod multi-instance il faut Vercel Cron / BullMQ |
| Frontend UI | Pages fonctionnelles MINIMALES (form HTML+Tailwind), zero design léché — chaque projet refait son look |

---

## 8. Critères de succès

- [ ] `gh repo create --template=amadou-template ... --clone` produit un projet fonctionnel après `pnpm install` + remplissage `.env` + `pnpm db:push` + `pnpm dev`
- [ ] Smoke test backend passe (signup → login → /me → upload → notification → webhook → payment mock)
- [ ] Frontend login/signup fonctionnent (form → POST → cookie set → redirect dashboard)
- [ ] README < 100 lignes, quickstart en 5 commandes
- [ ] Cagnottes-sn n'a subi aucune modification

---

## 9. Ce qui reste de l'expérience packages

Le code **battle-tested** des deux packages publiés (logger jamais-throw + fail-safe NODE_ENV, crypto AES-256-GCM, slug avec reserved-words, JobQueue avec dead-letter warn, RedisRateLimitStore) avec leurs **59 tests** est récupéré tel quel dans `backend/src/lib/`. Travail pas perdu.

Le repo `amadou-starter-packages-archive/` reste sur disque comme référence historique. Pas publié sur GitHub. Plans 1 / spec packages restent dans `cagnottes-sn/docs/superpowers/` comme trace de la décision.
