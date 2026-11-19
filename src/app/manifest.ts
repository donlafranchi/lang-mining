import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "lang-mining",
    short_name: "lang-mining",
    description: "Mine Spanish and Farsi lessons out of anything you read.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["education"],
    background_color: "#f6f2e8",
    theme_color: "#1f4d3a",
    icons: [
      // The icon is full-bleed green with the mark well inside the middle 80%, so one file serves both uses.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Deck", short_name: "Deck", description: "Your saved words", url: "/deck" },
      { name: "Quiz", short_name: "Quiz", description: "Review the words that are due", url: "/quiz" },
    ],
  };
}
