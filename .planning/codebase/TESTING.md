# Testing Patterns

**Analysis Date:** 2026-04-13

## Test Framework

**Status:** Not Configured

No test framework is currently installed or configured. The codebase has no test files (`.test.ts`, `.spec.ts`, etc.) in either frontend or backend.

**Frontend (`package.json`):**
- No test runner dependency (Jest, Vitest, Testing Library, etc.)
- `npm run lint` runs ESLint only

**Backend (`backend/package.json`):**
- No test runner dependency
- `npm run build` compiles TypeScript to `dist/`
- `npm run dev` runs via `tsx watch` for development

## Testing Recommendations

### Framework Choice

**For Frontend (Next.js 16 + React 19):**
- **Recommended:** Vitest + React Testing Library
- Vitest integrates seamlessly with Turbopack, fast HMR
- React Testing Library for component testing (accessibility-first)

**For Backend (Express 5):**
- **Recommended:** Vitest + Node test utilities or Supertest
- Vitest for unit/integration tests of utility functions
- Supertest for HTTP endpoint testing (mocking Express requests/responses)

### Test File Organization (Proposed)

**Frontend:**
```
src/
├── lib/
│   ├── api.ts
│   ├── api.test.ts          # Co-located with source
│   ├── useApi.ts
│   └── useApi.test.ts
├── contexts/
│   ├── AuthContext.tsx
│   └── AuthContext.test.tsx
└── app/
    ├── page.tsx
    └── page.test.tsx
```

**Backend:**
```
backend/src/
├── lib/
│   ├── auth.ts
│   ├── auth.test.ts
│   ├── payments/
│   │   ├── bictorys.ts
│   │   └── bictorys.test.ts
│   └── logger.ts
├── routes/
│   ├── blocks.test.ts       # Test entire route handler
│   ├── orders.test.ts
│   └── auth.test.ts
└── middleware/
    ├── auth.test.ts
    └── auth.middleware.test.ts
```

**Naming Pattern:** `[module].test.ts` co-located with source file

### Run Commands (Future Setup)

```bash
# Frontend
npm run test                   # Run all tests
npm run test:watch            # Watch mode (re-run on file change)
npm run test:coverage         # Generate coverage report

# Backend (from /backend)
npm run test                   # Run all tests
npm run test:watch            # Watch mode
npm run test:coverage         # Generate coverage report
npm run test:debug            # Run with debugger
```

## Test Structure (Proposed Pattern)

**Frontend Hook Testing (useApi):**
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useApi } from "@/lib/useApi";

describe("useApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached data immediately on second call", async () => {
    const { result: result1 } = renderHook(() => useApi("/api/test"));
    await waitFor(() => expect(result1.current.loading).toBe(false));
    
    const { result: result2 } = renderHook(() => useApi("/api/test"));
    expect(result2.current.data).toBe(result1.current.data);
    expect(result2.current.loading).toBe(false);
  });

  it("auto-refreshes stale cache in background", async () => {
    const { result } = renderHook(() => useApi("/api/test", { staleTime: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    expect(result.current.loading).toBe(false); // No loading spinner for background refresh
  });
});
```

**Frontend Component Testing (Auth Context):**
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthContext } from "@/contexts/AuthContext";

describe("AuthContext", () => {
  it("provides user from cookie on mount", async () => {
    render(
      <AuthContext>
        <div>{/* consumer component */}</div>
      </AuthContext>
    );
    
    // Assert context value available
  });
});
```

**Backend Route Testing (Bictorys Payment):**
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../index";
import { prisma } from "../lib/prisma";

describe("POST /api/orders", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.order.deleteMany({}); // Clean test DB
  });

  it("creates order and charges Bictorys", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", "izy-token=valid_jwt")
      .set("x-csrf-token", "valid_csrf")
      .send({
        sellerSlug: "test-creator",
        orderType: "DONATION",
        amount: 15000,
        paymentType: "wave_money",
        customerPhone: "771234567",
      });

    expect(res.status).toBe(200);
    expect(res.body.externalId).toBeDefined();
    
    const order = await prisma.order.findUnique({
      where: { id: res.body.id },
    });
    expect(order?.paymentStatus).toBe("PENDING");
  });

  it("validates amount is integer FCFA", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", "izy-token=valid_jwt")
      .send({
        sellerSlug: "test-creator",
        orderType: "DONATION",
        amount: 15000.5, // Invalid: float
        paymentType: "wave_money",
        customerPhone: "771234567",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/montant/i);
  });
});
```

**Backend Utility Testing (formatZodError):**
```typescript
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { formatZodError } from "../lib/zodErrors";

describe("formatZodError", () => {
  it("translates required field error to French", () => {
    const schema = z.object({ title: z.string() });
    try {
      schema.parse({});
    } catch (err) {
      const msg = formatZodError(err as z.ZodError);
      expect(msg).toBe("Le titre est obligatoire");
    }
  });

  it("handles min length validation", () => {
    const schema = z.object({ password: z.string().min(8) });
    try {
      schema.parse({ password: "short" });
    } catch (err) {
      const msg = formatZodError(err as z.ZodError);
      expect(msg).toMatch(/8 caractères/);
    }
  });
});
```

## Mocking Strategy (Proposed)

**What to Mock:**
- External API calls (Bictorys, Resend, R2)
- Database queries (Prisma)
- Environment variables
- Date/time (`Date.now()`, timers)
- Browser APIs (`fetch`, `localStorage`, `navigator`)

**What NOT to Mock:**
- Business logic (validate, format, calculate)
- Zod validation schemas
- Utility functions (unless they have side effects)
- Local state management (React hooks)

**Mocking Example (Bictorys API):**
```typescript
import { vi } from "vitest";

beforeEach(() => {
  vi.mock("../lib/payments/bictorys", () => ({
    BictorysProvider: {
      createTransaction: vi.fn().mockResolvedValue({
        externalId: "TX-123",
        redirectUrl: "https://bictorys.com/pay/...",
        status: "PENDING",
      }),
    },
  }));
});
```

**Mocking Example (Prisma):**
```typescript
import { vi } from "vitest";
import { prisma } from "../lib/prisma";

beforeEach(() => {
  vi.spyOn(prisma.seller, "findFirst").mockResolvedValue({
    id: "seller-1",
    slug: "test-creator",
    plan: "FREE",
    // ... rest of fields
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

**Mocking Example (fetch in Frontend):**
```typescript
import { vi } from "vitest";

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ data: "mocked" }),
  text: async () => "success",
});
```

## Test Types

### Unit Tests

**Scope:** Individual functions, utilities, no external dependencies

**Examples:**
- `formatPrice(15000)` → `"15 000 FCFA"`
- `isInAppBrowser()` → true/false based on user agent
- `formatZodError(err)` → French error message
- `createAccessToken(payload)` → JWT string

**Pattern:**
```typescript
describe("formatPrice", () => {
  it("formats FCFA with space separator", () => {
    expect(formatPrice(15000)).toBe("15 000 FCFA");
    expect(formatPrice(1000000)).toBe("1 000 000 FCFA");
  });
});
```

### Integration Tests

**Scope:** Multiple modules together, database/API mocked

**Examples:**
- Create order → validate → charge payment → log webhook
- Auth flow: signup → email verify → login → refresh token
- Block CRUD: create → update config → delete → cache invalidate

**Pattern:**
```typescript
describe("Order Flow", () => {
  it("creates donation, charges, and sends confirmation email", async () => {
    // 1. Create order
    const order = await createOrder({ ... });
    expect(order.paymentStatus).toBe("PENDING");
    
    // 2. Mock Bictorys webhook
    await receiveWebhook({ transactionId: order.externalId, status: "SUCCESS" });
    
    // 3. Verify order marked paid
    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated.paymentStatus).toBe("PAID");
    
    // 4. Verify email queued
    const emailJob = await emailQueue.getJob(order.id);
    expect(emailJob.email).toBe(order.customerEmail);
  });
});
```

### E2E Tests

**Status:** Not configured

**Recommended:** Playwright for critical user journeys (payment redirect, auth flow)
- Separate from unit/integration tests
- Run in CI only (slower)
- Test real browser, DOM rendering

**Future Setup:**
```bash
npm install -D @playwright/test
```

## Fixtures and Test Data (Proposed)

**Location:** `backend/test/fixtures/` (new directory)

**Seller Fixture:**
```typescript
// backend/test/fixtures/sellers.ts
export const testSeller = {
  id: "seller-1",
  slug: "test-creator",
  email: "test@example.com",
  plan: "FREE" as const,
  displayName: "Test Creator",
};

export async function createTestSeller(overrides = {}) {
  return prisma.seller.create({
    data: { ...testSeller, ...overrides },
  });
}
```

**Order Fixture:**
```typescript
// backend/test/fixtures/orders.ts
export async function createTestOrder(seller: Seller) {
  return prisma.order.create({
    data: {
      sellerId: seller.id,
      orderType: "DONATION",
      amount: 15000,
      paymentStatus: "PENDING",
      paymentType: "wave_money",
      customerPhone: "771234567",
    },
  });
}
```

## Coverage Targets (Proposed)

**Current:** 0% (no tests)

**Recommended Minimums:**
- Critical paths: 80%+ (auth, payments, webhooks)
- Utilities: 90%+
- Components: 70%+ (UI harder to test)
- Overall: 60%+

**View Coverage:**
```bash
npm run test:coverage
# or via HTML report
open coverage/index.html
```

## Async Testing Pattern (Proposed)

**Frontend Hooks:**
```typescript
import { waitFor } from "@testing-library/react";

it("loads data", async () => {
  const { result } = renderHook(() => useApi("/api/data"));
  
  expect(result.current.loading).toBe(true);
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
  
  expect(result.current.data).toBeDefined();
});
```

**Backend Routes:**
```typescript
import request from "supertest";

it("creates and returns order", async () => {
  const res = await request(app)
    .post("/api/orders")
    .send({ /* valid data */ });
  
  expect(res.status).toBe(200);
  expect(res.body.id).toBeDefined();
});
```

## Error Testing Pattern (Proposed)

**Frontend:**
```typescript
it("shows error message on network failure", async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
  
  const { result } = renderHook(() => useApi("/api/data"));
  
  await waitFor(() => {
    expect(result.current.error).toMatch(/réseau/i);
    expect(result.current.loading).toBe(false);
  });
});
```

**Backend:**
```typescript
it("returns 400 on validation error", async () => {
  const res = await request(app)
    .post("/api/orders")
    .send({ amount: "not-a-number" });
  
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/montant/i);
});

it("returns 401 on missing auth", async () => {
  const res = await request(app).get("/api/blocks");
  
  expect(res.status).toBe(401);
  expect(res.body.error).toMatch(/Token/);
});
```

## CI/CD Integration (Proposed)

**GitHub Actions workflow:**
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci && cd backend && npm ci

      - name: Run frontend tests
        run: npm run test:ci

      - name: Run backend tests
        run: cd backend && npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

---

*Testing analysis: 2026-04-13*

**Note:** This document outlines testing patterns and recommendations based on the codebase structure. Actual implementation of a test framework should be done as a dedicated phase with careful consideration of coverage targets and test data management.
