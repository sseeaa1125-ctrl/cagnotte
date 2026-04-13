import type { PaymentProvider } from "./types.js";
import { BictorysProvider } from "./bictorys.js";

export function getPaymentProvider(name: string): PaymentProvider {
  switch (name) {
    case "bictorys":
      return new BictorysProvider();
    default:
      throw new Error(`Provider de paiement inconnu : ${name}`);
  }
}

export type { PaymentProvider } from "./types.js";
