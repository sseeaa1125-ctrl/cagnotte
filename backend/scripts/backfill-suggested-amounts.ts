// One-shot backfill — cap config.suggestedAmounts to the first 3 entries
// on every FUNDRAISER block whose array currently has more.
//
// Why this exists: the Zod schemas were tightened from .max(4) to .max(3)
// to match the public /participer form (which only renders 3 preset pills)
// and the editor (which already caps on save). Any block created before
// the tightening can still have 4+ entries in the DB, and the close /
// reopen / edit flows re-validate the full config through Zod — they
// would error out on those legacy rows. This script normalises them so
// the stricter schema is safe to ship.
//
// Idempotent: rows with ≤3 are skipped.
//
// Usage: npx tsx scripts/backfill-suggested-amounts.ts

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
    const current = cfg.suggestedAmounts;
    if (!Array.isArray(current) || current.length <= 3) {
      skipped++;
      continue;
    }
    const next = { ...cfg, suggestedAmounts: current.slice(0, 3) };
    await prisma.block.update({
      where: { id: b.id },
      data: { config: next as never },
    });
    console.log(
      `✓ patched ${b.slug} (id=${b.id.slice(0, 8)}) — [${(current as number[]).join(
        ", ",
      )}] → [${((next.suggestedAmounts as unknown) as number[]).join(", ")}]`,
    );
    patched++;
  }

  console.log(`\nDone. patched=${patched} skipped=${skipped} total=${blocks.length}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
