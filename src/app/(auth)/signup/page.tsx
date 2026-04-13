"use client";

import UnifiedAuthPage from "../login/page";

// Redirige virtuellement les utilisateurs de /signup vers notre composante unifiée AuthPage
export default function SignupPage() {
  return <UnifiedAuthPage />;
}
