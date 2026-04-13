"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

export default function AppRedirectPage() {
  useEffect(() => {
    let cancelled = false;

    api<{ seller: { slug: string } }>("/api/auth/me")
      .then((data) => {
        if (!cancelled && data.seller) {
          window.location.replace("/dashboard");
        } else if (!cancelled) {
          window.location.replace("/login");
        }
      })
      .catch(() => {
        if (!cancelled) {
          window.location.replace("/login");
        }
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    </div>
  );
}
