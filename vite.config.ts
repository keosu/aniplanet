import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        id: "./",
        name: "野境 Wild Atlas",
        short_name: "Wild Atlas",
        description: "从一颗地球出发，探索 125 种动物。Explore wildlife on Earth.",
        lang: "zh-CN",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#081827",
        theme_color: "#081827",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cacheId: "wild-atlas",
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,json,webmanifest}"],
        // Include every local photo, including the 4 MiB kiang image.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/\/[^/?]+\.[^/]+$/],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    watch: { ignored: ["**/android/**", "**/tmp/**", "**/test-results/**"] },
  },
  build: { chunkSizeWarningLimit: 1000 },
});
