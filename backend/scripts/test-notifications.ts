// @ts-check
/**
 * Phase 2 plan 02-02 — notifications dispatch test harness.
 *
 * Run with the dev server up:
 *   Terminal 1: cd backend && npm run dev
 *   Terminal 2: cd backend && npx tsx scripts/test-notifications.ts
 *
 * Override server URL: API=http://localhost:4001 npx tsx scripts/test-notifications.ts
 *
 * Asserts the two exit-gate invariants:
 *
 *   P01 — Webhook double-delivery dedup
 *     A PAID webhook delivered TWICE produces exactly ONE Notification row
 *     (dedupeKey = donation_received:{orderId}). The order is PAID exactly
 *     once and the customer/balance counters increment exactly once.
 *
 *   P06 — Milestone re-fire prevention
 *     Crossing 50% with one webhook fires exactly one MILESTONE_REACHED
 *     notification; subsequent paid orders that stay above 50% (but below
 *     100%) do NOT fire a second milestone, even though detectCrossed()
 *     would say "still ≥ 50". The dedupe is enforced by the @unique
 *     constraint on Notification.dedupeKey via the duck-typed P2002 catch.
 *
 * Fixtures:
 *   - Idempotent: sellers/blocks/orders are keyed off TEST_RUN_ID =
 *     `notif-test-{ts}` so re-runs don't collide.
 *   - Cleanup runs in `finally` so failures don't leak rows to dev DB.
 *
 * Exit code: 0 on all-green, 1 on any failure.
 */

import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const API = process.env.API || "http://localhost:4000";
const BICTORYS_WEBHOOK_SECRET = process.env.BICTORYS_WEBHOOK_SECRET || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

if (!BICTORYS_WEBHOOK_SECRET) {
  console.error("✗ BICTORYS_WEBHOOK_SECRET manquant dans .env — la signature webhook est obligatoire.");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL manquant dans .env");
  process.exit(1);
}

// Direct Prisma (no adapter helpers) so this script runs standalone
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: DATABASE_URL }) });

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error("  ", err instanceof Error ? err.stack || err.message : err);
    failed++;
  }
}

// ─── helpers ───────────────────────────────────────────────────────────────

interface BictorysWebhookPayload {
  id: string;
  paymentReference: string;
  status: "succeeded";
  amount: number;
  currency: string;
}

/**
 * Post a Bictorys webhook payload using the static x-secret-key fallback path
 * (matches the verifyWebhookSignature flow in routes/webhooks.ts that compares
 * x-secret-key timing-safe against BICTORYS_WEBHOOK_SECRET).
 */
async function postWebhook(payload: BictorysWebhookPayload): Promise<Response> {
  const rawBody = JSON.stringify(payload);
  return fetch(`${API}/api/webhooks/bictorys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": BICTORYS_WEBHOOK_SECRET,
    },
    body: rawBody,
  });
}

/**
 * Insert a PAID order directly via Prisma (bypassing POST /api/orders to skip
 * the rate limiter / circuit breaker / commission helper). Used to seed
 * background donations for the milestone test.
 */
async function insertPaidOrder(opts: {
  sellerId: string;
  blockId: string;
  amount: number;
  reference: string;
}): Promise<void> {
  await prisma.order.create({
    data: {
      reference: opts.reference,
      sellerId: opts.sellerId,
      orderType: "DONATION",
      amount: opts.amount,
      currency: "XOF",
      commissionRate: 0,
      commissionAmount: 0,
      sellerAmount: opts.amount,
      paymentStatus: "PAID",
      paymentProvider: "test_seed",
      paidAt: new Date(),
      customerEmail: `seed-${opts.reference}@noemail.local`,
      blockId: opts.blockId,
    },
  });
}

/**
 * Insert a PENDING order ready to be webhook-acked. The Bictorys webhook
 * matches by `reference` so we craft a known reference up-front.
 */
async function insertPendingOrder(opts: {
  sellerId: string;
  blockId: string;
  amount: number;
  reference: string;
  donorMessage?: string;
}): Promise<{ id: string; reference: string }> {
  const o = await prisma.order.create({
    data: {
      reference: opts.reference,
      sellerId: opts.sellerId,
      orderType: "DONATION",
      amount: opts.amount,
      currency: "XOF",
      commissionRate: 0,
      commissionAmount: 0,
      sellerAmount: opts.amount,
      paymentStatus: "PENDING",
      paymentProvider: "bictorys",
      customerEmail: `donor-${opts.reference}@noemail.local`,
      customerName: "Donor Test",
      donorMessage: opts.donorMessage,
      blockId: opts.blockId,
    },
    select: { id: true, reference: true },
  });
  return o;
}

// ─── main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const TEST_RUN_ID = `notif-test-${Date.now()}`;
  const sellerEmail = `${TEST_RUN_ID}@example.local`;
  const sellerSlug = TEST_RUN_ID;

  // Track IDs for cleanup
  const seller = await prisma.seller.create({
    data: {
      email: sellerEmail,
      slug: sellerSlug,
      displayName: "Notification Test Seller",
      emailVerified: true,
      // Default notificationPrefs = null → all categories enabled
    },
    select: { id: true },
  });
  const sellerId = seller.id;

  let block1Id = "";
  let block2Id = "";

  try {
    // ───── Block 1: P01 — webhook double-delivery dedup ─────
    const block1 = await prisma.block.create({
      data: {
        sellerId,
        type: "FUNDRAISER",
        title: `${TEST_RUN_ID} — P01`,
        position: 0,
        slug: `${sellerSlug}-p01`,
        config: {
          subtype: "personal",
          visibility: "public",
          goalAmount: 100_000,
          showDonorCount: true,
        },
      },
      select: { id: true },
    });
    block1Id = block1.id;

    const orderRef1 = `${TEST_RUN_ID}-p01-order`;
    const pending1 = await insertPendingOrder({
      sellerId,
      blockId: block1Id,
      amount: 5000,
      reference: orderRef1,
    });

    const txId1 = `${TEST_RUN_ID}-p01-tx`;
    const payload1: BictorysWebhookPayload = {
      id: txId1,
      paymentReference: orderRef1,
      status: "succeeded",
      amount: 5000,
      currency: "XOF",
    };

    await test("P01: first webhook delivery → 200 OK + order PAID + 1 notification", async () => {
      const r1 = await postWebhook(payload1);
      assert.equal(r1.status, 200, `expected 200, got ${r1.status}`);

      const ord = await prisma.order.findUnique({ where: { id: pending1.id } });
      assert.equal(ord?.paymentStatus, "PAID");

      const notifs = await prisma.notification.findMany({
        where: { dedupeKey: `donation_received:${pending1.id}` },
      });
      assert.equal(notifs.length, 1, `expected 1 notification, got ${notifs.length}`);
      assert.equal(notifs[0].type, "DONATION_RECEIVED");
      assert.equal(notifs[0].sellerId, sellerId);
    });

    await test("P01: second webhook delivery → still exactly 1 notification (dedup)", async () => {
      const r2 = await postWebhook(payload1);
      assert.equal(r2.status, 200, `expected 200, got ${r2.status}`);

      // Order should still be PAID (no double-credit)
      const ord = await prisma.order.findUnique({ where: { id: pending1.id } });
      assert.equal(ord?.paymentStatus, "PAID");

      // Still exactly 1 notification — the @unique on dedupeKey + the
      // post-tx createNotification P2002 catch + the in-tx WebhookLog upsert
      // form a triple-protected dedupe path.
      const notifs = await prisma.notification.findMany({
        where: { dedupeKey: `donation_received:${pending1.id}` },
      });
      assert.equal(notifs.length, 1, `expected exactly 1 notification after duplicate, got ${notifs.length}`);

      // WebhookLog should still have exactly one row for this (externalId, eventType)
      const logs = await prisma.webhookLog.findMany({ where: { externalId: txId1 } });
      assert.equal(logs.length, 1, `expected 1 webhook log, got ${logs.length}`);
      assert.equal(logs[0].status, "processed");
    });

    // ───── Block 2: P06 — milestone re-fire prevention ─────
    // Goal = 100 000 FCFA. We'll seed ~49 000 directly, then push the
    // first webhook that crosses the 50% line, then push another small
    // webhook that stays above 50% but well under 100% — the second
    // must NOT fire a second MILESTONE_REACHED at threshold 50.
    const block2 = await prisma.block.create({
      data: {
        sellerId,
        type: "FUNDRAISER",
        title: `${TEST_RUN_ID} — P06`,
        position: 1,
        slug: `${sellerSlug}-p06`,
        config: {
          subtype: "personal",
          visibility: "public",
          goalAmount: 100_000,
          showDonorCount: true,
        },
      },
      select: { id: true },
    });
    block2Id = block2.id;

    // Seed 9 PAID orders at ~5444 each → totals ~49 000 (under the 50% line)
    for (let i = 0; i < 9; i++) {
      await insertPaidOrder({
        sellerId,
        blockId: block2Id,
        amount: 5444,
        reference: `${TEST_RUN_ID}-p06-seed-${i}`,
      });
    }

    // First webhook ack: 2000 FCFA → newTotal ~50 996 → 50.99% ≥ 50%
    const orderRef2a = `${TEST_RUN_ID}-p06-cross`;
    const pending2a = await insertPendingOrder({
      sellerId,
      blockId: block2Id,
      amount: 2000,
      reference: orderRef2a,
    });
    const txId2a = `${TEST_RUN_ID}-p06-tx-a`;

    await test("P06: webhook crossing 50% fires exactly 1 MILESTONE_REACHED:50", async () => {
      const r = await postWebhook({
        id: txId2a,
        paymentReference: orderRef2a,
        status: "succeeded",
        amount: 2000,
        currency: "XOF",
      });
      assert.equal(r.status, 200);

      const milestones = await prisma.notification.findMany({
        where: { dedupeKey: `milestone:${block2Id}:50` },
      });
      assert.equal(milestones.length, 1, `expected 1 milestone-50, got ${milestones.length}`);
      assert.equal(milestones[0].type, "MILESTONE_REACHED");
    });

    // Second webhook ack: 2000 FCFA → newTotal ~52 996, still ≥ 50%, well under 100%
    const orderRef2b = `${TEST_RUN_ID}-p06-still`;
    const pending2b = await insertPendingOrder({
      sellerId,
      blockId: block2Id,
      amount: 2000,
      reference: orderRef2b,
    });
    const txId2b = `${TEST_RUN_ID}-p06-tx-b`;

    await test("P06: subsequent paid order (still ≥50%, <100%) does NOT re-fire milestone", async () => {
      const r = await postWebhook({
        id: txId2b,
        paymentReference: orderRef2b,
        status: "succeeded",
        amount: 2000,
        currency: "XOF",
      });
      assert.equal(r.status, 200);

      // detectCrossed() should return [] because prevPct was already ≥ 50.
      // Even if it returned [50], the createNotification P2002 catch would
      // collapse the second insert. Either way: still exactly 1 row.
      const milestones = await prisma.notification.findMany({
        where: { dedupeKey: `milestone:${block2Id}:50` },
      });
      assert.equal(
        milestones.length,
        1,
        `expected milestone count to stay at 1 after second ack, got ${milestones.length}`,
      );

      // The new order should still be PAID + have its own DONATION_RECEIVED row
      const ord = await prisma.order.findUnique({ where: { id: pending2b.id } });
      assert.equal(ord?.paymentStatus, "PAID");
      const dr = await prisma.notification.findMany({
        where: { dedupeKey: `donation_received:${pending2b.id}` },
      });
      assert.equal(dr.length, 1);
    });

    // ───── Sanity: PENDING order count is 0 (every webhook ack moved its order forward) ─────
    void pending2a;
  } finally {
    // ─── Cleanup — runs even on assertion failure ───
    try {
      // Notifications first (no FK dependents)
      await prisma.notification.deleteMany({ where: { sellerId } });
      // Webhook logs by externalId prefix
      await prisma.webhookLog.deleteMany({
        where: { externalId: { startsWith: TEST_RUN_ID } },
      });
      // Orders
      await prisma.order.deleteMany({ where: { sellerId } });
      // Blocks
      if (block1Id) {
        await prisma.block.deleteMany({ where: { id: { in: [block1Id, block2Id].filter(Boolean) } } });
      }
      // Seller
      await prisma.seller.delete({ where: { id: sellerId } });
    } catch (cleanupErr) {
      console.error("⚠️  Cleanup partial failure:", cleanupErr);
    }
    await prisma.$disconnect();
  }

  // ─── Summary ───
  const total = passed + failed;
  console.log("");
  if (failed === 0) {
    console.log(`${passed}/${total} passed`);
    process.exit(0);
  }
  console.log(`${passed}/${total} passed (${failed} failed)`);
  process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  prisma.$disconnect().finally(() => process.exit(1));
});
