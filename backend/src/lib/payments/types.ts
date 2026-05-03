// cagnottes.sn — opérateurs supportés. La carte bancaire est ré-introduite
// avec un workflow d'approbation par cagnotte (cf. fundraiserBlockConfigSchema
// `cardStatus`). Les autres opérateurs WAEMU restent typés pour future expansion.
//
// `card` ⇒ flow Bictorys hosted-checkout 3DS (`&payment_category=card`,
// country forcé à "SN"). Pas de phone requis côté API — Bictorys collecte
// le PAN sur sa page checkout. Voir docs/BICTORYS_INTEGRATION.md §5.
export type PaymentType =
  | "orange_money"
  | "wave_money"
  | "maxit"
  | "mtn_money"
  | "moov"
  | "togocell"
  | "mobicash"
  | "card";

export interface CreateTransactionParams {
  amount: number;
  currency: string;
  country: string;
  paymentType: PaymentType;
  reference: string;
  successRedirectUrl: string;
  errorRedirectUrl: string;
  otp?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    country?: string;
  };
}

export interface TransactionResult {
  externalId: string;
  redirectUrl?: string;
  qrCode?: string;
  link?: string;
  message?: string;
}

export interface PaymentProvider {
  createTransaction(
    params: CreateTransactionParams
  ): Promise<TransactionResult>;
}
