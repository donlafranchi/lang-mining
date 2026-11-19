import type { NextConfig } from "next";

// Every page here reads live data per request, so Cache Components stays off
// and the pages opt out of static rendering with `dynamic = "force-dynamic"`.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Browsers must always check for a new service worker, or an old one can stick around for a day.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
