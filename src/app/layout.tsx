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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#172866",
};

export const metadata: Metadata = {
  title: {
    default: "Cagnottes.sn — Crée ta cagnotte, partage, collecte",
    template: "%s | Cagnottes.sn",
  },
  description:
    "Crée une cagnotte en ligne et collecte des contributions via Wave, Orange Money ou Free Money. La façon la plus simple de lever des fonds au Sénégal.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://cagnottes.sn"),
  openGraph: {
    title: "Cagnottes.sn",
    description:
      "Crée une cagnotte en ligne et collecte des contributions via Wave, Orange Money ou Free Money.",
    siteName: "Cagnottes.sn",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cagnottes.sn",
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
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
