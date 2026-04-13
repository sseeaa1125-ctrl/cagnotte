"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { adminApi, AdminApiError } from "@/lib/adminApi";
import { storeCsrfToken } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "SUPPORT";
  createdAt?: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await adminApi<{ admin: AdminUser; csrfToken?: string }>("/api/admin/auth/me");
      setAdmin(data.admin);
      if (data.csrfToken) storeCsrfToken(data.csrfToken);
    } catch (err) {
      setAdmin(null);
      if (err instanceof AdminApiError && err.status === 401) {
        // Not logged in — expected on login page
      } else {
        setError(err instanceof Error ? err.message : "Erreur de connexion");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await adminApi<{ admin: AdminUser; csrfToken?: string }>("/api/admin/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setAdmin(data.admin);
    if (data.csrfToken) storeCsrfToken(data.csrfToken);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi("/api/admin/auth/logout", { method: "POST" });
    } catch {
      // Logout should succeed even if API fails
    }
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, error, login, logout, refresh }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
