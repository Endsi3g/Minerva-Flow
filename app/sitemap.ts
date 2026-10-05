import { MetadataRoute } from "next";
import { INITIAL_BLOG_POSTS } from "@/lib/blog/posts";

// French is the default locale and is served unprefixed, so those are the canonical URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";
  const latestPost = INITIAL_BLOG_POSTS.reduce((a, p) => (p.publishedAt > a ? p.publishedAt : a), "");

  const pages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: new Date(latestPost), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/ambassadeurs`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const posts: MetadataRoute.Sitemap = INITIAL_BLOG_POSTS.filter((p) => p.isPublished).map((p) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt ?? p.publishedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...pages, ...posts];
}
