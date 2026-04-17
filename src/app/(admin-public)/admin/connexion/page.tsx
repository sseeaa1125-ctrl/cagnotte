"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { storeAdminCsrfToken } from "@/lib/adminApi";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface LoginResponse {
  admin: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
  csrfToken: string;
}

export default function AdminConnexionPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
      });

      if (!res.ok) {
        let msg = `Erreur ${res.status}`;
        try {
          const body = await res.json();
          msg = (body as { error?: string }).error || msg;
        } catch {
          // non-JSON response
        }
        setError(msg);
        return;
      }

      const data: LoginResponse = await res.json();
      storeAdminCsrfToken(data.csrfToken);
      router.replace("/admin");
    } catch {
      setError("Erreur reseau. Verifie ta connexion et reessaye.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#172866] to-[#0E1A40] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#172866]">
            Administration cagnotte.sn
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Connecte-toi pour acceder au panneau d&apos;administration.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="admin-email"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cagnotte.sn"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Mot de passe
            </label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5"
          >
            {submitting ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
