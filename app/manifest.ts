import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "flow by Minerva",
    short_name: "Minerva Flow",
    description: "L'application pour la gestions des revenus des restaurants et cafés au Quebec.",
    start_url: "/overview",
    display: "standalone",
    background_color: "#F5F1E6",
    theme_color: "#F5F1E6",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/login-narrow.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/screenshots/login-wide.png",
        sizes: "1280x800",
        type: "image/png",
        form_factor: "wide",
      },
    ],
  };
}
