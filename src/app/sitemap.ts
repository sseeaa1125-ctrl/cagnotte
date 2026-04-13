import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://izy.store";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  // Fetch all active seller slugs for store pages
  try {
    const res = await fetch(`${API_URL}/api/sellers/sitemap`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as { slugs: { slug: string; updatedAt: string }[] };
      for (const s of data.slugs) {
        entries.push({
          url: `${BASE_URL}/${s.slug}`,
          lastModified: new Date(s.updatedAt),
          changeFrequency: "daily",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Silently fail — sitemap will just have the homepage
  }

  return entries;
}
