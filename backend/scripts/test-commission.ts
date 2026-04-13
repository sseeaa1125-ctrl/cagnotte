/**
 * test-commission.ts — Phase 1 plan 01-03
 *
 * Standalone tsx test harness for `backend/src/lib/commission.ts`.
 * Run with:  npx tsx scripts/test-commission.ts
 *
 * Coverage:
 *   - 10 hand-picked fixtures (edge cases + happy path)
 *   - 100 deterministic fuzz fixtures (50 per subtype) over [0, 10_000_000]
 *   - 3 error-path fixtures (negative, fractional, unknown subtype)
 *
 * Total ≥ 113 fixtures. Asserts the invariant `commission + net === gross`
 * for every fuzz fixture, plus exact `rate`/`commission`/`net` values for
 * every hand fixture. Pitfall guarded: P03 (rounding drift).
 */

import {
  computeCommission,
  FUNDRAISER_COMMISSION_BP,
  type FundraiserSubtype,
} from "../src/lib/commission.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    const line = detail ? `${name} — ${detail}` : name;
    failures.push(line);
    console.log(`✗ ${line}`);
  }
}

// ----------------------------------------------------------------------------
// 1. Hand fixtures
// ----------------------------------------------------------------------------

interface HandFixture {
  gross: number;
  subtype: FundraiserSubtype;
  expected: { rate: number; commission: number; net: number };
}

const HAND_FIXTURES: HandFixture[] = [
  { gross: 0,        subtype: "solidaire", expected: { rate: 600, commission: 0,    net: 0 } },
  { gross: 500,      subtype: "solidaire", expected: { rate: 600, commission: 30,   net: 470 } },
  { gross: 1,        subtype: "solidaire", expected: { rate: 600, commission: 0,    net: 1 } },
  { gross: 15000,    subtype: "solidaire", expected: { rate: 600, commission: 900,  net: 14100 } },
  { gross: 2500,     subtype: "solidaire", expected: { rate: 600, commission: 150,  net: 2350 } },
  { gross: 10001,    subtype: "solidaire", expected: { rate: 600, commission: 600,  net: 9401 } },

  { gross: 0,        subtype: "festive",   expected: { rate: 800, commission: 0,    net: 0 } },
  { gross: 1,        subtype: "festive",   expected: { rate: 800, commission: 0,    net: 1 } },
  { gross: 15000,    subtype: "festive",   expected: { rate: 800, commission: 1200, net: 13800 } },
  { gross: 9999,     subtype: "festive",   expected: { rate: 800, commission: 799,  net: 9200 } },
  { gross: 1000000,  subtype: "festive",   expected: { rate: 800, commission: 80000, net: 920000 } },
];

console.log("=== Hand fixtures ===");
for (const f of HAND_FIXTURES) {
  const r = computeCommission(f.gross, f.subtype);
  const ok =
    r.rate === f.expected.rate &&
    r.commission === f.expected.commission &&
    r.net === f.expected.net;
  check(
    `hand: gross=${f.gross} ${f.subtype}`,
    ok,
    ok ? undefined : `expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(r)}`,
  );
}

// ----------------------------------------------------------------------------
// 2. Deterministic fuzz (100 fixtures total — 50 per subtype)
// ----------------------------------------------------------------------------

console.log("\n=== Fuzz fixtures (100) ===");

let seed = 42;
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed;
}

const FUZZ_PER_SUBTYPE = 50;
const MAX_GROSS = 10_000_000;
const SUBTYPES: FundraiserSubtype[] = ["solidaire", "festive"];

let fuzzCount = 0;
for (const subtype of SUBTYPES) {
  for (let i = 0; i < FUZZ_PER_SUBTYPE; i += 1) {
    const gross = rand() % (MAX_GROSS + 1);
    const r = computeCommission(gross, subtype);

    const expectedRate = FUNDRAISER_COMMISSION_BP[subtype];
    const expectedCommission = Math.floor((gross * expectedRate) / 10000);
    const expectedNet = gross - expectedCommission;

    const ok =
      r.rate === expectedRate &&
      r.commission === expectedCommission &&
      r.net === expectedNet &&
      r.commission + r.net === gross &&
      Number.isInteger(r.commission) &&
      Number.isInteger(r.net);

    fuzzCount += 1;
    check(
      `fuzz #${fuzzCount} (${subtype}, gross=${gross})`,
      ok,
      ok
        ? undefined
        : `expected rate=${expectedRate} commission=${expectedCommission} net=${expectedNet}, got ${JSON.stringify(r)}`,
    );
  }
}

// ----------------------------------------------------------------------------
// 3. Error-path fixtures
// ----------------------------------------------------------------------------

console.log("\n=== Error fixtures ===");

function expectThrow(name: string, fn: () => void): void {
  try {
    fn();
    check(name, false, "expected throw, got no throw");
  } catch {
    check(name, true);
  }
}

expectThrow("error: negative gross", () => computeCommission(-1, "solidaire"));
expectThrow("error: fractional gross", () => computeCommission(3.5, "festive"));
expectThrow("error: unknown subtype", () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  computeCommission(1000, "bogus" as any),
);
// Bonus error fixtures — strengthen P03 guard.
expectThrow("error: NaN gross", () => computeCommission(Number.NaN, "solidaire"));
expectThrow("error: Infinity gross", () => computeCommission(Number.POSITIVE_INFINITY, "festive"));

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------

const total = passed + failed;
console.log(`\n${passed}/${total} passed`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
}
process.exit(failed > 0 ? 1 : 0);
