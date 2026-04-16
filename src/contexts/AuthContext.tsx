"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError, clearCsrfToken, storeCsrfToken } from "@/lib/api";

interface SellerInfo {
  id: string;
  displayName: string;
  subtitle: string | null;
  slug: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  showAvatar: boolean;
  onboardingCompleted: boolean;
  bio: string | null;
  email: string;
  plan: string;
  themeId: string;
  themeFont: string;
  themeColors: { primary?: string; background?: string; button?: string } | null;
  bgImageUrl: string | null;
  headerLayout: string;
  imageStyle: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  facebookUrl: string | null;
  whatsappNumber: string | null;
  twitterUrl: string | null;
  telegramUrl: string | null;
  snapchatUrl: string | null;
  websiteUrl: string | null;
  kycStatus: string;
}

interface AuthContextValue {
  seller: SellerInfo | null;
  loading: boolean;
  loggingOut: boolean;
  error: string | null;
  refreshSeller: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 5 plan 05-01 — fetchSeller is silent on 401. Anonymous visitors
  // (public donor flow, /inscription, /connexion) legitimately hit 401 on
  // /api/auth/me and should NOT be redirected from a public page. The (authed)
  // route group ships in plan 05-02 with a server-side cookies() guard that
  // handles unauth redirects BEFORE JSX renders. Do not re-introduce a
  // client-side redirect here — it races with Phase 4 public pages.
  const fetchSeller = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ seller: SellerInfo; csrfToken?: string }>(
        "/api/auth/me",
      );
      setSeller(res.seller);
      // Re-hydrate CSRF token on every authed page load. Cross-origin dev
      // (frontend :3000 / backend :4000) can't read the backend-scoped
      // izy-csrf cookie from document.cookie, so we rely on localStorage —
      // which the backend /me endpoint now refreshes on every call.
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSeller(null);
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Trop de tentatives. Attends 10 minutes, puis réessaye.");
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : "Connexion au serveur impossible. Vérifie ton réseau et réessaye.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeller();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors — cookie will expire anyway
    }
    clearCsrfToken();
    setSeller(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{ seller, loading, loggingOut, error, refreshSeller: fetchSeller, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// SSR-safe stub returned when `useAuth()` is called without a provider in
// the tree. In dev, Turbopack HMR can temporarily lose AuthContext identity
// across hot reloads — consumers briefly see a null context during SSR even
// though the real provider exists up the tree. Throwing in that case
// crashes the page with a misleading "missing provider" error. Instead we
// return a loading-state stub that the client hydrates back to the real
// provider on mount.
const SSR_STUB: AuthContextValue = {
  seller: null,
  loading: true,
  loggingOut: false,
  error: null,
  refreshSeller: async () => {},
  logout: async () => {},
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // During SSR or the Turbopack HMR race, fall back to the stub so the
    // page doesn't 500. On the client we still throw — a truly missing
    // provider is a real bug worth surfacing.
    if (typeof window === "undefined") return SSR_STUB;
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return ctx;
}
