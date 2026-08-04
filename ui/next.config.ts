import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type ProductVersionManifest = {
  ui: {
    name: string;
    version: string;
  };
  api: {
    name: string;
    version: string;
  };
};

const versionManifestPath = resolve(process.cwd(), "../version.json");
const productVersion = JSON.parse(
  readFileSync(versionManifestPath, "utf8"),
) as ProductVersionManifest;

if (!/^\d+\.\d+\.\d+$/.test(productVersion.ui.version)) {
  throw new Error(`Invalid UI version in ${versionManifestPath}: ${productVersion.ui.version}`);
}

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_PRODUCT_VERSION: productVersion.ui.version,
    NEXT_PUBLIC_SOFTWARE_NAME: productVersion.ui.name,
  },
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
