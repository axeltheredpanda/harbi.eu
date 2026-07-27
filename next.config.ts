import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/claude",
        destination: "/claudette",
        permanent: true,
      },
      {
        source: "/claude/:path*",
        destination: "/claudette/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
