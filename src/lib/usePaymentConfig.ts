"use client";

import { useState, useEffect } from "react";
import { BACKEND_URL } from "@/lib/api";
import {
  PAYMENT_COUNTRIES,
  ALL_PAYMENT_COUNTRIES,
  ALL_OPERATORS,
  type PaymentOperator,
  type OperatorInfo,
  type PaymentCountry,
} from "@/types";

interface PaymentMethodsApiResponse {
  activeCountries: string[];
  countryOperators: Record<string, string[]>;
}

interface PaymentConfig {
  countries: PaymentCountry[];
  allCountries: PaymentCountry[];
  getOperatorsForCountry: (countryCode: string) => OperatorInfo[];
  isPhoneMismatch: (countryCode: string, phone: string) => boolean;
  isOperatorDisabled: (operatorId: PaymentOperator, countryCode: string, phone: string) => boolean;
  detectCountryFromPhone: (phone: string) => string;
  detectActiveCountryFromPhone: (phone: string) => string;
  loaded: boolean;
}

// Cache module-level pour éviter de refetch à chaque mount
let cachedConfig: PaymentMethodsApiResponse | null = null;
let fetchPromise: Promise<PaymentMethodsApiResponse | null> | null = null;

// Fallback statique (= ce qui est hardcodé dans types/index.ts)
const FALLBACK_CONFIG: PaymentMethodsApiResponse = {
  activeCountries: PAYMENT_COUNTRIES.map((c) => c.code),
  countryOperators: {
    SN: ["wave_money", "orange_money", "maxit", "card"],
    CI: ["wave_money", "orange_money", "mtn_money", "card"],
    OTHER: ["card"],
  },
};

const DIAL_MAP: [string, string][] = [
  ["221", "SN"], ["225", "CI"], ["226", "BF"],
  ["223", "ML"], ["228", "TG"], ["229", "BJ"],
];

function detectCountryFromPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  for (const [dial, code] of DIAL_MAP) {
    if (digits.startsWith(dial)) return code;
  }
  return "SN";
}

async function fetchConfig(): Promise<PaymentMethodsApiResponse | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/payment-methods`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function usePaymentConfig(): PaymentConfig {
  const [config, setConfig] = useState<PaymentMethodsApiResponse>(
    cachedConfig || FALLBACK_CONFIG
  );
  const [loaded, setLoaded] = useState(!!cachedConfig);

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      setLoaded(true);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchConfig();
    }

    fetchPromise.then((data) => {
      if (data) {
        cachedConfig = data;
        setConfig(data);
      }
      setLoaded(true);
    });
  }, []);

  // Construire la liste de pays actifs à partir du config
  const countries: PaymentCountry[] = config.activeCountries
    .map((code) => ALL_PAYMENT_COUNTRIES.find((c) => c.code === code))
    .filter((c): c is PaymentCountry => !!c);

  function getOperatorsForCountry(countryCode: string): OperatorInfo[] {
    const ids = config.countryOperators[countryCode] || config.countryOperators.OTHER || ["card"];
    return ALL_OPERATORS.filter((op) => ids.includes(op.id));
  }

  function isPhoneMismatch(countryCode: string, phone: string): boolean {
    if (countryCode === "OTHER" || !phone) return false;
    return detectCountryFromPhone(phone) !== countryCode;
  }

  function isOperatorDisabled(operatorId: PaymentOperator, countryCode: string, phone: string): boolean {
    if (operatorId === "card") return false;
    return isPhoneMismatch(countryCode, phone);
  }

  // Résout le pays détecté vers un pays actif (fallback "OTHER" si le pays n'est pas activé)
  function detectActiveCountryFromPhone(phone: string): string {
    const detected = detectCountryFromPhone(phone);
    const isActive = config.activeCountries.includes(detected);
    return isActive ? detected : "OTHER";
  }

  return {
    countries,
    allCountries: ALL_PAYMENT_COUNTRIES,
    getOperatorsForCountry,
    isPhoneMismatch,
    isOperatorDisabled,
    detectCountryFromPhone,
    detectActiveCountryFromPhone,
    loaded,
  };
}
