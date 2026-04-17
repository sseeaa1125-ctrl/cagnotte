import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Connexion",
  robots: { index: false, follow: false },
};

export default function AdminConnexionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
