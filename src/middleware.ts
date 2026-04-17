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

// Authed route segments — must mirror src/app/(authed)/*. The (authed) layout
// already enforces auth server-side, but it can't refresh an expired access
// token mid-render. Middleware catches the missing izy-token *before* the
// layout runs and bounces the user through /api/auth/refresh-and-return so a
// stale 15min access cookie + valid 7d refresh cookie is silently renewed.
const AUTHED_PREFIXES = [
  "/tableau-de-bord",
  "/profil",
  "/notifications",
  "/participations",
  "/retraits",
];

// Admin routes — separate cookie, separate refresh flow.
const ADMIN_AUTHED_PREFIXES = ["/admin"];
const ADMIN_PUBLIC_PATHS = ["/admin/connexion"];
const ADMIN_ACCESS_COOKIE = "izy-admin-token";

const ACCESS_COOKIE = "izy-token";

function isAuthedPath(pathname: string): boolean {
  return AUTHED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Forward the current pathname + search to downstream server components as an
// `x-pathname` request header so authed layouts/pages can rebuild an accurate
// `?next=` param when they need to redirect through /api/auth/refresh-and-return.
function passthroughWithPathname(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  const fullPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  requestHeaders.set("x-pathname", fullPath);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/" ||
    KNOWN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.includes(".")
  ) {
    return passthroughWithPathname(request);
  }

  // Admin auth gate — redirect to /admin/connexion if no admin cookie.
  // Admin public paths (login page) are excluded from the check.
  const isAdminPath = ADMIN_AUTHED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAdminPublic = ADMIN_PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isAdminPath && !isAdminPublic && !request.cookies.get(ADMIN_ACCESS_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/connexion";
    url.search = "";
    return NextResponse.redirect(url, 303);
  }

  // Silent refresh gate for protected pages.
  // The refresh cookie is path-scoped to /api/auth, so we redirect through
  // /api/auth/refresh-and-return — a URL the browser *will* attach the
  // refresh cookie to. The backend mints fresh tokens then 302s back to
  // `next`. If the user is genuinely logged out, the backend bounces to
  // /connexion. The (authed) layout still runs its own /api/auth/me check
  // afterwards as a defense-in-depth gate.
  if (isAuthedPath(pathname) && !request.cookies.get(ACCESS_COOKIE)) {
    const next = `${pathname}${request.nextUrl.search}`;
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/refresh-and-return";
    url.search = `?next=${encodeURIComponent(next)}`;
    // 303 See Other — forces the browser to redirect as GET even if the
    // original request was a POST/PUT/DELETE. /refresh-and-return only
    // accepts GET, so 307 would 405 on any hypothetical mutation.
    return NextResponse.redirect(url, 303);
  }

  // Normalize slugs to lowercase (301 redirect)
  const lowered = pathname.toLowerCase();
  if (pathname !== lowered) {
    const url = request.nextUrl.clone();
    url.pathname = lowered;
    return NextResponse.redirect(url, 301);
  }

  return passthroughWithPathname(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
