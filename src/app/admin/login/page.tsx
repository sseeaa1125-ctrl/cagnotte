"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminApiError } from "@/lib/adminApi";
import gsap from "gsap";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, loading: authLoading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && containerRef.current) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

        // Initial set to ensure visibility (fixing potential opacity-0 issues)
        gsap.set(containerRef.current, { opacity: 1, visibility: "visible" });

        tl.from(".login-stagger", {
          y: 20,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          clearProps: "all"
        });
      }, containerRef);
      return () => ctx.revert();
    }
  }, [authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/admin");
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError("Erreur de connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-500" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex min-h-screen items-center justify-center bg-gray-950 px-4 opacity-0">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center login-stagger">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600">
            <span className="text-xl font-bold text-white">I</span>
          </div>
          <h1 className="text-xl font-bold text-white">Admin Izy</h1>
          <p className="mt-1 text-sm text-gray-400">Connecte-toi pour accéder au tableau de bord</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 login-stagger">
              {error}
            </div>
          )}

          <div className="login-stagger">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="admin@izy.store"
            />
          </div>

          <div className="login-stagger">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="Mot de passe"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed login-stagger"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
