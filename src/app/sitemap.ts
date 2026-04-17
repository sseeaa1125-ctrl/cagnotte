import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cagnotte.sn";
const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiCagnotte {
  slug: string;
  createdAt: string;
}

interface ListResponse {
  cagnottes: ApiCagnotte[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static pages ──────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/cagnottes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/a-propos`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/aide`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/tarifs`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/cgu`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/confidentialite`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/mentions-legales`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // ── Dynamic cagnotte pages ────────────────────────────────────────
  // Fetch all public active cagnottes from the API. The endpoint
  // already filters by visibility=public + status=active at the SQL
  // level. We request up to 500 (well above current volume); scale
  // to cursor-based pagination if the site grows past that.
  let cagnottePages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(
      `${BACKEND_API_URL}/api/cagnottes?limit=500&sort=recent`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const data = (await res.json()) as ListResponse;
      cagnottePages = data.cagnottes.map((c) => ({
        url: `${BASE_URL}/c/${c.slug}`,
        lastModified: new Date(c.createdAt),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Sitemap generation should never fail — return static pages only.
  }

  return [...staticPages, ...cagnottePages];
}
