import type { NextConfig } from "next";
import projectDomains from "./content/project-domains.json";

const nextConfig: NextConfig = {
  // Node Fluid Compute — avoid Edge for DB/fs content APIs
  serverExternalPackages: ["@neondatabase/serverless"],
  redirects() {
    return projectDomains.filter((domain) => domain.mode === "redirect").map((domain) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: domain.hostname }],
      destination: `${domain.destination}/:path*`,
      permanent: false,
    }));
  },
};

export default nextConfig;
