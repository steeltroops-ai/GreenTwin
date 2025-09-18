import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  // Disable experimental features for production deployment
  experimental: {
    turbo: {
      rules: {},
    },
  },
  // Remove output setting for Vercel compatibility
};

export default nextConfig;
