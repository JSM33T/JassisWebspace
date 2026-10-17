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

for (const [component, metadata] of Object.entries(productVersion)) {
  if (!metadata.name.trim() || !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    throw new Error(`Invalid ${component} metadata in ${versionManifestPath}`);
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [{ source: '/artifacts/share', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    ] }];
  },
  env: {
    NEXT_PUBLIC_UI_SOFTWARE_NAME: productVersion.ui.name,
    NEXT_PUBLIC_UI_VERSION: productVersion.ui.version,
    NEXT_PUBLIC_API_SOFTWARE_NAME: productVersion.api.name,
    NEXT_PUBLIC_API_VERSION: productVersion.api.version,
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
