import { ImageResponse } from "next/og";

// ─────────────────────────────────────────────────────────────────────────
// Dynamic OG image for each cagnotte.
//
// Branded card: navy gradient + title + progress bar + stats + logo.
// Avoids Satori pitfalls: no position:absolute, no conditional null, no
// fontFamily without font data, no fs imports (crash Turbopack).
// ─────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const alt = "Cagnotte sur cagnotte.sn";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function fmt(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let title = "Cagnotte sur cagnotte.sn";
  let subtype: string | null = null;
  let goalAmount = 0;
  let totalRaised = 0;
  let donorCount = 0;
  let sellerName = "";
  let hideAmount = false;
  let hideDonors = false;

  try {
    const res = await fetch(`${BACKEND_API_URL}/api/cagnottes/${slug}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const d = await res.json();
      title = d.title ?? title;
      subtype = d.subtype ?? null;
      goalAmount = d.goalAmount ?? 0;
      totalRaised = d.totalRaised ?? 0;
      donorCount = d.donorCount ?? 0;
      sellerName = d.seller?.displayName ?? "";
      hideAmount = !!d.hideAmount;
      hideDonors = !!d.hideDonors;
    }
  } catch {
    // fallback to defaults
  }

  const progress =
    goalAmount > 0
      ? Math.min(Math.round((totalRaised / goalAmount) * 100), 100)
      : 0;
  const accent = subtype === "solidaire" ? "#0D9488" : "#E8437F";
  const badge = subtype === "festive" ? "Festive" : subtype === "solidaire" ? "Solidaire" : "";
  const displayTitle = title.length > 55 ? title.slice(0, 52) + "..." : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(145deg, #1E3A8A 0%, #172866 40%, #0E1A40 100%)",
          color: "white",
        }}
      >
        {/* ── Top: badge + title + seller ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Badge row */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {badge ? (
              <div
                style={{
                  display: "flex",
                  backgroundColor: accent,
                  color: "white",
                  padding: "6px 20px",
                  borderRadius: "20px",
                  fontSize: "18px",
                  fontWeight: 700,
                }}
              >
                {badge}
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              fontSize: "50px",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "white",
            }}
          >
            {displayTitle}
          </div>

          {/* Seller */}
          <div
            style={{
              display: "flex",
              fontSize: "20px",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {sellerName ? `par ${sellerName}` : "cagnotte.sn"}
          </div>
        </div>

        {/* ── Bottom: stats + progress + logo ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Amount row */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
            <div style={{ display: "flex", fontSize: "34px", fontWeight: 700, color: "#FBE6ED" }}>
              {hideAmount ? "Montant masqué" : fmt(totalRaised)}
            </div>
            {!hideAmount && goalAmount > 0 ? (
              <div style={{ display: "flex", fontSize: "20px", color: "rgba(255,255,255,0.45)" }}>
                sur {fmt(goalAmount)}
              </div>
            ) : !hideAmount ? (
              <div style={{ display: "flex", fontSize: "20px", color: "rgba(255,255,255,0.45)" }}>
                collectés
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
          </div>

          {/* Progress bar */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "14px",
              backgroundColor: "rgba(255,255,255,0.12)",
              borderRadius: "7px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                width: `${Math.max(progress, 2)}%`,
                height: "100%",
                backgroundColor: accent,
                borderRadius: "7px",
              }}
            />
          </div>

          {/* Stats + logo row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: "18px", color: "rgba(255,255,255,0.5)" }}>
              {hideDonors
                ? ""
                : `${donorCount} ${donorCount > 1 ? "contributeurs" : "contributeur"}`}
              {!hideAmount && goalAmount > 0 ? `${hideDonors ? "" : " · "}${progress}%` : ""}
            </div>
            <div style={{ display: "flex", fontSize: "22px", fontWeight: 700, color: "white", letterSpacing: "-0.3px" }}>
              cagnotte.sn
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
