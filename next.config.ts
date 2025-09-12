import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only run ESLint on these directories during build
    dirs: ['src'],
    // Don't fail the build on ESLint errors/warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow build to continue even with TypeScript errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
