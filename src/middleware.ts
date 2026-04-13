import { NextRequest, NextResponse } from "next/server";

// cagnottes.sn — simplified middleware (Banani frontend to define routing later).
// For now: only normalize slugs to lowercase. The /slug → /store/slug rewrite
// from fari.store is disabled because the store/ page tree was removed.

const KNOWN_PREFIXES = [
  "/api",
  "/_next",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/" ||
    KNOWN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Normalize slugs to lowercase (301 redirect)
  const lowered = pathname.toLowerCase();
  if (pathname !== lowered) {
    const url = request.nextUrl.clone();
    url.pathname = lowered;
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
