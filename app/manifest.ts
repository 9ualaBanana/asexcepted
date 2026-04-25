import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AsExcepted",
    short_name: "AsExcepted",
    description: "AsExcepted Progressive Web App",
    start_url: "/",
    display: "standalone",
    background_color: "#14121c",
    theme_color: "#14121c",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
