import type { NextConfig } from "next";

// Dynamically add the backend API URL to allowed image domains
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const apiRemotePattern = (() => {
  try {
    const u = new URL(apiUrl);
    return {
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
    };
  } catch {
    return { protocol: "http" as const, hostname: "localhost", port: "4000" };
  }
})();

const nextConfig: NextConfig = {
  // PROXY: Route /api/* calls through Next.js to backend (same-origin cookies fix for Safari ITP)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  // L1: Security headers + image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "**.railway.app",
      },
      apiRemotePattern,
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://accounts.google.com https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://analytics.tiktok.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "img-src 'self' data: blob: https: " + (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"),
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://accounts.google.com https://oauth2.googleapis.com https://www.google-analytics.com https://analytics.google.com https://www.facebook.com https://graph.facebook.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://analytics.tiktok.com " + (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"),
              "frame-src 'self' https://accounts.google.com https://www.youtube.com https://youtube.com https://player.vimeo.com https://www.loom.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
