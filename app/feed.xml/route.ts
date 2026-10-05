import { NextResponse } from "next/server";
import { getAllBlogPosts } from "@/lib/blog/data";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";
  const posts = await getAllBlogPosts();

  const itemsXml = posts
    .map((post) => {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.publishedAt).toUTCString();
      const escapedTitle = post.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escapedDescription = post.description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      return `
    <item>
      <title>${escapedTitle}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapedDescription}</description>
      <author>flow@minervaflow.app (${post.authorName})</author>
      <category>${post.category}</category>
    </item>`;
    })
    .join("\n");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Minerva Flow — Analyses, Ratios &amp; Rentabilité en Restauration</title>
    <link>${baseUrl}/blog</link>
    <description>Guides pratiques pour restaurants et cafés : fidélisation, caisse, Prime Cost et visibilité locale.</description>
    <language>fr-CA</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(rssXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
