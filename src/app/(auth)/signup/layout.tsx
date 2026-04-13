import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription",
  description: "Crée ton compte Izy gratuitement et lance ta boutique en quelques minutes.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
