import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "lang-mining",
    short_name: "lang-mining",
    description: "Mine Spanish lessons out of anything you read or watch.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f2e8",
    theme_color: "#1f4d3a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
