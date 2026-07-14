-- Minerva Flow — notifications + weekly automated reports

create table notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade, -- null = broadcast to every active member
  type text not null, -- e.g. weekly_report
  title text not null,
  body text,
  link text, -- e.g. /reports/revenu or /assistant/{conversationId}
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_restaurant_user on notifications (restaurant_id, user_id, created_at desc);

create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  week_start date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, week_start)
);

create index idx_weekly_reports_restaurant on weekly_reports (restaurant_id, week_start desc);

alter table notifications enable row level security;
alter table weekly_reports enable row level security;

-- a member sees broadcast notifications (user_id is null) and their own;
-- inserts happen only via the service-role client from the cron route.
create policy "notifications_select" on notifications for select
  using (is_restaurant_member(restaurant_id) and (user_id is null or user_id = auth.uid()));
create policy "notifications_update_own" on notifications for update
  using (user_id = auth.uid());

create policy "weekly_reports_select" on weekly_reports for select
  using (is_restaurant_member(restaurant_id));
