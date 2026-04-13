# Coding Conventions

**Analysis Date:** 2026-04-13

## Naming Patterns

**Files:**
- Components: `PascalCase` (e.g., `ToastContext.tsx`, `AuthContext.tsx`)
- Utilities/functions: `camelCase` (e.g., `api.ts`, `useApi.ts`, `formatPrice.ts`)
- Routes: `kebab-case` in paths (e.g., `/api/pay-redirect`, `/api/blocks`)
- Prisma enums: `SCREAMING_SNAKE_CASE` (e.g., `FUNDRAISER`, `DONATION`, `PENDING`)

**Functions:**
- Hooks: `use` prefix (e.g., `useApi<T>`, `useApi<T>()` returns `UseApiResult<T>`)
- Event handlers: `handle` or `on` prefix (e.g., `handleSubmit`, `onClick`)
- Predicates: `is` or `can` prefix (e.g., `isInAppBrowser()`, `isTikTokBrowser()`, `canRefresh()`)
- Async operations: verb + subject (e.g., `fetchData()`, `createAccessToken()`, `setAuthCookies()`)
- Database helpers: `validate`/`format`/`create` + subject (e.g., `validateBlockConfig()`, `formatZodError()`, `createOrder()`)

**Variables:**
- Boolean flags: `is`/`has`/`can` prefix (e.g., `isProd`, `hasError`, `canFetch`)
- State references: clear, descriptive names (e.g., `mountedRef`, `fetchIdRef`, `pathRef` for refs; `data`, `loading`, `error` for state)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `STALE_TIME`, `MAX_RETRIES`, `ACCESS_TOKEN_EXPIRY`)
- Cache maps: plural nouns or clear semantic names (e.g., `cache` for in-memory, `authCache` for typed cache)

**Types:**
- Interfaces: `PascalCase`, often paired with function/feature name (e.g., `UseApiOptions`, `UseApiResult<T>`, `TokenPayload`, `ApiOptions`, `CreateTransactionParams`)
- Type aliases: `PascalCase` (e.g., `Record<string, string>`)
- Enums: `PascalCase` in TypeScript, `SCREAMING_SNAKE_CASE` in Prisma schema
- Generic parameters: single uppercase letters (e.g., `<T>`, `<R>`) or `<Payload>`, `<Result>` for clarity

## Code Style

**Formatting:**
- **Linter:** ESLint with Next.js config (`eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`) — see `eslint.config.mjs` (Next.js 16 flat config)
- **No Prettier config** — rely on ESLint's defaults and IDE formatting
- **Line length:** No hard limit enforced; aim for readability (~100-120 chars comfortable)
- **Indentation:** 2 spaces (standard Node/Next.js convention)
- **Quotes:** Double quotes for strings (TypeScript/JavaScript standard)

**Linting:**
- Core rules: Next.js Core Web Vitals + TypeScript strict rules
- Default ignores: `.next/`, `out/`, `build/`, `next-env.d.ts` (frontend); `dist/`, `node_modules/` (backend)
- No explicit style override — ESLint defaults are sufficient

## Import Organization

**Order (Frontend):**
1. React/Next.js imports (`import type { Metadata } from "next"`)
2. Third-party libraries (`import { clsx } from "clsx"`)
3. Internal absolute imports (`import { api } from "@/lib/api"`)
4. Internal relative imports (`.js` extension required in backend, optional in frontend)
5. Styles (`import "./globals.css"`)

**Order (Backend):**
1. Node.js built-ins (`import type { Request, Response } from "express"`)
2. Third-party libraries (`import { z } from "zod"`)
3. Internal imports (`import { prisma } from "../lib/prisma.js"`)
4. Type-only imports grouped (`import type { ... } from "..."`)

**Path Aliases:**
- Frontend: `@/*` → `src/*` (configured in `tsconfig.json`)
- Backend: No aliases; use relative imports (`../lib`, `../middleware`)
- File extensions: Frontend omits `.js`/`.ts`; backend includes `.js` (ES modules)

**Import Example (Frontend):**
```typescript
import type { UseApiOptions } from "./useApi";
import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
```

**Import Example (Backend):**
```typescript
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import * as logger from "../lib/logger.js";
```

## Error Handling

**Frontend (`src/lib/api.ts`):**
- Custom `ApiError` class extends `Error` with `status` and `body` properties
- Distinguish network errors: timeout (AbortError), offline (navigator.onLine), unknown
- User-facing messages in French (e.g., `"La requête a pris trop de temps"`)
- Auto-retry on network errors (1 retry after 1s) but NOT on API errors (4xx/5xx)
- Auto-refresh on 401 (unless already retrying) then single retry of original request
- Parse error body as JSON first, fallback to text (handles HTML 502/503 from proxies)

**Backend (`backend/src/routes/*.ts`):**
- Zod validation with custom `formatZodError()` helper for French messages
- HTTP status codes: 400 for validation/missing data, 404 for not found, 401 for auth, 500 for server errors
- All error responses JSON with `{ error: "French message" }` format
- Try/catch wraps route handlers; log errors via `logger.error(msg, err)`, return safe message to client
- Database queries wrapped in existence checks (return 404 before using unchecked data)
- Validation precedence: schema parse → existence checks → business logic

**Pattern Example:**
```typescript
try {
  const data = createOrderSchema.parse(req.body);
  const seller = await prisma.seller.findFirst({ where: { ... } });
  if (!seller) {
    res.status(404).json({ error: "Vendeur introuvable" });
    return;
  }
  // ... proceed
  res.json({ /* result */ });
} catch (err) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: formatZodError(err) });
  } else {
    logger.error("Erreur création commande", err);
    res.status(500).json({ error: "Erreur interne" });
  }
}
```

## Logging

**Framework:** Native `console.log/warn/error` with custom wrapper in `lib/logger.ts`

**Patterns:**
- Production mode redacts emails, order refs (FA-*), phone numbers (8+ digits), and file paths
- Development logs everything unredacted
- API calls prefixed with scope (e.g., `[Bictorys]`, `[Webhook]`)
- Success logs: operation + key identifiers (e.g., `[Bictorys] Response: transactionId=..., link=..., qrCode=...`)
- Error logs: context + error message (e.g., `logger.error("Erreur création commande", err)`)
- **Never log in frontend** — errors shown in UI via Toast/error state

**Example (Backend):**
```typescript
import * as logger from "../lib/logger.js";
logger.log(`[Bictorys] POST ${url}`);
logger.error("Erreur création commande", err);
```

## Comments

**When to Comment:**
- Complex business logic that isn't obvious from code (e.g., Bictorys retry logic with WAF 403 backoff)
- Performance-critical sections (e.g., cache TTL reasoning, fetch timeouts)
- Workarounds and quirks (e.g., TikTok WebView payment redirect, Safari ITP proxy)
- Audit trail references (e.g., `// NOTE: cagnottes.sn fork — ...removed` for deleted features)
- Integration-specific behavior (e.g., `// Orange Money CI requiert un code OTP généré via #144*82#`)

**JSDoc/TSDoc:**
- Used sparingly for public functions and hooks
- Format: `/** brief description */` (single-line for simple functions)
- Example (Frontend):
  ```typescript
  /**
   * Hook with in-memory stale-while-revalidate cache for GET requests.
   * - If cached data exists, returns it immediately (loading = false)
   * - Revalidates in background if stale
   */
  export function useApi<T>(path: string, options?: UseApiOptions): UseApiResult<T>
  ```

## Function Design

**Size:**
- Small, focused functions (< 50 lines typical)
- Async handlers longer but still single responsibility (one request type per route handler)
- Utility functions: 5-30 lines
- Middleware: 10-40 lines

**Parameters:**
- Prefer objects over positional args for > 2 params (e.g., `api<T>(path, options: ApiOptions)`)
- Options interfaces with optional fields for flexible behavior
- Type all parameters explicitly (strict TypeScript required)

**Return Values:**
- Explicit return type annotations always
- Async functions return `Promise<T>`
- Errors thrown, not returned as `{ error, data }` tuples
- Hooks return structured objects: `{ data, loading, error, refresh }` (clear semantics)

## Module Design

**Exports:**
- Named exports preferred (e.g., `export function api<T>()`, `export class ApiError`)
- Default exports only for Next.js components in pages/layouts
- Type exports explicit: `export type { UseApiOptions }`
- Re-exports in barrel files (index.ts) keep imports clean

**Barrel Files:**
- Used in `contexts/` (e.g., might aggregate providers in future)
- Minimal; list all exports explicitly
- Don't re-export from re-exports (one level deep only)

**Organization (Frontend):**
```
src/
├── app/              # Next.js pages/layouts
├── lib/              # Utilities (api, hooks, constants, types)
├── contexts/         # React Context providers
├── types/            # Shared TypeScript types
└── middleware.ts     # Next.js middleware
```

**Organization (Backend):**
```
backend/src/
├── routes/           # Express route handlers (one file per resource)
├── middleware/       # Express middleware (auth, etc.)
├── lib/              # Utilities (auth, payments, storage, logger, queues)
├── generated/        # Prisma client (generated, do not edit)
└── index.ts          # Express app setup
```

## Data & Validation

**Monetary Amounts:**
- Always integers (FCFA has no cents)
- Type: `number` (not string or Decimal)
- Zod: `z.number().int().min(500).max(10_000_000)`
- Storage: Prisma `Int` field
- Display: `formatPrice(amount)` returns `"15 000 FCFA"` (space as thousands separator, French locale)

**Validation (Zod):**
- Every POST/PUT/PATCH request validated against a schema
- Schemas defined at route module scope (e.g., `createOrderSchema`, `updateBlockSchema`)
- Errors caught and formatted to French via `formatZodError(err)`
- Custom fields in schema with tailored error messages (e.g., `z.string().min(1, "Titre requis")`)

**IDs:**
- Prisma models use `cuid()` for `id` fields (default in schema)
- References: type as `string` in TypeScript, Prisma handles relation queries
- Public identifiers (slugs, references) separate from internal IDs

## Styling

**Tailwind CSS v4:**
- Utility-first only; no CSS modules, no styled-components, no inline `style={{}}`
- Class merging: `cn(className, "px-4")` via `clsx` + `twMerge`
- Primary color: `teal-600` (#0D9488)
- Accent color: `amber-500` (#F59E0B)
- Font: Inter (loaded via `next/font/google`)
- Mobile-first: design for 375px width, scale up
- Touch targets: buttons/inputs ≥ 48px (height: `py-3.5` minimum)
- Responsive classes: `sm:`, `md:`, `lg:` prefixes, `md:grid-cols-2` for tablet/desktop

**Example:**
```typescript
<button className={cn("px-4 py-3.5 bg-teal-600 text-white rounded", className)}>
  {children}
</button>
```

## Language

**UI Text:**
- All user-facing strings in **French**
- No English in UI (error messages, labels, placeholders)
- Text constants in `src/lib/constants.ts` (not hardcoded in JSX)
- Price formatting uses French locale (`fr-FR`)

**Code Comments:**
- English or French acceptable; **French preferred for clarity** in this French-focused codebase
- Commit messages: English convention

## TypeScript Strict Mode

- **Enabled:** `strict: true` in both `tsconfig.json` and `backend/tsconfig.json`
- Type safety enforced; no `any` without explicit `// @ts-ignore` justification
- Vendor type definitions included (`@types/node`, `@types/react`, `@types/react-dom`)
- Prisma client fully typed (custom output path: `backend/src/generated/prisma`)

---

*Convention analysis: 2026-04-13*
