import type { MetadataRoute } from "next";

const SITE_HOST = "harbi.eu";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE_HOST}`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/chat",
          "/cutout",
          "/convert",
          "/analytics",
          "/settings",
          "/login",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL.replace(/\/$/, "")}/sitemap.xml`,
    // Hostname only (no protocol) — avoids an invalid Host line for crawlers.
    host: SITE_HOST,
  };
}
