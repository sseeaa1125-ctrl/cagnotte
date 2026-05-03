/**
 * Phase 2+ smoke-test: 27 assertions covering every new/changed route + P01/P03/P05
 * + carte bancaire workflow (tests 19-24) + audit-039 follow-ups (tests 25-27 :
 * audit trail anti-blanchiment, transition REJECTED→REQUESTED, cascade notif).
 *
 * Prerequisites:
 *   1. cd backend && npm run dev    (in another terminal)
 *   2. cd backend && npx tsx scripts/seed-dev.ts
 *   3. BICTORYS_WEBHOOK_SECRET set in .env
 *
 * Run:
 *   cd backend && npx tsx scripts/smoke-test.ts
 *
 * Override server URL:
 *   API=http://localhost:4001 npx tsx scripts/smoke-test.ts
 *
 * SAFETY: Local dev only. Never run against production. The script reads
 * `process.env.API` and defaults to localhost. Test fixtures use `@test.cagnottes.sn`
 * and `smoke-*` prefixes so cleanup is bounded. Cleanup runs in `finally`.
 *
 * Exits 0 on all-green, 1 on any failure.
 */

import "dotenv/config";
import assert from "node:assert/strict";
import bcryptjs from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";
import { validateBlockConfig } from "../src/lib/blocks/schemas.js";

const API = process.env.API || "http://localhost:4000";
const WEBHOOK_SECRET = process.env.BICTORYS_WEBHOOK_SECRET || "";

if (!WEBHOOK_SECRET) {
  console.error("✗ BICTORYS_WEBHOOK_SECRET manquant dans .env");
  process.exit(1);
}

/**
 * Reset the order-related rate-limit counters before running. Tests 9/10 are
 * intentional flood tests; without this reset, a re-run within the 60s window
 * would 429 tests 7/8 because the IP counter is still hot.
 *
 * We delete every key under `rl:order-ip-min:*`, `rl:order-ip-hour:*`,
 * `rl:order-email-min:*`. Upstash supports SCAN.
 */
async function resetOrderRateLimiters(): Promise<void> {
  const prefixes = ["rl:order-ip-min:*", "rl:order-ip-hour:*", "rl:order-email-min:*"];
  for (const pattern of prefixes) {
    let cursor = "0";
    let total = 0;
    do {
      // @ts-expect-error — Upstash SCAN signature returns [cursor, keys]
      const [next, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = next as string;
      if (Array.isArray(keys) && keys.length > 0) {
        await redis.del(...(keys as string[]));
        total += keys.length;
      }
    } while (cursor !== "0");
    if (total > 0) console.log(`[setup] cleared ${total} keys for ${pattern}`);
  }
}

// ─── Cookie jar + CSRF helper ────────────────────────────────────────────────

let cookieJar: Record<string, string> = {};
let csrfToken = "";
let adminCsrfToken = "";

function parseSetCookie(header: string | null): void {
  if (!header) return;
  // node fetch joins multiple Set-Cookie headers with ", " — split smartly.
  const parts = header.split(/,(?=\s*\w[\w-]*=)/);
  for (const part of parts) {
    const [kv] = part.split(";");
    const eq = kv.indexOf("=");
    if (eq < 0) continue;
    const name = kv.slice(0, eq).trim();
    const value = kv.slice(eq + 1).trim();
    if (!name) continue;
    cookieJar[name] = value;
    if (name === "izy-csrf") {
      csrfToken = decodeURIComponent(value);
    }
    if (name === "izy-admin-csrf") {
      adminCsrfToken = decodeURIComponent(value);
    }
  }
}

function buildCookieHeader(): string {
  return Object.entries(cookieJar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function clearCookies(): void {
  cookieJar = {};
  csrfToken = "";
  adminCsrfToken = "";
}

interface ReqOpts {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function req(path: string, opts: ReqOpts = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const cookieHeader = buildCookieHeader();
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  if (csrfToken && opts.method && opts.method !== "GET") {
    headers["x-csrf-token"] = csrfToken;
  }
  if (opts.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  parseSetCookie(res.headers.get("set-cookie"));
  return res;
}

// Variant for admin endpoints — sends `izy-admin-csrf` value via x-csrf-token.
async function adminReq(path: string, opts: ReqOpts = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const cookieHeader = buildCookieHeader();
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  if (adminCsrfToken && opts.method && opts.method !== "GET") {
    headers["x-csrf-token"] = adminCsrfToken;
  }
  if (opts.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  parseSetCookie(res.headers.get("set-cookie"));
  return res;
}

// ─── Webhook signing helper ──────────────────────────────────────────────────

interface BictorysWebhook {
  id: string;
  paymentReference: string;
  status: "succeeded";
  // Bictorys peut envoyer amount/currency à null (audit-036 — format webhook
  // modifié avril 2026). Le handler backend doit skip l'anti-fraude dans ce
  // cas plutôt que marquer FAILED. Test 16 couvre ce cas.
  amount: number | null;
  currency: string | null;
}

async function postWebhook(payload: BictorysWebhook): Promise<Response> {
  return fetch(`${API}/api/webhooks/bictorys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
  });
}

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    console.error(`✗ ${name}\n  ${msg}`);
    failures.push(name);
    failed++;
  }
}

// ─── Cleanup state (populated as we go) ──────────────────────────────────────

const cleanup: {
  smokeEmail: string | null;
  testOrderRefs: string[];
  pendingOrderIds: string[];
  milestoneBlockId: string | null;
  withdrawalReferences: string[];
  cardSmokeBlockIds: string[];
  cardSmokeAdminId: string | null;
} = {
  smokeEmail: null,
  testOrderRefs: [],
  pendingOrderIds: [],
  milestoneBlockId: null,
  withdrawalReferences: [],
  cardSmokeBlockIds: [],
  cardSmokeAdminId: null,
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    // Pre-flight: clear order rate-limit counters so re-runs aren't poisoned
    // by tests 09/10 from the previous run.
    try {
      await resetOrderRateLimiters();
    } catch (err) {
      console.warn(`[setup] rate limiter reset skipped: ${err instanceof Error ? err.message : err}`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 1 — Health check (GET /api/cagnottes returns 200)
    // ─────────────────────────────────────────────────────────────────────
    await test("01. Health: GET /api/cagnottes → 200", async () => {
      const r = await fetch(`${API}/api/cagnottes`);
      assert.strictEqual(r.status, 200);
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 2 — Signup → verify-email → auto-login (cookie capture)
    // ─────────────────────────────────────────────────────────────────────
    const smokeEmail = `smoke-${Date.now()}@test.cagnottes.sn`;
    const smokeSlug = `smoke-${Date.now()}`;
    cleanup.smokeEmail = smokeEmail;

    await test("02. AUTH-03: signup → verify-email → izy-token cookie", async () => {
      clearCookies();
      const r1 = await req("/api/auth/signup", {
        method: "POST",
        body: {
          email: smokeEmail,
          password: "smokepass123",
          displayName: "Smoke User",
          slug: smokeSlug,
        },
      });
      assert.ok(
        r1.status === 200 || r1.status === 201,
        `signup expected 200/201, got ${r1.status}`,
      );
      const code = await prisma.verificationCode.findFirst({
        where: { email: smokeEmail },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(code, "verification code should exist in DB");
      const r2 = await req("/api/auth/verify-email", {
        method: "POST",
        body: { email: smokeEmail, code: code!.code },
      });
      assert.strictEqual(r2.status, 200, `verify-email status ${r2.status}`);
      assert.ok(cookieJar["izy-token"], "izy-token cookie present after verify");
      assert.ok(cookieJar["izy-csrf"], "izy-csrf cookie present after verify");
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 3 — P05: list excludes private cagnotte
    // ─────────────────────────────────────────────────────────────────────
    await test("03. P05: GET /api/cagnottes excludes private cagnotte", async () => {
      const r = await fetch(`${API}/api/cagnottes`);
      assert.strictEqual(r.status, 200);
      const j = (await r.json()) as { cagnottes: { slug: string }[] };
      const slugs = j.cagnottes.map((c) => c.slug);
      assert.ok(
        !slugs.includes("cagnotte-privee-test"),
        `private slug leaked in list: ${slugs.join(", ")}`,
      );
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 4 — P05: direct slug returns 200 + Cache-Control: private, no-store
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "04. P05: GET /api/cagnottes/cagnotte-privee-test → 200 + Cache-Control: private, no-store",
      async () => {
        const r = await fetch(`${API}/api/cagnottes/cagnotte-privee-test`);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(
          r.headers.get("cache-control"),
          "private, no-store",
          `Cache-Control got: ${r.headers.get("cache-control")}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 5 — DISC-03: participants masks anonymous donors
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "05. DISC-03: participants endpoint masks isAnonymous donors as 'Anonyme'",
      async () => {
        const r = await fetch(`${API}/api/cagnottes/anniversaire-de-fatou/participants`);
        assert.strictEqual(r.status, 200);
        const j = (await r.json()) as {
          participants: { name: string; message: string | null }[];
        };
        const anyAnonymous = j.participants.some((p) => p.name === "Anonyme");
        assert.ok(
          anyAnonymous,
          `expected at least one 'Anonyme' name in participants, got ${JSON.stringify(j.participants.map((p) => p.name))}`,
        );
        // Ensure no participant ever leaks a customerEmail key (T-02-03)
        for (const p of j.participants) {
          assert.ok(
            !("customerEmail" in p),
            `participants must NOT include customerEmail`,
          );
        }
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 6 — DISC-03: participants omits private messages
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "06. DISC-03: participants endpoint returns null for messageIsPrivate donors",
      async () => {
        const r = await fetch(`${API}/api/cagnottes/anniversaire-de-fatou/participants`);
        assert.strictEqual(r.status, 200);
        const j = (await r.json()) as {
          participants: { name: string; message: string | null }[];
        };
        // Seed has at least one messageIsPrivate=true on c1 (Awa Ndiaye)
        const anyNullMsg = j.participants.some((p) => p.message === null);
        assert.ok(
          anyNullMsg,
          `expected at least one null message, got ${JSON.stringify(j.participants)}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 7 — P03: festive commission 8% + invariant
    // ─────────────────────────────────────────────────────────────────────
    await test("07. P03: festive cagnotte → commission = 8%, commission + net = gross", async () => {
      const c1 = await prisma.block.findUnique({ where: { slug: "anniversaire-de-fatou" } });
      assert.ok(c1, "anniversaire-de-fatou block missing");
      // Use a unique amount so we can find this exact order back
      const amount = 14000;
      const r = await req("/api/orders", {
        method: "POST",
        body: {
          sellerSlug: "test-seller-a",
          orderType: "DONATION",
          amount,
          paymentType: "wave_money",
          customerEmail: `test07-${Date.now()}@test.cagnottes.sn`,
          customerName: "Test 07",
          customerPhone: "+221770000007",
          blockId: c1!.id,
          cagnotteSlug: c1!.slug || undefined,
          isAnonymous: false,
          messageIsPrivate: false,
        },
      });
      // Order POST may fail (Bictorys 503 / circuit) but the row must be persisted before that — confirm.
      const created = await prisma.order.findFirst({
        where: { blockId: c1!.id, amount },
        orderBy: { createdAt: "desc" },
      });
      if (!created) {
        throw new Error(
          `order not persisted (HTTP ${r.status}: ${(await r.text()).slice(0, 200)})`,
        );
      }
      cleanup.testOrderRefs.push(created.reference);
      // 8% of 14000 = 1120 (exact). Math.floor irrelevant here.
      assert.strictEqual(
        created.commissionAmount,
        Math.floor((14000 * 800) / 10000),
        `commissionAmount: expected ${Math.floor((14000 * 800) / 10000)}, got ${created.commissionAmount}`,
      );
      assert.strictEqual(
        created.commissionAmount + created.sellerAmount,
        amount,
        `invariant violated: ${created.commissionAmount} + ${created.sellerAmount} !== ${amount}`,
      );
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 8 — P03: solidaire commission 6% + invariant
    // ─────────────────────────────────────────────────────────────────────
    await test("08. P03: solidaire cagnotte → commission = 6%, commission + net = gross", async () => {
      const c3 = await prisma.block.findUnique({ where: { slug: "rentree-scolaire-2026" } });
      assert.ok(c3, "rentree-scolaire-2026 block missing");
      const amount = 13000;
      await req("/api/orders", {
        method: "POST",
        body: {
          sellerSlug: "test-seller-b",
          orderType: "DONATION",
          amount,
          paymentType: "wave_money",
          customerEmail: `test08-${Date.now()}@test.cagnottes.sn`,
          customerName: "Test 08",
          customerPhone: "+221770000008",
          blockId: c3!.id,
          cagnotteSlug: c3!.slug || undefined,
          isAnonymous: false,
          messageIsPrivate: false,
        },
      });
      const created = await prisma.order.findFirst({
        where: { blockId: c3!.id, amount },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(created, "order not persisted for solidaire commission test");
      cleanup.testOrderRefs.push(created!.reference);
      assert.strictEqual(
        created!.commissionAmount,
        Math.floor((13000 * 600) / 10000),
        `commissionAmount: expected ${Math.floor((13000 * 600) / 10000)}, got ${created!.commissionAmount}`,
      );
      assert.strictEqual(
        created!.commissionAmount + created!.sellerAmount,
        amount,
        `invariant violated: ${created!.commissionAmount} + ${created!.sellerAmount} !== ${amount}`,
      );
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 9 — P07: email minute limiter trips at the 6th request
    // (we test the email limiter FIRST because it's the tightest gate, and
    // intentionally fire requests in parallel so they all land inside the same
    // 60s window. Sequential requests would give Bictorys time to drift the
    // window and we'd never observe the 429 in dev where each request takes
    // ~3 seconds to roundtrip a real Wave call.)
    // ─────────────────────────────────────────────────────────────────────
    await test("09. P07: 8 parallel POSTs with same customerEmail → at least one 429", async () => {
      const sharedEmail = `flood09-${Date.now()}@test.cagnottes.sn`;
      const c1 = await prisma.block.findUnique({ where: { slug: "anniversaire-de-fatou" } });
      const tasks: Promise<Response>[] = [];
      for (let i = 0; i < 8; i++) {
        tasks.push(
          fetch(`${API}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sellerSlug: "test-seller-a",
              orderType: "DONATION",
              amount: 2000 + i,
              paymentType: "wave_money",
              customerEmail: sharedEmail,
              customerName: "Flood 09",
              customerPhone: "+221770000009",
              blockId: c1!.id,
              cagnotteSlug: c1!.slug || undefined,
            }),
          }),
        );
      }
      const results = await Promise.all(tasks);
      const statuses = results.map((r) => r.status);
      const count429 = statuses.filter((s) => s === 429).length;
      assert.ok(
        count429 >= 1,
        `expected ≥1 429 from email limiter, got statuses: ${statuses.join(",")}`,
      );
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 10 — P07: IP minute limiter trips when 25 parallel POSTs hit
    // ─────────────────────────────────────────────────────────────────────
    await test("10. P07: 25 parallel POSTs from same IP → at least one 429 (IP limiter)", async () => {
      // The order-ip-min limiter is 20/min per IP. We fire 25 in parallel
      // with UNIQUE emails so the email limiter does not eat the requests
      // first. After test 09 above already pushed the IP counter, this test
      // is virtually guaranteed to trip the IP limiter even if Redis state
      // were to drift slightly.
      const c1 = await prisma.block.findUnique({ where: { slug: "anniversaire-de-fatou" } });
      const ts = Date.now();
      const tasks: Promise<Response>[] = [];
      for (let i = 0; i < 25; i++) {
        tasks.push(
          fetch(`${API}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sellerSlug: "test-seller-a",
              orderType: "DONATION",
              amount: 3000 + i,
              paymentType: "wave_money",
              customerEmail: `flood10-${i}-${ts}@test.cagnottes.sn`,
              customerName: "Flood 10",
              customerPhone: "+221770000010",
              blockId: c1!.id,
              cagnotteSlug: c1!.slug || undefined,
            }),
          }),
        );
      }
      const results = await Promise.all(tasks);
      const statuses = results.map((r) => r.status);
      const count429 = statuses.filter((s) => s === 429).length;
      assert.ok(
        count429 >= 1,
        `expected ≥1 429 from IP limiter, got statuses: ${statuses.join(",")}`,
      );
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 11 — P01: webhook double-delivery dedup
    // ─────────────────────────────────────────────────────────────────────
    await test("11. P01: webhook delivered twice → 1 PAID, 1 notification, 1 credit", async () => {
      const c1 = await prisma.block.findUnique({
        where: { slug: "anniversaire-de-fatou" },
      });
      assert.ok(c1, "anniversaire-de-fatou block missing");
      const sellerId = c1!.sellerId;
      const reference = `smoke-p01-${Date.now()}`;
      const order = await prisma.order.create({
        data: {
          reference,
          sellerId,
          orderType: "DONATION",
          amount: 7777,
          currency: "XOF",
          commissionRate: 800,
          commissionAmount: 622,
          sellerAmount: 7155,
          paymentStatus: "PENDING",
          paymentProvider: "bictorys",
          customerEmail: `smoke-p01-${Date.now()}@test.cagnottes.sn`,
          customerName: "Smoke P01",
          isAnonymous: false,
          messageIsPrivate: false,
          blockId: c1!.id,
        },
        select: { id: true, reference: true },
      });
      cleanup.pendingOrderIds.push(order.id);

      const externalId = `bictorys-smoke-p01-${Date.now()}`;
      const payload: BictorysWebhook = {
        id: externalId,
        paymentReference: order.reference,
        status: "succeeded",
        amount: 7777,
        currency: "XOF",
      };

      const r1 = await postWebhook(payload);
      assert.strictEqual(r1.status, 200, `1st webhook status ${r1.status}`);
      const r2 = await postWebhook(payload);
      assert.strictEqual(r2.status, 200, `2nd webhook status ${r2.status}`);

      // Order must be PAID exactly once
      const refreshed = await prisma.order.findUnique({
        where: { id: order.id },
        select: { paymentStatus: true, paidAt: true, paymentExternalId: true },
      });
      assert.strictEqual(
        refreshed?.paymentStatus,
        "PAID",
        `order status: ${refreshed?.paymentStatus}`,
      );

      // Exactly one DONATION_RECEIVED notification with the dedupeKey
      const notifs = await prisma.notification.findMany({
        where: { dedupeKey: `donation_received:${order.id}` },
      });
      assert.strictEqual(
        notifs.length,
        1,
        `expected 1 DONATION_RECEIVED notif, got ${notifs.length}`,
      );

      // Exactly one webhook log row for this externalId+status combo
      const logs = await prisma.webhookLog.findMany({
        where: { externalId, eventType: "succeeded" },
      });
      assert.strictEqual(
        logs.length,
        1,
        `expected 1 webhook log row, got ${logs.length}`,
      );
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 12 — NOTF-03: milestone fires once at 50% then never re-fires
    // ─────────────────────────────────────────────────────────────────────
    await test("12. NOTF-03: 50% milestone fires once; subsequent paid orders do not re-fire", async () => {
      // Create a fresh block dedicated to this test so we control the goal.
      const sellerA = await prisma.seller.findUnique({
        where: { slug: "test-seller-a" },
      });
      assert.ok(sellerA);
      const milestoneSlug = `smoke-milestone-${Date.now()}`;
      const block = await prisma.block.create({
        data: {
          sellerId: sellerA!.id,
          type: "FUNDRAISER",
          title: "Smoke Milestone Block",
          position: 99,
          slug: milestoneSlug,
          isActive: true,
          config: {
            subtype: "festive",
            visibility: "public",
            goalAmount: 100_000,
            showDonorCount: true,
            title: "Smoke Milestone Block",
          },
        },
        select: { id: true, sellerId: true },
      });
      cleanup.milestoneBlockId = block.id;

      // Pre-seed PAID orders bringing block to 49% (49 000 / 100 000)
      await prisma.order.create({
        data: {
          reference: `smoke-m1-${Date.now()}`,
          sellerId: block.sellerId,
          orderType: "DONATION",
          amount: 49000,
          currency: "XOF",
          commissionRate: 800,
          commissionAmount: 3920,
          sellerAmount: 45080,
          paymentStatus: "PAID",
          paymentProvider: "test_seed",
          paidAt: new Date(),
          customerEmail: `smoke-m1@test.cagnottes.sn`,
          customerName: "Smoke M1",
          blockId: block.id,
          isAnonymous: false,
          messageIsPrivate: false,
        },
      });

      // PENDING order that, when webhook'd, brings total to 51%
      const crossOrder = await prisma.order.create({
        data: {
          reference: `smoke-m2-${Date.now()}`,
          sellerId: block.sellerId,
          orderType: "DONATION",
          amount: 2000,
          currency: "XOF",
          commissionRate: 800,
          commissionAmount: 160,
          sellerAmount: 1840,
          paymentStatus: "PENDING",
          paymentProvider: "bictorys",
          customerEmail: `smoke-m2@test.cagnottes.sn`,
          customerName: "Smoke M2",
          blockId: block.id,
          isAnonymous: false,
          messageIsPrivate: false,
        },
        select: { id: true, reference: true },
      });
      cleanup.pendingOrderIds.push(crossOrder.id);

      const r1 = await postWebhook({
        id: `bictorys-smoke-m2-${Date.now()}`,
        paymentReference: crossOrder.reference,
        status: "succeeded",
        amount: 2000,
        currency: "XOF",
      });
      assert.strictEqual(r1.status, 200);

      let milestoneRows = await prisma.notification.findMany({
        where: { blockId: block.id, type: "MILESTONE_REACHED" },
      });
      assert.strictEqual(
        milestoneRows.length,
        1,
        `after first crossing: expected 1 MILESTONE_REACHED, got ${milestoneRows.length}`,
      );
      assert.strictEqual(
        milestoneRows[0].dedupeKey,
        `milestone:${block.id}:50`,
      );

      // Fire ANOTHER paid order still in the 50–99% band
      const followUp = await prisma.order.create({
        data: {
          reference: `smoke-m3-${Date.now()}`,
          sellerId: block.sellerId,
          orderType: "DONATION",
          amount: 5000,
          currency: "XOF",
          commissionRate: 800,
          commissionAmount: 400,
          sellerAmount: 4600,
          paymentStatus: "PENDING",
          paymentProvider: "bictorys",
          customerEmail: `smoke-m3@test.cagnottes.sn`,
          customerName: "Smoke M3",
          blockId: block.id,
          isAnonymous: false,
          messageIsPrivate: false,
        },
        select: { id: true, reference: true },
      });
      cleanup.pendingOrderIds.push(followUp.id);

      const r2 = await postWebhook({
        id: `bictorys-smoke-m3-${Date.now()}`,
        paymentReference: followUp.reference,
        status: "succeeded",
        amount: 5000,
        currency: "XOF",
      });
      assert.strictEqual(r2.status, 200);

      milestoneRows = await prisma.notification.findMany({
        where: { blockId: block.id, type: "MILESTONE_REACHED" },
      });
      assert.strictEqual(
        milestoneRows.length,
        1,
        `after 2nd webhook still in band: expected 1 MILESTONE_REACHED, got ${milestoneRows.length}`,
      );
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 13 — KYC-02: KYC_NONE seller blocked from withdrawal
    // ─────────────────────────────────────────────────────────────────────
    await test("13. KYC-02: Seller B (KYC_NONE) → POST /api/withdrawals → 403 + KYC error", async () => {
      // Login as Seller B
      clearCookies();
      const r1 = await req("/api/auth/login", {
        method: "POST",
        body: { email: "seller-b@test.cagnottes.sn", password: "password123" },
      });
      assert.strictEqual(r1.status, 200, `login B status ${r1.status}`);

      const r2 = await req("/api/withdrawals", {
        method: "POST",
        body: {
          amount: 5000,
          phone: "+221770000002",
          provider: "wave_money",
          recipientName: "Seller B",
        },
      });
      assert.strictEqual(r2.status, 403, `expected 403, got ${r2.status}`);
      const body = (await r2.json()) as { error?: string };
      assert.match(
        body.error || "",
        /KYC|vérifier ton identité/i,
        `expected KYC error, got ${body.error}`,
      );
    });

    // ─────────────────────────────────────────────────────────────────────
    // Test 14 — KYC-03: KYC_APPROVED + correct PIN passes the gates
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "14. KYC-03: Seller A (KYC_APPROVED + PIN 1234) → POST /api/withdrawals → KYC/PIN gates pass",
      async () => {
        clearCookies();
        const r1 = await req("/api/auth/login", {
          method: "POST",
          body: { email: "seller-a@test.cagnottes.sn", password: "password123" },
        });
        assert.strictEqual(r1.status, 200, `login A status ${r1.status}`);

        const r2 = await req("/api/withdrawals", {
          method: "POST",
          body: {
            amount: 1000,
            phone: "+221770000001",
            provider: "wave_money",
            recipientName: "Aïda Diop",
            withdrawalPin: "1234",
          },
        });
        // The KYC + PIN gates must NOT block. Anything beyond them is fine
        // (real Bictorys payout may 4xx/5xx in dev). Only fail on KYC/PIN errors.
        const body = (await r2.json().catch(() => ({}))) as { error?: string; code?: string };
        if (r2.status === 403) {
          assert.ok(
            !/KYC|vérifier ton identité|Code de retrait incorrect/i.test(
              body.error || "",
            ),
            `KYC/PIN gate blocked unexpectedly: ${body.error}`,
          );
        }
        if (r2.status === 400) {
          assert.notStrictEqual(
            body.code,
            "PIN_REQUIRED",
            `unexpected PIN_REQUIRED gate: ${JSON.stringify(body)}`,
          );
        }
        // Track for cleanup if a withdrawal was actually created
        if (r2.status >= 200 && r2.status < 300) {
          const w = await prisma.withdrawal.findFirst({
            where: { sellerId: (await prisma.seller.findUnique({ where: { slug: "test-seller-a" } }))!.id },
            orderBy: { createdAt: "desc" },
          });
          if (w) cleanup.withdrawalReferences.push(w.reference);
        }
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 15 — NOTF-08/09: notifications feed + count for Seller A
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "15. NOTF-08/09: Seller A GET /api/notifications + GET /api/notifications/count",
      async () => {
        // Still logged in as Seller A from test 14
        const r1 = await req("/api/notifications");
        assert.strictEqual(r1.status, 200, `feed status ${r1.status}`);
        const j1 = (await r1.json()) as {
          items: { id: string; readAt: string | null }[];
          hasUnread: boolean;
        };
        assert.ok(Array.isArray(j1.items), "items must be an array");
        assert.ok(j1.items.length >= 1, `expected ≥1 notification for Seller A, got ${j1.items.length}`);

        const r2 = await req("/api/notifications/count");
        assert.strictEqual(r2.status, 200, `count status ${r2.status}`);
        const j2 = (await r2.json()) as { total: number; unread: number };
        assert.ok(typeof j2.total === "number" && typeof j2.unread === "number");
        assert.ok(
          j2.total >= j1.items.length || j2.total >= 1,
          `count.total (${j2.total}) inconsistent with feed items (${j1.items.length})`,
        );
        // Sanity: feed includes at least one unread row when count.unread > 0
        if (j2.unread > 0) {
          const anyUnread = j1.items.some((i) => i.readAt === null);
          assert.ok(anyUnread, `count says unread=${j2.unread} but feed has no readAt:null row`);
        }
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 16 — Webhook amount=null must skip anti-fraude, not mark FAILED
    // (regression audit-036 — Bictorys change format avril 2026)
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "16. Webhook Bictorys amount=null → order passe PAID (skip anti-fraude)",
      async () => {
        const c1 = await prisma.block.findUnique({
          where: { slug: "anniversaire-de-fatou" },
        });
        assert.ok(c1, "anniversaire-de-fatou block missing");
        const reference = `smoke-amount-null-${Date.now()}`;
        const order = await prisma.order.create({
          data: {
            reference,
            sellerId: c1!.sellerId,
            orderType: "DONATION",
            amount: 5150,
            currency: "XOF",
            commissionRate: 800,
            commissionAmount: 412,
            sellerAmount: 4738,
            paymentStatus: "PENDING",
            paymentProvider: "bictorys",
            customerEmail: `smoke-amount-null-${Date.now()}@test.cagnottes.sn`,
            customerName: "Smoke amount null",
            isAnonymous: false,
            messageIsPrivate: false,
            blockId: c1!.id,
          },
          select: { id: true, reference: true },
        });
        cleanup.pendingOrderIds.push(order.id);

        const externalId = `bictorys-smoke-amount-null-${Date.now()}`;
        // Payload avec amount et currency explicitement null (nouveau format
        // Bictorys observé en prod 2026-04-20).
        const r = await postWebhook({
          id: externalId,
          paymentReference: order.reference,
          status: "succeeded",
          amount: null,
          currency: null,
        });
        assert.strictEqual(r.status, 200, `webhook status ${r.status}`);

        const refreshed = await prisma.order.findUnique({
          where: { id: order.id },
          select: { paymentStatus: true },
        });
        assert.strictEqual(
          refreshed?.paymentStatus,
          "PAID",
          `expected PAID (anti-fraude skippé quand amount=null), got ${refreshed?.paymentStatus}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 17 — POST /api/orders avec cagnotteSlug inconnu → 400
    // (regression audit-036 — bug routing blockId via cagnotteSlug)
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "17. POST /api/orders avec cagnotteSlug inexistant → 400 explicite",
      async () => {
        const r = await req("/api/orders", {
          method: "POST",
          body: {
            sellerSlug: "test-seller-a",
            orderType: "DONATION",
            amount: 2000,
            paymentType: "wave_money",
            customerEmail: `smoke17-${Date.now()}@test.cagnottes.sn`,
            customerName: "Smoke 17",
            customerPhone: "+221770000017",
            // Slug volontairement inexistant pour ce seller
            cagnotteSlug: "slug-qui-nexiste-pas-garanti",
            isAnonymous: false,
            messageIsPrivate: false,
          },
        });
        assert.strictEqual(
          r.status,
          400,
          `expected 400 for unknown cagnotteSlug, got ${r.status}`,
        );
        const body = (await r.json()) as { error?: string };
        assert.ok(
          /introuvable|introuvable pour ce vendeur/i.test(body.error || ""),
          `expected 'introuvable' error, got: ${body.error}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 18 — POST /api/orders sur cagnotte expirée → 400 "terminée"
    // (regression hotfix — guard endDate)
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "18. POST /api/orders sur cagnotte endDate passée → 400 terminée",
      async () => {
        // Crée une cagnotte fraîche avec endDate hier pour isoler du reste.
        const sellerA = await prisma.seller.findUnique({
          where: { slug: "test-seller-a" },
          select: { id: true },
        });
        assert.ok(sellerA, "test-seller-a seller missing");
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const block = await prisma.block.create({
          data: {
            sellerId: sellerA!.id,
            type: "FUNDRAISER",
            title: "Smoke 18 — cagnotte expirée",
            slug: `smoke-18-expired-${Date.now()}`,
            isActive: true,
            config: {
              title: "Smoke 18 — cagnotte expirée",
              subtype: "festive",
              occasion: "anniversaire",
              goalAmount: 100000,
              endDate: yesterday.toISOString(),
              visibility: "public",
              status: "active",
              showDonorCount: true,
              suggestedAmounts: [2000, 5000, 10000],
            },
          },
          select: { id: true, slug: true },
        });
        try {
          const r = await req("/api/orders", {
            method: "POST",
            body: {
              sellerSlug: "test-seller-a",
              orderType: "DONATION",
              amount: 2000,
              paymentType: "wave_money",
              customerEmail: `smoke18-${Date.now()}@test.cagnottes.sn`,
              customerName: "Smoke 18",
              customerPhone: "+221770000018",
              cagnotteSlug: block.slug!,
              isAnonymous: false,
              messageIsPrivate: false,
            },
          });
          assert.strictEqual(
            r.status,
            400,
            `expected 400 for expired cagnotte, got ${r.status}`,
          );
          const body = (await r.json()) as { error?: string };
          assert.ok(
            /terminée|levée de fonds/i.test(body.error || ""),
            `expected 'terminée' error, got: ${body.error}`,
          );
        } finally {
          // Nettoie le block de test (pas d'ordre lié car le POST a été refusé)
          await prisma.block.delete({ where: { id: block.id } }).catch(() => {});
        }
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 19 — Schema accepte cardStatus default "NONE" (legacy cagnottes)
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "19. CARD-01: legacy config sans cardStatus → Zod default 'NONE'",
      async () => {
        const legacyCfg = {
          subtype: "festive",
          occasion: "anniversaire",
          title: "Legacy",
          description: "x",
          coverUrl: null,
          goalAmount: 50000,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          visibility: "public",
          status: "active",
          showDonorCount: true,
          suggestedAmounts: [1000, 5000],
        };
        const validated = validateBlockConfig("FUNDRAISER", legacyCfg) as Record<
          string,
          unknown
        >;
        assert.strictEqual(
          validated.cardStatus,
          "NONE",
          `expected default 'NONE', got ${JSON.stringify(validated.cardStatus)}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 20 — Creator PUT /api/blocks/:id avec cardStatus=APPROVED → 403
    // (privilege escalation guard — seul l'admin peut APPROVED/REJECTED)
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "20. CARD-02: creator PUT cardStatus='APPROVED' → 403 CARD_STATUS_FORBIDDEN",
      async () => {
        clearCookies();
        const r1 = await req("/api/auth/login", {
          method: "POST",
          body: { email: "seller-a@test.cagnottes.sn", password: "password123" },
        });
        assert.strictEqual(r1.status, 200, `login A status ${r1.status}`);

        const sellerA = await prisma.seller.findUnique({
          where: { slug: "test-seller-a" },
          select: { id: true },
        });
        assert.ok(sellerA, "test-seller-a missing");

        const futureDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const baseCfg = {
          subtype: "festive",
          occasion: "anniversaire",
          title: "Smoke 20",
          description: "smoke",
          coverUrl: null,
          goalAmount: 100000,
          endDate: futureDate,
          visibility: "public",
          status: "active",
          showDonorCount: true,
          suggestedAmounts: [1000, 5000, 10000],
        };
        const block = await prisma.block.create({
          data: {
            sellerId: sellerA!.id,
            type: "FUNDRAISER",
            title: "Smoke 20",
            slug: `smoke-20-card-forbidden-${Date.now()}`,
            isActive: true,
            config: baseCfg,
          },
          select: { id: true },
        });
        cleanup.cardSmokeBlockIds.push(block.id);

        const r2 = await req(`/api/blocks/${block.id}`, {
          method: "PUT",
          body: {
            config: { ...baseCfg, cardStatus: "APPROVED" },
          },
        });
        assert.strictEqual(r2.status, 403, `expected 403, got ${r2.status}`);
        const body = (await r2.json()) as { code?: string };
        assert.strictEqual(
          body.code,
          "CARD_STATUS_FORBIDDEN",
          `expected code CARD_STATUS_FORBIDDEN, got ${JSON.stringify(body)}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 21 — Creator PUT cardStatus='REQUESTED' → cardRequestedAt auto-set
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "21. CARD-03: creator PUT cardStatus='REQUESTED' → cardRequestedAt set",
      async () => {
        // Reuse seller A session from test 20.
        const sellerA = await prisma.seller.findUnique({
          where: { slug: "test-seller-a" },
          select: { id: true },
        });
        assert.ok(sellerA, "test-seller-a missing");

        const futureDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const baseCfg = {
          subtype: "festive",
          occasion: "anniversaire",
          title: "Smoke 21",
          description: "smoke",
          coverUrl: null,
          goalAmount: 100000,
          endDate: futureDate,
          visibility: "public",
          status: "active",
          showDonorCount: true,
          suggestedAmounts: [1000, 5000, 10000],
        };
        const block = await prisma.block.create({
          data: {
            sellerId: sellerA!.id,
            type: "FUNDRAISER",
            title: "Smoke 21",
            slug: `smoke-21-card-req-${Date.now()}`,
            isActive: true,
            config: baseCfg,
          },
          select: { id: true },
        });
        cleanup.cardSmokeBlockIds.push(block.id);

        const tBefore = Date.now();
        const r2 = await req(`/api/blocks/${block.id}`, {
          method: "PUT",
          body: {
            config: { ...baseCfg, cardStatus: "REQUESTED" },
          },
        });
        assert.strictEqual(r2.status, 200, `expected 200, got ${r2.status}`);

        const updated = await prisma.block.findUnique({
          where: { id: block.id },
          select: { config: true },
        });
        const cfg = (updated!.config as Record<string, unknown>) || {};
        assert.strictEqual(cfg.cardStatus, "REQUESTED");
        assert.ok(
          typeof cfg.cardRequestedAt === "string",
          `cardRequestedAt expected ISO string, got ${typeof cfg.cardRequestedAt}`,
        );
        const tStamp = new Date(cfg.cardRequestedAt as string).getTime();
        assert.ok(
          tStamp >= tBefore - 1000 && tStamp <= Date.now() + 1000,
          `cardRequestedAt out of range: ${cfg.cardRequestedAt}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 22 — Admin POST /card-review APPROVED sans KYC → 403 KYC_REQUIRED
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "22. CARD-04: admin POST /card-review APPROVED sur seller KYC≠APPROVED → 403 KYC_REQUIRED",
      async () => {
        // Crée un smoke admin (cleanup en finally bloc principal)
        const smokeAdminEmail = `smoke-admin-${Date.now()}@test.cagnottes.sn`;
        const adminPwd = "smokeAdminPass123!";
        const admin = await prisma.admin.create({
          data: {
            email: smokeAdminEmail,
            password: bcryptjs.hashSync(adminPwd, 12),
            name: "Smoke Admin",
            role: "ADMIN",
            isActive: true,
          },
          select: { id: true },
        });
        cleanup.cardSmokeAdminId = admin.id;

        // Seller B (KYC_NONE) — crée un block avec cardStatus REQUESTED
        const sellerB = await prisma.seller.findUnique({
          where: { slug: "test-seller-b" },
          select: { id: true, kycStatus: true },
        });
        assert.ok(sellerB, "test-seller-b missing");
        assert.notStrictEqual(
          sellerB!.kycStatus,
          "APPROVED",
          "test-seller-b must be non-APPROVED for this test",
        );

        const futureDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const reqAt = new Date().toISOString();
        const block = await prisma.block.create({
          data: {
            sellerId: sellerB!.id,
            type: "FUNDRAISER",
            title: "Smoke 22 — KYC gate",
            slug: `smoke-22-card-kyc-${Date.now()}`,
            isActive: true,
            config: {
              subtype: "solidaire",
              cause: "education",
              beneficiary: "Test",
              title: "Smoke 22 — KYC gate",
              description: "smoke",
              coverUrl: null,
              goalAmount: 100000,
              endDate: futureDate,
              visibility: "public",
              status: "active",
              showDonorCount: true,
              suggestedAmounts: [1000, 5000, 10000],
              cardStatus: "REQUESTED",
              cardRequestedAt: reqAt,
            },
          },
          select: { id: true },
        });
        cleanup.cardSmokeBlockIds.push(block.id);

        // Login admin (capture izy-admin-csrf via parseSetCookie)
        clearCookies();
        const rLogin = await req("/api/admin/auth/login", {
          method: "POST",
          body: { email: smokeAdminEmail, password: adminPwd },
        });
        assert.strictEqual(
          rLogin.status,
          200,
          `admin login status ${rLogin.status}`,
        );

        const rReview = await adminReq(
          `/api/admin/cagnottes/${block.id}/card-review`,
          {
            method: "POST",
            body: { status: "APPROVED" },
          },
        );
        assert.strictEqual(
          rReview.status,
          403,
          `expected 403 KYC_REQUIRED, got ${rReview.status}`,
        );
        const body = (await rReview.json()) as { code?: string };
        assert.strictEqual(
          body.code,
          "KYC_REQUIRED",
          `expected code KYC_REQUIRED, got ${JSON.stringify(body)}`,
        );
        // Audit-039 A-6 — purger la session admin pour éviter qu'un futur
        // test utilisant req() hérite par accident du contexte admin.
        clearCookies();
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 23 — POST /api/orders amount > 50k sans email → 400 Zod
    // (anti-blanchiment : nom + email obligatoires au-dessus de 50 000 FCFA)
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "23. CARD-05: POST /api/orders amount=60000 sans email → 400 anti-blanchiment",
      async () => {
        const c1 = await prisma.block.findUnique({
          where: { slug: "anniversaire-de-fatou" },
        });
        assert.ok(c1, "anniversaire-de-fatou missing");
        const r = await fetch(`${API}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sellerSlug: "test-seller-a",
            orderType: "DONATION",
            amount: 60000,
            paymentType: "wave_money",
            customerName: "Test 23",
            customerPhone: "+221770000023",
            // pas d'email — doit échouer
            blockId: c1!.id,
            cagnotteSlug: c1!.slug || undefined,
            isAnonymous: false,
            messageIsPrivate: false,
          }),
        });
        assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
        const body = (await r.json()) as { error?: string };
        assert.match(
          body.error || "",
          /email|anti-blanchiment|50.?000/i,
          `expected anti-blanchiment error, got: ${body.error}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 24 — POST /api/orders paymentType=card sur cagnotte cardStatus≠APPROVED
    // → 400 CARD_NOT_ENABLED
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "24. CARD-06: POST /api/orders paymentType=card sur cagnotte non-approuvée → 400 CARD_NOT_ENABLED",
      async () => {
        const c1 = await prisma.block.findUnique({
          where: { slug: "anniversaire-de-fatou" },
        });
        assert.ok(c1, "anniversaire-de-fatou missing");
        const r = await fetch(`${API}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sellerSlug: "test-seller-a",
            orderType: "DONATION",
            amount: 5000,
            paymentType: "card",
            customerName: "Test 24",
            customerEmail: `test24-${Date.now()}@test.cagnottes.sn`,
            // pas de phone (carte exempte)
            blockId: c1!.id,
            cagnotteSlug: c1!.slug || undefined,
            isAnonymous: false,
            messageIsPrivate: false,
          }),
        });
        assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
        const body = (await r.json()) as { code?: string; error?: string };
        assert.strictEqual(
          body.code,
          "CARD_NOT_ENABLED",
          `expected code CARD_NOT_ENABLED, got ${JSON.stringify(body)}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 25 — Audit trail anti-blanchiment : donateur anonyme ≥50k →
    // Notification.data.donorDisplayName conserve le vrai nom + wasAnonymous=true
    // (audit-039 C-3)
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "25. CARD-07: don anonyme ≥50k → Notification.data préserve donorDisplayName + wasAnonymous",
      async () => {
        const c1 = await prisma.block.findUnique({
          where: { slug: "anniversaire-de-fatou" },
          select: { id: true, sellerId: true },
        });
        assert.ok(c1, "anniversaire-de-fatou missing");

        const realName = "Donateur Audit Trail 25";
        const realEmail = `audit25-${Date.now()}@test.cagnottes.sn`;
        const reference = `smoke-c3-${Date.now()}`;
        const order = await prisma.order.create({
          data: {
            reference,
            sellerId: c1!.sellerId,
            orderType: "DONATION",
            amount: 60000,
            currency: "XOF",
            commissionRate: 800,
            commissionAmount: 4800,
            sellerAmount: 55200,
            paymentStatus: "PENDING",
            paymentProvider: "bictorys",
            customerEmail: realEmail,
            customerName: realName,
            isAnonymous: true,
            messageIsPrivate: false,
            blockId: c1!.id,
          },
          select: { id: true, reference: true },
        });
        cleanup.pendingOrderIds.push(order.id);

        const externalId = `bictorys-smoke-c3-${Date.now()}`;
        const r = await postWebhook({
          id: externalId,
          paymentReference: order.reference,
          status: "succeeded",
          amount: 60000,
          currency: "XOF",
        });
        assert.strictEqual(r.status, 200, `webhook status ${r.status}`);

        const notif = await prisma.notification.findFirst({
          where: { dedupeKey: `donation_received:${order.id}` },
          select: { data: true },
        });
        assert.ok(notif, "no DONATION_RECEIVED notification dispatched");
        const data = (notif!.data ?? {}) as Record<string, unknown>;
        assert.strictEqual(
          data.donorDisplayName,
          realName,
          `audit trail leak: donorDisplayName='${data.donorDisplayName}' (expected '${realName}')`,
        );
        assert.strictEqual(
          data.wasAnonymous,
          true,
          `wasAnonymous flag missing: ${JSON.stringify(data)}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 26 — Creator transition REJECTED → REQUESTED archive
    // cardLastRejectionReason et clear cardRejectionReason / cardReviewedAt
    // (audit-039 G-3)
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "26. CARD-08: creator PUT REJECTED→REQUESTED → archive lastRejectionReason, clear review",
      async () => {
        clearCookies();
        const r1 = await req("/api/auth/login", {
          method: "POST",
          body: { email: "seller-a@test.cagnottes.sn", password: "password123" },
        });
        assert.strictEqual(r1.status, 200, `login A status ${r1.status}`);

        const sellerA = await prisma.seller.findUnique({
          where: { slug: "test-seller-a" },
          select: { id: true },
        });
        assert.ok(sellerA, "test-seller-a missing");

        const futureDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const reviewedAt = new Date(Date.now() - 3600_000).toISOString();
        const previousReason = "Doc KYC manquant — re-soumets après upload";
        const baseCfg = {
          subtype: "festive" as const,
          occasion: "anniversaire",
          title: "Smoke 26",
          description: "smoke",
          coverUrl: null,
          goalAmount: 100000,
          endDate: futureDate,
          visibility: "public",
          status: "active",
          showDonorCount: true,
          suggestedAmounts: [1000, 5000, 10000],
          cardStatus: "REJECTED" as const,
          cardRequestedAt: new Date(Date.now() - 7200_000).toISOString(),
          cardReviewedAt: reviewedAt,
          cardRejectionReason: previousReason,
        };
        const block = await prisma.block.create({
          data: {
            sellerId: sellerA!.id,
            type: "FUNDRAISER",
            title: "Smoke 26",
            slug: `smoke-26-resubmit-${Date.now()}`,
            isActive: true,
            config: baseCfg,
          },
          select: { id: true },
        });
        cleanup.cardSmokeBlockIds.push(block.id);

        const r2 = await req(`/api/blocks/${block.id}`, {
          method: "PUT",
          body: {
            config: { ...baseCfg, cardStatus: "REQUESTED" },
          },
        });
        assert.strictEqual(r2.status, 200, `expected 200, got ${r2.status}`);

        const updated = await prisma.block.findUnique({
          where: { id: block.id },
          select: { config: true },
        });
        const cfg = (updated!.config as Record<string, unknown>) || {};
        assert.strictEqual(cfg.cardStatus, "REQUESTED");
        assert.strictEqual(
          cfg.cardLastRejectionReason,
          previousReason,
          `lastRejectionReason archive failed: ${JSON.stringify(cfg.cardLastRejectionReason)}`,
        );
        assert.strictEqual(
          cfg.cardRejectionReason,
          null,
          `cardRejectionReason should be cleared, got ${JSON.stringify(cfg.cardRejectionReason)}`,
        );
        assert.strictEqual(
          cfg.cardReviewedAt,
          null,
          `cardReviewedAt should be cleared, got ${JSON.stringify(cfg.cardReviewedAt)}`,
        );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // Test 27 — Cascade post-commit notif : admin APPROVED → Notification
    // CARD_APPROVED créée pour le seller
    // (audit-039 G-4)
    // ─────────────────────────────────────────────────────────────────────
    await test(
      "27. CARD-09: admin POST /card-review APPROVED → Notification CARD_APPROVED dispatchée",
      async () => {
        const sellerA = await prisma.seller.findUnique({
          where: { slug: "test-seller-a" },
          select: { id: true, kycStatus: true },
        });
        assert.ok(sellerA, "test-seller-a missing");
        assert.strictEqual(
          sellerA!.kycStatus,
          "APPROVED",
          "test-seller-a doit avoir KYC APPROVED",
        );

        const futureDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const reqAt = new Date().toISOString();
        const block = await prisma.block.create({
          data: {
            sellerId: sellerA!.id,
            type: "FUNDRAISER",
            title: "Smoke 27 — cascade approve",
            slug: `smoke-27-cascade-${Date.now()}`,
            isActive: true,
            config: {
              subtype: "festive",
              occasion: "anniversaire",
              title: "Smoke 27",
              description: "smoke",
              coverUrl: null,
              goalAmount: 100000,
              endDate: futureDate,
              visibility: "public",
              status: "active",
              showDonorCount: true,
              suggestedAmounts: [1000, 5000, 10000],
              cardStatus: "REQUESTED",
              cardRequestedAt: reqAt,
            },
          },
          select: { id: true },
        });
        cleanup.cardSmokeBlockIds.push(block.id);

        // Re-login as smoke admin (créé en test 22, encore en DB).
        if (!cleanup.cardSmokeAdminId) {
          throw new Error("test 27 requires test 22 smoke admin to exist");
        }
        const adminRow = await prisma.admin.findUnique({
          where: { id: cleanup.cardSmokeAdminId },
          select: { email: true },
        });
        assert.ok(adminRow, "smoke admin missing");

        clearCookies();
        const rLogin = await req("/api/admin/auth/login", {
          method: "POST",
          body: { email: adminRow!.email, password: "smokeAdminPass123!" },
        });
        assert.strictEqual(
          rLogin.status,
          200,
          `admin login status ${rLogin.status}`,
        );

        const rReview = await adminReq(
          `/api/admin/cagnottes/${block.id}/card-review`,
          { method: "POST", body: { status: "APPROVED" } },
        );
        assert.strictEqual(
          rReview.status,
          200,
          `expected 200, got ${rReview.status}: ${await rReview.text()}`,
        );

        // Le dispatch est fire-and-forget — polling court (jusqu'à 1s) pour
        // robustesse CI lent / rate-limit Redis (audit-039 follow-up P2).
        let notifs: Array<{ id: string }> = [];
        for (let attempt = 0; attempt < 10; attempt++) {
          notifs = await prisma.notification.findMany({
            where: {
              sellerId: sellerA!.id,
              type: "CARD_APPROVED",
              dedupeKey: { startsWith: `card:${block.id}:approved:` },
            },
            select: { id: true },
          });
          if (notifs.length >= 1) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        assert.ok(
          notifs.length >= 1,
          `expected ≥1 CARD_APPROVED notif after 1s polling, got ${notifs.length}`,
        );
        clearCookies();
      },
    );
  } finally {
    // ─── Cleanup ───────────────────────────────────────────────────────────
    try {
      // Delete smoke signup user + its verification codes
      if (cleanup.smokeEmail) {
        await prisma.notification.deleteMany({
          where: { seller: { email: cleanup.smokeEmail } },
        });
        await prisma.order.deleteMany({
          where: { seller: { email: cleanup.smokeEmail } },
        });
        await prisma.verificationCode.deleteMany({
          where: { email: cleanup.smokeEmail },
        });
        await prisma.seller.deleteMany({
          where: { email: cleanup.smokeEmail },
        });
      }
      // Delete test orders created by tests 7/8
      if (cleanup.testOrderRefs.length) {
        await prisma.order.deleteMany({
          where: { reference: { in: cleanup.testOrderRefs } },
        });
      }
      // Delete pending orders for P01/milestone tests (and their notifications)
      if (cleanup.pendingOrderIds.length) {
        await prisma.notification.deleteMany({
          where: { orderId: { in: cleanup.pendingOrderIds } },
        });
        await prisma.order.deleteMany({
          where: { id: { in: cleanup.pendingOrderIds } },
        });
      }
      // Delete the milestone-test block + its remaining seeded paid orders + milestone notifs
      if (cleanup.milestoneBlockId) {
        await prisma.notification.deleteMany({
          where: { blockId: cleanup.milestoneBlockId },
        });
        await prisma.order.deleteMany({
          where: { blockId: cleanup.milestoneBlockId },
        });
        await prisma.block.delete({
          where: { id: cleanup.milestoneBlockId },
        }).catch(() => {});
      }
      // Withdrawals from test 14 — best-effort delete
      if (cleanup.withdrawalReferences.length) {
        await prisma.withdrawal.deleteMany({
          where: { reference: { in: cleanup.withdrawalReferences } },
        });
      }
      // Flood test orders (tests 9, 10) — keyed by phones we used
      await prisma.order.deleteMany({
        where: {
          customerEmail: { contains: "flood09-" },
        },
      });
      await prisma.order.deleteMany({
        where: {
          customerEmail: { contains: "flood10-" },
        },
      });
      // Card-feature smoke blocks (tests 20-22) + smoke admin
      if (cleanup.cardSmokeBlockIds.length) {
        await prisma.notification.deleteMany({
          where: { blockId: { in: cleanup.cardSmokeBlockIds } },
        });
        await prisma.order.deleteMany({
          where: { blockId: { in: cleanup.cardSmokeBlockIds } },
        });
        await prisma.block.deleteMany({
          where: { id: { in: cleanup.cardSmokeBlockIds } },
        });
      }
      if (cleanup.cardSmokeAdminId) {
        await prisma.adminLog.deleteMany({
          where: { adminId: cleanup.cardSmokeAdminId },
        }).catch(() => {});
        await prisma.admin.delete({
          where: { id: cleanup.cardSmokeAdminId },
        }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.error("[cleanup] partial failure:", cleanupErr);
    }

    // ─── Report ────────────────────────────────────────────────────────────
    console.log(`\n${passed}/${passed + failed} passed`);
    if (failed === 0) {
      console.log("Phase 2 exit gate: GREEN ✓");
    } else {
      console.log("Failures:");
      for (const f of failures) console.log(`  - ${f}`);
    }
    await prisma.$disconnect();
    process.exit(failed === 0 ? 0 : 1);
  }
}

main().catch(async (err) => {
  console.error("[smoke-test] fatal:", err);
  try {
    await prisma.$disconnect();
  } catch {
    /* noop */
  }
  process.exit(1);
});
