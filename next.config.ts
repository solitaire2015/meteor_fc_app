import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
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
  images: {
    // Disable image optimization to avoid sharp dependency
    unoptimized: true,
  },
};

export default nextConfig;
