// cagnottes.sn v1 — bank cards removed. Only Senegalese mobile money
// operators are used in production ("wave_money", "orange_money",
// "moov" = Free Money). The other operators remain typed so upstream
// code still compiles for future WAEMU markets.
export type PaymentType =
  | "orange_money"
  | "wave_money"
  | "maxit"
  | "mtn_money"
  | "moov"
  | "togocell"
  | "mobicash";

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
