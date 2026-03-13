import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  buildExcludes: [/app-build-manifest\.json$/, /\/_next\/static\/css\//],
} as any);

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default withPWA(nextConfig);
