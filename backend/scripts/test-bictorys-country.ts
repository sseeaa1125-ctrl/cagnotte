/**
 * Simulation exhaustive de getBictorysCountry
 * Teste des centaines de combinaisons : pays détecté × paymentType × phone × pays vendeur
 * 
 * Usage: npx tsx scripts/test-bictorys-country.ts
 */

// ── Copie locale de la logique (pour exécution standalone) ──
const BICTORYS_COUNTRIES: Record<string, string[]> = {
  wave_money: ["SN", "CI", "BF"],
  orange_money: ["SN", "CI", "ML", "BK"],
};

const DIAL_TO_COUNTRY: [string, string][] = [
  ["225", "CI"], ["224", "GN"], ["223", "ML"], ["226", "BF"],
  ["227", "NE"], ["228", "TG"], ["229", "BJ"], ["222", "MR"],
  ["245", "GW"], ["237", "CM"], ["241", "GA"], ["242", "CG"],
  ["243", "CD"], ["212", "MA"], ["221", "SN"],
];

function countryFromDialCode(phone: string): string | null {
  const digits = phone.replace(/[^0-9]/g, "");
  for (const [dial, code] of DIAL_TO_COUNTRY) {
    if (digits.startsWith(dial)) return code;
  }
  return null;
}

function getBictorysCountry(
  detectedCountry: string | null,
  paymentType: string,
  sellerCountry?: string | null,
  customerPhone?: string | null,
): string {
  const supported = BICTORYS_COUNTRIES[paymentType];
  if (!supported) {
    return detectedCountry || sellerCountry || "SN";
  }
  if (customerPhone) {
    const phoneCountry = countryFromDialCode(customerPhone);
    if (phoneCountry && supported.includes(phoneCountry)) {
      return phoneCountry;
    }
  }
  if (detectedCountry && supported.includes(detectedCountry)) {
    return detectedCountry;
  }
  if (sellerCountry && supported.includes(sellerCountry)) {
    return sellerCountry;
  }
  return supported[0];
}

// ── Données de simulation ──
const PAYMENT_TYPES = ["wave_money", "orange_money", "card"];

const DETECTED_COUNTRIES = [
  "SN", "CI", "BF", "ML", "FR", "US", "BE", "CA", "MA", "TG", "BJ", "NE", "CM", "GA", "CD", null,
];

const SELLER_COUNTRIES = ["SN", "CI", "BF", "ML", null];

const CUSTOMER_PHONES: { label: string; phone: string | null }[] = [
  // Sénégal
  { label: "SN Wave (+221 77)", phone: "+221771234567" },
  { label: "SN Orange (+221 78)", phone: "+221781234567" },
  { label: "SN fixe (+221 33)", phone: "+221331234567" },
  // Côte d'Ivoire
  { label: "CI mobile (+225 07)", phone: "+2250712345678" },
  { label: "CI mobile (+225 05)", phone: "+2250512345678" },
  // Burkina Faso
  { label: "BF mobile (+226 70)", phone: "+22670123456" },
  { label: "BF mobile (+226 76)", phone: "+22676123456" },
  // Mali
  { label: "ML mobile (+223 7)", phone: "+22370123456" },
  { label: "ML mobile (+223 6)", phone: "+22360123456" },
  // France
  { label: "FR mobile (+33 6)", phone: "+33612345678" },
  { label: "FR fixe (+33 1)", phone: "+33112345678" },
  // Belgique
  { label: "BE mobile (+32 4)", phone: "+32412345678" },
  // USA
  { label: "US mobile (+1)", phone: "+12125551234" },
  // Maroc
  { label: "MA mobile (+212 6)", phone: "+212612345678" },
  // Togo
  { label: "TG mobile (+228 9)", phone: "+22890123456" },
  // Bénin
  { label: "BJ mobile (+229 9)", phone: "+22990123456" },
  // Cameroun
  { label: "CM mobile (+237 6)", phone: "+237612345678" },
  // Guinée
  { label: "GN mobile (+224 6)", phone: "+224612345678" },
  // Mauritanie
  { label: "MR mobile (+222 4)", phone: "+22241234567" },
  // Pas de téléphone
  { label: "Aucun", phone: null },
  // Format sans +
  { label: "SN sans + (221 77)", phone: "221771234567" },
  { label: "CI sans + (225 07)", phone: "2250712345678" },
  // Format local (pas d'indicatif)
  { label: "Local 77XXXXXXX", phone: "771234567" },
  { label: "Local 07XXXXXXXX", phone: "0712345678" },
];

// ── Exécution ──
interface TestResult {
  paymentType: string;
  detectedCountry: string | null;
  sellerCountry: string | null;
  phoneLabel: string;
  phone: string | null;
  result: string;
  status: "✅" | "⚠️" | "❌";
  note: string;
}

const results: TestResult[] = [];
let passed = 0;
let warnings = 0;
let failures = 0;

for (const paymentType of PAYMENT_TYPES) {
  for (const detectedCountry of DETECTED_COUNTRIES) {
    for (const sellerCountry of SELLER_COUNTRIES) {
      for (const { label: phoneLabel, phone } of CUSTOMER_PHONES) {
        const result = getBictorysCountry(detectedCountry, paymentType, sellerCountry, phone);
        const supported = BICTORYS_COUNTRIES[paymentType];
        
        let status: "✅" | "⚠️" | "❌";
        let note: string;

        if (paymentType === "card") {
          // Card : le résultat doit être un pays valide (pas null)
          if (result) {
            status = "✅";
            note = "Carte — pays accepté";
          } else {
            status = "❌";
            note = "Carte — pays manquant!";
          }
        } else {
          // Mobile money
          if (!supported.includes(result)) {
            status = "❌";
            note = `PAYS ${result} NON SUPPORTÉ pour ${paymentType}! Supportés: ${supported.join(",")}`;
            failures++;
          } else {
            // Vérifier la cohérence téléphone ↔ résultat
            const phoneCountry = phone ? countryFromDialCode(phone) : null;
            if (phoneCountry && supported.includes(phoneCountry) && result !== phoneCountry) {
              status = "❌";
              note = `Téléphone ${phoneCountry} mais résultat ${result} — incohérent!`;
              failures++;
            } else if (!phoneCountry && detectedCountry && supported.includes(detectedCountry) && result !== detectedCountry) {
              status = "⚠️";
              note = `Géo ${detectedCountry} ignorée — résultat ${result}`;
              warnings++;
            } else {
              status = "✅";
              note = phoneCountry && supported.includes(phoneCountry)
                ? `Via téléphone (${phoneCountry})`
                : detectedCountry && supported.includes(detectedCountry)
                  ? `Via géolocalisation (${detectedCountry})`
                  : sellerCountry && supported.includes(sellerCountry)
                    ? `Via pays vendeur (${sellerCountry})`
                    : `Fallback (${supported[0]})`;
            }
            if (status === "✅") passed++;
          }
        }

        results.push({ paymentType, detectedCountry, sellerCountry, phoneLabel, phone, result, status, note });
      }
    }
  }
}

// ── Résumé ──
const total = results.filter(r => r.paymentType !== "card").length;
console.log("═══════════════════════════════════════════════════════════");
console.log(`  SIMULATION getBictorysCountry — ${results.length} cas total`);
console.log(`  Mobile money: ${total} cas (wave_money + orange_money)`);
console.log("═══════════════════════════════════════════════════════════\n");

// Afficher les échecs
const failResults = results.filter(r => r.status === "❌");
if (failResults.length > 0) {
  console.log(`\n❌ ÉCHECS (${failResults.length}):`);
  console.log("─".repeat(120));
  for (const r of failResults) {
    console.log(`  ${r.paymentType.padEnd(14)} | geo=${(r.detectedCountry || "null").padEnd(4)} | seller=${(r.sellerCountry || "null").padEnd(4)} | phone=${r.phoneLabel.padEnd(22)} | → ${r.result} | ${r.note}`);
  }
}

// Afficher les warnings
const warnResults = results.filter(r => r.status === "⚠️");
if (warnResults.length > 0) {
  console.log(`\n⚠️  WARNINGS (${warnResults.length}):`);
  console.log("─".repeat(120));
  for (const r of warnResults) {
    console.log(`  ${r.paymentType.padEnd(14)} | geo=${(r.detectedCountry || "null").padEnd(4)} | seller=${(r.sellerCountry || "null").padEnd(4)} | phone=${r.phoneLabel.padEnd(22)} | → ${r.result} | ${r.note}`);
  }
}

// ── Scénarios réels détaillés ──
console.log("\n\n══════════════════════════════════════════════════════════════");
console.log("  SCÉNARIOS RÉELS COURANTS");
console.log("══════════════════════════════════════════════════════════════\n");

const scenarios: { desc: string; geo: string | null; type: string; seller: string; phone: string | null; expected: string }[] = [
  // Sénégalais au Sénégal
  { desc: "Dakarois paie Wave SN",                      geo: "SN", type: "wave_money",   seller: "SN", phone: "+221771234567", expected: "SN" },
  { desc: "Dakarois paie Orange SN",                    geo: "SN", type: "orange_money",  seller: "SN", phone: "+221781234567", expected: "SN" },
  { desc: "Dakarois paie par carte",                    geo: "SN", type: "card",          seller: "SN", phone: "+221771234567", expected: "SN" },

  // Sénégalais en France (diaspora)
  { desc: "Sénégalais à Paris, Wave SN (+221)",         geo: "FR", type: "wave_money",   seller: "SN", phone: "+221771234567", expected: "SN" },
  { desc: "Sénégalais à Paris, Orange SN (+221)",       geo: "FR", type: "orange_money",  seller: "SN", phone: "+221781234567", expected: "SN" },
  { desc: "Sénégalais à Paris, carte",                  geo: "FR", type: "card",          seller: "SN", phone: "+221771234567", expected: "FR" },

  // Ivoirien en Côte d'Ivoire
  { desc: "Abidjanais paie Wave CI",                    geo: "CI", type: "wave_money",   seller: "CI", phone: "+2250712345678", expected: "CI" },
  { desc: "Abidjanais paie Orange CI",                  geo: "CI", type: "orange_money",  seller: "CI", phone: "+2250712345678", expected: "CI" },

  // Ivoirien en France
  { desc: "Ivoirien à Paris, Wave CI (+225)",           geo: "FR", type: "wave_money",   seller: "SN", phone: "+2250712345678", expected: "CI" },
  { desc: "Ivoirien à Lyon, Orange CI (+225)",          geo: "FR", type: "orange_money",  seller: "SN", phone: "+2250712345678", expected: "CI" },

  // Burkinabè
  { desc: "Ouagalais paie Wave BF",                     geo: "BF", type: "wave_money",   seller: "BF", phone: "+22670123456",   expected: "BF" },
  { desc: "Burkinabè en France, Wave BF (+226)",        geo: "FR", type: "wave_money",   seller: "SN", phone: "+22670123456",   expected: "BF" },

  // Malien
  { desc: "Bamakois paie Orange ML",                    geo: "ML", type: "orange_money",  seller: "ML", phone: "+22370123456",   expected: "ML" },
  { desc: "Malien à Paris, Orange ML (+223)",           geo: "FR", type: "orange_money",  seller: "SN", phone: "+22370123456",   expected: "ML" },

  // Français (numéro français, pas de mobile money africain)
  { desc: "Français paie Wave → numéro FR non supporté",geo: "FR", type: "wave_money",   seller: "SN", phone: "+33612345678",   expected: "SN" },
  { desc: "Français paie carte",                        geo: "FR", type: "card",          seller: "SN", phone: "+33612345678",   expected: "FR" },
  { desc: "Américain paie carte",                       geo: "US", type: "card",          seller: "SN", phone: "+12125551234",   expected: "US" },

  // Cross-country : vendeur CI, acheteur SN
  { desc: "Sénégalais achète chez vendeur CI (Wave)",   geo: "SN", type: "wave_money",   seller: "CI", phone: "+221771234567",  expected: "SN" },
  { desc: "Ivoirien achète chez vendeur SN (Wave)",     geo: "CI", type: "wave_money",   seller: "SN", phone: "+2250712345678", expected: "CI" },
  { desc: "Ivoirien achète chez vendeur SN (Orange)",   geo: "CI", type: "orange_money",  seller: "SN", phone: "+2250712345678", expected: "CI" },

  // Sénégalais en Belgique, USA, Canada
  { desc: "Sénégalais à Bruxelles, Wave SN",           geo: "BE", type: "wave_money",   seller: "SN", phone: "+221771234567",  expected: "SN" },
  { desc: "Sénégalais à Montréal, Wave SN",            geo: "CA", type: "wave_money",   seller: "SN", phone: "+221771234567",  expected: "SN" },
  { desc: "Sénégalais à New York, Orange SN",           geo: "US", type: "orange_money",  seller: "SN", phone: "+221781234567",  expected: "SN" },

  // Edge cases : pas de téléphone
  { desc: "Géo SN, pas de téléphone, Wave",             geo: "SN", type: "wave_money",   seller: "SN", phone: null,             expected: "SN" },
  { desc: "Géo FR, pas de téléphone, Wave (→ seller)",  geo: "FR", type: "wave_money",   seller: "SN", phone: null,             expected: "SN" },
  { desc: "Géo FR, pas de tél, seller CI, Wave (→ CI)", geo: "FR", type: "wave_money",   seller: "CI", phone: null,             expected: "CI" },
  { desc: "Géo null, tél null, seller null, Wave",      geo: null, type: "wave_money",   seller: null, phone: null,             expected: "SN" },
  { desc: "Géo null, tél null, seller null, carte",     geo: null, type: "card",          seller: null, phone: null,             expected: "SN" },

  // Numéro sans indicatif (local)
  { desc: "Numéro local 77XXX (pas d'indicatif), Wave", geo: "SN", type: "wave_money",   seller: "SN", phone: "771234567",      expected: "SN" },

  // Togolais essaie Wave (non supporté au Togo)
  { desc: "Togolais +228, Wave (TG non supporté)",      geo: "TG", type: "wave_money",   seller: "SN", phone: "+22890123456",   expected: "SN" },
  { desc: "Béninois +229, Orange (BJ non supporté)",    geo: "BJ", type: "orange_money",  seller: "CI", phone: "+22990123456",   expected: "CI" },
];

let scenarioPassed = 0;
let scenarioFailed = 0;

for (const s of scenarios) {
  const result = getBictorysCountry(s.geo, s.type, s.seller, s.phone);
  const ok = result === s.expected;
  if (ok) scenarioPassed++;
  else scenarioFailed++;
  
  const icon = ok ? "✅" : "❌";
  const detail = ok ? "" : ` (attendu ${s.expected}, obtenu ${result})`;
  console.log(`  ${icon} ${s.desc.padEnd(52)} → ${result}${detail}`);
}

// ── Bilan final ──
console.log("\n\n══════════════════════════════════════════════════════════════");
console.log("  BILAN FINAL");
console.log("══════════════════════════════════════════════════════════════");
console.log(`  Combinaisons totales testées : ${results.length}`);
console.log(`  Mobile money : ✅ ${passed} OK  |  ⚠️ ${warnings} warnings  |  ❌ ${failures} échecs`);
console.log(`  Scénarios réels : ✅ ${scenarioPassed} OK  |  ❌ ${scenarioFailed} échecs`);
console.log("══════════════════════════════════════════════════════════════");

if (failures > 0 || scenarioFailed > 0) {
  process.exit(1);
} else {
  console.log("\n🎉 Tous les tests passent !");
  process.exit(0);
}
