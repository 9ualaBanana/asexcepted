import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  env: {
    // Stable per deployment/build; used for cache-busting static audio URLs.
    NEXT_PUBLIC_BUILD_ID: `local-${Date.now().toString(36)}`
  },
};

export default nextConfig;
