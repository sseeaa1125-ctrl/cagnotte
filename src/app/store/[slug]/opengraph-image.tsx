import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Profil vendeur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface SellerOg {
  displayName: string;
  bio: string | null;
  subtitle: string | null;
  avatarUrl: string | null;
}

async function getSellerOg(slug: string): Promise<SellerOg | null> {
  try {
    const res = await fetch(`${API_URL}/api/sellers/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.seller;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const seller = await getSellerOg(slug);

  if (!seller) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0D9488 0%, #065F56 100%)",
            color: "white",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          izy.store
        </div>
      ),
      { ...size }
    );
  }

  const displayName = seller.displayName || slug;
  const subtitle = seller.subtitle || seller.bio || "";
  const truncatedSubtitle = subtitle.length > 100 ? subtitle.slice(0, 97) + "..." : subtitle;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0D9488 0%, #065F56 50%, #042F2E 100%)",
          padding: "60px",
          gap: "24px",
        }}
      >
        {/* Avatar */}
        {seller.avatarUrl ? (
          <img
            src={seller.avatarUrl}
            width={140}
            height={140}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: "4px solid rgba(255,255,255,0.3)",
            }}
          />
        ) : (
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 700,
              color: "white",
              border: "4px solid rgba(255,255,255,0.3)",
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.1,
            maxWidth: "900px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName}
        </div>

        {/* Subtitle */}
        {truncatedSubtitle && (
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.75)",
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            {truncatedSubtitle}
          </div>
        )}

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 600,
          }}
        >
          izy.store
        </div>
      </div>
    ),
    { ...size }
  );
}
