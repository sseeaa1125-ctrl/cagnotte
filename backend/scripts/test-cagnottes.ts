// @ts-check
/**
 * Phase 2 plan 02-01 — public cagnottes routes test harness.
 *
 * Run with: `cd backend && npx tsx scripts/test-cagnottes.ts`
 *
 * Hits a running backend (default http://localhost:4000, override via
 * `API=http://… npx tsx scripts/test-cagnottes.ts`). Asserts:
 *
 *   1. GET /api/cagnottes returns 200 + JSON with `cagnottes` array.
 *   2. Response shape (fields present on each entry, masking applied).
 *   3. GET /api/cagnottes/<random-nonexistent> returns 404.
 *   4. GET /api/cagnottes accepts ?limit=1 and respects the cap.
 *   5. (Fixture-dependent) If the DB has at least one private cagnotte,
 *      verify its slug is NOT in the list response AND that fetching it by
 *      slug returns 200 with `Cache-Control: private, no-store`.
 *
 * Exits 0 on all-green, 1 on any failure. Fixture-dependent assertions print
 * a SKIP warning when the DB has no matching rows — the full smoke-test in
 * 02-03 will seed and run end-to-end.
 */

import assert from "node:assert/strict";

const API = process.env.API || "http://localhost:4000";

interface ListResponse {
  cagnottes: Array<{
    id: string;
    slug: string | null;
    title: string;
    coverUrl: string | null;
    subtype: string | null;
    goalAmount: number | null;
    endDate: string | null;
    totalRaised: number | null;
    donorCount: number | null;
    seller: { id: string; slug: string; displayName: string; avatarUrl: string | null };
    createdAt: string;
  }>;
  nextCursor: string | null;
}

interface DetailResponse {
  id: string;
  slug: string | null;
  title: string;
  visibility: "public" | "private";
  recentDonations: Array<{ id: string; name: string; amount: number | null; message: string | null }>;
}

let passed = 0;
let failed = 0;
let skipped = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error("  ", err instanceof Error ? err.message : err);
    failed++;
  }
}

function skip(name: string, reason: string): void {
  console.log(`⊘ ${name} — SKIP (${reason})`);
  skipped++;
}

async function main(): Promise<void> {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. List endpoint — basic shape
  // ───────────────────────────────────────────────────────────────────────────

  let firstList: ListResponse | null = null;

  await test("GET /api/cagnottes returns 200 + cagnottes array", async () => {
    const r = await fetch(`${API}/api/cagnottes`);
    assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
    const j = (await r.json()) as ListResponse;
    assert.ok(Array.isArray(j.cagnottes), "cagnottes field is not an array");
    assert.ok("nextCursor" in j, "nextCursor field missing");
    firstList = j;
  });

  await test("GET /api/cagnottes sets Cache-Control: public, max-age=60", async () => {
    const r = await fetch(`${API}/api/cagnottes`);
    const cc = r.headers.get("cache-control");
    assert.ok(cc && cc.includes("public") && cc.includes("max-age=60"), `unexpected Cache-Control: ${cc}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Per-row shape (only meaningful if at least one row exists)
  // ───────────────────────────────────────────────────────────────────────────

  if (firstList && firstList.cagnottes.length > 0) {
    await test("Each list entry has expected keys (id, slug, title, seller…)", async () => {
      const row = firstList!.cagnottes[0];
      const expectedKeys = [
        "id",
        "slug",
        "title",
        "coverUrl",
        "subtype",
        "goalAmount",
        "endDate",
        "totalRaised",
        "donorCount",
        "seller",
        "createdAt",
      ];
      for (const k of expectedKeys) {
        assert.ok(k in row, `missing key: ${k}`);
      }
      assert.ok(row.seller && typeof row.seller === "object", "seller must be an object");
      assert.ok("displayName" in row.seller, "seller.displayName missing");
      assert.ok("slug" in row.seller, "seller.slug missing");
    });
  } else {
    skip("Per-row shape", "list endpoint returned 0 cagnottes (no fixtures)");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Limit param works
  // ───────────────────────────────────────────────────────────────────────────

  await test("GET /api/cagnottes?limit=1 caps response size", async () => {
    const r = await fetch(`${API}/api/cagnottes?limit=1`);
    assert.strictEqual(r.status, 200);
    const j = (await r.json()) as ListResponse;
    assert.ok(j.cagnottes.length <= 1, `expected ≤1, got ${j.cagnottes.length}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. 404 on nonexistent slug
  // ───────────────────────────────────────────────────────────────────────────

  await test("GET /api/cagnottes/nonexistent-slug-xyz123 returns 404", async () => {
    const r = await fetch(`${API}/api/cagnottes/nonexistent-slug-xyz123`);
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test("GET /api/cagnottes/INVALID_CHARS returns 400", async () => {
    // slugParamSchema rejects uppercase + underscores
    const r = await fetch(`${API}/api/cagnottes/INVALID_CHARS`);
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Detail endpoint — happy path on the first listed cagnotte
  // ───────────────────────────────────────────────────────────────────────────

  if (firstList && firstList.cagnottes.length > 0 && firstList.cagnottes[0].slug) {
    const sampleSlug = firstList.cagnottes[0].slug;
    await test(`GET /api/cagnottes/${sampleSlug} returns 200 + detail payload`, async () => {
      const r = await fetch(`${API}/api/cagnottes/${sampleSlug}`);
      assert.strictEqual(r.status, 200);
      const j = (await r.json()) as DetailResponse;
      assert.ok(j.id, "id missing");
      assert.strictEqual(j.slug, sampleSlug);
      assert.ok(Array.isArray(j.recentDonations), "recentDonations must be an array");
      assert.ok(["public", "private"].includes(j.visibility), `bad visibility: ${j.visibility}`);
    });

    await test(`GET /api/cagnottes/${sampleSlug}/participants returns 200`, async () => {
      const r = await fetch(`${API}/api/cagnottes/${sampleSlug}/participants`);
      assert.strictEqual(r.status, 200);
      const j = (await r.json()) as { participants: unknown[]; nextCursor: string | null };
      assert.ok(Array.isArray(j.participants));
      assert.ok("nextCursor" in j);
      // Mask check: no entry should leak customerEmail
      for (const p of j.participants) {
        assert.ok(!("customerEmail" in (p as object)), "participant leaked customerEmail");
      }
    });
  } else {
    skip("Detail + participants happy path", "no fixture cagnotte to fetch");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Private cagnotte invariant — fixture-dependent (full smoke in 02-03)
  // ───────────────────────────────────────────────────────────────────────────

  const privateSlug = process.env.PRIVATE_CAGNOTTE_SLUG;
  if (privateSlug) {
    await test(`Private cagnotte "${privateSlug}" is NOT in the list response`, async () => {
      // Walk pages until we exhaust or find it.
      let cursor: string | null = null;
      let pageCount = 0;
      let found = false;
      do {
        const url = `${API}/api/cagnottes?limit=50${cursor ? `&cursor=${cursor}` : ""}`;
        const r = await fetch(url);
        assert.strictEqual(r.status, 200);
        const j = (await r.json()) as ListResponse;
        if (j.cagnottes.some((c) => c.slug === privateSlug)) {
          found = true;
          break;
        }
        cursor = j.nextCursor;
        pageCount++;
      } while (cursor && pageCount < 20); // safety cap
      assert.strictEqual(found, false, `private slug ${privateSlug} leaked into list`);
    });

    await test(`Private cagnotte "${privateSlug}" detail sets Cache-Control: private, no-store`, async () => {
      const r = await fetch(`${API}/api/cagnottes/${privateSlug}`);
      assert.strictEqual(r.status, 200);
      const cc = r.headers.get("cache-control");
      assert.ok(cc && cc.includes("private") && cc.includes("no-store"), `unexpected Cache-Control: ${cc}`);
    });
  } else {
    skip("Private cagnotte invariants", "set PRIVATE_CAGNOTTE_SLUG env to enable");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────────────────────────────────

  const total = passed + failed;
  console.log(`\n${passed}/${total} passed (${skipped} skipped)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Test harness crashed:", err);
  process.exit(1);
});
