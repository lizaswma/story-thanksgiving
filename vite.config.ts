import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// See PRD.md §3 (tech stack) and §4 (bilingual).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "小兔过感恩节 · Little Rabbit's Thanksgiving",
        short_name: "小兔过感恩节",
        description:
          "An interactive bilingual (中文 / English) Thanksgiving storybook for toddlers.",
        lang: "zh-CN",
        dir: "ltr",
        theme_color: "#ee9c53",
        background_color: "#fdf3e8",
        display: "standalone",
        orientation: "landscape",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Precache every asset type the book uses so it works fully offline (PRD §3).
        globPatterns: [
          "**/*.{js,css,html,svg,png,webp,jpg,jpeg,mp3,ogg,woff2}",
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5175, host: true },
  preview: { port: 4175 },
});
