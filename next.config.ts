import type { NextConfig } from "next";

// Every page here reads live data per request, so Cache Components stays off
// and the pages opt out of static rendering with `dynamic = "force-dynamic"`.
const nextConfig: NextConfig = {};

export default nextConfig;
