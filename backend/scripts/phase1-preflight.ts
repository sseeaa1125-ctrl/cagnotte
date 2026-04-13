/**
 * Phase 1 pre-flight guard for `phase1_cagnotte_foundations` migration.
 *
 * Asserts before running `prisma migrate dev`:
 *   1. DATABASE_URL is set and does NOT point at production.
 *   2. Block table row count is < 1000 (else fall back to P08 3-step pattern).
 *   3. WebhookLog has no duplicate (externalId, eventType) rows that would
 *      break the new composite unique index. Cleans them up if found
 *      (keeps the newest per pair).
 *
 * Re-runnable. Exits 0 on success, 1 on any guard failure.
 *
 * Usage: cd backend && npx tsx scripts/phase1-preflight.ts
 *
 * IMPORTANT: imports the custom Prisma client at ../src/generated/prisma/client.js
 * (NEVER `@prisma/client` — see CLAUDE.md).
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

async function main() {
  // ── Guard 1: DATABASE_URL exists and is NOT prod ──
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("REFUSE_TO_MIGRATE: DATABASE_URL is not set");
    process.exit(1);
  }
  const lowered = connectionString.toLowerCase();
  if (lowered.includes("prod") || lowered.includes("production")) {
    console.error(
      "REFUSE_TO_MIGRATE_PROD: DATABASE_URL contains 'prod' or 'production' substring. ABORTING.",
    );
    process.exit(1);
  }
  console.log("DATABASE_URL_OK: dev/staging branch detected");

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // ── Guard 2: Block row count < 1000 ──
    const blockCountRows = await prisma.$queryRawUnsafe<{ c: number }[]>(
      'SELECT COUNT(*)::int AS c FROM "Block"',
    );
    const blockCount = blockCountRows[0]?.c ?? 0;
    if (blockCount > 1000) {
      console.error(
        `BLOCK_COUNT_OVER_1000 (${blockCount}) — fall back to 3-step migration pattern (nullable → backfill → unique). ABORTING plan 01-01 auto path.`,
      );
      process.exit(1);
    }
    console.log(`BLOCK_COUNT_OK: ${blockCount}`);

    // ── Guard 3: WebhookLog duplicate (externalId, eventType) cleanup ──
    const dupes = await prisma.$queryRawUnsafe<
      { externalId: string; eventType: string; c: number }[]
    >(
      `SELECT "externalId", "eventType", COUNT(*)::int AS c
       FROM "WebhookLog"
       WHERE "externalId" IS NOT NULL
       GROUP BY 1, 2
       HAVING COUNT(*) > 1`,
    );

    if (dupes.length > 0) {
      console.log(
        `WEBHOOKLOG_DEDUP: found ${dupes.length} duplicate (externalId, eventType) pairs:`,
      );
      for (const row of dupes) {
        console.log(`  - ${row.externalId} / ${row.eventType}: ${row.c} rows`);
      }

      // Keep the newest per pair, delete the rest.
      const deleteResult = await prisma.$executeRawUnsafe(
        `DELETE FROM "WebhookLog"
         WHERE "externalId" IS NOT NULL
         AND id NOT IN (
           SELECT DISTINCT ON ("externalId", "eventType") id
           FROM "WebhookLog"
           WHERE "externalId" IS NOT NULL
           ORDER BY "externalId", "eventType", "createdAt" DESC
         )`,
      );
      console.log(`WEBHOOKLOG_DEDUP_CLEANED: deleted ${deleteResult} stale rows`);

      // Re-verify
      const after = await prisma.$queryRawUnsafe<
        { externalId: string; eventType: string; c: number }[]
      >(
        `SELECT "externalId", "eventType", COUNT(*)::int AS c
         FROM "WebhookLog"
         WHERE "externalId" IS NOT NULL
         GROUP BY 1, 2
         HAVING COUNT(*) > 1`,
      );
      if (after.length > 0) {
        console.error(
          `WEBHOOKLOG_DEDUP_FAILED: ${after.length} duplicates remain after cleanup. ABORTING.`,
        );
        process.exit(1);
      }
      console.log("WEBHOOKLOG_DEDUP_OK (after cleanup)");
    } else {
      console.log("WEBHOOKLOG_DEDUP_OK");
    }

    console.log("\n✅ Phase 1 pre-flight PASSED — safe to run `prisma migrate dev`");
    process.exit(0);
  } catch (err) {
    console.error("PREFLIGHT_ERROR:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
