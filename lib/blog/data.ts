import { createClient } from "@/lib/supabase/server";
import { BlogPost } from "./types";
import { INITIAL_BLOG_POSTS } from "./posts";

interface DatabaseBlogPostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  cover_image: string | null;
  author_name: string;
  author_role: string;
  author_avatar: string | null;
  read_time_minutes: number;
  published_at: string;
  updated_at: string | null;
  is_published: boolean;
  featured: boolean;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  key_takeaways: string[] | null;
  metrics: { label: string; value: string; change?: string }[] | null;
}

function mapRowToBlogPost(row: DatabaseBlogPostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    content: row.content,
    category: row.category as BlogPost["category"],
    coverImage: row.cover_image || undefined,
    authorName: row.author_name,
    authorRole: row.author_role,
    authorAvatar: row.author_avatar || undefined,
    readTimeMinutes: row.read_time_minutes || 5,
    publishedAt: row.published_at,
    updatedAt: row.updated_at || undefined,
    isPublished: row.is_published,
    featured: row.featured,
    tags: row.tags || [],
    seoTitle: row.seo_title || undefined,
    seoDescription: row.seo_description || undefined,
    keyTakeaways: row.key_takeaways || undefined,
    metrics: row.metrics || undefined,
  };
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return INITIAL_BLOG_POSTS;
    }

    return (data as DatabaseBlogPostRow[]).map(mapRowToBlogPost);
  } catch {
    return INITIAL_BLOG_POSTS;
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (!error && data) {
      return mapRowToBlogPost(data as DatabaseBlogPostRow);
    }
  } catch {
    // Fall back to static posts below
  }

  const staticMatch = INITIAL_BLOG_POSTS.find((p) => p.slug === slug);
  return staticMatch || null;
}

export async function getFeaturedBlogPost(): Promise<BlogPost> {
  const posts = await getAllBlogPosts();
  return posts.find((p) => p.featured) || posts[0] || INITIAL_BLOG_POSTS[0];
}

export async function getRelatedPosts(currentSlug: string, limit = 2): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  const current = posts.find((p) => p.slug === currentSlug);
  return posts
    .filter((p) => p.slug !== currentSlug)
    .sort((a, b) => {
      if (current && a.category === current.category) return -1;
      if (current && b.category === current.category) return 1;
      return 0;
    })
    .slice(0, limit);
}
