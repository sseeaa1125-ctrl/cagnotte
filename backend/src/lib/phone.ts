/**
 * Pays supportés pour les payouts mobile money.
 * dial = indicatif sans le +, localDigits = nombre de chiffres après l'indicatif.
 */
const SUPPORTED_COUNTRIES: { code: string; dial: string; localDigits: number[] }[] = [
  { code: "SN", dial: "221", localDigits: [9] },
  { code: "CI", dial: "225", localDigits: [10] },
  { code: "ML", dial: "223", localDigits: [8] },
  { code: "BF", dial: "226", localDigits: [8] },
  { code: "GN", dial: "224", localDigits: [9] },
  { code: "NE", dial: "227", localDigits: [8] },
  { code: "TG", dial: "228", localDigits: [8] },
  { code: "BJ", dial: "229", localDigits: [8] },
  { code: "MR", dial: "222", localDigits: [8] },
  { code: "GW", dial: "245", localDigits: [7] },
  { code: "CM", dial: "237", localDigits: [9] },
  { code: "GA", dial: "241", localDigits: [7, 8] },
  { code: "CG", dial: "242", localDigits: [9] },
  { code: "CD", dial: "243", localDigits: [9] },
  { code: "MA", dial: "212", localDigits: [9] },
];

/**
 * Normaliser un numéro africain au format Bictorys : +INDICATIF+NUMERO collé.
 * Accepte : "770000000", "+221 77 000 00 00", "00221770000000", "221770000000"
 * Retourne : "+221XXXXXXXXX" ou null si invalide.
 * Le paramètre `countryHint` (ex: "SN") aide à interpréter les numéros locaux.
 */
export function normalizePhone(phone: string, countryHint?: string): string | null {
  let clean = phone.replace(/[\s\-\.\(\)+]/g, "");

  // Retirer le 00 devant (format international alternatif)
  if (clean.startsWith("00")) {
    clean = clean.slice(2);
  }

  // Tenter de matcher un indicatif connu
  for (const country of SUPPORTED_COUNTRIES) {
    if (clean.startsWith(country.dial)) {
      const local = clean.slice(country.dial.length);
      if (country.localDigits.includes(local.length)) {
        return "+" + clean;
      }
    }
  }

  // Numéro local sans indicatif — utiliser le hint pays
  if (countryHint) {
    const country = SUPPORTED_COUNTRIES.find((c) => c.code === countryHint);
    if (country && country.localDigits.includes(clean.length)) {
      return "+" + country.dial + clean;
    }
  }

  // Fallback Sénégal : 9 chiffres commençant par 7
  if (/^7[0-9]{8}$/.test(clean)) {
    return "+221" + clean;
  }

  return null;
}

/**
 * Extraire le code pays ISO à partir d'un numéro normalisé (ex: "+221..." → "SN")
 */
export function getCountryFromPhone(normalizedPhone: string): string {
  const digits = normalizedPhone.replace(/^\+/, "");
  for (const country of SUPPORTED_COUNTRIES) {
    if (digits.startsWith(country.dial)) {
      return country.code;
    }
  }
  return "SN"; // Fallback
}

/**
 * Nettoyer un numéro pour le stockage en DB et l'envoi à Bictorys.
 * Accepte tout format du PhoneInput ("+221 77 123 45 67") ou brut ("221771234567").
 * Retourne le format Bictorys : "+221771234567" (+ indicatif + numéro, tout collé).
 * Si le numéro a déjà un indicatif reconnu, on ajoute juste le +.
 * Sinon on retourne +digits tel quel.
 */
export function cleanPhoneForStorage(phone: string): string {
  let clean = phone.replace(/[\s\-\.\(\)]/g, "");
  // Garder le + s'il existe, sinon on l'ajoutera
  const hasPlus = clean.startsWith("+");
  if (hasPlus) clean = clean.slice(1);
  // Retirer le 00 devant (format international alternatif)
  if (clean.startsWith("00")) clean = clean.slice(2);
  return "+" + clean;
}

/**
 * Masquer un numéro pour l'affichage sécurisé
 * 221772543344 → 221 77****44
 */
export function maskPhone(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.length < 8) return "***";
  return clean.slice(0, 5) + "****" + clean.slice(-2);
}
