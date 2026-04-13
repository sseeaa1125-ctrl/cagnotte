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
