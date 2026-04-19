# `@amadou/*` Starter Kit — Plan 1 : Bootstrap & Foundations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a fresh monorepo `amadou-starter` (sibling to cagnottes-sn) with pnpm workspaces + turborepo + changesets + tsup + Vitest, configure GitHub Packages publishing, and publish the first two foundation packages: `@amadou/core` (logger, crypto, slug, Zod helpers) and `@amadou/infra` (Redis client, rate-limit store, JobQueue).

**Architecture:** Monorepo at `~/Desktop/K-gnote/amadou-starter/`. pnpm workspace with `packages/*` and `apps/*`. Each package builds with tsup (dual ESM+CJS), tests with Vitest, versions via changesets, publishes to GitHub Packages on tag. Source code is **adapted** (not copied verbatim) from cagnottes-sn — the cagnottes-sn repo is **read-only** during this work.

**Tech Stack:** pnpm 9+, turborepo, changesets, tsup, Vitest, TypeScript 5.6+ strict, Node 20 LTS, GitHub Actions, GitHub Packages.

**Source spec:** [docs/superpowers/specs/2026-04-19-amadou-starter-kit-design.md](../specs/2026-04-19-amadou-starter-kit-design.md)

**Source code reference (READ-ONLY)**: cagnottes-sn at `~/Desktop/K-gnote/cagnottes-sn/`. Files to adapt are listed inline per task.

---

## File Structure (after Plan 1 completes)

```
~/Desktop/K-gnote/amadou-starter/
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── .gitignore
├── .npmrc
├── .nvmrc
├── README.md
├── package.json
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── logger.ts
│   │       ├── logger.test.ts
│   │       ├── crypto.ts
│   │       ├── crypto.test.ts
│   │       ├── slug.ts
│   │       ├── slug.test.ts
│   │       ├── zod-helpers.ts
│   │       └── zod-helpers.test.ts
│   └── infra/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts
│           ├── redis.ts
│           ├── redis.test.ts
│           ├── rate-limit-store.ts
│           ├── rate-limit-store.test.ts
│           ├── job-queue.ts
│           └── job-queue.test.ts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
```

---

## Task 1: Create new repo + initialize pnpm workspace

**Files:**
- Create: `~/Desktop/K-gnote/amadou-starter/` (new directory)
- Create: `~/Desktop/K-gnote/amadou-starter/.gitignore`
- Create: `~/Desktop/K-gnote/amadou-starter/.nvmrc`
- Create: `~/Desktop/K-gnote/amadou-starter/package.json`
- Create: `~/Desktop/K-gnote/amadou-starter/pnpm-workspace.yaml`
- Create: `~/Desktop/K-gnote/amadou-starter/README.md`

- [ ] **Step 1: Verify pnpm + Node versions**

```bash
node --version    # must be >=20.0.0
pnpm --version    # must be >=9.0.0
```

If pnpm missing: `npm install -g pnpm@latest`. If Node < 20: install via nvm.

- [ ] **Step 2: Create directory and init git**

```bash
mkdir -p ~/Desktop/K-gnote/amadou-starter
cd ~/Desktop/K-gnote/amadou-starter
git init
git branch -M main
```

- [ ] **Step 3: Create `.nvmrc`**

```
20
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.turbo/
coverage/
*.log
.DS_Store
.env
.env.local
*.tsbuildinfo
```

- [ ] **Step 5: Create root `package.json`**

```json
{
  "name": "amadou-starter",
  "version": "0.0.0",
  "private": true,
  "description": "Modular starter kit — @amadou/* packages for Next.js + Express + Prisma stack",
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo run build --filter=./packages/* && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.10",
    "turbo": "^2.3.3",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 6: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 7: Create `README.md`**

```markdown
# amadou-starter

Modular starter kit for Next.js 16 + Express 5 + Prisma + Neon + Upstash + R2 + Resend + Bictorys stack.

## Packages

- `@amadou/core` — logger, crypto, slug, Zod helpers
- `@amadou/infra` — Redis client, rate-limit store, JobQueue
- (more coming)

## Quick start

\`\`\`bash
pnpm install
pnpm build
pnpm test
\`\`\`

See [docs/superpowers/specs/](docs/superpowers/specs/) for the design spec.
```

- [ ] **Step 8: Install root dev deps**

Run: `cd ~/Desktop/K-gnote/amadou-starter && pnpm install`
Expected: creates `node_modules/`, `pnpm-lock.yaml`, no errors.

- [ ] **Step 9: Initial commit**

```bash
git add .
git commit -m "chore: bootstrap monorepo with pnpm workspaces"
```

---

## Task 2: Shared TypeScript + ESLint configuration

**Files:**
- Create: `tsconfig.base.json`
- Create: `.eslintrc.cjs`
- Modify: `package.json` (add ESLint dev deps)

- [ ] **Step 1: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": false
  }
}
```

- [ ] **Step 2: Install ESLint deps**

```bash
pnpm add -Dw eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

- [ ] **Step 3: Create root `.eslintrc.cjs`**

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.config.ts', '*.config.js', '*.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

- [ ] **Step 4: Verify lint config loads**

Run: `pnpm exec eslint --version`
Expected: prints version (e.g., `v9.x.x`).

- [ ] **Step 5: Commit**

```bash
git add tsconfig.base.json .eslintrc.cjs package.json pnpm-lock.yaml
git commit -m "chore: add shared TypeScript and ESLint configuration"
```

---

## Task 3: Turborepo + tsup + Vitest + changesets setup

**Files:**
- Create: `turbo.json`
- Create: `.changeset/config.json`
- Modify: `package.json` (add tsup, vitest dev deps)

- [ ] **Step 1: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json", "tsup.config.ts", "package.json"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "vitest.config.ts"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "inputs": ["src/**", ".eslintrc.cjs"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 2: Install build/test deps at root**

```bash
pnpm add -Dw tsup vitest @vitest/coverage-v8
```

- [ ] **Step 3: Initialize changesets**

Run: `pnpm changeset init`
Expected: creates `.changeset/config.json` and `.changeset/README.md`.

- [ ] **Step 4: Configure changesets for GitHub Packages**

Edit `.changeset/config.json` to:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["amadou-starter", "@amadou/template-backend", "@amadou/template-frontend"]
}
```

- [ ] **Step 5: Commit**

```bash
git add turbo.json .changeset/ package.json pnpm-lock.yaml
git commit -m "chore: configure turborepo, tsup, vitest, changesets"
```

---

## Task 4: GitHub Actions CI/CD + GitHub Packages auth

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `.npmrc`

- [ ] **Step 1: Create `.npmrc` (project-local, for GitHub Packages auth)**

```
@amadou:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
auto-install-peers=true
strict-peer-dependencies=false
```

Note: `NODE_AUTH_TOKEN` is set in CI secrets. Locally, set in `~/.npmrc` instead (do NOT commit a token).

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@amadou'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test
```

- [ ] **Step 3: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@amadou'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Create Release PR or publish
        uses: changesets/action@v1
        with:
          version: pnpm version-packages
          publish: pnpm release
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 4: Commit**

```bash
git add .github/ .npmrc
git commit -m "ci: add GitHub Actions for CI and changesets release"
```

---

## Task 5: Scaffold `@amadou/core` package

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/README.md`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@amadou/core",
  "version": "0.0.0",
  "description": "Foundations: logger, crypto, slug, Zod helpers",
  "license": "UNLICENSED",
  "private": false,
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo"
  },
  "peerDependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.17.10",
    "tsup": "^8.3.5",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8",
    "zod": "^3.23.8"
  }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/core/tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'node20',
});
```

- [ ] **Step 4: Create `packages/core/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});
```

- [ ] **Step 5: Create `packages/core/src/index.ts` (empty barrel)**

```typescript
// @amadou/core — foundations
export {};
```

- [ ] **Step 6: Create `packages/core/README.md`**

```markdown
# @amadou/core

Foundations: logger, crypto, slug, Zod helpers.

## Install

\`\`\`bash
pnpm add @amadou/core zod
\`\`\`

## Exports

(populated as modules are added)
```

- [ ] **Step 7: Install package deps**

Run: `cd ~/Desktop/K-gnote/amadou-starter && pnpm install`
Expected: hoists deps, no errors.

- [ ] **Step 8: Verify build pipeline**

Run: `pnpm --filter @amadou/core build`
Expected: creates `packages/core/dist/{index.js,index.cjs,index.d.ts}`.

- [ ] **Step 9: Commit**

```bash
git add packages/core/ pnpm-lock.yaml
git commit -m "feat(core): scaffold @amadou/core package"
```

---

## Task 6: TDD `logger` module (with prod redaction)

**Files:**
- Create: `packages/core/src/logger.ts`
- Create: `packages/core/src/logger.test.ts`
- Modify: `packages/core/src/index.ts`

**Reference (READ-ONLY)**: `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/logger.ts`

- [ ] **Step 1: Write failing tests `packages/core/src/logger.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from './logger.js';

describe('createLogger', () => {
  let consoleSpy: { log: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  it('logs structured JSON in production', () => {
    const logger = createLogger({ env: 'production' });
    logger.info('test message', { foo: 'bar' });

    expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
    expect(output.level).toBe('info');
    expect(output.msg).toBe('test message');
    expect(output.foo).toBe('bar');
    expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('redacts emails in production', () => {
    const logger = createLogger({ env: 'production' });
    logger.info('user signup', { email: 'alice@example.com' });

    const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
    expect(output.email).toBe('[REDACTED]');
  });

  it('redacts phone numbers in production', () => {
    const logger = createLogger({ env: 'production' });
    logger.info('contact', { phone: '+221771234567' });

    const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
    expect(output.phone).toBe('[REDACTED]');
  });

  it('redacts payment refs in production', () => {
    const logger = createLogger({ env: 'production' });
    logger.info('payment', { orderRef: 'ORD-ABC123', externalId: 'BIC-XYZ' });

    const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
    expect(output.orderRef).toBe('[REDACTED]');
    expect(output.externalId).toBe('[REDACTED]');
  });

  it('does NOT redact in development', () => {
    const logger = createLogger({ env: 'development' });
    logger.info('user signup', { email: 'alice@example.com' });

    const call = consoleSpy.log.mock.calls[0]![0];
    expect(call).toContain('alice@example.com');
  });

  it('uses console.error for error level', () => {
    const logger = createLogger({ env: 'production' });
    logger.error('boom', { err: 'fail' });
    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    expect(consoleSpy.log).not.toHaveBeenCalled();
  });

  it('accepts custom redact keys', () => {
    const logger = createLogger({ env: 'production', redactKeys: ['ssn'] });
    logger.info('kyc', { ssn: '123-45-6789', name: 'Alice' });

    const output = JSON.parse(consoleSpy.log.mock.calls[0]![0] as string);
    expect(output.ssn).toBe('[REDACTED]');
    expect(output.name).toBe('Alice');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @amadou/core test`
Expected: FAIL with "Cannot find module './logger.js'" or similar.

- [ ] **Step 3: Implement `packages/core/src/logger.ts`**

Read `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/logger.ts` (lines 1-end). Adapt to this generic API:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const DEFAULT_REDACT_KEYS = [
  'email',
  'phone',
  'orderRef',
  'externalId',
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'csrfToken',
];

export interface CreateLoggerOptions {
  env?: 'production' | 'development' | 'test';
  redactKeys?: readonly string[];
}

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const env = options.env ?? (process.env.NODE_ENV as CreateLoggerOptions['env']) ?? 'development';
  const redactKeys = new Set([...DEFAULT_REDACT_KEYS, ...(options.redactKeys ?? [])]);

  function redact(ctx: Record<string, unknown>): Record<string, unknown> {
    if (env !== 'production') return ctx;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(ctx)) {
      result[key] = redactKeys.has(key) ? '[REDACTED]' : value;
    }
    return result;
  }

  function emit(level: LogLevel, msg: string, ctx?: Record<string, unknown>): void {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      msg,
      ...(ctx ? redact(ctx) : {}),
    };
    const out = env === 'production' ? JSON.stringify(payload) : `[${level}] ${msg} ${ctx ? JSON.stringify(ctx) : ''}`.trim();
    if (level === 'error') {
      console.error(out);
    } else {
      console.log(out);
    }
  }

  return {
    debug: (msg, ctx) => emit('debug', msg, ctx),
    info: (msg, ctx) => emit('info', msg, ctx),
    warn: (msg, ctx) => emit('warn', msg, ctx),
    error: (msg, ctx) => emit('error', msg, ctx),
  };
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

```typescript
// @amadou/core — foundations
export { createLogger } from './logger.js';
export type { Logger, CreateLoggerOptions } from './logger.js';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @amadou/core test`
Expected: all 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/logger.ts packages/core/src/logger.test.ts packages/core/src/index.ts
git commit -m "feat(core): logger with production redaction"
```

---

## Task 7: TDD `crypto` module (AES-256-GCM)

**Files:**
- Create: `packages/core/src/crypto.ts`
- Create: `packages/core/src/crypto.test.ts`
- Modify: `packages/core/src/index.ts`

**Reference (READ-ONLY)**: `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/crypto.ts`

- [ ] **Step 1: Write failing tests `packages/core/src/crypto.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt, generateKey } from './crypto.js';

describe('crypto AES-256-GCM', () => {
  const key = generateKey();

  it('round-trips plaintext', () => {
    const plaintext = 'hello world';
    const ciphertext = encrypt(plaintext, key);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const plaintext = 'same input';
    const a = encrypt(plaintext, key);
    const b = encrypt(plaintext, key);
    expect(a).not.toBe(b);
    expect(decrypt(a, key)).toBe(plaintext);
    expect(decrypt(b, key)).toBe(plaintext);
  });

  it('throws on tampered ciphertext', () => {
    const ciphertext = encrypt('secret', key);
    const tampered = ciphertext.slice(0, -2) + 'XX';
    expect(() => decrypt(tampered, key)).toThrow();
  });

  it('throws on wrong key', () => {
    const ciphertext = encrypt('secret', key);
    const wrongKey = generateKey();
    expect(() => decrypt(ciphertext, wrongKey)).toThrow();
  });

  it('rejects key of wrong length', () => {
    const shortKey = randomBytes(16).toString('base64');
    expect(() => encrypt('x', shortKey)).toThrow(/key/i);
  });

  it('handles unicode plaintext', () => {
    const plaintext = 'éàù 🚀 中文';
    const ciphertext = encrypt(plaintext, key);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it('generateKey returns 32-byte base64', () => {
    const k = generateKey();
    const buf = Buffer.from(k, 'base64');
    expect(buf.length).toBe(32);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @amadou/core test`
Expected: FAIL on crypto module.

- [ ] **Step 3: Implement `packages/core/src/crypto.ts`**

Read `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/crypto.ts` (lines 1-end). Adapt: API exports `encrypt(plaintext, key)`, `decrypt(ciphertext, key)`, `generateKey()`. Key as base64 string (32 bytes). Output format: `iv(12).toString('base64') + ':' + tag(16).toString('base64') + ':' + ciphertext.toString('base64')`.

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

function decodeKey(key: string): Buffer {
  const buf = Buffer.from(key, 'base64');
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must decode to ${KEY_LENGTH} bytes (got ${buf.length})`);
  }
  return buf;
}

export function generateKey(): string {
  return randomBytes(KEY_LENGTH).toString('base64');
}

export function encrypt(plaintext: string, key: string): string {
  const keyBuf = decodeKey(key);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decrypt(ciphertext: string, key: string): string {
  const keyBuf = decodeKey(key);
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext components');
  }
  const decipher = createDecipheriv(ALGORITHM, keyBuf, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

```typescript
export { createLogger } from './logger.js';
export type { Logger, CreateLoggerOptions } from './logger.js';
export { encrypt, decrypt, generateKey } from './crypto.js';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @amadou/core test`
Expected: all logger + crypto tests PASS (14 total).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/crypto.ts packages/core/src/crypto.test.ts packages/core/src/index.ts
git commit -m "feat(core): AES-256-GCM encrypt/decrypt with random IV and auth tag"
```

---

## Task 8: TDD `slug` module (slugify + ensureUniqueSlug)

**Files:**
- Create: `packages/core/src/slug.ts`
- Create: `packages/core/src/slug.test.ts`
- Modify: `packages/core/src/index.ts`

**Reference (READ-ONLY)**: `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/cagnottes/slug.ts`

**Generalization note**: cagnottes-specific reserved words (`api`, `admin`, `cagnotte`, etc.) become a configurable `reserved` option. Default reserved set: `['api', 'admin', 'login', 'signup', 'logout', 'app', 'dashboard']`.

- [ ] **Step 1: Write failing tests `packages/core/src/slug.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { slugify, ensureUniqueSlug } from './slug.js';

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips accents (French, Spanish, etc.)', () => {
    expect(slugify('Café à Paris')).toBe('cafe-a-paris');
    expect(slugify('Niño Español')).toBe('nino-espanol');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World! @ 2026')).toBe('hello-world-2026');
  });

  it('collapses multiple dashes', () => {
    expect(slugify('a---b___c')).toBe('a-b-c');
  });

  it('trims leading/trailing dashes', () => {
    expect(slugify('---abc---')).toBe('abc');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('handles unicode by stripping', () => {
    expect(slugify('Hello 中文 World')).toBe('hello-world');
  });

  it('respects maxLength option', () => {
    expect(slugify('this is a very long title indeed', { maxLength: 10 })).toBe('this-is-a');
  });
});

describe('ensureUniqueSlug', () => {
  it('returns base slug when create succeeds', async () => {
    const create = vi.fn().mockResolvedValueOnce({ slug: 'hello' });
    const result = await ensureUniqueSlug('hello', create);
    expect(result).toBe('hello');
    expect(create).toHaveBeenCalledWith('hello');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('appends numeric suffix on collision', async () => {
    const create = vi.fn()
      .mockRejectedValueOnce(new Error('UNIQUE constraint'))
      .mockRejectedValueOnce(new Error('UNIQUE constraint'))
      .mockResolvedValueOnce({ slug: 'hello-3' });

    const result = await ensureUniqueSlug('hello', create, { isCollision: () => true });
    expect(result).toBe('hello-3');
    expect(create).toHaveBeenNthCalledWith(1, 'hello');
    expect(create).toHaveBeenNthCalledWith(2, 'hello-2');
    expect(create).toHaveBeenNthCalledWith(3, 'hello-3');
  });

  it('rethrows non-collision errors', async () => {
    const create = vi.fn().mockRejectedValueOnce(new Error('DB exploded'));
    await expect(ensureUniqueSlug('hello', create, { isCollision: () => false })).rejects.toThrow('DB exploded');
  });

  it('rejects reserved words by suffixing', async () => {
    const create = vi.fn().mockResolvedValueOnce({ slug: 'admin-2' });
    const result = await ensureUniqueSlug('admin', create, { reserved: ['admin'] });
    expect(create).toHaveBeenCalledWith('admin-2');
    expect(result).toBe('admin-2');
  });

  it('throws after maxAttempts', async () => {
    const create = vi.fn().mockRejectedValue(new Error('UNIQUE'));
    await expect(
      ensureUniqueSlug('hello', create, { isCollision: () => true, maxAttempts: 3 })
    ).rejects.toThrow(/maxAttempts/);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('uses default isCollision detecting Prisma P2002', async () => {
    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    const create = vi.fn()
      .mockRejectedValueOnce(p2002)
      .mockResolvedValueOnce({ slug: 'hello-2' });
    const result = await ensureUniqueSlug('hello', create);
    expect(result).toBe('hello-2');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @amadou/core test`
Expected: FAIL on slug tests.

- [ ] **Step 3: Implement `packages/core/src/slug.ts`**

```typescript
const DEFAULT_RESERVED = new Set([
  'api', 'admin', 'login', 'signup', 'logout', 'app', 'dashboard',
  'me', 'auth', 'static', 'public', 'assets', '_next',
]);

const DEFAULT_MAX_ATTEMPTS = 50;
const DEFAULT_MAX_LENGTH = 64;

export interface SlugifyOptions {
  maxLength?: number;
}

export function slugify(input: string, options: SlugifyOptions = {}): string {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).replace(/-+$/g, '');
}

export interface EnsureUniqueSlugOptions {
  reserved?: readonly string[];
  isCollision?: (err: unknown) => boolean;
  maxAttempts?: number;
}

function defaultIsCollision(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string; message?: string };
  if (e.code === 'P2002') return true;
  return /unique/i.test(e.message ?? '');
}

export async function ensureUniqueSlug<T>(
  base: string,
  create: (slug: string) => Promise<T>,
  options: EnsureUniqueSlugOptions = {}
): Promise<string> {
  const reserved = new Set([...DEFAULT_RESERVED, ...(options.reserved ?? [])].map((s) => s.toLowerCase()));
  const isCollision = options.isCollision ?? defaultIsCollision;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  let attempt = 1;
  let candidate = reserved.has(base.toLowerCase()) ? `${base}-2` : base;
  if (reserved.has(base.toLowerCase())) attempt = 2;

  while (attempt <= maxAttempts) {
    try {
      await create(candidate);
      return candidate;
    } catch (err) {
      if (!isCollision(err)) throw err;
      attempt += 1;
      candidate = `${base}-${attempt}`;
    }
  }
  throw new Error(`ensureUniqueSlug: exceeded maxAttempts (${maxAttempts}) for base="${base}"`);
}
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

```typescript
export { createLogger } from './logger.js';
export type { Logger, CreateLoggerOptions } from './logger.js';
export { encrypt, decrypt, generateKey } from './crypto.js';
export { slugify, ensureUniqueSlug } from './slug.js';
export type { SlugifyOptions, EnsureUniqueSlugOptions } from './slug.js';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @amadou/core test`
Expected: all 20 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/slug.ts packages/core/src/slug.test.ts packages/core/src/index.ts
git commit -m "feat(core): slugify and ensureUniqueSlug with reserved-words guard"
```

---

## Task 9: TDD Zod helpers + finalize `@amadou/core`

**Files:**
- Create: `packages/core/src/zod-helpers.ts`
- Create: `packages/core/src/zod-helpers.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/README.md`

- [ ] **Step 1: Write failing tests `packages/core/src/zod-helpers.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { zEmail, zPhone, zCuid, zPositiveInt } from './zod-helpers.js';

describe('zEmail', () => {
  it('accepts valid email and lowercases', () => {
    expect(zEmail.parse('Alice@Example.COM')).toBe('alice@example.com');
  });

  it('rejects invalid email', () => {
    expect(() => zEmail.parse('not-an-email')).toThrow();
  });

  it('trims whitespace', () => {
    expect(zEmail.parse('  alice@example.com  ')).toBe('alice@example.com');
  });
});

describe('zPhone', () => {
  it('accepts E.164 format', () => {
    expect(zPhone.parse('+221771234567')).toBe('+221771234567');
  });

  it('strips spaces and dashes', () => {
    expect(zPhone.parse('+221 77 123-45-67')).toBe('+221771234567');
  });

  it('rejects without country code', () => {
    expect(() => zPhone.parse('771234567')).toThrow();
  });
});

describe('zCuid', () => {
  it('accepts cuid format', () => {
    expect(zCuid.parse('clx123abc456def789ghi012')).toBe('clx123abc456def789ghi012');
  });

  it('rejects too-short string', () => {
    expect(() => zCuid.parse('short')).toThrow();
  });
});

describe('zPositiveInt', () => {
  it('accepts positive integer', () => {
    expect(zPositiveInt.parse(42)).toBe(42);
  });

  it('rejects zero', () => {
    expect(() => zPositiveInt.parse(0)).toThrow();
  });

  it('rejects negative', () => {
    expect(() => zPositiveInt.parse(-1)).toThrow();
  });

  it('rejects float', () => {
    expect(() => zPositiveInt.parse(1.5)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @amadou/core test`
Expected: FAIL on zod-helpers.

- [ ] **Step 3: Implement `packages/core/src/zod-helpers.ts`**

```typescript
import { z } from 'zod';

export const zEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address');

export const zPhone = z
  .string()
  .transform((s) => s.replace(/[\s\-()]/g, ''))
  .pipe(z.string().regex(/^\+\d{8,15}$/, 'Phone must be in E.164 format (e.g., +221771234567)'));

export const zCuid = z.string().regex(/^c[a-z0-9]{20,30}$/, 'Invalid cuid');

export const zPositiveInt = z.number().int().positive('Must be a positive integer');
```

- [ ] **Step 4: Update `packages/core/src/index.ts`**

```typescript
export { createLogger } from './logger.js';
export type { Logger, CreateLoggerOptions } from './logger.js';
export { encrypt, decrypt, generateKey } from './crypto.js';
export { slugify, ensureUniqueSlug } from './slug.js';
export type { SlugifyOptions, EnsureUniqueSlugOptions } from './slug.js';
export { zEmail, zPhone, zCuid, zPositiveInt } from './zod-helpers.js';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @amadou/core test`
Expected: all tests PASS (~30 total).

- [ ] **Step 6: Update `packages/core/README.md` with full exports**

```markdown
# @amadou/core

Foundations: logger, crypto, slug, Zod helpers.

## Install

\`\`\`bash
pnpm add @amadou/core zod
\`\`\`

## Exports

### `createLogger(options?)`
Structured JSON logger with production redaction (emails, phones, payment refs by default; extend via `redactKeys`).

### `encrypt(plaintext, key)` / `decrypt(ciphertext, key)` / `generateKey()`
AES-256-GCM with random IV and auth tag. Key is base64-encoded 32 bytes.

### `slugify(input, options?)` / `ensureUniqueSlug(base, create, options?)`
Generates URL-safe slugs and ensures uniqueness via collision retry (Prisma P2002 by default).

### `zEmail`, `zPhone`, `zCuid`, `zPositiveInt`
Zod schemas for common validations.
```

- [ ] **Step 7: Verify build + typecheck + lint**

```bash
pnpm --filter @amadou/core build
pnpm --filter @amadou/core typecheck
pnpm --filter @amadou/core lint
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add packages/core/
git commit -m "feat(core): Zod helpers (zEmail, zPhone, zCuid, zPositiveInt) and finalize README"
```

---

## Task 10: Scaffold `@amadou/infra` package

**Files:**
- Create: `packages/infra/package.json`
- Create: `packages/infra/tsconfig.json`
- Create: `packages/infra/tsup.config.ts`
- Create: `packages/infra/vitest.config.ts`
- Create: `packages/infra/src/index.ts`
- Create: `packages/infra/README.md`

- [ ] **Step 1: Create `packages/infra/package.json`**

```json
{
  "name": "@amadou/infra",
  "version": "0.0.0",
  "description": "Infrastructure: Upstash Redis client, rate-limit store, JobQueue base",
  "license": "UNLICENSED",
  "private": false,
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@amadou/core": "workspace:*"
  },
  "peerDependencies": {
    "@upstash/redis": "^1.34.0"
  },
  "devDependencies": {
    "@types/node": "^20.17.10",
    "@upstash/redis": "^1.34.0",
    "tsup": "^8.3.5",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `packages/infra/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/infra/tsup.config.ts`** (identical to core's)

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'node20',
});
```

- [ ] **Step 4: Create `packages/infra/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});
```

- [ ] **Step 5: Create `packages/infra/src/index.ts`**

```typescript
// @amadou/infra — Redis-backed infrastructure
export {};
```

- [ ] **Step 6: Create `packages/infra/README.md`**

```markdown
# @amadou/infra

Infrastructure: Upstash Redis client, rate-limit store, JobQueue base.

## Install

\`\`\`bash
pnpm add @amadou/infra @upstash/redis
\`\`\`

## Exports

(populated as modules are added)
```

- [ ] **Step 7: Install + verify build**

```bash
cd ~/Desktop/K-gnote/amadou-starter
pnpm install
pnpm --filter @amadou/infra build
```

Expected: builds successfully.

- [ ] **Step 8: Commit**

```bash
git add packages/infra/ pnpm-lock.yaml
git commit -m "feat(infra): scaffold @amadou/infra package"
```

---

## Task 11: TDD Redis client wrapper

**Files:**
- Create: `packages/infra/src/redis.ts`
- Create: `packages/infra/src/redis.test.ts`
- Modify: `packages/infra/src/index.ts`

**Reference (READ-ONLY)**: `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/redis.ts`

- [ ] **Step 1: Write failing tests `packages/infra/src/redis.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation((opts: { url: string; token: string }) => ({
    _opts: opts,
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

const { createRedisClient } = await import('./redis.js');

describe('createRedisClient', () => {
  it('builds client from explicit options', () => {
    const client = createRedisClient({ url: 'https://r.upstash.io', token: 't' });
    expect((client as unknown as { _opts: { url: string; token: string } })._opts).toEqual({
      url: 'https://r.upstash.io',
      token: 't',
    });
  });

  it('reads from env when options absent', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://env.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'env-token';
    const client = createRedisClient();
    expect((client as unknown as { _opts: { url: string; token: string } })._opts).toEqual({
      url: 'https://env.upstash.io',
      token: 'env-token',
    });
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('throws when no url/token available', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(() => createRedisClient()).toThrow(/UPSTASH_REDIS/);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @amadou/infra test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/infra/src/redis.ts`**

Read `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/redis.ts`. Adapt with explicit options + env fallback:

```typescript
import { Redis } from '@upstash/redis';

export interface CreateRedisClientOptions {
  url?: string;
  token?: string;
}

export function createRedisClient(options: CreateRedisClientOptions = {}): Redis {
  const url = options.url ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = options.token ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'createRedisClient: missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN (set env vars or pass options)'
    );
  }

  return new Redis({ url, token });
}

export type { Redis };
```

- [ ] **Step 4: Update `packages/infra/src/index.ts`**

```typescript
export { createRedisClient } from './redis.js';
export type { Redis, CreateRedisClientOptions } from './redis.js';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @amadou/infra test`
Expected: all 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/infra/src/redis.ts packages/infra/src/redis.test.ts packages/infra/src/index.ts
git commit -m "feat(infra): Upstash Redis client wrapper with env fallback"
```

---

## Task 12: TDD `RedisRateLimitStore` (express-rate-limit compatible)

**Files:**
- Create: `packages/infra/src/rate-limit-store.ts`
- Create: `packages/infra/src/rate-limit-store.test.ts`
- Modify: `packages/infra/src/index.ts`
- Modify: `packages/infra/package.json` (add `express-rate-limit` peer)

**Reference (READ-ONLY)**: `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/rateLimitStore.ts`

- [ ] **Step 1: Add `express-rate-limit` as peer + dev dep**

Edit `packages/infra/package.json`, add to `peerDependencies`:
```json
"express-rate-limit": "^7.4.0"
```
And to `devDependencies`:
```json
"express-rate-limit": "^7.4.0"
```

Run: `pnpm install`

- [ ] **Step 2: Write failing tests `packages/infra/src/rate-limit-store.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisRateLimitStore } from './rate-limit-store.js';

function makeMockRedis() {
  const store = new Map<string, number>();
  return {
    incr: vi.fn(async (key: string) => {
      const v = (store.get(key) ?? 0) + 1;
      store.set(key, v);
      return v;
    }),
    expire: vi.fn(async (_key: string, _seconds: number) => 1),
    decr: vi.fn(async (key: string) => {
      const v = Math.max(0, (store.get(key) ?? 0) - 1);
      store.set(key, v);
      return v;
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    pttl: vi.fn(async (_key: string) => 60_000),
    _store: store,
  };
}

describe('RedisRateLimitStore', () => {
  let redis: ReturnType<typeof makeMockRedis>;
  let store: RedisRateLimitStore;

  beforeEach(() => {
    redis = makeMockRedis();
    store = new RedisRateLimitStore({ redis: redis as never, prefix: 'test:', windowMs: 60_000 });
  });

  it('increment returns totalHits and resetTime', async () => {
    const result = await store.increment('user-1');
    expect(result.totalHits).toBe(1);
    expect(result.resetTime).toBeInstanceOf(Date);
    expect(redis.incr).toHaveBeenCalledWith('test:user-1');
    expect(redis.expire).toHaveBeenCalledWith('test:user-1', 60);
  });

  it('subsequent increments accumulate', async () => {
    await store.increment('user-1');
    await store.increment('user-1');
    const result = await store.increment('user-1');
    expect(result.totalHits).toBe(3);
  });

  it('decrement reduces counter', async () => {
    await store.increment('user-1');
    await store.increment('user-1');
    await store.decrement('user-1');
    const result = await store.increment('user-1');
    expect(result.totalHits).toBe(2);
  });

  it('resetKey clears the counter', async () => {
    await store.increment('user-1');
    await store.resetKey('user-1');
    expect(redis.del).toHaveBeenCalledWith('test:user-1');
  });
});
```

- [ ] **Step 3: Run test to verify failure**

Run: `pnpm --filter @amadou/infra test`
Expected: FAIL.

- [ ] **Step 4: Implement `packages/infra/src/rate-limit-store.ts`**

Read `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/rateLimitStore.ts`. Adapt to constructor-based config:

```typescript
import type { Redis } from '@upstash/redis';
import type { Store, IncrementResponse } from 'express-rate-limit';

export interface RedisRateLimitStoreOptions {
  redis: Redis;
  prefix?: string;
  windowMs: number;
}

export class RedisRateLimitStore implements Store {
  private readonly redis: Redis;
  private readonly prefix: string;
  readonly windowMs: number;

  constructor(options: RedisRateLimitStoreOptions) {
    this.redis = options.redis;
    this.prefix = options.prefix ?? 'rl:';
    this.windowMs = options.windowMs;
  }

  private k(key: string): string {
    return `${this.prefix}${key}`;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const fullKey = this.k(key);
    const totalHits = (await this.redis.incr(fullKey)) as number;
    if (totalHits === 1) {
      await this.redis.expire(fullKey, Math.ceil(this.windowMs / 1000));
    }
    return {
      totalHits,
      resetTime: new Date(Date.now() + this.windowMs),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(this.k(key));
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(this.k(key));
  }
}
```

- [ ] **Step 5: Update `packages/infra/src/index.ts`**

```typescript
export { createRedisClient } from './redis.js';
export type { Redis, CreateRedisClientOptions } from './redis.js';
export { RedisRateLimitStore } from './rate-limit-store.js';
export type { RedisRateLimitStoreOptions } from './rate-limit-store.js';
```

- [ ] **Step 6: Run tests to verify pass**

Run: `pnpm --filter @amadou/infra test`
Expected: all 7 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/infra/
git commit -m "feat(infra): RedisRateLimitStore compatible with express-rate-limit"
```

---

## Task 13: TDD `JobQueue` base class

**Files:**
- Create: `packages/infra/src/job-queue.ts`
- Create: `packages/infra/src/job-queue.test.ts`
- Modify: `packages/infra/src/index.ts`

**Reference (READ-ONLY)**: `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/queues/JobQueue.ts`

- [ ] **Step 1: Write failing tests `packages/infra/src/job-queue.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobQueue } from './job-queue.js';

interface TestPayload {
  message: string;
}

function makeMockRedis() {
  const lists = new Map<string, string[]>();
  return {
    lpush: vi.fn(async (key: string, value: string) => {
      const list = lists.get(key) ?? [];
      list.unshift(value);
      lists.set(key, list);
      return list.length;
    }),
    rpop: vi.fn(async (key: string) => {
      const list = lists.get(key) ?? [];
      return list.pop() ?? null;
    }),
    llen: vi.fn(async (key: string) => (lists.get(key) ?? []).length),
    _lists: lists,
  };
}

describe('JobQueue', () => {
  let redis: ReturnType<typeof makeMockRedis>;
  let queue: JobQueue<TestPayload>;

  beforeEach(() => {
    redis = makeMockRedis();
    queue = new JobQueue<TestPayload>({
      redis: redis as never,
      name: 'test-queue',
      maxAttempts: 3,
    });
  });

  it('push enqueues a job and returns id', async () => {
    const id = await queue.push({ message: 'hello' });
    expect(id).toMatch(/^job_/);
    expect(redis.lpush).toHaveBeenCalledTimes(1);
    expect(await queue.size()).toBe(1);
  });

  it('pop returns oldest job FIFO', async () => {
    await queue.push({ message: 'first' });
    await queue.push({ message: 'second' });

    const job1 = await queue.pop();
    const job2 = await queue.pop();
    expect(job1?.payload.message).toBe('first');
    expect(job2?.payload.message).toBe('second');
  });

  it('pop returns null when queue empty', async () => {
    expect(await queue.pop()).toBeNull();
  });

  it('process invokes handler and removes successful jobs', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    await queue.push({ message: 'do-it' });
    const processed = await queue.processNext(handler);
    expect(processed).toBe(true);
    expect(handler).toHaveBeenCalledWith({ message: 'do-it' });
    expect(await queue.size()).toBe(0);
  });

  it('process re-enqueues on failure with attempts++', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('fail'));
    await queue.push({ message: 'retry-me' });

    await queue.processNext(handler);
    expect(await queue.size()).toBe(1);

    const job = await queue.pop();
    expect(job?.attempts).toBe(1);
  });

  it('process drops job after maxAttempts (dead-letter)', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('fail'));
    const onDead = vi.fn();
    queue = new JobQueue<TestPayload>({
      redis: redis as never,
      name: 'test',
      maxAttempts: 2,
      onDeadLetter: onDead,
    });

    await queue.push({ message: 'doomed' });
    await queue.processNext(handler); // attempt 1
    await queue.processNext(handler); // attempt 2 → dead
    await queue.processNext(handler); // queue empty

    expect(handler).toHaveBeenCalledTimes(2);
    expect(onDead).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { message: 'doomed' }, attempts: 2 }),
      expect.any(Error)
    );
    expect(await queue.size()).toBe(0);
  });

  it('returns false when processNext finds no job', async () => {
    const handler = vi.fn();
    expect(await queue.processNext(handler)).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @amadou/infra test`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/infra/src/job-queue.ts`**

Read `~/Desktop/K-gnote/cagnottes-sn/backend/src/lib/queues/JobQueue.ts`. Adapt to generic TS class:

```typescript
import type { Redis } from '@upstash/redis';
import { randomBytes } from 'node:crypto';

export interface QueueJob<T> {
  id: string;
  payload: T;
  attempts: number;
  enqueuedAt: number;
}

export interface JobQueueOptions<T> {
  redis: Redis;
  name: string;
  maxAttempts?: number;
  onDeadLetter?: (job: QueueJob<T>, lastError: unknown) => void | Promise<void>;
}

export class JobQueue<T> {
  private readonly redis: Redis;
  private readonly key: string;
  private readonly maxAttempts: number;
  private readonly onDeadLetter?: (job: QueueJob<T>, err: unknown) => void | Promise<void>;

  constructor(options: JobQueueOptions<T>) {
    this.redis = options.redis;
    this.key = `q:${options.name}`;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.onDeadLetter = options.onDeadLetter;
  }

  async push(payload: T): Promise<string> {
    const job: QueueJob<T> = {
      id: `job_${randomBytes(8).toString('hex')}`,
      payload,
      attempts: 0,
      enqueuedAt: Date.now(),
    };
    await this.redis.lpush(this.key, JSON.stringify(job));
    return job.id;
  }

  async pop(): Promise<QueueJob<T> | null> {
    const raw = (await this.redis.rpop(this.key)) as string | null;
    if (!raw) return null;
    if (typeof raw === 'string') return JSON.parse(raw) as QueueJob<T>;
    // Upstash may return objects directly
    return raw as unknown as QueueJob<T>;
  }

  async size(): Promise<number> {
    return (await this.redis.llen(this.key)) as number;
  }

  async processNext(handler: (payload: T) => Promise<void>): Promise<boolean> {
    const job = await this.pop();
    if (!job) return false;

    try {
      await handler(job.payload);
      return true;
    } catch (err) {
      const updated: QueueJob<T> = { ...job, attempts: job.attempts + 1 };
      if (updated.attempts >= this.maxAttempts) {
        if (this.onDeadLetter) {
          await this.onDeadLetter(updated, err);
        }
      } else {
        await this.redis.lpush(this.key, JSON.stringify(updated));
      }
      return true;
    }
  }
}
```

- [ ] **Step 4: Update `packages/infra/src/index.ts`**

```typescript
export { createRedisClient } from './redis.js';
export type { Redis, CreateRedisClientOptions } from './redis.js';
export { RedisRateLimitStore } from './rate-limit-store.js';
export type { RedisRateLimitStoreOptions } from './rate-limit-store.js';
export { JobQueue } from './job-queue.js';
export type { QueueJob, JobQueueOptions } from './job-queue.js';
```

- [ ] **Step 5: Run all infra tests**

Run: `pnpm --filter @amadou/infra test`
Expected: all 14 tests PASS.

- [ ] **Step 6: Verify build + typecheck**

```bash
pnpm --filter @amadou/infra build
pnpm --filter @amadou/infra typecheck
```

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add packages/infra/
git commit -m "feat(infra): generic JobQueue with retry and dead-letter callback"
```

---

## Task 14: First release v0.1.0

**Files:**
- Create: `.changeset/initial-release.md`

- [ ] **Step 1: Run full pipeline locally**

```bash
cd ~/Desktop/K-gnote/amadou-starter
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Expected: all green.

- [ ] **Step 2: Create initial changeset**

Create `.changeset/initial-release.md`:

```markdown
---
"@amadou/core": minor
"@amadou/infra": minor
---

Initial release of `@amadou/core` (logger, crypto, slug, Zod helpers) and `@amadou/infra` (Upstash Redis client, rate-limit store, JobQueue).
```

- [ ] **Step 3: Bump versions**

Run: `pnpm changeset version`
Expected: `core/package.json` and `infra/package.json` versions updated to `0.1.0`. `CHANGELOG.md` files created.

- [ ] **Step 4: Verify version bump**

```bash
cat packages/core/package.json | grep version
cat packages/infra/package.json | grep version
```

Expected: both show `"version": "0.1.0"`.

- [ ] **Step 5: Commit version bump**

```bash
git add .
git commit -m "chore: version packages to 0.1.0"
```

- [ ] **Step 6: Create GitHub repo + push**

Create the GitHub repo (under your org), then:

```bash
git remote add origin git@github.com:<your-org>/amadou-starter.git
git push -u origin main
```

- [ ] **Step 7: Configure repo secrets**

In GitHub repo settings → Secrets and variables → Actions, ensure `GITHUB_TOKEN` has `packages: write` permission (set at workflow level — already done in `.github/workflows/release.yml`).

- [ ] **Step 8: Trigger release workflow**

The push to `main` triggers `release.yml` which runs `changeset publish`. If no changesets present, it opens a "Version Packages" PR; if changesets present (as we just versioned manually), it publishes directly.

Check Actions tab → Release workflow run.

Expected: green run, two packages published. Verify on GitHub Packages page of the repo.

- [ ] **Step 9: Verify package install works from a clean directory**

```bash
mkdir /tmp/amadou-test && cd /tmp/amadou-test
echo "@amadou:registry=https://npm.pkg.github.com" > .npmrc
echo "//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}" >> .npmrc
GITHUB_TOKEN=<your-pat-with-read:packages> npm install @amadou/core@0.1.0 @amadou/infra@0.1.0 zod @upstash/redis
```

Expected: both packages download. Try `node -e "console.log(Object.keys(require('@amadou/core')))"` — should list exports.

- [ ] **Step 10: Final commit (CHANGELOG sync if needed)**

```bash
git pull --rebase
git status
```

If clean: done. If `CHANGELOG.md` files were modified by the workflow:

```bash
git add packages/*/CHANGELOG.md
git commit -m "chore: sync changelogs from release"
git push
```

---

## Self-Review Checklist (run after Task 14 complete)

- [ ] Spec section 2 (forme du livrable) → covered by Tasks 1-4
- [ ] Spec section 3.1 (`@amadou/core`) → covered by Tasks 5-9 (all 4 sub-modules: logger, crypto, slug, zod-helpers)
- [ ] Spec section 3.2 (`@amadou/infra`) → covered by Tasks 10-13 (all 3 sub-modules: redis, rate-limit, JobQueue)
- [ ] Spec section 6 (décisions par défaut) → all applied: TS strict, dual ESM+CJS, Node 20, Conventional Commits, Vitest
- [ ] Spec section 8 critère "10 packages compilent et publient sur GitHub Packages" → 2/10 done after Plan 1; remaining 8 in Plans 2-4
- [ ] Cagnottes-sn never modified → confirmed: all source references are READ-ONLY copies/adaptations into the new repo

## What comes next

After Plan 1 ships v0.1.0:
- **Plan 2** : `@amadou/auth` + `@amadou/storage` + `@amadou/email`
- **Plan 3** : `@amadou/notifications` + `@amadou/webhook` + `@amadou/payments`
- **Plan 4** : `@amadou/payments-bictorys` + `@amadou/react-api`
- **Plan 5** : `apps/template/*` + smoke E2E + README + v1.0.0 release
