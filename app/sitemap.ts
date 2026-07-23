import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://minerva-flow.vercel.app";
  const locales = ["fr", "tr"];
  const pages = [
    "",
    "/overview",
    "/finance",
    "/assistant",
    "/integrations",
    "/changelog",
    "/library",
    "/collaborateurs",
    "/commandes",
    "/depenses",
    "/fournisseurs",
    "/inventaire",
    "/menu",
    "/fidelisation",
    "/reservations",
    "/settings",
    "/billing",
  ];

  const entries: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    pages.forEach((page) => {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" || page === "/changelog" ? "daily" : "weekly",
        priority: page === "" ? 1.0 : 0.8,
      });
    });
  });

  return entries;
}
