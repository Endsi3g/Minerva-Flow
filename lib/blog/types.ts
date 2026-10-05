export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string; // Markdown or rich text
  category:
    | "Rentabilité & Prime Cost"
    | "Technologies & POS"
    | "Fidélisation & Croissance"
    | "Google Maps & E-Réputation";
  coverImage?: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  readTimeMinutes: number;
  publishedAt: string; // ISO date string
  updatedAt?: string;
  isPublished: boolean;
  featured?: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  keyTakeaways?: string[];
  metrics?: { label: string; value: string; change?: string }[];
}
