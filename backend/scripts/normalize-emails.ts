/**
 * One-time migration — normalize all Seller.email values to lowercase.
 *
 * Audit 012 F-01 introduced Zod-level email lowercasing for every auth
 * endpoint, so going forward every new account is stored lowercase. This
 * script fixes legacy rows that were created before F-01 and might still
 * carry mixed-case emails ("Alice@Example.com"). After running this once,
 * every login attempt routes through `emailSchema` which lowercases the
 * input and the DB will always match.
 *
 * The script is IDEMPOTENT — running it twice is a no-op.
 *
 * Collision handling: if two rows already exist that would collapse to
 * the same lowercase email (e.g. the result of a historical race), the
 * script does NOT delete anything. It logs the collision and leaves both
 * rows untouched so a human can decide which one to keep.
 *
 * Usage:
 *   cd backend && npx tsx scripts/normalize-emails.ts            # dry-run
 *   cd backend && npx tsx scripts/normalize-emails.ts --apply    # write
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

interface Row {
  id: string;
  email: string;
  createdAt: Date;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const mode = apply ? "APPLY" : "DRY-RUN";

  console.log(`[normalize-emails] mode = ${mode}`);

  // We pull every row and filter in JS instead of using a SQL LOWER() filter
  // so the script stays portable across Prisma/Postgres minor versions.
  const all = await prisma.seller.findMany({
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by lowercased email so we can detect collisions before touching
  // anything.
  const buckets = new Map<string, Row[]>();
  for (const row of all) {
    const lower = row.email.toLowerCase();
    const list = buckets.get(lower) ?? [];
    list.push(row);
    buckets.set(lower, list);
  }

  const toUpdate: { id: string; from: string; to: string }[] = [];
  const collisions: { lower: string; rows: Row[] }[] = [];

  for (const [lower, rows] of buckets) {
    if (rows.length === 1) {
      const only = rows[0];
      if (only.email !== lower) {
        toUpdate.push({ id: only.id, from: only.email, to: lower });
      }
      continue;
    }
    // 2+ rows collapse to the same lowercase — don't touch, log.
    collisions.push({ lower, rows });
  }

  console.log(
    `[normalize-emails] scanned ${all.length} sellers — ${toUpdate.length} need normalization, ${collisions.length} collisions`,
  );

  if (collisions.length > 0) {
    console.warn("[normalize-emails] COLLISIONS DETECTED — not touching these:");
    for (const c of collisions) {
      console.warn(`  ${c.lower}:`);
      for (const row of c.rows) {
        console.warn(`    - ${row.id}  ${row.email}  (created ${row.createdAt.toISOString()})`);
      }
    }
    console.warn(
      "[normalize-emails] Resolve manually: pick the canonical row, soft-delete the duplicate, then re-run.",
    );
  }

  if (toUpdate.length === 0) {
    console.log("[normalize-emails] nothing to update — DB is already normalized.");
    await prisma.$disconnect();
    return;
  }

  if (!apply) {
    console.log("[normalize-emails] DRY-RUN — would update:");
    for (const u of toUpdate.slice(0, 20)) {
      console.log(`  ${u.id}  ${u.from} -> ${u.to}`);
    }
    if (toUpdate.length > 20) console.log(`  ...and ${toUpdate.length - 20} more`);
    console.log("[normalize-emails] re-run with --apply to write.");
    await prisma.$disconnect();
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const u of toUpdate) {
    try {
      await prisma.seller.update({
        where: { id: u.id },
        data: { email: u.to },
      });
      ok++;
    } catch (err) {
      failed++;
      console.error(`[normalize-emails] FAILED ${u.id}: ${(err as Error).message}`);
    }
  }

  console.log(`[normalize-emails] done — ${ok} updated, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
