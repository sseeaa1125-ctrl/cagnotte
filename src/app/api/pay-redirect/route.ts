import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy redirect pour contourner les WebViews restrictifs (TikTok).
 * TikTok bloque la navigation vers pay.wave.com — même dans les query params.
 * L'URL de paiement est encodée en Base64 pour éviter la détection.
 *
 * Usage: /api/pay-redirect?t=BASE64_ENCODED_URL
 */
export async function GET(request: NextRequest) {
  const encoded = request.nextUrl.searchParams.get("t");

  if (!encoded) {
    return NextResponse.json({ error: "Missing parameter" }, { status: 400 });
  }

  // Décoder le Base64
  let url: string;
  try {
    url = atob(encoded);
  } catch {
    return NextResponse.json({ error: "Invalid encoding" }, { status: 400 });
  }

  // Sécurité: n'autoriser que les domaines de paiement connus
  const ALLOWED_DOMAINS = [
    "pay.wave.com",
    "checkout.bfrpay.com",
    "checkout.bfrpay.net",
    "pay.bfrpay.com",
    "pay.bictorys.com",
  ];

  try {
    const parsed = new URL(url);
    const isAllowed = ALLOWED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)
    );

    if (!isAllowed) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

    return NextResponse.redirect(url, 302);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
}
