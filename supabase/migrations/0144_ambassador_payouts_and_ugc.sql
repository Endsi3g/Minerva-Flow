-- Hosted Stripe payouts and consent-based, real restaurant UGC.
alter table public.flow_ambassadors
  add column if not exists stripe_account_id text unique,
  add column if not exists payout_country text not null default 'CA';

alter table public.flow_ambassador_commissions
  add column if not exists stripe_transfer_id text unique;

create table if not exists public.flow_ugc_restaurant_profiles (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  display_name text not null,
  city text,
  approved_quote text,
  public_url text,
  consented_by uuid not null references auth.users(id) on delete restrict,
  consented_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flow_ugc_display_name_length check (char_length(display_name) between 2 and 120),
  constraint flow_ugc_quote_length check (approved_quote is null or char_length(approved_quote) <= 500)
);

create table if not exists public.flow_ugc_submissions (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.flow_ambassadors(id) on delete cascade,
  restaurant_profile_id uuid not null references public.flow_ugc_restaurant_profiles(id) on delete restrict,
  platform text not null check (platform in ('instagram','tiktok','youtube','linkedin','facebook','other')),
  post_url text not null,
  caption text not null,
  disclosure_confirmed boolean not null default false check (disclosure_confirmed),
  usage_rights_confirmed boolean not null default false check (usage_rights_confirmed),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint flow_ugc_post_url_length check (char_length(post_url) between 8 and 2048),
  constraint flow_ugc_caption_length check (char_length(caption) between 2 and 2000)
);

create index if not exists flow_ugc_submissions_ambassador_idx
  on public.flow_ugc_submissions(ambassador_id, created_at desc);
create index if not exists flow_ugc_submissions_review_idx
  on public.flow_ugc_submissions(status, created_at desc);

alter table public.flow_ugc_restaurant_profiles enable row level security;
alter table public.flow_ugc_submissions enable row level security;

drop policy if exists flow_ugc_profiles_read_active on public.flow_ugc_restaurant_profiles;
create policy flow_ugc_profiles_read_active on public.flow_ugc_restaurant_profiles
  for select to authenticated using (is_active);
drop policy if exists flow_ugc_submissions_read_own on public.flow_ugc_submissions;
create policy flow_ugc_submissions_read_own on public.flow_ugc_submissions
  for select to authenticated using (exists (
    select 1 from public.flow_ambassadors a where a.id = ambassador_id and a.user_id = auth.uid()
  ));

grant all on public.flow_ugc_restaurant_profiles, public.flow_ugc_submissions to service_role;
grant select on public.flow_ugc_restaurant_profiles, public.flow_ugc_submissions to authenticated;

comment on table public.flow_ugc_restaurant_profiles is 'Restaurants explicitly opted in to be named in public ambassador content.';
comment on table public.flow_ugc_submissions is 'Ambassador UGC submissions linked to a consented restaurant and reviewed before reuse.';
comment on column public.flow_ambassadors.stripe_account_id is 'Stripe Connect Express account used for ambassador payouts.';
