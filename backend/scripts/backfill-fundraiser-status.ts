// One-shot backfill — set config.status = "active" on every FUNDRAISER block
// that predates Phase 10 (or was seeded via seed-dev.ts before the field
// was introduced). Idempotent: rows that already have a status are skipped.
//
// Why this exists: the public list endpoint filters on
// `config.path=["status"], not: "closed"`. In Postgres JSON, a missing key
// reads as NULL and `NULL != 'closed'` evaluates to NULL, which is filtered
// out by WHERE → rows without a status are silently hidden. Backfilling
// fixes the symptom; the SQL filter was also hardened to a positive
// assertion (`equals: "active"`) to prevent a re-regression.
//
// Usage: npx tsx scripts/backfill-fundraiser-status.ts

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const blocks = await prisma.block.findMany({
    where: { type: "FUNDRAISER" },
    select: { id: true, slug: true, config: true },
  });

  let patched = 0;
  let skipped = 0;
  for (const b of blocks) {
    const cfg = (b.config ?? {}) as Record<string, unknown>;
    if (cfg.status === "active" || cfg.status === "closed") {
      skipped++;
      continue;
    }
    const next = { ...cfg, status: "active" };
    await prisma.block.update({
      where: { id: b.id },
      data: { config: next as never },
    });
    console.log(`✓ patched ${b.slug} (id=${b.id.slice(0, 8)})`);
    patched++;
  }

  console.log(`\nDone. patched=${patched} skipped=${skipped} total=${blocks.length}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
