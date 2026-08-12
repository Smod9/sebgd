import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node Fluid Compute — avoid Edge for DB/fs content APIs
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
