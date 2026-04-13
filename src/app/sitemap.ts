import type { MetadataRoute } from "next";

// Phase 4 plan 04-01 — minimal evergreen sitemap.
// NO /c/ entries in v1 (OQ-4 lock, P05 mitigation). Cagnotte URLs are never
// crawled — they're discoverable only via direct share by the creator.

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cagnottes.sn";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
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
      priority: 0.8,
    },
  ];
}
