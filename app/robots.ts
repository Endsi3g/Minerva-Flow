import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/overview", "/finance", "/assistant", "/commandes", "/collaborateurs", "/inventaire", "/settings", "/billing", "/equipe", "/portal"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
