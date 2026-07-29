import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Frozen at `next build` - used by the public landing tech badge.
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
  experimental: {
    // Keep last soft-nav payload while browsing the site so revisits paint
    // instantly; SoftNavRefresh then router.refresh()s in the background.
    staleTimes: {
      dynamic: 1800, // 30 min - session-ish while still on the site
      static: 1800,
    },
  },
  async redirects() {
    return [
      {
        source: "/claude",
        destination: "/chat",
        permanent: true,
      },
      {
        source: "/claude/:path*",
        destination: "/chat/:path*",
        permanent: true,
      },
      {
        source: "/claudette",
        destination: "/chat",
        permanent: true,
      },
      {
        source: "/claudette/:path*",
        destination: "/chat/:path*",
        permanent: true,
      },
    ];
  },
  // Silence webpack/turbopack dual-config error (Next 16 defaults to Turbopack)
  turbopack: {
    resolveAlias: {
      "onnxruntime-node": { browser: "./empty-module.js" },
      sharp: { browser: "./empty-module.js" },
    },
  },
};

export default nextConfig;
