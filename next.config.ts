import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
