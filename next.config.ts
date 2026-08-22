import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Prevent static generation of pages that use Prisma
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
