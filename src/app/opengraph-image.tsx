import { ImageResponse } from "next/og";

export const alt = "cagnotte.sn — La cagnotte qui change des vies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand palette
const NAVY = "#172866";
const NAVY_DARK = "#0E1A40";
const PINK = "#FBE6ED";
const PINK_VIBRANT = "#F472B6";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DARK} 55%, #1B1240 100%)`,
          color: "#FFFFFF",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative pink gradient blob */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${PINK_VIBRANT}66 0%, ${PINK_VIBRANT}00 70%)`,
            display: "flex",
          }}
        />
        {/* Decorative navy highlight */}
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: -120,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: `radial-gradient(circle, #4F6BE04D 0%, #4F6BE000 70%)`,
            display: "flex",
          }}
        />

        {/* Top row: brand + badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "#FFFFFF",
                color: NAVY,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              c.
            </div>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>
              cagnotte.sn
            </span>
          </div>
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 9999,
              background: PINK,
              color: NAVY,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Plateforme de cagnottes du Sénégal
          </div>
        </div>

        {/* Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, zIndex: 2 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 96,
              fontWeight: 900,
              letterSpacing: "-0.035em",
              lineHeight: 1.02,
            }}
          >
            <span>La cagnotte qui</span>
            <span>
              change des{" "}
              <span
                style={{
                  backgroundImage: `linear-gradient(90deg, ${PINK_VIBRANT} 0%, #C084FC 100%)`,
                  backgroundClip: "text",
                  color: "transparent",
                  display: "flex",
                }}
              >
                vies.
              </span>
            </span>
          </div>
          <p
            style={{
              fontSize: 28,
              color: "#C7D2FE",
              margin: 0,
              maxWidth: 860,
              lineHeight: 1.3,
            }}
          >
            Crée ta cagnotte en 2 min et collecte via Wave, Orange Money, Free Money.
          </p>
        </div>

        {/* Bottom row: payment providers + URL */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {["Wave", "Orange Money", "Free Money"].map((p) => (
              <div
                key={p}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#E0E7FF",
                  display: "flex",
                }}
              >
                {p}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#FFFFFF",
              display: "flex",
            }}
          >
            cagnotte.sn
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
