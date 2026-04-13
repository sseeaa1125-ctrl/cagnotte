"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError, clearCsrfToken } from "@/lib/api";

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
      const res = await api<{ seller: SellerInfo }>("/api/auth/me");
      setSeller(res.seller);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSeller(null);
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Trop de requêtes. Patiente quelques minutes puis réessaye.");
      } else {
        const msg = err instanceof Error ? err.message : "Erreur de connexion au serveur";
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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return ctx;
}
