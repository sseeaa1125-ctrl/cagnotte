import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cagnottes.sn";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/tableau-de-bord/", // authed area (Phase 6)
          "/dashboard/", // legacy authed area
          "/api/", // all API routes
          "/admin/", // v2 (currently empty)
          "/c/", // Phase 4 — ALL cagnottes (public + private) disallowed in v1 (P05 mitigation)
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
