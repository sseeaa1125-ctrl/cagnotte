import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#172866",
};

export const metadata: Metadata = {
  title: {
    default: "cagnotte.sn — Crée ta cagnotte, partage, collecte",
    template: "%s | cagnotte.sn",
  },
  description:
    "Crée une cagnotte en ligne et collecte des contributions via Wave, Orange Money ou Free Money. La façon la plus simple de lever des fonds au Sénégal.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://cagnotte.sn"),
  openGraph: {
    title: "cagnotte.sn",
    description:
      "Crée une cagnotte en ligne et collecte des contributions via Wave, Orange Money ou Free Money.",
    siteName: "cagnotte.sn",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "cagnotte.sn — La cagnotte qui fait du bien" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "cagnotte.sn",
    description:
      "Crée une cagnotte en ligne et collecte des contributions via Wave, Orange Money ou Free Money.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-background`}>
        {/* Audit 032 C-01 — WCAG 2.4.1 skip-to-content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
        >
          Aller au contenu principal
        </a>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
