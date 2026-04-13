"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
  format: string;
}

const COUNTRIES: Country[] = [
  // ── Afrique francophone (prioritaires) ──
  { code: "SN", name: "Sénégal", dial: "+221", flag: "🇸🇳", format: "XX XXX XX XX" },
  { code: "CI", name: "Côte d'Ivoire", dial: "+225", flag: "🇨🇮", format: "XX XX XX XX XX" },
  { code: "ML", name: "Mali", dial: "+223", flag: "🇲🇱", format: "XX XX XX XX" },
  { code: "BF", name: "Burkina Faso", dial: "+226", flag: "🇧🇫", format: "XX XX XX XX" },
  { code: "GN", name: "Guinée", dial: "+224", flag: "🇬🇳", format: "XXX XX XX XX" },
  { code: "NE", name: "Niger", dial: "+227", flag: "🇳🇪", format: "XX XX XX XX" },
  { code: "TG", name: "Togo", dial: "+228", flag: "🇹🇬", format: "XX XX XX XX" },
  { code: "BJ", name: "Bénin", dial: "+229", flag: "🇧🇯", format: "XX XX XX XX" },
  { code: "MR", name: "Mauritanie", dial: "+222", flag: "🇲🇷", format: "XX XX XX XX" },
  { code: "GW", name: "Guinée-Bissau", dial: "+245", flag: "🇬🇼", format: "XXX XXXX" },
  { code: "CM", name: "Cameroun", dial: "+237", flag: "🇨🇲", format: "X XX XX XX XX" },
  { code: "GA", name: "Gabon", dial: "+241", flag: "🇬🇦", format: "X XX XX XX" },
  { code: "CG", name: "Congo", dial: "+242", flag: "🇨🇬", format: "XX XXX XXXX" },
  { code: "CD", name: "RD Congo", dial: "+243", flag: "🇨🇩", format: "XXX XXX XXX" },
  { code: "MA", name: "Maroc", dial: "+212", flag: "🇲🇦", format: "X XX XX XX XX" },
  // ── Reste de l'Afrique ──
  { code: "TD", name: "Tchad", dial: "+235", flag: "🇹🇩", format: "XX XX XX XX" },
  { code: "GQ", name: "Guinée Équat.", dial: "+240", flag: "🇬🇶", format: "XXX XXX XXX" },
  { code: "CF", name: "Centrafrique", dial: "+236", flag: "🇨🇫", format: "XX XX XX XX" },
  { code: "BI", name: "Burundi", dial: "+257", flag: "🇧🇮", format: "XX XX XX XX" },
  { code: "RW", name: "Rwanda", dial: "+250", flag: "🇷🇼", format: "XXX XXX XXX" },
  { code: "KM", name: "Comores", dial: "+269", flag: "🇰🇲", format: "XXX XX XX" },
  { code: "DJ", name: "Djibouti", dial: "+253", flag: "🇩🇯", format: "XX XX XX XX" },
  { code: "MG", name: "Madagascar", dial: "+261", flag: "🇲🇬", format: "XX XX XXX XX" },
  { code: "SC", name: "Seychelles", dial: "+248", flag: "🇸🇨", format: "X XX XX XX" },
  { code: "DZ", name: "Algérie", dial: "+213", flag: "🇩🇿", format: "XXX XX XX XX" },
  { code: "TN", name: "Tunisie", dial: "+216", flag: "🇹🇳", format: "XX XXX XXX" },
  { code: "LY", name: "Libye", dial: "+218", flag: "🇱🇾", format: "XX XXX XXXX" },
  { code: "EG", name: "Égypte", dial: "+20", flag: "🇪🇬", format: "XX XXXX XXXX" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬", format: "XXX XXX XXXX" },
  { code: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭", format: "XX XXX XXXX" },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪", format: "XXX XXX XXX" },
  { code: "TZ", name: "Tanzanie", dial: "+255", flag: "🇹🇿", format: "XXX XXX XXX" },
  { code: "UG", name: "Ouganda", dial: "+256", flag: "🇺🇬", format: "XXX XXX XXX" },
  { code: "ZA", name: "Afrique du Sud", dial: "+27", flag: "🇿🇦", format: "XX XXX XXXX" },
  { code: "ET", name: "Éthiopie", dial: "+251", flag: "🇪🇹", format: "XX XXX XXXX" },
  { code: "SD", name: "Soudan", dial: "+249", flag: "🇸🇩", format: "XX XXX XXXX" },
  { code: "SS", name: "Soudan du Sud", dial: "+211", flag: "🇸🇸", format: "XX XXX XXXX" },
  { code: "SO", name: "Somalie", dial: "+252", flag: "🇸🇴", format: "XX XXX XXX" },
  { code: "ER", name: "Érythrée", dial: "+291", flag: "🇪🇷", format: "X XXX XXX" },
  { code: "AO", name: "Angola", dial: "+244", flag: "🇦🇴", format: "XXX XXX XXX" },
  { code: "MZ", name: "Mozambique", dial: "+258", flag: "🇲🇿", format: "XX XXX XXXX" },
  { code: "ZM", name: "Zambie", dial: "+260", flag: "🇿🇲", format: "XX XXX XXXX" },
  { code: "ZW", name: "Zimbabwe", dial: "+263", flag: "🇿🇼", format: "XX XXX XXXX" },
  { code: "MW", name: "Malawi", dial: "+265", flag: "🇲🇼", format: "X XXXX XXXX" },
  { code: "BW", name: "Botswana", dial: "+267", flag: "🇧🇼", format: "XX XXX XXX" },
  { code: "NA", name: "Namibie", dial: "+264", flag: "🇳🇦", format: "XX XXX XXXX" },
  { code: "SZ", name: "Eswatini", dial: "+268", flag: "🇸🇿", format: "XXXX XXXX" },
  { code: "LS", name: "Lesotho", dial: "+266", flag: "🇱🇸", format: "XXXX XXXX" },
  { code: "MU", name: "Maurice", dial: "+230", flag: "🇲🇺", format: "XXXX XXXX" },
  { code: "SL", name: "Sierra Leone", dial: "+232", flag: "🇸🇱", format: "XX XXX XXX" },
  { code: "LR", name: "Liberia", dial: "+231", flag: "🇱🇷", format: "XX XXX XXXX" },
  { code: "CV", name: "Cap-Vert", dial: "+238", flag: "🇨🇻", format: "XXX XX XX" },
  { code: "ST", name: "São Tomé-et-Príncipe", dial: "+239", flag: "🇸🇹", format: "XXX XXXX" },
  { code: "GM", name: "Gambie", dial: "+220", flag: "🇬🇲", format: "XXX XXXX" },
  // ── Europe ──
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷", format: "X XX XX XX XX" },
  { code: "BE", name: "Belgique", dial: "+32", flag: "🇧🇪", format: "XXX XX XX XX" },
  { code: "CH", name: "Suisse", dial: "+41", flag: "🇨🇭", format: "XX XXX XX XX" },
  { code: "GB", name: "Royaume-Uni", dial: "+44", flag: "🇬🇧", format: "XXXX XXX XXX" },
  { code: "DE", name: "Allemagne", dial: "+49", flag: "🇩🇪", format: "XXX XXXXXXX" },
  { code: "ES", name: "Espagne", dial: "+34", flag: "🇪🇸", format: "XXX XXX XXX" },
  { code: "IT", name: "Italie", dial: "+39", flag: "🇮🇹", format: "XXX XXX XXXX" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹", format: "XXX XXX XXX" },
  { code: "NL", name: "Pays-Bas", dial: "+31", flag: "🇳🇱", format: "X XXXX XXXX" },
  { code: "LU", name: "Luxembourg", dial: "+352", flag: "🇱🇺", format: "XXX XXX XXX" },
  { code: "AT", name: "Autriche", dial: "+43", flag: "🇦🇹", format: "XXX XXXXXXX" },
  { code: "SE", name: "Suède", dial: "+46", flag: "🇸🇪", format: "XX XXX XX XX" },
  { code: "NO", name: "Norvège", dial: "+47", flag: "🇳🇴", format: "XXX XX XXX" },
  { code: "DK", name: "Danemark", dial: "+45", flag: "🇩🇰", format: "XX XX XX XX" },
  { code: "FI", name: "Finlande", dial: "+358", flag: "🇫🇮", format: "XX XXX XXXX" },
  { code: "IE", name: "Irlande", dial: "+353", flag: "🇮🇪", format: "XX XXX XXXX" },
  { code: "PL", name: "Pologne", dial: "+48", flag: "🇵🇱", format: "XXX XXX XXX" },
  { code: "CZ", name: "Tchéquie", dial: "+420", flag: "🇨🇿", format: "XXX XXX XXX" },
  { code: "RO", name: "Roumanie", dial: "+40", flag: "🇷🇴", format: "XXX XXX XXX" },
  { code: "HU", name: "Hongrie", dial: "+36", flag: "🇭🇺", format: "XX XXX XXXX" },
  { code: "GR", name: "Grèce", dial: "+30", flag: "🇬🇷", format: "XXX XXX XXXX" },
  { code: "BG", name: "Bulgarie", dial: "+359", flag: "🇧🇬", format: "XX XXX XXXX" },
  { code: "HR", name: "Croatie", dial: "+385", flag: "🇭🇷", format: "XX XXX XXXX" },
  { code: "RS", name: "Serbie", dial: "+381", flag: "🇷🇸", format: "XX XXX XXXX" },
  { code: "SK", name: "Slovaquie", dial: "+421", flag: "🇸🇰", format: "XXX XXX XXX" },
  { code: "SI", name: "Slovénie", dial: "+386", flag: "🇸🇮", format: "XX XXX XXX" },
  { code: "UA", name: "Ukraine", dial: "+380", flag: "🇺🇦", format: "XX XXX XX XX" },
  { code: "RU", name: "Russie", dial: "+7", flag: "🇷🇺", format: "XXX XXX XX XX" },
  { code: "TR", name: "Turquie", dial: "+90", flag: "🇹🇷", format: "XXX XXX XXXX" },
  // ── Amérique du Nord ──
  { code: "US", name: "États-Unis", dial: "+1", flag: "🇺🇸", format: "XXX XXX XXXX" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", format: "XXX XXX XXXX" },
  { code: "MX", name: "Mexique", dial: "+52", flag: "🇲🇽", format: "XX XXXX XXXX" },
  // ── Amérique du Sud & Caraïbes ──
  { code: "BR", name: "Brésil", dial: "+55", flag: "🇧🇷", format: "XX XXXXX XXXX" },
  { code: "AR", name: "Argentine", dial: "+54", flag: "🇦🇷", format: "XX XXXX XXXX" },
  { code: "CO", name: "Colombie", dial: "+57", flag: "🇨🇴", format: "XXX XXX XXXX" },
  { code: "CL", name: "Chili", dial: "+56", flag: "🇨🇱", format: "X XXXX XXXX" },
  { code: "PE", name: "Pérou", dial: "+51", flag: "🇵🇪", format: "XXX XXX XXX" },
  { code: "VE", name: "Venezuela", dial: "+58", flag: "🇻🇪", format: "XXX XXX XXXX" },
  { code: "EC", name: "Équateur", dial: "+593", flag: "🇪🇨", format: "XX XXX XXXX" },
  { code: "HT", name: "Haïti", dial: "+509", flag: "🇭🇹", format: "XXXX XXXX" },
  { code: "DO", name: "Rép. Dominicaine", dial: "+1809", flag: "🇩🇴", format: "XXX XXXX" },
  { code: "GP", name: "Guadeloupe", dial: "+590", flag: "🇬🇵", format: "XXX XX XX XX" },
  { code: "MQ", name: "Martinique", dial: "+596", flag: "🇲🇶", format: "XXX XX XX XX" },
  { code: "GF", name: "Guyane française", dial: "+594", flag: "🇬🇫", format: "XXX XX XX XX" },
  { code: "RE", name: "La Réunion", dial: "+262", flag: "🇷🇪", format: "XXX XX XX XX" },
  { code: "YT", name: "Mayotte", dial: "+262", flag: "🇾🇹", format: "XXX XX XX XX" },
  // ── Asie ──
  { code: "CN", name: "Chine", dial: "+86", flag: "🇨🇳", format: "XXX XXXX XXXX" },
  { code: "IN", name: "Inde", dial: "+91", flag: "🇮🇳", format: "XXXXX XXXXX" },
  { code: "JP", name: "Japon", dial: "+81", flag: "🇯🇵", format: "XX XXXX XXXX" },
  { code: "KR", name: "Corée du Sud", dial: "+82", flag: "🇰🇷", format: "XX XXXX XXXX" },
  { code: "ID", name: "Indonésie", dial: "+62", flag: "🇮🇩", format: "XXX XXXX XXXX" },
  { code: "TH", name: "Thaïlande", dial: "+66", flag: "🇹🇭", format: "XX XXX XXXX" },
  { code: "VN", name: "Viêt Nam", dial: "+84", flag: "🇻🇳", format: "XX XXX XX XX" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭", format: "XXX XXX XXXX" },
  { code: "MY", name: "Malaisie", dial: "+60", flag: "🇲🇾", format: "XX XXXX XXXX" },
  { code: "SG", name: "Singapour", dial: "+65", flag: "🇸🇬", format: "XXXX XXXX" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰", format: "XXX XXX XXXX" },
  { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩", format: "XXXX XXX XXX" },
  { code: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰", format: "XX XXX XXXX" },
  // ── Moyen-Orient ──
  { code: "SA", name: "Arabie Saoudite", dial: "+966", flag: "🇸🇦", format: "XX XXX XXXX" },
  { code: "AE", name: "Émirats arabes unis", dial: "+971", flag: "🇦🇪", format: "XX XXX XXXX" },
  { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦", format: "XXXX XXXX" },
  { code: "KW", name: "Koweït", dial: "+965", flag: "🇰🇼", format: "XXXX XXXX" },
  { code: "BH", name: "Bahreïn", dial: "+973", flag: "🇧🇭", format: "XXXX XXXX" },
  { code: "OM", name: "Oman", dial: "+968", flag: "🇴🇲", format: "XXXX XXXX" },
  { code: "JO", name: "Jordanie", dial: "+962", flag: "🇯🇴", format: "X XXXX XXXX" },
  { code: "LB", name: "Liban", dial: "+961", flag: "🇱🇧", format: "XX XXX XXX" },
  { code: "IQ", name: "Irak", dial: "+964", flag: "🇮🇶", format: "XXX XXX XXXX" },
  { code: "IL", name: "Israël", dial: "+972", flag: "🇮🇱", format: "XX XXX XXXX" },
  // ── Océanie ──
  { code: "AU", name: "Australie", dial: "+61", flag: "🇦🇺", format: "XXX XXX XXX" },
  { code: "NZ", name: "Nouvelle-Zélande", dial: "+64", flag: "🇳🇿", format: "XX XXX XXXX" },
  { code: "NC", name: "Nouvelle-Calédonie", dial: "+687", flag: "🇳🇨", format: "XX XX XX" },
  { code: "PF", name: "Polynésie française", dial: "+689", flag: "🇵🇫", format: "XX XX XX XX" },
];

const PRIORITY_CODES = ["SN", "CI", "ML", "BF", "GN", "CM", "TG", "BJ", "NE", "MR", "GA", "CG", "CD", "MA"];

const COUNTRIES_BY_DIAL_LENGTH = [...COUNTRIES].sort(
  (a, b) => b.dial.replace(/\D/g, "").length - a.dial.replace(/\D/g, "").length
);

function getMaxDigits(format: string): number {
  return (format.match(/X/g) || []).length;
}

function formatPhone(raw: string, format: string): string {
  const digits = raw.replace(/\D/g, "");
  let result = "";
  let digitIdx = 0;
  for (const ch of format) {
    if (digitIdx >= digits.length) break;
    if (ch === "X") { result += digits[digitIdx]; digitIdx++; } else { result += ch; }
  }
  return result;
}

function getPlaceholder(format: string): string {
  let idx = 0;
  const digits = "70123456789";
  return format.replace(/X/g, () => digits[idx++ % digits.length]);
}

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string, rawDigits: string, countryCode: string) => void;
  defaultCountry?: string;
  allowedCountries?: string[];
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry,
  allowedCountries,
  label,
  hint,
  error,
  required,
  className,
}: PhoneInputProps) {
  const availableCountries = allowedCountries
    ? COUNTRIES.filter((c) => allowedCountries.includes(c.code))
    : COUNTRIES;

  const priorityCountries = availableCountries.filter((c) => PRIORITY_CODES.includes(c.code));
  const otherCountries = availableCountries.filter((c) => !PRIORITY_CODES.includes(c.code));

  const [country, setCountry] = useState<Country>(() => {
    if (defaultCountry) return COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES[0];
    if (typeof window !== "undefined") {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const tzMap: Record<string, string> = {
          "Africa/Dakar": "SN", "Africa/Abidjan": "CI", "Africa/Bamako": "ML",
          "Africa/Ouagadougou": "BF", "Africa/Conakry": "GN", "Africa/Niamey": "NE",
          "Africa/Lome": "TG", "Africa/Porto-Novo": "BJ", "Africa/Nouakchott": "MR",
          "Africa/Bissau": "GW", "Africa/Douala": "CM", "Africa/Libreville": "GA",
          "Africa/Brazzaville": "CG", "Africa/Kinshasa": "CD", "Africa/Casablanca": "MA",
          "Africa/Ndjamena": "TD", "Africa/Malabo": "GQ", "Africa/Bangui": "CF",
          "Africa/Bujumbura": "BI", "Africa/Kigali": "RW", "Indian/Comoro": "KM",
          "Africa/Djibouti": "DJ", "Indian/Antananarivo": "MG", "Indian/Mahe": "SC",
          "Africa/Algiers": "DZ", "Africa/Tunis": "TN", "Africa/Tripoli": "LY",
          "Africa/Cairo": "EG", "Africa/Lagos": "NG", "Africa/Accra": "GH",
          "Africa/Nairobi": "KE", "Africa/Dar_es_Salaam": "TZ", "Africa/Kampala": "UG",
          "Africa/Johannesburg": "ZA", "Africa/Addis_Ababa": "ET", "Africa/Khartoum": "SD",
          "Africa/Juba": "SS", "Africa/Mogadishu": "SO", "Africa/Asmara": "ER",
          "Africa/Luanda": "AO", "Africa/Maputo": "MZ", "Africa/Lusaka": "ZM",
          "Africa/Harare": "ZW", "Africa/Blantyre": "MW", "Africa/Gaborone": "BW",
          "Africa/Windhoek": "NA", "Africa/Mbabane": "SZ", "Africa/Maseru": "LS",
          "Indian/Mauritius": "MU", "Africa/Freetown": "SL", "Africa/Monrovia": "LR",
          "Atlantic/Cape_Verde": "CV", "Africa/Sao_Tome": "ST", "Africa/Banjul": "GM",
          "Europe/Paris": "FR", "Europe/Brussels": "BE", "Europe/Zurich": "CH",
          "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Madrid": "ES",
          "Europe/Rome": "IT", "Europe/Lisbon": "PT", "Europe/Amsterdam": "NL",
          "Europe/Luxembourg": "LU", "Europe/Vienna": "AT", "Europe/Stockholm": "SE",
          "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI",
          "Europe/Dublin": "IE", "Europe/Warsaw": "PL", "Europe/Prague": "CZ",
          "Europe/Bucharest": "RO", "Europe/Budapest": "HU", "Europe/Athens": "GR",
          "Europe/Sofia": "BG", "Europe/Zagreb": "HR", "Europe/Belgrade": "RS",
          "Europe/Bratislava": "SK", "Europe/Ljubljana": "SI", "Europe/Kiev": "UA",
          "Europe/Moscow": "RU", "Europe/Istanbul": "TR",
          "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US",
          "America/Toronto": "CA", "America/Mexico_City": "MX",
          "America/Sao_Paulo": "BR", "America/Argentina/Buenos_Aires": "AR",
          "America/Bogota": "CO", "America/Santiago": "CL", "America/Lima": "PE",
          "America/Caracas": "VE", "America/Guayaquil": "EC", "America/Port-au-Prince": "HT",
          "America/Santo_Domingo": "DO", "America/Guadeloupe": "GP", "America/Martinique": "MQ",
          "America/Cayenne": "GF", "Indian/Reunion": "RE", "Indian/Mayotte": "YT",
          "Asia/Shanghai": "CN", "Asia/Kolkata": "IN", "Asia/Tokyo": "JP", "Asia/Seoul": "KR",
          "Asia/Jakarta": "ID", "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN",
          "Asia/Manila": "PH", "Asia/Kuala_Lumpur": "MY", "Asia/Singapore": "SG",
          "Asia/Karachi": "PK", "Asia/Dhaka": "BD", "Asia/Colombo": "LK",
          "Asia/Riyadh": "SA", "Asia/Dubai": "AE", "Asia/Qatar": "QA", "Asia/Kuwait": "KW",
          "Asia/Bahrain": "BH", "Asia/Muscat": "OM", "Asia/Amman": "JO", "Asia/Beirut": "LB",
          "Asia/Baghdad": "IQ", "Asia/Jerusalem": "IL",
          "Australia/Sydney": "AU", "Pacific/Auckland": "NZ", "Pacific/Noumea": "NC",
          "Pacific/Tahiti": "PF",
        };
        const detected = tzMap[tz];
        if (detected) { const found = COUNTRIES.find((c) => c.code === detected); if (found) return found; }
      } catch { /* fallback */ }
    }
    return COUNTRIES[0];
  });

  const [localDigits, setLocalDigits] = useState(() => {
    if (!value) return "";
    const digits = value.replace(/\D/g, "");
    const init = defaultCountry ? COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES[0] : COUNTRIES[0];
    const dd = init.dial.replace(/\D/g, "");
    return digits.startsWith(dd) ? digits.slice(dd.length) : digits;
  });

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  // Position dropdown
  useEffect(() => {
    if (!open || !wrapperRef.current) return;
    const update = () => {
      const r = wrapperRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) { setSearch(""); setTimeout(() => searchRef.current?.focus(), 50); }
  }, [open]);

  // Close on click outside — but NOT on scrollbar clicks
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const dd = dropdownRef.current;
      if (!dd) return;
      // If click is inside the dropdown bounding box, don't close (handles scrollbar)
      const rect = dd.getBoundingClientRect();
      if (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      ) return;
      // If click is inside trigger area, let toggle handle it
      if (wrapperRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  // Sync external value
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!value) { setLocalDigits(""); }
    else {
      const digits = value.replace(/\D/g, "");
      const tc = defaultCountry ? COUNTRIES.find((c) => c.code === defaultCountry) || country : country;
      if (defaultCountry && tc.code !== country.code) setCountry(tc);
      const dd = tc.dial.replace(/\D/g, "");
      setLocalDigits(digits.startsWith(dd) ? digits.slice(dd.length) : digits);
    }
  }

  const handleInputChange = useCallback((raw: string) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.length > getMaxDigits(country.format)) {
      for (const c of COUNTRIES_BY_DIAL_LENGTH) {
        const cd = c.dial.replace(/\D/g, "");
        if (digits.startsWith(cd)) {
          const lp = digits.slice(cd.length);
          if (lp.length > 0 && lp.length <= getMaxDigits(c.format)) {
            if (c.code !== country.code) setCountry(c);
            setLocalDigits(lp);
            onChange(`${c.dial} ${formatPhone(lp, c.format)}`.trim(), lp, c.code);
            return;
          }
        }
      }
    }
    const dd = country.dial.replace(/\D/g, "");
    if (digits.startsWith(dd) && digits.length > getMaxDigits(country.format)) digits = digits.slice(dd.length);
    const trimmed = digits.slice(0, getMaxDigits(country.format));
    setLocalDigits(trimmed);
    if (!trimmed) onChange("", "", country.code);
    else onChange(`${country.dial} ${formatPhone(trimmed, country.format)}`.trim(), trimmed, country.code);
  }, [country, onChange]);

  const handleCountrySelect = useCallback((c: Country) => {
    setCountry(c);
    setOpen(false);
    setSearch("");
    const mx = getMaxDigits(c.format);
    const trimmed = localDigits.slice(0, mx);
    setLocalDigits(trimmed);
    if (!trimmed) onChange("", "", c.code);
    else onChange(`${c.dial} ${formatPhone(trimmed, c.format)}`.trim(), trimmed, c.code);
  }, [localDigits, onChange]);

  const filterFn = (c: Country) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase());

  const fp = search ? priorityCountries.filter(filterFn) : priorityCountries;
  const fo = search ? otherCountries.filter(filterFn) : otherCountries;
  const displayValue = formatPhone(localDigits, country.format);

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--theme-modal-text-muted, #374151)" }}>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <div ref={wrapperRef} className="relative flex items-center phone-input-wrapper">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-[48px] shrink-0 items-center gap-1.5 rounded-l-xl border border-r-0 px-3 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--theme-input-bg, #F9FAFB)",
            borderColor: open ? "var(--theme-primary, #0D9488)" : error ? "#EF4444" : "var(--theme-input-border, #D1D5DB)",
            color: "var(--theme-input-text, #374151)",
          }}
        >
          <span className="text-lg leading-none">{country.flag}</span>
          <span className="text-xs font-semibold" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>{country.dial}</span>
          <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }} />
        </button>

        <input
          type="tel" inputMode="tel" autoComplete="tel"
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={getPlaceholder(country.format)}
          required={required}
          className={cn("h-[48px] flex-1 min-w-0 rounded-r-xl border px-4 text-sm font-medium transition-all placeholder:opacity-50", "focus:outline-none focus:ring-1")}
          style={{
            backgroundColor: "var(--theme-input-bg, #FFFFFF)",
            borderColor: error ? "#EF4444" : "var(--theme-input-border, #D1D5DB)",
            color: "var(--theme-input-text, #111827)",
            ...(error ? { "--tw-ring-color": "#EF4444" } as React.CSSProperties : { "--tw-ring-color": "var(--theme-primary, #0D9488)" } as React.CSSProperties),
          }}
        />
      </div>

      {/* Dropdown via portal */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 99999,
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            backgroundColor: "#fff",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          }}
        >
          {/* Search */}
          <div style={{ padding: 8, borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un pays..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                outline: "none",
                backgroundColor: "#F9FAFB",
                fontSize: 14,
                color: "#111827",
              }}
            />
          </div>

          {/* Scrollable list — data-lenis-prevent stops Lenis from hijacking wheel events */}
          <div data-lenis-prevent style={{ overflowY: "scroll", maxHeight: 260 }}>
            {fp.length === 0 && fo.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                Aucun pays trouvé
              </div>
            )}
            {fp.map((c) => (
              <CountryRow key={c.code} country={c} selected={country.code === c.code} onSelect={handleCountrySelect} />
            ))}
            {fp.length > 0 && fo.length > 0 && (
              <div style={{ height: 1, backgroundColor: "#E5E7EB", margin: "4px 12px" }} />
            )}
            {fo.map((c) => (
              <CountryRow key={c.code} country={c} selected={country.code === c.code} onSelect={handleCountrySelect} />
            ))}
          </div>
        </div>,
        document.body
      )}

      {hint && !error && (
        <p className="mt-1.5 ml-1 text-[10px] font-medium" style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}>{hint}</p>
      )}
      {error && <p className="mt-1 ml-1 text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}

function CountryRow({ country, selected, onSelect }: { country: Country; selected: boolean; onSelect: (c: Country) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: "none",
        backgroundColor: selected ? "#F0FDFA" : "transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "#F9FAFB"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{country.flag}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#111827" }}>{country.name}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>{country.dial}</span>
      {selected && <Check size={14} color="#0D9488" />}
    </button>
  );
}

export { COUNTRIES, PRIORITY_CODES };
export type { PhoneInputProps };
