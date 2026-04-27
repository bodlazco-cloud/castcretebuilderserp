import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.spock.replit.dev",
    "*.replit.dev",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:5000",
        "*.spock.replit.dev",
        "*.replit.dev",
        "castcretebuilderserp-cbi-lesley.replit.app",
      ],
    },
  },
};

export default nextConfig;
