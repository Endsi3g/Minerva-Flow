-- Migration 0124: Daily menu views tracking and order source channel
alter table orders add column if not exists source text not null default 'web';

create table if not exists daily_menu_views (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  date date not null default current_date,
  views_count integer not null default 1,
  created_at timestamptz not null default now(),
  constraint unique_restaurant_menu_view_date unique (restaurant_id, date)
);

create index if not exists idx_daily_menu_views_restaurant_date on daily_menu_views (restaurant_id, date desc);

alter table daily_menu_views enable row level security;

drop policy if exists "daily_menu_views_select" on daily_menu_views;
create policy "daily_menu_views_select" on daily_menu_views for select
  using (is_restaurant_member(restaurant_id));

drop policy if exists "daily_menu_views_insert" on daily_menu_views;
create policy "daily_menu_views_insert" on daily_menu_views for insert
  with check (true);

drop policy if exists "daily_menu_views_update" on daily_menu_views;
create policy "daily_menu_views_update" on daily_menu_views for update
  using (true);
