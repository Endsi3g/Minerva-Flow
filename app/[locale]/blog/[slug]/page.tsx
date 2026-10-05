import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getBlogPostBySlug, getRelatedPosts } from "@/lib/blog/data";
import { INITIAL_BLOG_POSTS } from "@/lib/blog/posts";
import { Logo } from "@/components/shell/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EditorialMarkdown } from "@/components/blog/EditorialMarkdown";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export async function generateStaticParams() {
  return INITIAL_BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Article non trouvé | Minerva Flow",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";
  const postUrl = `${baseUrl}/blog/${post.slug}`;
  const title = post.seoTitle || `${post.title} | Minerva Flow`;
  const description = post.seoDescription || post.description;

  return {
    title,
    description,
    keywords: post.tags,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      title,
      description,
      url: postUrl,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.authorName],
      section: post.category,
      tags: post.tags,
      images: [
        {
          url: post.coverImage || "/og.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [post.coverImage || "/og.png"],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.slug, 2);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";
  const postUrl = `${baseUrl}/blog/${post.slug}`;

  // Rich Schema.org JSON-LD for AI search engines & Google Rich Results
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${postUrl}#article`,
        isPartOf: {
          "@type": "WebSite",
          "@id": `${baseUrl}#website`,
          name: "Minerva Flow",
          url: baseUrl,
        },
        headline: post.title,
        description: post.description,
        url: postUrl,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt,
        inLanguage: "fr-CA",
        mainEntityOfPage: postUrl,
        keywords: post.tags.join(", "),
        articleSection: post.category,
        author: {
          "@type": "Organization",
          name: post.authorName,
          url: baseUrl,
        },
        publisher: {
          "@type": "Organization",
          name: "Minerva Flow",
          url: baseUrl,
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/icon-512.png`,
          },
        },
        image: {
          "@type": "ImageObject",
          url: `${baseUrl}${post.coverImage || "/og.png"}`,
          width: 1200,
          height: 630,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: baseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${baseUrl}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: postUrl,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-mv-cream text-mv-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      {/* Top Luxury Navigation */}
      <header className="sticky top-0 z-40 border-b border-mv-border-soft bg-mv-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/blog" className="transition-opacity hover:opacity-85">
            <Logo size={28} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mv-ink-soft transition-colors hover:text-mv-ink"
            >
              <ArrowLeft size={14} /> Tous les articles
            </Link>
            <Button href="/sign-up" size="sm" className="hidden sm:inline-flex shadow-mv-sm">
              Créer mon compte <ArrowRight size={13} className="ml-1" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Article Breadcrumb & Metadata Header */}
        <div className="space-y-4 border-b border-mv-border-soft pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="subtle" tone="green" size="sm">
              {post.category}
            </Badge>
            <span className="text-mv-ink-faint">·</span>
            <span className="inline-flex items-center gap-1 text-[12px] text-mv-ink-faint">
              <Calendar size={13} />
              {new Date(post.publishedAt).toLocaleDateString("fr-CA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="text-mv-ink-faint">·</span>
            <span className="inline-flex items-center gap-1 text-[12px] text-mv-ink-faint">
              <Clock size={13} /> {post.readTimeMinutes} min de lecture
            </span>
          </div>

          <h1 className="font-display text-3xl font-normal leading-tight text-mv-ink sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          <p className="text-[16px] leading-relaxed text-mv-ink-soft sm:text-[18px]">
            {post.description}
          </p>

          {/* Author Badge */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-mv-green-tint font-display text-sm font-semibold text-mv-green-dark">
                {post.authorName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-mv-ink">{post.authorName}</div>
                <div className="text-[11.5px] text-mv-ink-faint">{post.authorRole}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Takeaways Box (GEO Information Gain Anchor) */}
        {post.keyTakeaways && post.keyTakeaways.length > 0 && (
          <aside className="my-8 rounded-2xl border border-mv-green/30 bg-gradient-to-br from-mv-green-tint/70 to-mv-surface p-6 shadow-xs">
            <div className="flex items-center gap-2 font-display text-[15px] font-semibold text-mv-green-dark">
              <Sparkles size={16} />
              Points clés &amp; Enseignements d’exploitation
            </div>
            <ul className="mt-3 space-y-2.5">
              {post.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-mv-ink">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-mv-green" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Key Metrics Dashboard if defined */}
        {post.metrics && post.metrics.length > 0 && (
          <div className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {post.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-mv-border-soft bg-mv-surface p-4 text-center shadow-xs"
              >
                <div className="font-mono text-2xl font-bold tracking-tight text-mv-green-dark">
                  {m.value}
                </div>
                <div className="mt-1 text-[11.5px] font-semibold text-mv-ink">{m.label}</div>
                {m.change && (
                  <div className="mt-0.5 font-mono text-[10.5px] text-mv-ink-faint">
                    {m.change}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Editorial Markdown Body */}
        <div className="mt-8">
          <EditorialMarkdown content={post.content} />
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-mv-border-soft pt-6">
            <span className="text-[12px] font-medium text-mv-ink-faint">Thématiques :</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-mv-border-soft bg-mv-surface px-2.5 py-1 text-[11.5px] text-mv-ink-soft"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* In-article Conversion Card */}
        <section className="mt-14 rounded-3xl border border-mv-border bg-gradient-to-br from-mv-surface via-mv-cream-soft to-mv-green-tint/40 p-8 text-center sm:p-10 shadow-mv-sm">
          <h3 className="font-display text-2xl font-normal text-mv-ink sm:text-3xl">
            Prêt à appliquer ces leviers dans votre restaurant ?
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-mv-ink-soft">
            Découvrez comment Minerva Flow centralise vos ventes Square ou Lightspeed, surveille votre Prime Cost et fidélise vos habitués avec Apple Wallet.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button href="/sign-up" size="lg" className="shadow-mv-sm">
              Créer mon compte <ArrowRight size={15} />
            </Button>
            <Button href="/demo/calin-cafe" variant="secondary" size="lg">
              Voir la démo interactive
            </Button>
          </div>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 space-y-6 border-t border-mv-border-soft pt-12">
            <h3 className="font-display text-2xl font-normal text-mv-ink">
              Poursuivre votre lecture
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {relatedPosts.map((rPost) => (
                <Link
                  key={rPost.id}
                  href={`/blog/${rPost.slug}`}
                  className="group rounded-2xl border border-mv-border-soft bg-mv-surface p-6 shadow-xs transition-all hover:border-mv-green/30 hover:shadow-mv-sm"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-mv-green-dark">
                    {rPost.category}
                  </span>
                  <h4 className="mt-2 font-display text-lg font-normal text-mv-ink transition-colors group-hover:text-mv-green-dark">
                    {rPost.title}
                  </h4>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-mv-ink-soft line-clamp-2">
                    {rPost.description}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark">
                    Lire l’article <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Luxury Footer */}
      <footer className="mt-20 border-t border-mv-border-soft bg-mv-surface py-10 text-[12.5px] text-mv-ink-faint">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span>© 2026 Minerva Technologies Inc.</span>
            <span>·</span>
            <span>Montréal (Québec), Canada</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="hover:text-mv-ink">
              Index du Blog
            </Link>
            <Link href="/fr/legal/privacy" className="hover:text-mv-ink">
              Confidentialité
            </Link>
            <Link href="/fr/legal/terms" className="hover:text-mv-ink">
              Conditions
            </Link>
            <a href="/llms.txt" className="font-mono text-mv-green-dark hover:underline">
              llms.txt
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
