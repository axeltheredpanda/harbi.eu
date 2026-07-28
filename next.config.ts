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
};

export default nextConfig;
