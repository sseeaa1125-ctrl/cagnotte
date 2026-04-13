// @ts-check
/**
 * Phase 1 plan 01-02 — slug helper test harness.
 *
 * Run with: `cd backend && npx tsx scripts/test-slug.ts`
 *
 * Exit 0 on all-green, 1 on any failure. No external deps; the fake createFn
 * uses an in-memory Set + a duck-typed P2002 error so we don't need a real
 * Prisma client at test time.
 */

import { slugify, ensureUniqueSlug, BLOCK_RESERVED_SLUGS } from "../src/lib/cagnottes/slug.js";

// ---------------------------------------------------------------------------
// Pure slugify() fixtures
// ---------------------------------------------------------------------------

interface SlugifyFixture {
  name: string;
  input: string;
  expected: string | RegExp;
}

const SLUGIFY_FIXTURES: SlugifyFixture[] = [
  // --- French diacritics (Senegalese names + common accents) ---
  { name: "Coumba Ndiaye",                   input: "Coumba Ndiaye",                       expected: "coumba-ndiaye" },
  { name: "Fatoumata Dramé",                 input: "Fatoumata Dramé",                     expected: "fatoumata-drame" },
  { name: "Les 30 ans de Thomas Diémé",      input: "Les 30 ans de Thomas Diémé",          expected: "les-30-ans-de-thomas-dieme" },
  { name: "Cadeau pour Aïssata",             input: "Cadeau pour Aïssata",                 expected: "cadeau-pour-aissata" },
  { name: "Célébration du mariage à Dakar",  input: "Célébration du mariage à Dakar",      expected: "celebration-du-mariage-a-dakar" },
  { name: "Naissance de Léïla",              input: "Naissance de Léïla",                  expected: "naissance-de-leila" },
  { name: "Voyage à Saint-Louis",            input: "Voyage à Saint-Louis",                expected: "voyage-a-saint-louis" },
  { name: "École de Mbour",                  input: "École de Mbour",                      expected: "ecole-de-mbour" },
  { name: "Anniversaire de Aïcha",           input: "Anniversaire de Aïcha",               expected: "anniversaire-de-aicha" },
  { name: "Hôpital de Thiès",                input: "Hôpital de Thiès",                    expected: "hopital-de-thies" },
  { name: "Mémoire d'Étienne",               input: "Mémoire d'Étienne",                   expected: "memoire-d-etienne" },
  { name: "Fête de l'Aïd",                   input: "Fête de l'Aïd",                       expected: "fete-de-l-aid" },
  { name: "Soutien à Khadija",               input: "Soutien à Khadija",                   expected: "soutien-a-khadija" },
  { name: "Voeu de Modou",                   input: "Voeu de Modou",                       expected: "voeu-de-modou" },
  { name: "Grand-père Moussa",               input: "Grand-père Moussa",                   expected: "grand-pere-moussa" },

  // --- Numbers preserved ---
  { name: "30 ans",                          input: "30 ans",                              expected: "30-ans" },
  { name: "100% solidaire",                  input: "100% solidaire",                      expected: "100-solidaire" },
  { name: "Année 2026",                      input: "Année 2026",                          expected: "annee-2026" },
  { name: "Top 10",                          input: "Top 10",                              expected: "top-10" },

  // --- Case + punctuation ---
  { name: "HELLO World!",                    input: "HELLO World!",                        expected: "hello-world" },
  { name: "Café & Croissant",                input: "Café & Croissant",                    expected: "cafe-croissant" },
  { name: "C'est la fête",                   input: "C'est la fête",                       expected: "c-est-la-fete" },
  { name: "Bonjour, monde !",                input: "Bonjour, monde !",                    expected: "bonjour-monde" },
  { name: "...trailing dots...",             input: "...trailing dots...",                 expected: "trailing-dots" },
  { name: "double  spaces",                  input: "double  spaces",                      expected: "double-spaces" },
  { name: "tab\tseparated",                  input: "tab\tseparated",                      expected: "tab-separated" },
  { name: "newline\ntitle",                  input: "newline\ntitle",                      expected: "newline-title" },

  // --- Empty / whitespace / fallback ---
  { name: "empty string",                    input: "",                                    expected: "cagnotte" },
  { name: "whitespace only",                 input: "   ",                                 expected: "cagnotte" },
  { name: "punct only",                      input: "!!!",                                 expected: "cagnotte" },
  { name: "dashes only",                     input: "---",                                 expected: "cagnotte" },
  { name: "mixed punct only",                input: " !@#$%^&*() ",                       expected: "cagnotte" },

  // --- Non-ASCII edge cases ---
  { name: "emoji + french",                  input: "🎉 Fête 🎂",                           expected: "fete" },
  { name: "celebration emoji",               input: "🎉 Célébration !!!",                  expected: "celebration" },
  { name: "arabic only",                     input: "مرحبا",                                expected: "cagnotte" },
  { name: "chinese only",                    input: "你好世界",                              expected: "cagnotte" },
  { name: "mixed emoji and ascii",           input: "Hello 👋 World 🌍",                   expected: "hello-world" },

  // --- Truncation (60 chars) ---
  {
    name: "long title truncated",
    input: "Cagnotte pour aider la famille de Mamadou apres l incendie de leur maison à Pikine ce mois-ci",
    expected: /^[a-z0-9-]{1,60}$/,
  },
  {
    name: "200-char title — length cap",
    input: "a".repeat(200),
    expected: /^a{1,60}$/,
  },
  {
    name: "long with trailing whitespace ending in dash territory",
    input: "Soutien aux familles touchées par les inondations de la région de Saint-Louis et de Matam",
    expected: /^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/,
  },

  // --- Hyphen handling ---
  { name: "already kebab",                   input: "already-kebab-case",                  expected: "already-kebab-case" },
  { name: "leading dashes",                  input: "---hello",                            expected: "hello" },
  { name: "trailing dashes",                 input: "hello---",                            expected: "hello" },
  { name: "internal multi dashes",           input: "hello---world",                       expected: "hello-world" },

  // --- Senegalese name variations ---
  { name: "Ousmane Sow",                     input: "Ousmane Sow",                         expected: "ousmane-sow" },
  { name: "Mariama Bâ",                      input: "Mariama Bâ",                          expected: "mariama-ba" },
  { name: "Cheikh Anta Diop",                input: "Cheikh Anta Diop",                    expected: "cheikh-anta-diop" },
  { name: "Sokhna Diarra",                   input: "Sokhna Diarra",                       expected: "sokhna-diarra" },
  { name: "Birame Faye",                     input: "Birame Faye",                         expected: "birame-faye" },
];

// ---------------------------------------------------------------------------
// ensureUniqueSlug() fixtures (collision chains + reserved words)
// ---------------------------------------------------------------------------

interface EnsureFixture {
  name: string;
  base: string;
  taken: string[];
  expected: string | RegExp;
}

const ENSURE_UNIQUE_FIXTURES: EnsureFixture[] = [
  // --- Reserved words → first attempt is `<word>-1` ---
  { name: "reserved: admin",                base: "admin",                taken: [],                                                       expected: "admin-1" },
  { name: "reserved: api",                  base: "api",                  taken: [],                                                       expected: "api-1" },
  { name: "reserved: dashboard",            base: "dashboard",            taken: [],                                                       expected: "dashboard-1" },
  { name: "reserved: tableau-de-bord",      base: "tableau-de-bord",      taken: [],                                                       expected: "tableau-de-bord-1" },
  { name: "reserved: toutes-les-cagnottes", base: "toutes-les-cagnottes", taken: [],                                                       expected: "toutes-les-cagnottes-1" },
  { name: "reserved: nouvelle",             base: "nouvelle",             taken: [],                                                       expected: "nouvelle-1" },

  // --- No collision → base used as-is ---
  { name: "no collision",                   base: "les-30-ans-de-thomas", taken: [],                                                       expected: "les-30-ans-de-thomas" },

  // --- One collision → base-2 ---
  { name: "one collision",                  base: "les-30-ans-de-thomas", taken: ["les-30-ans-de-thomas"],                                 expected: "les-30-ans-de-thomas-2" },

  // --- Two collisions → base-3 ---
  {
    name: "collision chain → -3",
    base: "les-30-ans-de-thomas",
    taken: ["les-30-ans-de-thomas", "les-30-ans-de-thomas-2"],
    expected: "les-30-ans-de-thomas-3",
  },

  // --- 9 collisions → base-10 ---
  {
    name: "collision chain → -10",
    base: "anniv",
    taken: [
      "anniv",
      "anniv-2",
      "anniv-3",
      "anniv-4",
      "anniv-5",
      "anniv-6",
      "anniv-7",
      "anniv-8",
      "anniv-9",
    ],
    expected: "anniv-10",
  },

  // --- 10+ collisions → timestamp fallback ---
  {
    name: "fallback timestamp",
    base: "les-30-ans-de-thomas",
    taken: [
      "les-30-ans-de-thomas",
      "les-30-ans-de-thomas-2",
      "les-30-ans-de-thomas-3",
      "les-30-ans-de-thomas-4",
      "les-30-ans-de-thomas-5",
      "les-30-ans-de-thomas-6",
      "les-30-ans-de-thomas-7",
      "les-30-ans-de-thomas-8",
      "les-30-ans-de-thomas-9",
      "les-30-ans-de-thomas-10",
    ],
    expected: /^les-30-ans-de-thomas-[a-z0-9]{4}$/,
  },

  // --- Reserved word + the -1 form is also taken → base-2 ---
  {
    name: "reserved with -1 already taken",
    base: "admin",
    taken: ["admin-1"],
    expected: "admin-2",
  },
];

// ---------------------------------------------------------------------------
// Fake createFn — closes over a Set, throws duck-typed P2002 on collision
// ---------------------------------------------------------------------------

function makeFakeCreateFn(taken: Set<string>): (candidate: string) => Promise<void> {
  return async (candidate: string) => {
    if (taken.has(candidate)) {
      throw Object.assign(new Error("P2002"), { code: "P2002" });
    }
    taken.add(candidate);
  };
}

// ---------------------------------------------------------------------------
// Sanity: BLOCK_RESERVED_SLUGS shape
// ---------------------------------------------------------------------------

const RESERVED_SANITY_CHECKS: Array<{ name: string; check: () => boolean }> = [
  { name: "reserved set has 15 entries",               check: () => BLOCK_RESERVED_SLUGS.size === 15 },
  { name: "reserved set has admin",                    check: () => BLOCK_RESERVED_SLUGS.has("admin") },
  { name: "reserved set has api",                      check: () => BLOCK_RESERVED_SLUGS.has("api") },
  { name: "reserved set has tableau-de-bord",          check: () => BLOCK_RESERVED_SLUGS.has("tableau-de-bord") },
  { name: "reserved set has toutes-les-cagnottes",     check: () => BLOCK_RESERVED_SLUGS.has("toutes-les-cagnottes") },
  { name: "reserved set does NOT have cagnottes",      check: () => !BLOCK_RESERVED_SLUGS.has("cagnottes") },
  { name: "reserved set does NOT have blocks",         check: () => !BLOCK_RESERVED_SLUGS.has("blocks") },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, actual: string, expected: string | RegExp): void {
  if (ok) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    const expStr = expected instanceof RegExp ? expected.toString() : `"${expected}"`;
    const msg = `✗ ${name}: expected ${expStr}, got "${actual}"`;
    console.log(msg);
    failures.push(msg);
  }
}

async function main(): Promise<void> {
  console.log("=== slugify() fixtures ===");
  for (const f of SLUGIFY_FIXTURES) {
    const got = slugify(f.input);
    const ok = f.expected instanceof RegExp ? f.expected.test(got) : got === f.expected;
    check(f.name, ok, got, f.expected);
    if (f.expected instanceof RegExp || typeof f.expected === "string") {
      // Always assert ≤60 chars as a global invariant
      if (got.length > 60) {
        failed++;
        const msg = `✗ ${f.name}: slug exceeds 60 chars (length=${got.length})`;
        console.log(msg);
        failures.push(msg);
      }
    }
  }

  console.log("\n=== ensureUniqueSlug() fixtures ===");
  for (const f of ENSURE_UNIQUE_FIXTURES) {
    const taken = new Set<string>(f.taken);
    const fakeCreate = makeFakeCreateFn(taken);
    let got: string;
    try {
      got = await ensureUniqueSlug(f.base, fakeCreate);
    } catch (err) {
      failed++;
      const msg = `✗ ${f.name}: threw ${(err as Error).message}`;
      console.log(msg);
      failures.push(msg);
      continue;
    }
    const ok = f.expected instanceof RegExp ? f.expected.test(got) : got === f.expected;
    check(f.name, ok, got, f.expected);
  }

  console.log("\n=== BLOCK_RESERVED_SLUGS sanity ===");
  for (const c of RESERVED_SANITY_CHECKS) {
    const ok = c.check();
    if (ok) {
      passed++;
      console.log(`✓ ${c.name}`);
    } else {
      failed++;
      const msg = `✗ ${c.name}`;
      console.log(msg);
      failures.push(msg);
    }
  }

  const total = passed + failed;
  console.log(`\n${passed}/${total} passed`);

  if (failed > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log("  " + f);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
