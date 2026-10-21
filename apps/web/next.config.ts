import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The browser only ever talks to this origin. Proxying the API keeps the
// Sanctum session cookie first-party and removes CORS from the picture.
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      { source: "/sanctum/:path*", destination: `${apiUrl}/sanctum/:path*` },
    ];
  },
};

export default createNextIntlPlugin()(nextConfig);
