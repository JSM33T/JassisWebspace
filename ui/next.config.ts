import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: process.env.NODE_ENV === 'development' || process.env.UNOPTIMIZED_IMAGES === 'true',
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5283',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5283',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5001',
      },
      {
        protocol: 'https',
        hostname: 'api.jassi.me',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'linqyard.blob.core.windows.net',
      },
    ],
  },
};

export default nextConfig;
