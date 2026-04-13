import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/contexts/ToastContext";
import { PWARegister } from "@/components/PWARegister";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#009b8d",
};

export const metadata: Metadata = {
  title: {
    default: "Izy — Ta boutique dans ta bio",
    template: "%s | Izy",
  },
  description:
    "Le link-in-bio avec paiement mobile money pour les créateurs d'Afrique. Vends tes produits, services et communautés depuis un seul lien.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://izy.store"),
  openGraph: {
    title: "Izy — Ta boutique dans ta bio",
    description:
      "Le link-in-bio avec paiement mobile money pour les créateurs d'Afrique. Vends tes produits, services et communautés depuis un seul lien.",
    siteName: "Izy",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/izy-store-og-green.png",
        width: 1200,
        height: 630,
        alt: "Izy.store — Votre link-in-bio avec paiement Mobile Money intégré",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Izy — Ta boutique dans ta bio",
    description:
      "Le link-in-bio avec paiement mobile money pour les créateurs d'Afrique.",
    images: ["/izy-store-og-green.png"],
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Izy",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { SmoothScroll } from "@/components/SmoothScroll";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        <PWARegister />
        <SmoothScroll>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
