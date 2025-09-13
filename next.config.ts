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
  images: {
    // Configure sharp for better Vercel compatibility
    loader: 'default',
    formats: ['image/webp'],
  },
  // Ensure sharp works properly on Vercel
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
