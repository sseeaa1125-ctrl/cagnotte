/**
 * test-schemas.ts — Phase 1 plan 01-03
 *
 * Standalone tsx test harness for the FUNDRAISER subtype/visibility extensions
 * to `fundraiserBlockConfigSchema` in `backend/src/lib/blocks/schemas.ts`.
 *
 * Run with:  npx tsx scripts/test-schemas.ts
 *
 * Coverage (FUND-01..FUND-04):
 *   - festive happy path + missing occasion + cross-contamination (cause/beneficiary)
 *   - solidaire happy path + missing cause + missing beneficiary + cross-contamination (occasion)
 *   - missing subtype
 *   - private visibility
 *   - hideAmount + hideDonors toggle
 *   - default values applied (visibility=public, hideAmount=false, hideDonors=false)
 */

import { fundraiserBlockConfigSchema } from "../src/lib/blocks/schemas.js";

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

const BASE_VALID_FIELDS = {
  title: "Les 30 ans de Thomas",
  goalAmount: 500000,
};

interface PassFixture {
  name: string;
  input: Record<string, unknown>;
  expect: "pass";
  assertDefaults?: Record<string, unknown>;
  assertField?: Record<string, unknown>;
}

interface FailFixture {
  name: string;
  input: Record<string, unknown>;
  expect: "fail";
  errorPath: (string | number)[];
  errorMatches?: RegExp;
}

type Fixture = PassFixture | FailFixture;

const FIXTURES: Fixture[] = [
  // --- festive happy path ---
  {
    name: "festive valid",
    input: { ...BASE_VALID_FIELDS, subtype: "festive", occasion: "anniversaire" },
    expect: "pass",
    assertDefaults: { visibility: "public", hideAmount: false, hideDonors: false },
  },
  // --- festive failures ---
  {
    name: "festive missing occasion",
    input: { ...BASE_VALID_FIELDS, subtype: "festive" },
    expect: "fail",
    errorPath: ["occasion"],
    errorMatches: /requise/,
  },
  {
    name: "festive with cause",
    input: { ...BASE_VALID_FIELDS, subtype: "festive", occasion: "mariage_pacs", cause: "sante_medical" },
    expect: "fail",
    errorPath: ["cause"],
    errorMatches: /vide/,
  },
  {
    name: "festive with beneficiary",
    input: { ...BASE_VALID_FIELDS, subtype: "festive", occasion: "voyage", beneficiary: "moi_meme" },
    expect: "fail",
    errorPath: ["beneficiary"],
    errorMatches: /vide/,
  },

  // --- solidaire happy path ---
  {
    name: "solidaire valid",
    input: { ...BASE_VALID_FIELDS, subtype: "solidaire", cause: "urgence", beneficiary: "un_proche" },
    expect: "pass",
    assertDefaults: { visibility: "public", hideAmount: false, hideDonors: false },
  },
  // --- solidaire failures ---
  {
    name: "solidaire missing cause",
    input: { ...BASE_VALID_FIELDS, subtype: "solidaire", beneficiary: "moi_meme" },
    expect: "fail",
    errorPath: ["cause"],
    errorMatches: /requise/,
  },
  {
    name: "solidaire missing beneficiary",
    input: { ...BASE_VALID_FIELDS, subtype: "solidaire", cause: "education" },
    expect: "fail",
    errorPath: ["beneficiary"],
    errorMatches: /requis/,
  },
  {
    name: "solidaire with occasion",
    input: { ...BASE_VALID_FIELDS, subtype: "solidaire", cause: "animaux", beneficiary: "une_association", occasion: "voyage" },
    expect: "fail",
    errorPath: ["occasion"],
    errorMatches: /vide/,
  },

  // --- missing subtype ---
  {
    name: "missing subtype",
    input: { ...BASE_VALID_FIELDS },
    expect: "fail",
    errorPath: ["subtype"],
  },

  // --- privacy toggles ---
  {
    name: "private visibility",
    input: { ...BASE_VALID_FIELDS, subtype: "festive", occasion: "naissance", visibility: "private" },
    expect: "pass",
    assertField: { visibility: "private" },
  },
  {
    name: "hideAmount + hideDonors",
    input: {
      ...BASE_VALID_FIELDS,
      subtype: "solidaire",
      cause: "sante_medical",
      beneficiary: "moi_meme",
      hideAmount: true,
      hideDonors: true,
    },
    expect: "pass",
    assertField: { hideAmount: true, hideDonors: true },
  },

  // --- bonus: festive with explicit nulls (should pass — nullable fields) ---
  {
    name: "festive valid with null cause/beneficiary",
    input: {
      ...BASE_VALID_FIELDS,
      subtype: "festive",
      occasion: "cadeau_commun",
      cause: null,
      beneficiary: null,
    },
    expect: "pass",
  },
];

console.log("=== fundraiserBlockConfigSchema fixtures ===");

function pathsEqual(a: (string | number)[], b: (string | number)[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

for (const f of FIXTURES) {
  const result = fundraiserBlockConfigSchema.safeParse(f.input);

  if (f.expect === "pass") {
    if (!result.success) {
      check(
        f.name,
        false,
        `expected pass, got fail: ${JSON.stringify(result.error.issues)}`,
      );
      continue;
    }
    let ok = true;
    let detail: string | undefined;
    if (f.assertDefaults) {
      for (const [k, v] of Object.entries(f.assertDefaults)) {
        if ((result.data as Record<string, unknown>)[k] !== v) {
          ok = false;
          detail = `default ${k} expected ${JSON.stringify(v)}, got ${JSON.stringify((result.data as Record<string, unknown>)[k])}`;
          break;
        }
      }
    }
    if (ok && f.assertField) {
      for (const [k, v] of Object.entries(f.assertField)) {
        if ((result.data as Record<string, unknown>)[k] !== v) {
          ok = false;
          detail = `field ${k} expected ${JSON.stringify(v)}, got ${JSON.stringify((result.data as Record<string, unknown>)[k])}`;
          break;
        }
      }
    }
    check(f.name, ok, detail);
  } else {
    if (result.success) {
      check(f.name, false, "expected fail, got pass");
      continue;
    }
    const matchingIssue = result.error.issues.find((iss) =>
      pathsEqual(iss.path as (string | number)[], f.errorPath),
    );
    if (!matchingIssue) {
      check(
        f.name,
        false,
        `no issue at path ${JSON.stringify(f.errorPath)}; got ${JSON.stringify(result.error.issues.map((i) => i.path))}`,
      );
      continue;
    }
    if (f.errorMatches && !f.errorMatches.test(matchingIssue.message)) {
      check(
        f.name,
        false,
        `message ${JSON.stringify(matchingIssue.message)} does not match ${f.errorMatches}`,
      );
      continue;
    }
    check(f.name, true);
  }
}

const total = passed + failed;
console.log(`\n${passed}/${total} passed`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const fl of failures) console.log(`  - ${fl}`);
}
process.exit(failed > 0 ? 1 : 0);
