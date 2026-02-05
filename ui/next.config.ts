import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
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
        protocol: 'https',
        hostname: 'api.jassi.me',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
