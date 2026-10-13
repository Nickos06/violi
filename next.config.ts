import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.openfoodfacts.org" }],
  },
};

export default nextConfig;
