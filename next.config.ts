import type { NextConfig } from "next";

const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: storageOrigin ? [{
      protocol: storageOrigin.protocol === "http:" ? "http" : "https",
      hostname: storageOrigin.hostname,
      port: storageOrigin.port,
      pathname: "/storage/v1/object/public/aqverine-products/**",
    }] : [],
  },
};

export default nextConfig;
