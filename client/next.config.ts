import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/speech", destination: `${process.env.API_SERVER_ORIGIN ?? "http://127.0.0.1:3001"}/api/speech` }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
