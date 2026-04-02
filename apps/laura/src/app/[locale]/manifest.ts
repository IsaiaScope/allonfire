import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Laura — Isaia & Laura's Photos & Games",
    short_name: "Laura",
    description:
      "A private space for Isaia and Laura to share photos and play games together",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "browser",
    orientation: "portrait-primary",
    background_color: "#37302a",
    theme_color: "#37302a",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Gallery",
        short_name: "Gallery",
        url: "/",
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Favorites",
        short_name: "Favorites",
        url: "/favorites",
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Games",
        short_name: "Games",
        url: "/games",
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
        ],
      },
    ],
  };
}
