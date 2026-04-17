import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cagnotte.sn";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/c/", "/cagnottes", "/a-propos", "/aide", "/tarifs"],
        disallow: [
          "/tableau-de-bord/",
          "/profil/",
          "/retraits/",
          "/participations/",
          "/notifications/",
          "/api/",
          "/connexion",
          "/inscription",
          "/verification-email",
          "/mot-de-passe-oublie",
          "/mot-de-passe-reinitialiser",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
