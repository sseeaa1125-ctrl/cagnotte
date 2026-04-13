import { NextRequest, NextResponse } from "next/server";

// Routes connues qui ne doivent PAS être réécrites vers /store/[slug]
const KNOWN_PREFIXES = [
  "/login",
  "/signup",
  "/dashboard",
  "/admin",
  "/app",
  "/onboarding",
  "/store",
  "/download",
  "/community",
  "/unsubscribe",
  "/cgu",
  "/cgv",
  "/confidentialite",
  "/mentions-legales",
  "/report",
  "/privacy",
  "/api",
  "/_next",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ne pas réécrire les routes connues, fichiers statiques, ou la page d'accueil
  if (
    pathname === "/" ||
    KNOWN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Normaliser les slugs en minuscules (redirect /MACDI → /macdi)
  const lowered = pathname.toLowerCase();
  if (pathname !== lowered) {
    const url = request.nextUrl.clone();
    url.pathname = lowered;
    return NextResponse.redirect(url, 301);
  }

  // Réécrire /amadou → /store/amadou (sans changer l'URL dans le navigateur)
  const url = request.nextUrl.clone();
  url.pathname = `/store${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
