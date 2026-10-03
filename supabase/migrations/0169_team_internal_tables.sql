-- Internal team portal data (/equipe): monthly goals, weekly check-ins,
-- declared content links, GitHub login links. Team members see each
-- other's check-ins/links/GitHub login (team directory); monthly goals
-- (revenue targets) are team-only, never readable by ambassadors.

create or replace function public.is_team_member()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_team_member from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_active_flow_ambassador()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.flow_ambassadors where user_id = auth.uid() and status = 'active');
$$;

revoke all on function public.is_team_member() from public;
revoke all on function public.is_active_flow_ambassador() from public;
grant execute on function public.is_team_member() to authenticated;
grant execute on function public.is_active_flow_ambassador() to authenticated;

create table if not exists public.team_monthly_goals (
  id uuid primary key default gen_random_uuid(),
  month date not null check (month = date_trunc('month', month)::date),
  metric text not null check (metric in ('restaurants_new', 'active_subscriptions', 'mrr', 'visitors')),
  target numeric not null check (target >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (month, metric)
);
alter table public.team_monthly_goals enable row level security;
drop policy if exists team_monthly_goals_team_all on public.team_monthly_goals;
create policy team_monthly_goals_team_all on public.team_monthly_goals
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create table if not exists public.team_weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  commitments text not null default '' check (char_length(commitments) <= 2000),
  delivered text not null default '' check (char_length(delivered) <= 2000),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);
alter table public.team_weekly_checkins enable row level security;
drop policy if exists team_weekly_checkins_select on public.team_weekly_checkins;
create policy team_weekly_checkins_select on public.team_weekly_checkins
  for select to authenticated using (public.is_team_member());
drop policy if exists team_weekly_checkins_write_own on public.team_weekly_checkins;
create policy team_weekly_checkins_write_own on public.team_weekly_checkins
  for all to authenticated
  using (user_id = auth.uid() and public.is_team_member())
  with check (user_id = auth.uid() and public.is_team_member());

create table if not exists public.team_content_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text not null check (url ~ '^https://' and char_length(url) <= 500),
  platform text not null default 'other' check (platform in ('instagram', 'tiktok', 'youtube', 'linkedin', 'facebook', 'other')),
  title text not null default '' check (char_length(title) <= 160),
  published_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists team_content_links_user_idx on public.team_content_links (user_id, published_on desc);
alter table public.team_content_links enable row level security;
drop policy if exists team_content_links_select on public.team_content_links;
create policy team_content_links_select on public.team_content_links
  for select to authenticated using (user_id = auth.uid() or public.is_team_member());
drop policy if exists team_content_links_write_own on public.team_content_links;
create policy team_content_links_write_own on public.team_content_links
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (public.is_team_member() or public.is_active_flow_ambassador()));

create table if not exists public.team_member_github (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  github_login text not null check (github_login ~ '^[A-Za-z0-9-]{1,39}$'),
  updated_at timestamptz not null default now()
);
create unique index if not exists team_member_github_login_idx on public.team_member_github (lower(github_login));
alter table public.team_member_github enable row level security;
drop policy if exists team_member_github_select on public.team_member_github;
create policy team_member_github_select on public.team_member_github
  for select to authenticated using (user_id = auth.uid() or public.is_team_member());
drop policy if exists team_member_github_write_own on public.team_member_github;
create policy team_member_github_write_own on public.team_member_github
  for all to authenticated
  using (user_id = auth.uid() and public.is_team_member())
  with check (user_id = auth.uid() and public.is_team_member());
