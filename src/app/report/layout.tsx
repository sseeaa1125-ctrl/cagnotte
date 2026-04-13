import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signaler une page | Izy.store",
  description: "Signale une page qui enfreint les conditions d'utilisation d'Izy.store",
  robots: { index: false, follow: false },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
