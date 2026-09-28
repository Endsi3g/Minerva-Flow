-- Attribution by ambassador link/video and Instagram professional account metrics.
create table if not exists public.flow_ambassador_links (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.flow_ambassadors(id) on delete cascade,
  slug text not null unique,
  label text not null,
  platform text check (platform in ('instagram','tiktok','youtube','linkedin','facebook','other')),
  content_url text,
  created_at timestamptz not null default now(),
  constraint flow_ambassador_link_label_length check (char_length(label) between 2 and 120),
  constraint flow_ambassador_link_content_url_length check (content_url is null or char_length(content_url) <= 2048)
);

create table if not exists public.flow_ambassador_link_clicks (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.flow_ambassador_links(id) on delete cascade,
  referrer_host text,
  clicked_at timestamptz not null default now()
);

alter table public.flow_ambassador_referrals
  add column if not exists referral_link_id uuid references public.flow_ambassador_links(id) on delete set null;
alter table public.flow_ugc_submissions
  add column if not exists referral_link_id uuid references public.flow_ambassador_links(id) on delete set null;

create index if not exists flow_ambassador_links_owner_idx on public.flow_ambassador_links(ambassador_id, created_at desc);
create index if not exists flow_ambassador_link_clicks_link_idx on public.flow_ambassador_link_clicks(link_id, clicked_at desc);
create index if not exists flow_ambassador_referrals_link_idx on public.flow_ambassador_referrals(referral_link_id, created_at desc);

create table if not exists public.flow_ambassador_instagram_connections (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null unique references public.flow_ambassadors(id) on delete cascade,
  instagram_user_id text not null,
  username text,
  access_token_id uuid not null,
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.flow_ambassador_links enable row level security;
alter table public.flow_ambassador_link_clicks enable row level security;
alter table public.flow_ambassador_instagram_connections enable row level security;

drop policy if exists flow_ambassador_links_read_own on public.flow_ambassador_links;
create policy flow_ambassador_links_read_own on public.flow_ambassador_links for select to authenticated
using (exists (select 1 from public.flow_ambassadors a where a.id = ambassador_id and a.user_id = auth.uid()));
drop policy if exists flow_ambassador_clicks_read_own on public.flow_ambassador_link_clicks;
create policy flow_ambassador_clicks_read_own on public.flow_ambassador_link_clicks for select to authenticated
using (exists (select 1 from public.flow_ambassador_links l join public.flow_ambassadors a on a.id = l.ambassador_id where l.id = link_id and a.user_id = auth.uid()));
drop policy if exists flow_ambassador_instagram_read_own on public.flow_ambassador_instagram_connections;
create policy flow_ambassador_instagram_read_own on public.flow_ambassador_instagram_connections for select to authenticated
using (exists (select 1 from public.flow_ambassadors a where a.id = ambassador_id and a.user_id = auth.uid()));

grant all on public.flow_ambassador_links, public.flow_ambassador_link_clicks, public.flow_ambassador_instagram_connections to service_role;
grant select on public.flow_ambassador_links, public.flow_ambassador_link_clicks, public.flow_ambassador_instagram_connections to authenticated;

create or replace function public.delete_vault_secret(secret_id uuid)
returns void
language sql
security definer
set search_path = public, vault
as $$
  delete from vault.secrets where id = secret_id;
$$;
revoke execute on function public.delete_vault_secret(uuid) from public, anon, authenticated;
grant execute on function public.delete_vault_secret(uuid) to service_role;

comment on table public.flow_ambassador_links is 'Per-content ambassador links used for privacy-minimized click and signup attribution.';
comment on table public.flow_ambassador_link_clicks is 'Anonymous referral-link click totals; no IP address or persistent visitor identifier is stored.';
comment on table public.flow_ambassador_instagram_connections is 'Server-side Instagram professional account connection metadata; access tokens are stored in Supabase Vault.';
