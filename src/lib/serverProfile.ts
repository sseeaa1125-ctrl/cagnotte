import { cache } from "react";
import { requireSellerMe } from "./serverAuth";

// Profile surface seller shape — union of every field consumed by any
// /profil sub-page. Individual pages narrow via TypeScript when they
// destructure. Marked optional where the backend returns null.
export interface ProfileSeller {
  id: string;
  email: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  kycStatus?: string;
  kycFullName?: string | null;
  kycIdUrl?: string | null;
  kycSelfieUrl?: string | null;
  payoutProvider?: "wave_money" | "orange_money" | null;
  payoutPhone?: string | null;
  payoutName?: string | null;
  payoutCountry?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bio?: string | null;
}

// React.cache() dedupes the `GET /api/auth/me` call across every server
// component that runs during a single SSR request. The /profil route
// group has 1 layout + 1 page, both of which need the seller — without
// cache() we'd hit the backend twice per navigation. The cache is scoped
// to the request so no cross-request leakage.
export const getProfileSeller = cache(
  async (): Promise<ProfileSeller> => requireSellerMe<ProfileSeller>(),
);
