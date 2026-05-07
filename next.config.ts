import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  allowedDevOrigins: [
    "*.spock.replit.dev",
    "*.replit.dev",
  ],
  async redirects() {
    return [
      { source: "/dashboard", destination: "/main-dashboard", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:5001",
        "*.spock.replit.dev",
        "*.replit.dev",
        "castcretebuilderserp-cbi-lesley.replit.app",
        "castcretebuilderserp.replit.app",
      ],
    },
  },
};

export default nextConfig;
