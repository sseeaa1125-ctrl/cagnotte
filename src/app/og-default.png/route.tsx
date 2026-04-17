import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "24px",
          background: "linear-gradient(145deg, #1E3A8A 0%, #172866 40%, #0E1A40 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", fontSize: "64px", fontWeight: 700, letterSpacing: "-1px" }}>
          cagnotte.sn
        </div>
        <div style={{ display: "flex", fontSize: "28px", color: "rgba(255,255,255,0.6)", maxWidth: "700px", textAlign: "center" }}>
          La cagnotte qui fait du bien
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "16px",
            backgroundColor: "#E8437F",
            color: "white",
            padding: "14px 40px",
            borderRadius: "28px",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          Crée ta cagnotte gratuitement
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
