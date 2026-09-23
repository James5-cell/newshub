import process from "node:process"
import type { VitePWAOptions } from "vite-plugin-pwa"
import { VitePWA } from "vite-plugin-pwa"

const pwaOption: Partial<VitePWAOptions> = {
  includeAssets: [
    "favicon.ico",
    "favicon.svg",
    "icon.svg",
    "apple-touch-icon.png",
    "icon-192x192.png",
    "icon-512x512.png",
  ],
  filename: "swx.js",
  manifest: {
    name: "NewsHub",
    short_name: "NewsHub",
    description: "Real-time Tech, Science & Developer News Aggregator",
    theme_color: "#F14D42",
    background_color: "#0d1117",
    icons: [
      {
        src: "icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  workbox: {
    navigateFallbackDenylist: [/^\/api/],
  },
  devOptions: {
    enabled: process.env.SW_DEV === "true",
    type: "module",
    navigateFallback: "index.html",
  },
}

export default function pwa() {
  return VitePWA(pwaOption)
}
