import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep production builds separate from the live development server's HMR
  // cache. Otherwise a build can replace chunks while Fast Refresh is using them.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
