import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    staleTimes: { dynamic: 0 },
    serverActions: { bodySizeLimit: "50mb" },
  },
};

export default nextConfig;
