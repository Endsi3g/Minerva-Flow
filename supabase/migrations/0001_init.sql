-- Minerva Flow — initial schema
-- Multi-tenant: every business table is scoped by restaurant_id and gated
-- through restaurant_members (the join table between auth.users and restaurants).
-- Market: Québec (CAD, America/Montreal, civic-address format).

create extension if not exists "pgcrypto";

-- ── enums ──────────────────────────────────────────────────────────────
create type member_role as enum ('owner', 'manager', 'staff', 'consultant');
create type member_status as enum ('active', 'invited');
create type program_status as enum ('planifie', 'actif', 'termine');
create type campaign_status as enum ('planifiee', 'active', 'terminee');
create type campaign_confidence as enum ('fort', 'moyen', 'faible', 'insuffisant');
create type flow_direction as enum ('in', 'out');
create type connection_type as enum ('banque', 'pos', 'reservation', 'livraison', 'email');
create type connection_status as enum ('connecte', 'erreur', 'attente');
create type alert_severity as enum ('critique', 'important', 'info');
create type alert_status as enum ('nouvelle', 'revue', 'assignee');
create type recommendation_status as enum ('nouvelle', 'planifiee', 'en_cours', 'ignoree', 'terminee');
create type rush_level as enum ('calme', 'normal', 'rush', 'debordement');

-- ── profiles ───────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── restaurants & membership ──────────────────────────────────────────
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  province text not null default 'QC',
  postal_code text,
  timezone text not null default 'America/Montreal',
  currency text not null default 'CAD',
  service_model text not null default 'restaurant', -- cafe | restaurant | hybrid
  operating_days int[] not null default '{0,1,2,3,4,5,6}',
  color text not null default '#167F5B',
  lng double precision,
  lat double precision,
  created_at timestamptz not null default now()
);

create table restaurant_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role member_role not null default 'staff',
  status member_status not null default 'invited',
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index idx_restaurant_members_user on restaurant_members (user_id);
create index idx_restaurant_members_restaurant on restaurant_members (restaurant_id);

-- helper: is the current user a member of this restaurant, with at-least this role?
create function is_restaurant_member(target_restaurant_id uuid, min_roles member_role[] default array['owner','manager','staff','consultant']::member_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from restaurant_members m
    where m.restaurant_id = target_restaurant_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(min_roles)
  );
$$;

-- ── activity log ───────────────────────────────────────────────────────
-- Powers the Profil "activité" list and the Équipe per-person activity view.
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  action_type text not null, -- e.g. day_added, alert_resolved, campaign_created, program_updated
  entity_type text,
  entity_id uuid,
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_activity_log_restaurant on activity_log (restaurant_id, created_at desc);
create index idx_activity_log_actor on activity_log (actor_id, created_at desc);

-- ── service days ───────────────────────────────────────────────────────
create table service_days (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  date date not null,
  revenue numeric(12,2) not null default 0,
  expenses numeric(12,2),
  reservation_count int,
  main_source text not null default 'salle', -- salle | livraison | reservation
  rush_level rush_level not null default 'normal',
  events text[] not null default '{}',
  notes text,
  promo_active boolean not null default false,
  menu_change boolean not null default false,
  reviewed boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (restaurant_id, date)
);

create index idx_service_days_restaurant_date on service_days (restaurant_id, date desc);

-- ── revenue programs ───────────────────────────────────────────────────
create table revenue_programs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  description text,
  type text not null default 'saison', -- brunch | soiree | saison | evenement
  start_date date not null,
  end_date date not null,
  objective text,
  revenue_goal numeric(12,2),
  expected_cost numeric(12,2),
  revenue numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  status program_status not null default 'planifie',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_programs_restaurant on revenue_programs (restaurant_id, start_date desc);

-- ── campaigns ──────────────────────────────────────────────────────────
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  program_id uuid references revenue_programs (id) on delete set null,
  name text not null,
  description text,
  channel text not null, -- Instagram | Facebook | Email | En salle
  type text not null default 'post', -- post | email | promo
  start_date date not null,
  end_date date,
  cost numeric(12,2) not null default 0,
  status campaign_status not null default 'planifiee',
  estimated_revenue numeric(12,2) not null default 0,
  visites int not null default 0,
  confidence campaign_confidence not null default 'insuffisant',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_campaigns_restaurant on campaigns (restaurant_id, start_date desc);

-- ── finance: transactions & categories ────────────────────────────────
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table financial_transactions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric(12,2) not null,
  direction flow_direction not null,
  category text,
  source_account text,
  program_id uuid references revenue_programs (id) on delete set null,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_transactions_restaurant_date on financial_transactions (restaurant_id, date desc);

-- ── integrations / connections ────────────────────────────────────────
create table connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  type connection_type not null,
  status connection_status not null default 'attente',
  last_sync timestamptz,
  detail text,
  created_at timestamptz not null default now()
);

create index idx_connections_restaurant on connections (restaurant_id);

-- ── alerts & alert rules ───────────────────────────────────────────────
create table alert_rules (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  rule_type text not null, -- revenue_drop | expense_spike | missing_day_input | broken_sync | reservation_anomaly
  threshold numeric,
  enabled boolean not null default true,
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, rule_type)
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  type text not null,
  severity alert_severity not null default 'info',
  title text not null,
  detail text,
  status alert_status not null default 'nouvelle',
  assigned_to uuid references auth.users (id),
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create index idx_alerts_restaurant on alerts (restaurant_id, created_at desc);

-- ── recommendations ────────────────────────────────────────────────────
create table recommendations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  diagnosis text not null,
  suggested_action text not null,
  related_metric text,
  related_program_id uuid references revenue_programs (id) on delete set null,
  related_campaign_id uuid references campaigns (id) on delete set null,
  status recommendation_status not null default 'nouvelle',
  created_at timestamptz not null default now()
);

create index idx_recommendations_restaurant on recommendations (restaurant_id, created_at desc);

-- ── notes / annotations (generic, polymorphic) ─────────────────────────
create table notes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  entity_type text not null, -- program | service_day | campaign | alert
  entity_id uuid not null,
  author_id uuid references auth.users (id),
  text text not null,
  created_at timestamptz not null default now()
);

create index idx_notes_entity on notes (entity_type, entity_id);

-- ── row level security ──────────────────────────────────────────────────
alter table profiles enable row level security;
alter table restaurants enable row level security;
alter table restaurant_members enable row level security;
alter table activity_log enable row level security;
alter table service_days enable row level security;
alter table revenue_programs enable row level security;
alter table campaigns enable row level security;
alter table expense_categories enable row level security;
alter table financial_transactions enable row level security;
alter table connections enable row level security;
alter table alert_rules enable row level security;
alter table alerts enable row level security;
alter table recommendations enable row level security;
alter table notes enable row level security;

-- profiles: a user can read/update their own profile only
create policy "profiles_self_select" on profiles for select using (id = auth.uid());
create policy "profiles_self_update" on profiles for update using (id = auth.uid());

-- restaurants: visible to members; owner + manager can update restaurant settings
create policy "restaurants_member_select" on restaurants for select
  using (is_restaurant_member(id));
create policy "restaurants_manage_update" on restaurants for update
  using (is_restaurant_member(id, array['owner','manager']::member_role[]));
create policy "restaurants_owner_insert" on restaurants for insert
  with check (true); -- creation happens via a server action that immediately inserts the owner membership

-- restaurant_members: members can see the roster of restaurants they belong to;
-- owner + manager can add/change/remove members (Équipe page)
create policy "members_select" on restaurant_members for select
  using (is_restaurant_member(restaurant_id));
create policy "members_manage_write" on restaurant_members for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "members_manage_update" on restaurant_members for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "members_manage_delete" on restaurant_members for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- activity_log: members read the restaurant's log; any active member can log their own actions
create policy "activity_log_select" on activity_log for select
  using (is_restaurant_member(restaurant_id));
create policy "activity_log_insert" on activity_log for insert
  with check (actor_id = auth.uid() and is_restaurant_member(restaurant_id));

-- service_days: members read; owner/manager/staff write, owner/manager delete
create policy "service_days_select" on service_days for select
  using (is_restaurant_member(restaurant_id));
create policy "service_days_write" on service_days for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
create policy "service_days_update" on service_days for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
create policy "service_days_delete" on service_days for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- revenue_programs: members read; owner/manager/staff write, owner/manager delete
create policy "programs_select" on revenue_programs for select
  using (is_restaurant_member(restaurant_id));
create policy "programs_write" on revenue_programs for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
create policy "programs_update" on revenue_programs for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
create policy "programs_delete" on revenue_programs for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- campaigns: members read; owner/manager/consultant write (consultants propose campaigns/plans), owner/manager delete
create policy "campaigns_select" on campaigns for select
  using (is_restaurant_member(restaurant_id));
create policy "campaigns_write" on campaigns for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','consultant']::member_role[]));
create policy "campaigns_update" on campaigns for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','consultant']::member_role[]));
create policy "campaigns_delete" on campaigns for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- finance tables: owner + manager only (staff/consultant do not see financial detail)
create policy "expense_categories_manage" on expense_categories for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create policy "transactions_manage" on financial_transactions for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create policy "connections_manage" on connections for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create policy "alert_rules_manage" on alert_rules for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- alerts: members read; owner/manager update status; system (service role) inserts
create policy "alerts_select" on alerts for select
  using (is_restaurant_member(restaurant_id));
create policy "alerts_update" on alerts for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- recommendations: members read; owner/manager update status
create policy "recommendations_select" on recommendations for select
  using (is_restaurant_member(restaurant_id));
create policy "recommendations_update" on recommendations for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- notes: any member can read and add notes
create policy "notes_select" on notes for select
  using (is_restaurant_member(restaurant_id));
create policy "notes_insert" on notes for insert
  with check (is_restaurant_member(restaurant_id));

-- ── storage: avatar photos ───────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars_owner_write" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── realtime ───────────────────────────────────────────────────────────
alter publication supabase_realtime add table service_days;
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table activity_log;
alter publication supabase_realtime add table financial_transactions;
alter publication supabase_realtime add table revenue_programs;
alter publication supabase_realtime add table campaigns;
