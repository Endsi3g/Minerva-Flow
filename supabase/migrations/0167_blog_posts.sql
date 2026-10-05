-- Migration 0167: Blog Posts Table & Seed Data for Minerva Flow High Authority Content
begin;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  content text not null,
  category text not null check (category in ('Rentabilité & Prime Cost', 'Technologies & POS', 'Fidélisation & Croissance')),
  cover_image text,
  author_name text not null default 'Équipe Minerva Flow',
  author_role text not null default 'Recherche & Économie de la Restauration',
  author_avatar text,
  read_time_minutes integer not null default 5 check (read_time_minutes > 0),
  tags text[] not null default '{}',
  is_published boolean not null default true,
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  key_takeaways text[],
  metrics jsonb,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexation optimisée pour les requêtes publiques et l'ordre chronologique
create index if not exists blog_posts_published_idx
  on public.blog_posts(is_published, published_at desc);

create index if not exists blog_posts_category_idx
  on public.blog_posts(category, published_at desc)
  where is_published = true;

create index if not exists blog_posts_featured_idx
  on public.blog_posts(featured, published_at desc)
  where is_published = true;

-- Activation du Row-Level Security (RLS)
alter table public.blog_posts enable row level security;

-- Lecture publique de tous les articles publiés pour les visiteurs et crawlers d'IA
drop policy if exists "blog_posts_public_select" on public.blog_posts;
create policy "blog_posts_public_select" on public.blog_posts
  for select
  using (is_published = true);

comment on table public.blog_posts is
  'Articles de blog, études de cas et guides opérationnels publics pour le référencement naturel (SEO) et l''optimisation pour moteurs d''intelligence artificielle (GEO) de Minerva Flow.';

commit;
