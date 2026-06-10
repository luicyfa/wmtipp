import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Familien-WM-Tipp",
    short_name: "WM-Tipp",
    description: "Privates Familien-Tippspiel zur Fußball-WM 2026",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8faf7",
    theme_color: "#0f7a4f",
    icons: [
      {
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
