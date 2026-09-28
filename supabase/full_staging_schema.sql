-- =========================================================================
-- MINERVA FLOW — CONSOLIDATED MIGRATIONS SCRIPT FOR STAGING
-- Target Project: lhosxxtvgmedwarwgjhb (Minerva Flow Staging)
-- Total Migrations: 133
-- Generated automatically for HTTPS execution
-- =========================================================================

-- Initialize supabase_migrations tracking table
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version text NOT NULL PRIMARY KEY,
    statements text[],
    name text
);

-- >>> MIGRATION 0001_init.sql >>>
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
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0001', 'init') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0001_init.sql <<<

-- >>> MIGRATION 0002_chat_and_referrals.sql >>>
-- Minerva Flow — AI chat history + referral program
-- Chat tables follow the same restaurant_id + is_restaurant_member() pattern
-- as 0001_init.sql. Referral tables are restaurant-scoped (the reward is a
-- subscription discount applied to a restaurant, not a personal profile).

-- ── enums ──────────────────────────────────────────────────────────────
create type chat_message_role as enum ('user', 'assistant');
create type artifact_type as enum ('table', 'chart', 'summary');
create type referral_status as enum ('pending', 'active', 'rewarded', 'expired');
create type reward_type as enum ('percent_discount', 'free_months');

-- ── chat conversations & messages ───────────────────────────────────────
create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  title text, -- null until the first exchange generates one; renders as "Nouvelle conversation"
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_chat_conversations_restaurant on chat_conversations (restaurant_id, updated_at desc);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade, -- denormalized for direct RLS without a join
  author_id uuid references auth.users (id), -- null for assistant messages
  role chat_message_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_conversation on chat_messages (conversation_id, created_at);

create table chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references chat_messages (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  storage_path text not null, -- "{restaurantId}/{conversationId}/{uuid}-{filename}" in the chat-attachments bucket
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create index idx_chat_attachments_message on chat_attachments (message_id);

create table chat_artifacts (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  message_id uuid references chat_messages (id) on delete set null, -- the assistant message that produced it
  type artifact_type not null,
  title text not null,
  data jsonb not null, -- shape depends on `type`; validated by the zod schema at generation time
  created_at timestamptz not null default now()
);

create index idx_chat_artifacts_conversation on chat_artifacts (conversation_id, created_at desc);

-- ── referral program ─────────────────────────────────────────────────────
create table referral_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  code text not null unique, -- short human-shareable slug, e.g. "MINERVA-7X2K"
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (restaurant_id) -- one active code per restaurant keeps redemption/sharing unambiguous
);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references referral_codes (id) on delete cascade,
  referred_email text not null, -- captured at sign-up, before a restaurant necessarily exists
  referred_restaurant_id uuid references restaurants (id) on delete set null,
  status referral_status not null default 'pending',
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  rewarded_at timestamptz
);

create index idx_referrals_code on referrals (referral_code_id);

create table referral_rewards (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade, -- the referrer's restaurant (beneficiary)
  referral_id uuid not null references referrals (id) on delete cascade,
  reward_type reward_type not null default 'percent_discount',
  amount numeric not null, -- e.g. 20 (percent) or 1 (free month), per reward_type
  applied boolean not null default false, -- flips true once a (future) billing integration consumes it
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_referral_rewards_restaurant on referral_rewards (restaurant_id, created_at desc);

-- ── row level security ──────────────────────────────────────────────────
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
alter table chat_attachments enable row level security;
alter table chat_artifacts enable row level security;
alter table referral_codes enable row level security;
alter table referrals enable row level security;
alter table referral_rewards enable row level security;

-- chat: any active member (owner/manager/staff/consultant — the is_restaurant_member
-- default) can read, create conversations/messages, and add attachments/artifacts
create policy "chat_conversations_select" on chat_conversations for select
  using (is_restaurant_member(restaurant_id));
create policy "chat_conversations_insert" on chat_conversations for insert
  with check (created_by = auth.uid() and is_restaurant_member(restaurant_id));
create policy "chat_conversations_update" on chat_conversations for update
  using (is_restaurant_member(restaurant_id)); -- rename/archive by any participant

create policy "chat_messages_select" on chat_messages for select
  using (is_restaurant_member(restaurant_id));
create policy "chat_messages_insert" on chat_messages for insert
  with check (is_restaurant_member(restaurant_id));
  -- user messages insert with author_id = auth.uid(); assistant-role messages are
  -- inserted by the API route using the server Supabase client acting as the same
  -- authenticated user, so this single policy covers both.

create policy "chat_attachments_select" on chat_attachments for select
  using (is_restaurant_member(restaurant_id));
create policy "chat_attachments_insert" on chat_attachments for insert
  with check (is_restaurant_member(restaurant_id));

create policy "chat_artifacts_select" on chat_artifacts for select
  using (is_restaurant_member(restaurant_id));
create policy "chat_artifacts_insert" on chat_artifacts for insert
  with check (is_restaurant_member(restaurant_id));

-- referrals: any active member can see/share the restaurant's referral code
-- (the "P" button in the chat sidebar is reachable by all roles), but only
-- owner/manager can create or change it (billing-adjacent). Referrals/rewards
-- are created and transitioned server-side only (service role) — at sign-up
-- time the referred user has no restaurant_members row yet on the referrer's
-- restaurant, so is_restaurant_member() can never pass for a
-- client-authenticated insert here, by design.
create policy "referral_codes_select" on referral_codes for select
  using (is_restaurant_member(restaurant_id));
create policy "referral_codes_insert" on referral_codes for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "referral_codes_update" on referral_codes for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create policy "referrals_select" on referrals for select
  using (exists (
    select 1 from referral_codes c
    where c.id = referral_code_id and is_restaurant_member(c.restaurant_id, array['owner','manager']::member_role[])
  ));

create policy "referral_rewards_select" on referral_rewards for select
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ── storage: chat attachments (private — unlike the public avatars bucket) ─
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

create policy "chat_attachments_bucket_read" on storage.objects for select
  using (bucket_id = 'chat-attachments' and is_restaurant_member((storage.foldername(name))[1]::uuid));
create policy "chat_attachments_bucket_write" on storage.objects for insert
  with check (bucket_id = 'chat-attachments' and is_restaurant_member((storage.foldername(name))[1]::uuid));
create policy "chat_attachments_bucket_delete" on storage.objects for delete
  using (bucket_id = 'chat-attachments' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[]));

-- ── realtime ───────────────────────────────────────────────────────────
-- Presence (point 7 of the chat redesign plan) uses ephemeral Realtime
-- Presence channels, not Postgres Changes replication — chat_messages is
-- intentionally not added to supabase_realtime here (see plan for rationale).
;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0002', 'chat_and_referrals') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0002_chat_and_referrals.sql <<<

-- >>> MIGRATION 0003_companies.sql >>>
-- Minerva Flow — company hierarchy (groups of restaurants)
-- Mirrors the restaurants/restaurant_members/is_restaurant_member pattern
-- from 0001_init.sql exactly, one level up.

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role member_role not null default 'staff',
  status member_status not null default 'invited',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index idx_company_members_user on company_members (user_id);
create index idx_company_members_company on company_members (company_id);

create function is_company_member(target_company_id uuid, min_roles member_role[] default array['owner','manager','staff','consultant']::member_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from company_members m
    where m.company_id = target_company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(min_roles)
  );
$$;

-- A restaurant can optionally belong to a company (nullable — standalone
-- restaurants keep working exactly as before).
alter table restaurants add column company_id uuid references companies (id) on delete set null;
create index idx_restaurants_company on restaurants (company_id);

alter table companies enable row level security;
alter table company_members enable row level security;

create policy "companies_select" on companies for select
  using (is_company_member(id));
create policy "companies_update" on companies for update
  using (is_company_member(id, array['owner','manager']::member_role[]));
create policy "companies_insert" on companies for insert
  with check (true); -- creation happens via a server action that immediately inserts the owner membership

create policy "company_members_select" on company_members for select
  using (is_company_member(company_id));
create policy "company_members_insert" on company_members for insert
  with check (is_company_member(company_id, array['owner','manager']::member_role[]) or user_id = auth.uid());
  -- the "or user_id = auth.uid()" covers the moment a company is first created:
  -- the creating user has no membership row yet, so they insert their own
  -- owner row directly (same bootstrap gap as restaurants_owner_insert below).
create policy "company_members_update" on company_members for update
  using (is_company_member(company_id, array['owner','manager']::member_role[]));
create policy "company_members_delete" on company_members for delete
  using (is_company_member(company_id, array['owner','manager']::member_role[]));

-- Extend restaurant visibility: a company member can see every restaurant
-- under their company without needing an individual restaurant_members row.
drop policy "restaurants_member_select" on restaurants;
create policy "restaurants_member_select" on restaurants for select
  using (
    is_restaurant_member(id)
    or (company_id is not null and is_company_member(company_id))
  );
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0003', 'companies') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0003_companies.sql <<<

-- >>> MIGRATION 0004_artifact_comparison_type.sql >>>
-- Adds the richer "comparison" artifact type introduced by the chat
-- artifacts v2 feature (dual-line charts + key-metrics table + summary +
-- trend forecast), alongside the existing table/chart/summary types from
-- 0002_chat_and_referrals.sql.
alter type artifact_type add value 'comparison';
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0004', 'artifact_comparison_type') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0004_artifact_comparison_type.sql <<<

-- >>> MIGRATION 0005_notifications_and_weekly_reports.sql >>>
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
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0005', 'notifications_and_weekly_reports') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0005_notifications_and_weekly_reports.sql <<<

-- >>> MIGRATION 0006_ad_attribution.sql >>>
-- Minerva Flow — ad platform attribution (Meta Ads + Google Ads)
-- OAuth tokens are stored via Supabase Vault (pgsodium), never as plain
-- columns — ad_platform_connections only holds a reference (key id) into
-- vault.secrets. Only the service-role client (lib/supabase/admin.ts) can
-- read vault.decrypted_secrets; RLS on ad_platform_connections itself
-- still gates who can see that a connection exists at all.

create extension if not exists "pgsodium";
create extension if not exists "supabase_vault";

create type ad_provider as enum ('meta', 'google');
create type ad_connection_status as enum ('connecte', 'erreur', 'attente');
create type ad_channel as enum ('organic', 'meta', 'google');

create table ad_platform_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider ad_provider not null,
  external_account_id text,
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  status ad_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create index idx_ad_platform_connections_restaurant on ad_platform_connections (restaurant_id);

create table ad_conversions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  ad_platform_connection_id uuid references ad_platform_connections (id) on delete set null,
  channel ad_channel not null default 'organic',
  city text,
  lng double precision,
  lat double precision,
  converted_online boolean not null default false,
  revenue numeric(12,2),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_ad_conversions_restaurant on ad_conversions (restaurant_id, occurred_at desc);
create index idx_ad_conversions_channel on ad_conversions (restaurant_id, channel);

alter table ad_platform_connections enable row level security;
alter table ad_conversions enable row level security;

-- connection management (which is billing/security-adjacent, holds OAuth
-- account links) mirrors the existing connections_manage convention:
-- owner/manager only, read and write together.
create policy "ad_platform_connections_manage" on ad_platform_connections for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- conversion data (aggregate, non-sensitive) is readable by any active
-- member, same as the rest of the marketing/campaign data; writes happen
-- only via the service-role sync job (no client-facing insert policy).
create policy "ad_conversions_select" on ad_conversions for select
  using (is_restaurant_member(restaurant_id));

-- ── vault access wrappers ────────────────────────────────────────────────
-- The vault schema isn't exposed over PostgREST directly, so these thin
-- security-definer wrappers expose exactly the two operations needed
-- (store / decrypt a token) as callable RPCs — restricted to service_role
-- only, since decrypt_secret must never be reachable by a regular user
-- (it would let them read any secret in the vault by id).
create function store_vault_secret(secret text, secret_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  new_id uuid;
begin
  new_id := vault.create_secret(secret, secret_name);
  return new_id;
end;
$$;

create function read_vault_secret(secret_id uuid)
returns text
language sql
security definer
set search_path = public, vault
stable
as $$
  select decrypted_secret from vault.decrypted_secrets where id = secret_id;
$$;

revoke execute on function store_vault_secret(text, text) from public, anon, authenticated;
revoke execute on function read_vault_secret(uuid) from public, anon, authenticated;
grant execute on function store_vault_secret(text, text) to service_role;
grant execute on function read_vault_secret(uuid) to service_role;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0006', 'ad_attribution') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0006_ad_attribution.sql <<<

-- >>> MIGRATION 0007_google_connections.sql >>>
-- Minerva Flow — unified Google Workspace connection (Gmail, Sheets, Drive,
-- Calendar, Analytics) — one row per restaurant, scopes accumulate as the
-- user opts into individual features via the in-app consent modal.
-- Distinct from ad_platform_connections (0006), which is Meta/Google Ads
-- specific and stays that way; both share GOOGLE_CLIENT_ID/SECRET but are
-- separate OAuth flows with separate token sets.

create table google_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade unique,
  connected_email text,
  granted_scopes text[] not null default '{}',
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  calendar_id text, -- Google Calendar id for the dedicated "Minerva Flow" calendar, created on first sync
  drive_folder_id text, -- Drive folder id for exported reports, created on first export
  ga4_property_id text, -- GA4 property id, entered manually by the user (no reliable discovery without an extra scope)
  status ad_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_google_connections_restaurant on google_connections (restaurant_id);

alter table google_connections enable row level security;

create policy "google_connections_manage" on google_connections for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0007', 'google_connections') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0007_google_connections.sql <<<

-- >>> MIGRATION 0008_default_restaurant_on_signup.sql >>>
-- Minerva Flow — every user needs at least one restaurant to use the app.
-- Until now, signing up only created a `profiles` row (see handle_new_user()
-- in 0001_init.sql); a brand-new user had zero restaurant_members rows, so
-- getUserRestaurants() returned [] and the app crashed on first load
-- (TeamSwitcher and useCurrentRestaurant() both assume restaurants[0]
-- exists). Extend the signup trigger to also create a default restaurant +
-- owner membership, and backfill any account already stuck in that state.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  insert into public.restaurants (name)
  values ('Mon restaurant')
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

do $$
declare
  orphan record;
  new_restaurant_id uuid;
begin
  for orphan in
    select u.id
    from auth.users u
    where not exists (
      select 1 from public.restaurant_members m
      where m.user_id = u.id and m.status = 'active'
    )
  loop
    insert into public.restaurants (name)
    values ('Mon restaurant')
    returning id into new_restaurant_id;

    insert into public.restaurant_members (restaurant_id, user_id, role, status)
    values (new_restaurant_id, orphan.id, 'owner', 'active');
  end loop;
end $$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0008', 'default_restaurant_on_signup') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0008_default_restaurant_on_signup.sql <<<

-- >>> MIGRATION 0009_onboarding.sql >>>
-- Minerva Flow — tracks whether a user has completed the first-run
-- onboarding wizard (profile photo, name, role). Defaults to false so every
-- existing account (created before this migration) is routed through it
-- once; the app layout redirects to /onboarding while this is false.

alter table profiles add column onboarding_completed boolean not null default false;

-- Existing accounts (created before this migration) already found their way
-- into the app without a wizard — don't retroactively interrupt them.
-- Only signups from this point forward see /onboarding.
update profiles set onboarding_completed = true;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0009', 'onboarding') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0009_onboarding.sql <<<

-- >>> MIGRATION 0010_pending_lots_and_phases.sql >>>
-- Minerva Flow — toutes les migrations en attente (Lots 2-4 + Phases 1-6 de
-- la feuille de route + changelog), unifiées en une seule migration à
-- appliquer d'un coup (éditeur SQL Supabase ou `supabase db push`).
--
-- Idempotente de bout en bout : chaque table/policy/type/colonne est créée
-- avec une garde ("if not exists", "drop policy if exists", bloc
-- d'exception pour les types) — ce fichier peut être relancé sans risque
-- même si une exécution précédente (partielle ou complète, via cette
-- version ou une ancienne version en plusieurs fichiers) a déjà créé
-- certains objets. Une seule ligne en erreur dans une transaction annule
-- tout le reste ; l'idempotence évite ce piège.

begin;

-- ═══════════════════════════════════════════════════════════════════════
-- LOT 2 — invitation par lien, pièces jointes de campagne, partage public
-- de rapport (lecture seule)
-- ═══════════════════════════════════════════════════════════════════════

-- Invitations : le flux email existant (/api/collaborateurs/invite) reste
-- en place, mais l'envoi d'email n'étant pas fonctionnel, on ajoute un
-- deuxième mode — un lien à copier/coller, avec rôle pré-assigné et
-- expiration 7 jours. Contrairement à restaurant_members (qui exige déjà
-- une adhésion pour écrire, via is_restaurant_member()), un lien peut être
-- suivi par quelqu'un qui n'a même pas encore de compte : toute la
-- génération et la consommation du lien passe donc par le client admin
-- (service role), exactement comme le flux email existant. Les policies
-- ci-dessous ne servent qu'à la lecture (lister ses propres liens actifs).
create table if not exists restaurant_invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  role member_role not null default 'staff',
  token text not null unique,
  created_by uuid not null references auth.users (id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_restaurant_invites_restaurant on restaurant_invites (restaurant_id);
create index if not exists idx_restaurant_invites_token on restaurant_invites (token);

alter table restaurant_invites enable row level security;

drop policy if exists "restaurant_invites_select" on restaurant_invites;
create policy "restaurant_invites_select" on restaurant_invites for select
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ── pièces jointes de campagne ────────────────────────────────────────────
create table if not exists campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  storage_path text not null, -- "{restaurantId}/{draftId}/{uuid}-{filename}" dans le bucket campaign-assets
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  kind text not null default 'image', -- 'image' | 'file'
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_assets_campaign on campaign_assets (campaign_id);

alter table campaign_assets enable row level security;

drop policy if exists "campaign_assets_select" on campaign_assets;
create policy "campaign_assets_select" on campaign_assets for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "campaign_assets_insert" on campaign_assets;
create policy "campaign_assets_insert" on campaign_assets for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','consultant']::member_role[]));
drop policy if exists "campaign_assets_delete" on campaign_assets;
create policy "campaign_assets_delete" on campaign_assets for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', false)
on conflict (id) do nothing;

drop policy if exists "campaign_assets_bucket_read" on storage.objects;
create policy "campaign_assets_bucket_read" on storage.objects for select
  using (bucket_id = 'campaign-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid));
drop policy if exists "campaign_assets_bucket_write" on storage.objects;
create policy "campaign_assets_bucket_write" on storage.objects for insert
  with check (bucket_id = 'campaign-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','consultant']::member_role[]));
drop policy if exists "campaign_assets_bucket_delete" on storage.objects;
create policy "campaign_assets_bucket_delete" on storage.objects for delete
  using (bucket_id = 'campaign-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[]));

-- ── partage public de rapport (lecture seule) ─────────────────────────────
-- Snapshot au moment du partage plutôt qu'un recalcul live à chaque visite :
-- un visiteur anonyme n'a pas de session RLS, et figer les chiffres au
-- moment du clic "Partager" est à la fois plus simple et plus sûr (aucune
-- requête restaurant_id-scopée n'est exécutée pour un visiteur non authentifié).
create table if not exists report_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  report_slug text not null,
  token text not null unique,
  title text not null,
  data jsonb not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_report_shares_token on report_shares (token);
create index if not exists idx_report_shares_restaurant on report_shares (restaurant_id);

alter table report_shares enable row level security;

drop policy if exists "report_shares_select" on report_shares;
create policy "report_shares_select" on report_shares for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "report_shares_insert" on report_shares;
create policy "report_shares_insert" on report_shares for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','consultant']::member_role[]));
drop policy if exists "report_shares_delete" on report_shares;
create policy "report_shares_delete" on report_shares for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- LOT 3 — formulaire de support in-app
-- ═══════════════════════════════════════════════════════════════════════

-- L'envoi d'email n'étant pas fonctionnel, les demandes (bug/amélioration/
-- question) sont simplement enregistrées ici pour être consultées plus
-- tard (dashboard Supabase pour l'instant, page d'admin éventuellement).
create table if not exists support_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'bug', -- 'bug' | 'amelioration' | 'question'
  subject text not null,
  message text not null,
  status text not null default 'nouveau', -- 'nouveau' | 'en_cours' | 'resolu'
  created_at timestamptz not null default now()
);

create index if not exists idx_support_requests_user on support_requests (user_id, created_at desc);

alter table support_requests enable row level security;

drop policy if exists "support_requests_insert_own" on support_requests;
create policy "support_requests_insert_own" on support_requests for insert
  with check (user_id = auth.uid());
drop policy if exists "support_requests_select_own" on support_requests;
create policy "support_requests_select_own" on support_requests for select
  using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- LOT 4 — suivi des employés, revues de performance, revue automatique IA
-- ═══════════════════════════════════════════════════════════════════════

-- `employees` est distinct de `restaurant_members` : un employé (serveur,
-- cuisinier...) n'a pas forcément de compte dans l'application. Quand il en
-- a un, `linked_user_id` fait le lien vers son compte pour affichage
-- (avatar, etc.) — jamais requis.
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  linked_user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  role_title text not null default 'Employé',
  hourly_wage numeric,
  active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_restaurant on employees (restaurant_id);

alter table employees enable row level security;

drop policy if exists "employees_select" on employees;
create policy "employees_select" on employees for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "employees_manage_insert" on employees;
create policy "employees_manage_insert" on employees for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists "employees_manage_update" on employees;
create policy "employees_manage_update" on employees for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists "employees_manage_delete" on employees;
create policy "employees_manage_delete" on employees for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Journal de quarts léger — saisi manuellement (par l'employé ou le
-- gérant) plutôt qu'un vrai système de planification, hors scope pour
-- l'instant. Alimente les indicateurs de ponctualité/heures travaillées
-- affichés sur la revue.
create table if not exists employee_shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  shift_date date not null,
  hours_worked numeric not null default 0,
  was_late boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_shifts_employee on employee_shifts (employee_id, shift_date desc);

alter table employee_shifts enable row level security;

drop policy if exists "employee_shifts_select" on employee_shifts;
create policy "employee_shifts_select" on employee_shifts for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "employee_shifts_manage_insert" on employee_shifts;
create policy "employee_shifts_manage_insert" on employee_shifts for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists "employee_shifts_manage_delete" on employee_shifts;
create policy "employee_shifts_manage_delete" on employee_shifts for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Revue de performance — évaluation manuelle par le propriétaire/gérant.
-- attributed_revenue est saisi à la main (aucune intégration POS par
-- employé n'existe encore) plutôt que calculé automatiquement.
create table if not exists employee_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  rating smallint not null check (rating between 1 and 5),
  strengths text,
  improvements text,
  attributed_revenue numeric,
  raise_recommended boolean not null default false,
  reviewer_id uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_reviews_employee on employee_reviews (employee_id, created_at desc);

alter table employee_reviews enable row level security;

drop policy if exists "employee_reviews_select" on employee_reviews;
create policy "employee_reviews_select" on employee_reviews for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "employee_reviews_manage_insert" on employee_reviews;
create policy "employee_reviews_manage_insert" on employee_reviews for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists "employee_reviews_manage_delete" on employee_reviews;
create policy "employee_reviews_manage_delete" on employee_reviews for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Revue automatique par IA. Réutilise la même pipeline de calcul que
-- weekly_reports (buildReports sur une plage de dates) mais dans sa propre
-- table plutôt que d'être compressée dans weekly_reports.data — chaque
-- revue IA a besoin d'un id stable pour être consultée et imprimée/
-- partagée avec l'équipe, et une plage de dates arbitraire (génération à
-- la demande) ne respecterait pas la contrainte unique(restaurant_id,
-- week_start) de weekly_reports.
create table if not exists ai_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  source text not null default 'manuelle', -- 'auto' (cron hebdo) | 'manuelle' (à la demande)
  metrics jsonb not null, -- snapshot des ReportDef au moment de la génération
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  recommendations text[] not null default '{}',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_reviews_restaurant on ai_reviews (restaurant_id, created_at desc);

alter table ai_reviews enable row level security;

drop policy if exists "ai_reviews_select" on ai_reviews;
create policy "ai_reviews_select" on ai_reviews for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "ai_reviews_insert" on ai_reviews;
create policy "ai_reviews_insert" on ai_reviews for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 1 (feuille de route) — durcissement + panneau admin
-- ═══════════════════════════════════════════════════════════════════════

-- Limitation de débit (routes publiques : liens d'invitation, de partage).
-- Journal glissant plutôt qu'un compteur par fenêtre fixe — simple, et ne
-- nécessite aucun service externe (Upstash/Redis). Toujours consultée via
-- le client admin depuis du code serveur (un visiteur anonyme n'a pas de
-- session RLS), donc aucune policy d'accès anon/authenticated n'est
-- nécessaire ici — RLS activé + aucune policy = accès refusé par défaut
-- pour tout le monde sauf le service role.
create table if not exists rate_limit_hits (
  id uuid primary key default gen_random_uuid(),
  rate_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_hits_key_time on rate_limit_hits (rate_key, created_at desc);

alter table rate_limit_hits enable row level security;

-- Rôle opérateur Minerva (panneau admin) — distinct des rôles restaurant.
alter table profiles add column if not exists is_platform_admin boolean not null default false;

create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_platform_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- Vue de tous les restaurants pour l'opérateur (en plus des policies
-- membres existantes — celle-ci s'ajoute, elle ne les remplace pas).
drop policy if exists "restaurants_admin_select" on restaurants;
create policy "restaurants_admin_select" on restaurants for select
  using (is_platform_admin());

-- Vue de tous les parrainages pour l'opérateur.
drop policy if exists "referrals_admin_select" on referrals;
create policy "referrals_admin_select" on referrals for select
  using (is_platform_admin());

-- ── support_requests : réponse de l'opérateur visible côté restaurateur ──
alter table support_requests add column if not exists admin_reply text;
alter table support_requests add column if not exists replied_at timestamptz;
alter table support_requests add column if not exists replied_by uuid references auth.users (id);

drop policy if exists "support_requests_admin_select" on support_requests;
create policy "support_requests_admin_select" on support_requests for select
  using (is_platform_admin());
drop policy if exists "support_requests_admin_update" on support_requests;
create policy "support_requests_admin_update" on support_requests for update
  using (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 2 (feuille de route) — conformité Loi 25
-- ═══════════════════════════════════════════════════════════════════════

-- ── registre des incidents (obligation Loi 25 en cas de fuite) ───────────
create table if not exists incident_log (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  severity text not null default 'faible', -- 'faible' | 'moyenne' | 'critique'
  occurred_at timestamptz not null default now(),
  affected_user_count integer not null default 0,
  resolution text,
  resolved_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table incident_log enable row level security;

drop policy if exists "incident_log_admin_all" on incident_log;
create policy "incident_log_admin_all" on incident_log for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- ── journal de suppression de compte (piste d'audit Loi 25) ──────────────
-- Volontairement séparé de auth.users (qui sera supprimé) : garde une
-- trace minimale — qui, quand, pourquoi — sans les données personnelles
-- elles-mêmes.
create table if not exists account_deletion_log (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  reason text,
  deleted_at timestamptz not null default now()
);

alter table account_deletion_log enable row level security;

drop policy if exists "account_deletion_log_admin_select" on account_deletion_log;
create policy "account_deletion_log_admin_select" on account_deletion_log for select
  using (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 3 (feuille de route) — programme pilote structuré
-- ═══════════════════════════════════════════════════════════════════════

-- Une demande d'accès pilote n'ouvre pas directement un compte — elle est
-- consignée pour être suivie manuellement dans le panneau admin, plutôt
-- que de laisser l'inscription ouverte à n'importe qui depuis la page
-- publique.
create table if not exists pilot_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  restaurant_name text not null,
  city text,
  phone text,
  message text,
  status text not null default 'nouveau', -- 'nouveau' | 'contacte' | 'actif' | 'decline'
  created_at timestamptz not null default now()
);

create index if not exists idx_pilot_requests_status on pilot_requests (status, created_at desc);

alter table pilot_requests enable row level security;

-- Formulaire public (visiteur anonyme) — écriture seule, jamais de lecture
-- publique. Toujours passée via le client admin côté serveur de toute
-- façon (comme les invites/report_shares), cette policy documente
-- l'intention si jamais un appel RLS-scopé venait à être ajouté plus tard.
drop policy if exists "pilot_requests_admin_all" on pilot_requests;
create policy "pilot_requests_admin_all" on pilot_requests for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 4 (feuille de route) — scaffold d'intégration POS
-- ═══════════════════════════════════════════════════════════════════════

-- Suit exactement le même schéma que ad_platform_connections
-- (0006_ad_attribution.sql) — jetons stockés dans Supabase Vault, jamais
-- en clair dans une colonne. Commence par Square (API la mieux
-- documentée) ; Lightspeed et Clover suivent le même schéma quand leurs
-- identifiants d'app seront disponibles.
do $$ begin
  create type pos_provider as enum ('square', 'lightspeed', 'clover');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type pos_connection_status as enum ('connecte', 'erreur', 'attente');
exception when duplicate_object then null;
end $$;

create table if not exists pos_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider pos_provider not null,
  external_account_id text,
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  status pos_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create index if not exists idx_pos_connections_restaurant on pos_connections (restaurant_id);

alter table pos_connections enable row level security;

drop policy if exists "pos_connections_select" on pos_connections;
create policy "pos_connections_select" on pos_connections for select
  using (is_restaurant_member(restaurant_id));

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 5 (feuille de route) — facturation Stripe + activation parrainage
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type subscription_status as enum (
    'incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
  );
exception when duplicate_object then null;
end $$;

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status subscription_status not null default 'incomplete',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id)
);

create index if not exists idx_subscriptions_restaurant on subscriptions (restaurant_id);
create index if not exists idx_subscriptions_stripe_customer on subscriptions (stripe_customer_id);

alter table subscriptions enable row level security;

drop policy if exists "subscriptions_select" on subscriptions;
create policy "subscriptions_select" on subscriptions for select
  using (is_restaurant_member(restaurant_id, array['owner']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Journal des mises à jour (changelog)
-- ═══════════════════════════════════════════════════════════════════════

-- Visible par tous les utilisateurs connectés (pas restreint à un
-- restaurant — c'est une information plateforme). Publier une entrée
-- déclenche une notification à tous les utilisateurs actifs, tous
-- établissements confondus (voir lib/data/notifications.ts:notifyAllUsers,
-- appelée depuis app/admin/changelog/actions.ts — pas depuis cette
-- migration, pour éviter de spammer une notification par entrée
-- historique importée ci-dessous).
do $$ begin
  create type changelog_category as enum ('fonctionnalite', 'amelioration', 'correctif');
exception when duplicate_object then null;
end $$;

create table if not exists changelog_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category changelog_category not null default 'fonctionnalite',
  published_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_changelog_entries_published on changelog_entries (published_at desc);

alter table changelog_entries enable row level security;

-- Visible par tout utilisateur connecté, peu importe son établissement —
-- c'est une info plateforme, pas une donnée de restaurant.
drop policy if exists "changelog_entries_select" on changelog_entries;
create policy "changelog_entries_select" on changelog_entries for select
  using (auth.uid() is not null);

drop policy if exists "changelog_entries_admin_insert" on changelog_entries;
create policy "changelog_entries_admin_insert" on changelog_entries for insert
  with check (is_platform_admin());
drop policy if exists "changelog_entries_admin_delete" on changelog_entries;
create policy "changelog_entries_admin_delete" on changelog_entries for delete
  using (is_platform_admin());

-- ── historique des lots/phases déjà livrés ────────────────────────────────
-- Gardé par un "where not exists" plutôt qu'une clé unique sur le titre —
-- si la table contient déjà des entrées (ce lot déjà importé, ou une
-- entrée publiée depuis l'admin), on ne réinsère rien.
insert into changelog_entries (title, description, category, published_at)
select v.title, v.description, v.category, v.published_at
from (values
  ('Gestion du workspace et navigation repensée', 'Nouvelle page pour configurer votre établissement depuis le sélecteur, sidebar réorganisée en sections repliables, correctifs d''affichage (carte centrée sur Montréal, couleurs, bannière de démarrage pour les comptes non configurés).', 'fonctionnalite'::changelog_category, now() - interval '9 days'),
  ('Invitations par lien, campagnes enrichies, rapports partageables', 'Invitez votre équipe avec un simple lien plutôt qu''un courriel. Créez des campagnes avec images et fichiers joints. Filtrez et partagez vos rapports par lien public en lecture seule.', 'fonctionnalite'::changelog_category, now() - interval '8 days'),
  ('Guide, support et pages légales', 'Nouvelle page Guide pour configurer l''application en quelques minutes, formulaire de support intégré, conditions d''utilisation et politique de confidentialité.', 'fonctionnalite'::changelog_category, now() - interval '7 days'),
  ('Suivi des employés et revues de performance', 'Nouvelle page pour suivre vos employés, leurs quarts de travail et publier des revues de performance — avec une revue automatique générée par IA sur vos données réelles.', 'fonctionnalite'::changelog_category, now() - interval '6 days'),
  ('Import de données historiques et démarrage guidé', 'Importez des mois ou années de revenus depuis un fichier Excel/CSV en un clic. Une checklist de démarrage vous guide dans les premières étapes.', 'fonctionnalite'::changelog_category, now() - interval '5 days'),
  ('Sécurité et fiabilité renforcées', 'Protection contre les abus sur les liens publics, surveillance des erreurs en production, et limitation de l''historique chargé pour garder l''application rapide même avec beaucoup de données.', 'amelioration'::changelog_category, now() - interval '5 days'),
  ('Panneau d''administration', 'Nouvel espace pour consulter tous les établissements, répondre aux demandes de support et suivre les demandes d''accès pilote.', 'fonctionnalite'::changelog_category, now() - interval '4 days'),
  ('Conformité à la Loi 25', 'Suppression de compte en libre-service, registre des incidents, responsable de la protection des renseignements personnels désigné.', 'amelioration'::changelog_category, now() - interval '3 days'),
  ('Connexion Square et export QuickBooks', 'Base technique posée pour synchroniser vos ventes Square automatiquement, et export de vos transactions au format QuickBooks dès maintenant.', 'fonctionnalite'::changelog_category, now() - interval '2 days'),
  ('Facturation et parrainage', 'Mise en place de la facturation par abonnement, et le programme de parrainage récompense maintenant automatiquement un mois gratuit par filleul actif.', 'fonctionnalite'::changelog_category, now() - interval '1 day'),
  ('Journal des mises à jour', 'Vous y êtes ! Chaque nouvelle mise à jour de Minerva Flow sera annoncée ici, avec une notification pour vous prévenir.', 'fonctionnalite'::changelog_category, now())
) as v(title, description, category, published_at)
where not exists (select 1 from changelog_entries);

-- ═══════════════════════════════════════════════════════════════════════
-- Synchronisation des ventes Square (cron quotidien + webhooks)
-- ═══════════════════════════════════════════════════════════════════════

-- Distingue une journée saisie à la main d'une journée remplie par une
-- synchronisation POS — le sync ne doit jamais écraser une saisie manuelle.
alter table service_days add column if not exists revenue_source text not null default 'manuel';

do $$ begin
  alter table service_days add constraint service_days_revenue_source_check
    check (revenue_source in ('manuel', 'square', 'lightspeed', 'clover'));
exception when duplicate_object then null;
end $$;

alter table service_days add column if not exists revenue_synced_at timestamptz;

alter table pos_connections add column if not exists last_synced_at timestamptz;

-- ═══════════════════════════════════════════════════════════════════════
-- Notifications push natives (Web Push)
-- ═══════════════════════════════════════════════════════════════════════

-- Un abonnement par appareil/navigateur — un même utilisateur peut avoir
-- plusieurs abonnements actifs (téléphone + ordinateur). L'endpoint est la
-- clé naturelle : le navigateur en génère un nouveau si l'ancien expire.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid references restaurants (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on push_subscriptions;
create policy "push_subscriptions_select_own" on push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on push_subscriptions;
create policy "push_subscriptions_insert_own" on push_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on push_subscriptions;
create policy "push_subscriptions_delete_own" on push_subscriptions for delete
  using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- Réservations et tables (module 1 de l'expansion "OS pour restaurants")
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type reservation_status as enum ('confirmee', 'annulee', 'honoree', 'no_show');
exception when duplicate_object then null;
end $$;

create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  label text not null,
  capacity int not null default 2,
  created_at timestamptz not null default now()
);

create index if not exists idx_restaurant_tables_restaurant on restaurant_tables (restaurant_id);

alter table restaurant_tables enable row level security;

drop policy if exists "restaurant_tables_select" on restaurant_tables;
create policy "restaurant_tables_select" on restaurant_tables for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "restaurant_tables_manage" on restaurant_tables;
create policy "restaurant_tables_manage" on restaurant_tables for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  table_id uuid references restaurant_tables (id) on delete set null,
  guest_name text not null,
  guest_phone text,
  party_size int not null default 2,
  reservation_time timestamptz not null,
  status reservation_status not null default 'confirmee',
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_reservations_restaurant_time on reservations (restaurant_id, reservation_time);

alter table reservations enable row level security;

drop policy if exists "reservations_select" on reservations;
create policy "reservations_select" on reservations for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "reservations_insert" on reservations;
create policy "reservations_insert" on reservations for insert
  with check (is_restaurant_member(restaurant_id));
drop policy if exists "reservations_update" on reservations;
create policy "reservations_update" on reservations for update
  using (is_restaurant_member(restaurant_id));
drop policy if exists "reservations_delete" on reservations;
create policy "reservations_delete" on reservations for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Horaire du personnel (module 2 de l'expansion "OS pour restaurants")
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type shift_schedule_status as enum ('planifie', 'confirme', 'annule');
exception when duplicate_object then null;
end $$;

create table if not exists shift_schedules (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  position_label text,
  status shift_schedule_status not null default 'planifie',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_shift_schedules_restaurant_date on shift_schedules (restaurant_id, shift_date);
create index if not exists idx_shift_schedules_employee on shift_schedules (employee_id, shift_date);

alter table shift_schedules enable row level security;

drop policy if exists "shift_schedules_select" on shift_schedules;
create policy "shift_schedules_select" on shift_schedules for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "shift_schedules_manage" on shift_schedules;
create policy "shift_schedules_manage" on shift_schedules for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Commandes fournisseurs (module 3 de l'expansion "OS pour restaurants")
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type purchase_order_status as enum ('brouillon', 'envoyee', 'recue', 'annulee');
exception when duplicate_object then null;
end $$;

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  category text,
  created_at timestamptz not null default now()
);

create index if not exists idx_suppliers_restaurant on suppliers (restaurant_id);

alter table suppliers enable row level security;

drop policy if exists "suppliers_select" on suppliers;
create policy "suppliers_select" on suppliers for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "suppliers_manage" on suppliers;
create policy "suppliers_manage" on suppliers for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  supplier_id uuid not null references suppliers (id) on delete cascade,
  status purchase_order_status not null default 'brouillon',
  order_date date not null default current_date,
  expected_date date,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_purchase_orders_restaurant on purchase_orders (restaurant_id, order_date desc);

alter table purchase_orders enable row level security;

drop policy if exists "purchase_orders_select" on purchase_orders;
create policy "purchase_orders_select" on purchase_orders for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "purchase_orders_manage" on purchase_orders;
create policy "purchase_orders_manage" on purchase_orders for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 1,
  unit text not null default 'unité',
  unit_cost numeric not null default 0
);

create index if not exists idx_purchase_order_items_order on purchase_order_items (purchase_order_id);

alter table purchase_order_items enable row level security;

drop policy if exists "purchase_order_items_select" on purchase_order_items;
create policy "purchase_order_items_select" on purchase_order_items for select
  using (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_items.purchase_order_id and is_restaurant_member(po.restaurant_id)
  ));
drop policy if exists "purchase_order_items_manage" on purchase_order_items;
create policy "purchase_order_items_manage" on purchase_order_items for all
  using (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and is_restaurant_member(po.restaurant_id, array['owner','manager']::member_role[])
  ))
  with check (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and is_restaurant_member(po.restaurant_id, array['owner','manager']::member_role[])
  ));

-- ═══════════════════════════════════════════════════════════════════════
-- Google Calendar personnel (par membre, en lecture seule — distinct de
-- google_connections qui est la connexion Workspace unique du restaurant)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists member_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  google_email text,
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table member_calendar_connections enable row level security;

drop policy if exists "member_calendar_connections_select_own" on member_calendar_connections;
create policy "member_calendar_connections_select_own" on member_calendar_connections for select
  using (user_id = auth.uid());
drop policy if exists "member_calendar_connections_delete_own" on member_calendar_connections;
create policy "member_calendar_connections_delete_own" on member_calendar_connections for delete
  using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- Scaffold pour services de réservation tiers (OpenTable, Resy, SevenRooms)
--
-- La plupart de ces plateformes exigent un partenariat d'affaires, pas
-- juste une clé API en libre-service comme Square — ce scaffold ne peut
-- donc pas être branché sur un vrai flux OAuth tant qu'un compte
-- partenaire n'existe pas pour un fournisseur donné. Il ne fait que
-- réserver la structure de données pour brancher un provider dès que ces
-- identifiants existent, même schéma que pos_connections.
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type reservation_platform as enum ('opentable', 'resy', 'sevenrooms');
exception when duplicate_object then null;
end $$;

create table if not exists reservation_platform_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  platform reservation_platform not null,
  external_account_id text,
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  status pos_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (restaurant_id, platform)
);

alter table reservation_platform_connections enable row level security;

drop policy if exists "reservation_platform_connections_select" on reservation_platform_connections;
create policy "reservation_platform_connections_select" on reservation_platform_connections for select
  using (is_restaurant_member(restaurant_id));

-- ═══════════════════════════════════════════════════════════════════════
-- Champs employé additionnels (description, coordonnées) + dépense
-- automatique liée aux quarts travaillés
-- ═══════════════════════════════════════════════════════════════════════

alter table employees add column if not exists description text;
alter table employees add column if not exists contact_phone text;
alter table employees add column if not exists contact_email text;

-- Un quart travaillé génère automatiquement sa dépense de main d'œuvre —
-- on garde la trace de la transaction générée pour pouvoir la mettre à
-- jour/supprimer si le quart est corrigé, sans dupliquer.
alter table employee_shifts add column if not exists financial_transaction_id uuid
  references financial_transactions (id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════════
-- Partage d'horaire par lien (même schéma que report_shares)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists schedule_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  token text not null unique,
  snapshot jsonb not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_schedule_shares_token on schedule_shares (token);
create index if not exists idx_schedule_shares_restaurant on schedule_shares (restaurant_id);

alter table schedule_shares enable row level security;

drop policy if exists "schedule_shares_select" on schedule_shares;
create policy "schedule_shares_select" on schedule_shares for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "schedule_shares_insert" on schedule_shares;
create policy "schedule_shares_insert" on schedule_shares for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Traçabilité des transactions (qui a créé/modifié) + partage de dépense
-- ═══════════════════════════════════════════════════════════════════════

alter table financial_transactions add column if not exists created_by uuid references auth.users (id);
alter table financial_transactions add column if not exists updated_by uuid references auth.users (id);
alter table financial_transactions add column if not exists updated_at timestamptz;

create table if not exists expense_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  transaction_id uuid not null references financial_transactions (id) on delete cascade,
  token text not null unique,
  snapshot jsonb not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_expense_shares_token on expense_shares (token);

alter table expense_shares enable row level security;

drop policy if exists "expense_shares_select" on expense_shares;
create policy "expense_shares_select" on expense_shares for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "expense_shares_insert" on expense_shares;
create policy "expense_shares_insert" on expense_shares for insert
  with check (is_restaurant_member(restaurant_id));

-- ═══════════════════════════════════════════════════════════════════════
-- Suivi de livraison fournisseur (adresse + coordonnées géocodées)
-- ═══════════════════════════════════════════════════════════════════════

alter table suppliers add column if not exists address text;
alter table suppliers add column if not exists lng double precision;
alter table suppliers add column if not exists lat double precision;

-- ═══════════════════════════════════════════════════════════════════════
-- Fidélisation client (fiches client + registre de points de fidélité)
-- ═══════════════════════════════════════════════════════════════════════

alter table restaurants add column if not exists loyalty_points_per_dollar numeric(6,2) not null default 1;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  visit_count int not null default 0,
  total_spent numeric(12,2) not null default 0,
  loyalty_points int not null default 0,
  last_visit_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_restaurant on customers (restaurant_id, name);

alter table customers enable row level security;

drop policy if exists "customers_select" on customers;
create policy "customers_select" on customers for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "customers_write" on customers;
create policy "customers_write" on customers for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "customers_update" on customers;
create policy "customers_update" on customers for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "customers_delete" on customers;
create policy "customers_delete" on customers for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  points_cost int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_loyalty_rewards_restaurant on loyalty_rewards (restaurant_id);

alter table loyalty_rewards enable row level security;

drop policy if exists "loyalty_rewards_select" on loyalty_rewards;
create policy "loyalty_rewards_select" on loyalty_rewards for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "loyalty_rewards_manage" on loyalty_rewards;
create policy "loyalty_rewards_manage" on loyalty_rewards for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

do $$ begin
  create type loyalty_transaction_type as enum ('visite', 'ajustement', 'echange');
exception when duplicate_object then null;
end $$;

create table if not exists loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  type loyalty_transaction_type not null,
  amount_spent numeric(12,2),
  points_delta int not null default 0,
  note text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_loyalty_transactions_customer on loyalty_transactions (customer_id, created_at desc);

alter table loyalty_transactions enable row level security;

drop policy if exists "loyalty_transactions_select" on loyalty_transactions;
create policy "loyalty_transactions_select" on loyalty_transactions for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "loyalty_transactions_insert" on loyalty_transactions;
create policy "loyalty_transactions_insert" on loyalty_transactions for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Ingénierie de menu (rentabilité par plat, classification en quadrant)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  category text,
  price numeric(10,2) not null default 0,
  food_cost numeric(10,2) not null default 0,
  units_sold numeric not null default 0,
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_items_restaurant on menu_items (restaurant_id, category);

alter table menu_items enable row level security;

drop policy if exists "menu_items_select" on menu_items;
create policy "menu_items_select" on menu_items for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "menu_items_write" on menu_items;
create policy "menu_items_write" on menu_items for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_items_update" on menu_items;
create policy "menu_items_update" on menu_items for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_items_delete" on menu_items;
create policy "menu_items_delete" on menu_items for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Inventaire et gaspillage (quantité en main, seuils de réapprovisionnement,
-- mouvements — le gaspillage se répercute aussi dans financial_transactions
-- via lib/data/finance.ts pour apparaître dans Dépenses/Rapports sans
-- dupliquer l'agrégation par catégorie déjà présente dans lib/reports.ts)
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type inventory_movement_type as enum ('reception', 'utilisation', 'gaspillage', 'ajustement');
exception when duplicate_object then null;
end $$;

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'unité',
  quantity_on_hand numeric not null default 0,
  par_level numeric,
  unit_cost numeric(10,2) not null default 0,
  supplier_id uuid references suppliers (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_restaurant on inventory_items (restaurant_id, category);

alter table inventory_items enable row level security;

drop policy if exists "inventory_items_select" on inventory_items;
create policy "inventory_items_select" on inventory_items for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "inventory_items_write" on inventory_items;
create policy "inventory_items_write" on inventory_items for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "inventory_items_update" on inventory_items;
create policy "inventory_items_update" on inventory_items for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "inventory_items_delete" on inventory_items;
create policy "inventory_items_delete" on inventory_items for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items (id) on delete cascade,
  type inventory_movement_type not null,
  quantity numeric not null,
  reason text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_item on inventory_movements (inventory_item_id, created_at desc);

alter table inventory_movements enable row level security;

drop policy if exists "inventory_movements_select" on inventory_movements;
create policy "inventory_movements_select" on inventory_movements for select
  using (exists (
    select 1 from inventory_items ii
    where ii.id = inventory_movements.inventory_item_id and is_restaurant_member(ii.restaurant_id)
  ));
drop policy if exists "inventory_movements_insert" on inventory_movements;
create policy "inventory_movements_insert" on inventory_movements for insert
  with check (exists (
    select 1 from inventory_items ii
    where ii.id = inventory_movements.inventory_item_id
      and is_restaurant_member(ii.restaurant_id, array['owner','manager','staff']::member_role[])
  ));

-- ═══════════════════════════════════════════════════════════════════════
-- Portail client (connexion par lien magique) + programmes de parrainage
-- ═══════════════════════════════════════════════════════════════════════

-- Un client peut maintenant être un vrai utilisateur Supabase Auth (lien
-- magique, jamais un mot de passe), sans jamais devenir restaurant_members.
alter table customers add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists idx_customers_user on customers (user_id);

drop policy if exists "customers_select_own" on customers;
create policy "customers_select_own" on customers for select
  using (auth.uid() = user_id);

drop policy if exists "loyalty_transactions_select_own" on loyalty_transactions;
create policy "loyalty_transactions_select_own" on loyalty_transactions for select
  using (exists (
    select 1 from customers c where c.id = loyalty_transactions.customer_id and c.user_id = auth.uid()
  ));

-- Réservations publiques : un client soumet une "demande" via un lien de
-- parrainage, jamais auto-confirmée — le staff doit la confirmer.
alter type reservation_status add value if not exists 'demandee';

create table if not exists referral_programs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  description text,
  goal_count int not null default 1,
  reward_id uuid references loyalty_rewards (id) on delete set null,
  reward_description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_programs_restaurant on referral_programs (restaurant_id);

alter table referral_programs enable row level security;

drop policy if exists "referral_programs_select" on referral_programs;
create policy "referral_programs_select" on referral_programs for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "referral_programs_write" on referral_programs;
create policy "referral_programs_write" on referral_programs for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "referral_programs_update" on referral_programs;
create policy "referral_programs_update" on referral_programs for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "referral_programs_delete" on referral_programs;
create policy "referral_programs_delete" on referral_programs for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists customer_referral_links (
  id uuid primary key default gen_random_uuid(),
  referral_program_id uuid not null references referral_programs (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  code text not null unique,
  clicks int not null default 0,
  converted_count int not null default 0,
  reward_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referral_program_id, customer_id)
);

create index if not exists idx_customer_referral_links_code on customer_referral_links (code);

alter table customer_referral_links enable row level security;

-- Écritures uniquement via le client admin (le client n'est jamais
-- restaurant_members, donc aucune policy insert/update/delete pour lui) ;
-- lecture ouverte au staff du restaurant et au client propriétaire du lien.
drop policy if exists "customer_referral_links_select" on customer_referral_links;
create policy "customer_referral_links_select" on customer_referral_links for select
  using (
    exists (
      select 1 from referral_programs rp
      where rp.id = customer_referral_links.referral_program_id and is_restaurant_member(rp.restaurant_id)
    )
    or exists (
      select 1 from customers c
      where c.id = customer_referral_links.customer_id and c.user_id = auth.uid()
    )
  );

alter table reservations add column if not exists customer_id uuid references customers (id) on delete set null;
alter table reservations add column if not exists referral_link_id uuid references customer_referral_links (id) on delete set null;
alter table reservations add column if not exists is_public_request boolean not null default false;

do $$ begin
  create type referral_conversion_type as enum ('reservation', 'achat');
exception when duplicate_object then null;
end $$;

create table if not exists customer_referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referral_link_id uuid not null references customer_referral_links (id) on delete cascade,
  conversion_type referral_conversion_type not null,
  reservation_id uuid references reservations (id) on delete set null,
  credited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_referral_conversions_link on customer_referral_conversions (referral_link_id);

alter table customer_referral_conversions enable row level security;

drop policy if exists "customer_referral_conversions_select" on customer_referral_conversions;
create policy "customer_referral_conversions_select" on customer_referral_conversions for select
  using (
    exists (
      select 1 from customer_referral_links crl
      join referral_programs rp on rp.id = crl.referral_program_id
      where crl.id = customer_referral_conversions.referral_link_id and is_restaurant_member(rp.restaurant_id)
    )
    or exists (
      select 1 from customer_referral_links crl
      join customers c on c.id = crl.customer_id
      where crl.id = customer_referral_conversions.referral_link_id and c.user_id = auth.uid()
    )
  );

-- Un client qui se connecte par lien magique (raw_user_meta_data.is_customer)
-- ne doit jamais recevoir de faux restaurant "Mon restaurant" — seuls les
-- vrais comptes propriétaires passent par le provisionnement ci-dessous.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' then
    return new;
  end if;

  insert into public.restaurants (name)
  values ('Mon restaurant')
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Incréments atomiques — remplacent les patrons "lire, calculer en JS,
-- réécrire" qui existaient côté application pour ces compteurs (points de
-- fidélité, quantité en stock, ventes de menu, clics/conversions de
-- parrainage) : deux écritures concurrentes sur la même ligne pouvaient en
-- écraser une silencieusement. Chaque fonction revérifie elle-même
-- l'autorisation (security definer contourne les RLS) puisqu'un client
-- authentifié peut appeler ces fonctions RPC directement.
-- ═══════════════════════════════════════════════════════════════════════

-- Enregistre la ligne du grand livre ET met à jour le solde du client dans
-- le même aller-retour — une écriture de visite ne peut plus laisser une
-- transaction sans le solde correspondant (ou l'inverse) en cas d'échec
-- partiel entre les deux requêtes séparées que faisait l'ancien code.
create or replace function increment_customer_visit(
  p_customer_id uuid, p_restaurant_id uuid, p_amount_spent numeric, p_points_delta int, p_note text
)
returns setof customers
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from customers where id = p_customer_id;
  if v_restaurant_id is null or v_restaurant_id != p_restaurant_id
     or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  insert into loyalty_transactions (restaurant_id, customer_id, type, amount_spent, points_delta, note, created_by)
  values (v_restaurant_id, p_customer_id, 'visite', p_amount_spent, p_points_delta, p_note, auth.uid());

  return query
    update customers
    set visit_count = visit_count + 1,
        total_spent = total_spent + p_amount_spent,
        loyalty_points = loyalty_points + p_points_delta,
        last_visit_at = now()
    where id = p_customer_id
    returning *;
end;
$$;

-- Déduit le solde seulement si la clause WHERE (solde suffisant) matche —
-- retourne 0 ligne sinon, sans jamais enregistrer de transaction d'échange
-- fantôme pour un échange qui a réellement échoué.
create or replace function redeem_customer_reward(p_customer_id uuid, p_restaurant_id uuid, p_reward_id uuid)
returns setof customers
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_points_cost int;
  v_reward_name text;
  updated customers%rowtype;
begin
  select restaurant_id into v_restaurant_id from customers where id = p_customer_id;
  if v_restaurant_id is null or v_restaurant_id != p_restaurant_id
     or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  select points_cost, name into v_points_cost, v_reward_name
  from loyalty_rewards where id = p_reward_id and restaurant_id = v_restaurant_id;

  if v_points_cost is null then
    return;
  end if;

  update customers
  set loyalty_points = loyalty_points - v_points_cost
  where id = p_customer_id and loyalty_points >= v_points_cost
  returning * into updated;

  if not found then
    return;
  end if;

  insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note, created_by)
  values (v_restaurant_id, p_customer_id, 'echange', -v_points_cost, 'Échange : ' || v_reward_name, auth.uid());

  return next updated;
end;
$$;

create or replace function increment_inventory_quantity(p_item_id uuid, p_delta numeric)
returns setof inventory_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from inventory_items where id = p_item_id;
  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  return query
    update inventory_items
    set quantity_on_hand = greatest(0, quantity_on_hand + p_delta)
    where id = p_item_id
    returning *;
end;
$$;

create or replace function increment_menu_item_sales(p_item_id uuid, p_quantity numeric)
returns setof menu_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from menu_items where id = p_item_id;
  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  return query
    update menu_items
    set units_sold = units_sold + p_quantity
    where id = p_item_id
    returning *;
end;
$$;

-- Intentionnellement sans vérification d'autorisation : appelée depuis la
-- page publique /p/[code] par un visiteur anonyme qui suit un lien de
-- parrainage — c'est le même contournement RLS que le client admin déjà
-- utilisé pour cette lecture publique.
create or replace function increment_referral_link_clicks(p_code text)
returns void
language sql
security definer set search_path = public
as $$
  update customer_referral_links set clicks = clicks + 1 where code = p_code;
$$;

-- Toute la logique de crédit (marquer la conversion, incrémenter le
-- compteur, débloquer la récompense si l'objectif est atteint) tient dans
-- un seul aller-retour, verrouillé par la ligne de conversion (for update)
-- pour empêcher un double-crédit si le statut de la réservation change
-- deux fois rapidement.
create or replace function credit_referral_conversion(p_reservation_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_referral_link_id uuid;
  v_new_count int;
  v_goal_count int;
  v_reward_claimed timestamptz;
begin
  select restaurant_id, referral_link_id into v_restaurant_id, v_referral_link_id
  from reservations where id = p_reservation_id;

  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id) then
    raise exception 'Non autorisé';
  end if;

  if v_referral_link_id is null then
    return;
  end if;

  -- The guard lives in the WHERE clause itself, so the lock-acquire and the
  -- "already credited?" check happen in the same atomic statement instead
  -- of a separate SELECT ... FOR UPDATE beforehand.
  update customer_referral_conversions
  set credited_at = now()
  where reservation_id = p_reservation_id and credited_at is null;

  if not found then
    return;
  end if;

  update customer_referral_links
  set converted_count = converted_count + 1
  where id = v_referral_link_id
  returning converted_count, reward_claimed_at into v_new_count, v_reward_claimed;

  select goal_count into v_goal_count
  from referral_programs
  where id = (select referral_program_id from customer_referral_links where id = v_referral_link_id);

  if v_new_count >= v_goal_count and v_reward_claimed is null then
    update customer_referral_links
    set reward_claimed_at = now()
    where id = v_referral_link_id;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Lot B — menu public, commande en ligne (sans paiement réel : le client
-- compose sa commande et la voit confirmée, mais paie sur place)
-- ═══════════════════════════════════════════════════════════════════════

alter table restaurants add column if not exists tax_rate numeric(6,5) not null default 0.14975;
alter table restaurants add column if not exists accepts_tips boolean not null default true;
alter table menu_items add column if not exists image_url text;

do $$ begin
  create type order_status as enum ('soumise', 'confirmee', 'en_preparation', 'prete', 'servie', 'annulee');
exception when duplicate_object then null;
end $$;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  status order_status not null default 'soumise',
  guest_name text not null,
  guest_phone text,
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  tip_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text,
  notes text,
  customer_id uuid references customers (id) on delete set null,
  referral_link_id uuid references customer_referral_links (id) on delete set null,
  is_public_request boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_restaurant_created on orders (restaurant_id, created_at desc);

alter table orders enable row level security;

drop policy if exists "orders_select" on orders;
create policy "orders_select" on orders for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "orders_insert" on orders;
create policy "orders_insert" on orders for insert
  with check (is_restaurant_member(restaurant_id));
drop policy if exists "orders_update" on orders;
create policy "orders_update" on orders for update
  using (is_restaurant_member(restaurant_id));
drop policy if exists "orders_delete" on orders;
create policy "orders_delete" on orders for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  menu_item_id uuid references menu_items (id) on delete set null,
  item_name text not null,
  unit_price numeric(10,2) not null default 0,
  quantity int not null default 1,
  notes text
);

create index if not exists idx_order_items_order on order_items (order_id);

alter table order_items enable row level security;

drop policy if exists "order_items_select" on order_items;
create policy "order_items_select" on order_items for select
  using (exists (
    select 1 from orders o where o.id = order_items.order_id and is_restaurant_member(o.restaurant_id)
  ));
drop policy if exists "order_items_manage" on order_items;
create policy "order_items_manage" on order_items for all
  using (exists (
    select 1 from orders o where o.id = order_items.order_id and is_restaurant_member(o.restaurant_id)
  ))
  with check (exists (
    select 1 from orders o where o.id = order_items.order_id and is_restaurant_member(o.restaurant_id)
  ));

-- Lien de menu public — indépendant d'un lien de parrainage personnel
-- (customer_referral_links est scoppé à un client précis). Pas
-- d'instantané : le menu affiché reste à jour avec les prix/disponibilité
-- réels au moment de la visite, contrairement à report_shares.
create table if not exists menu_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  token text not null unique,
  item_ids uuid[],
  title text not null default 'Menu',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_shares_token on menu_shares (token);

alter table menu_shares enable row level security;

drop policy if exists "menu_shares_select" on menu_shares;
create policy "menu_shares_select" on menu_shares for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "menu_shares_insert" on menu_shares;
create policy "menu_shares_insert" on menu_shares for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_shares_delete" on menu_shares;
create policy "menu_shares_delete" on menu_shares for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

alter table customer_referral_conversions add column if not exists order_id uuid references orders (id) on delete set null;

-- Jumelle de credit_referral_conversion (réservations) mais pour une
-- commande — même verrouillage (for update) contre le double-crédit.
create or replace function credit_referral_conversion_for_order(p_order_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_referral_link_id uuid;
  v_new_count int;
  v_goal_count int;
  v_reward_claimed timestamptz;
begin
  select restaurant_id, referral_link_id into v_restaurant_id, v_referral_link_id
  from orders where id = p_order_id;

  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id) then
    raise exception 'Non autorisé';
  end if;

  if v_referral_link_id is null then
    return;
  end if;

  update customer_referral_conversions
  set credited_at = now()
  where order_id = p_order_id and credited_at is null;

  if not found then
    return;
  end if;

  update customer_referral_links
  set converted_count = converted_count + 1
  where id = v_referral_link_id
  returning converted_count, reward_claimed_at into v_new_count, v_reward_claimed;

  select goal_count into v_goal_count
  from referral_programs
  where id = (select referral_program_id from customer_referral_links where id = v_referral_link_id);

  if v_new_count >= v_goal_count and v_reward_claimed is null then
    update customer_referral_links
    set reward_claimed_at = now()
    where id = v_referral_link_id;
  end if;
end;
$$;

-- ── storage: images de plats (bucket public, patron "avatars") ──────────
insert into storage.buckets (id, name, public)
values ('menu-item-images', 'menu-item-images', true)
on conflict (id) do nothing;

drop policy if exists "menu_item_images_public_read" on storage.objects;
create policy "menu_item_images_public_read" on storage.objects for select
  using (bucket_id = 'menu-item-images');
drop policy if exists "menu_item_images_write" on storage.objects;
create policy "menu_item_images_write" on storage.objects for insert
  with check (bucket_id = 'menu-item-images' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_item_images_update" on storage.objects;
create policy "menu_item_images_update" on storage.objects for update
  using (bucket_id = 'menu-item-images' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_item_images_delete" on storage.objects;
create policy "menu_item_images_delete" on storage.objects for delete
  using (bucket_id = 'menu-item-images' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[]));

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0010', 'pending_lots_and_phases') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0010_pending_lots_and_phases.sql <<<

-- >>> MIGRATION 0011_workspaces.sql >>>
-- Minerva Flow — Workspace unification (Phase 1)
-- Promotes the thin "companies" grouping (0003_companies.sql) into a
-- first-class Workspace: it now owns team invitations, restaurant
-- assignment, and (below) billing. Restaurant-level RLS is untouched —
-- restaurant_members stays the source of truth for actual data access;
-- redeeming a workspace invite creates ordinary restaurant_members rows.

-- ── rename companies → workspaces ───────────────────────────────────────
alter table companies rename to workspaces;
alter table company_members rename to workspace_members;
alter table workspace_members rename column company_id to workspace_id;
alter table restaurants rename column company_id to workspace_id;
alter index idx_restaurants_company rename to idx_restaurants_workspace;
alter index idx_company_members_user rename to idx_workspace_members_user;
alter index idx_company_members_company rename to idx_workspace_members_workspace;

-- Drop the policies that reference is_company_member() BEFORE dropping the
-- function itself — Postgres refuses to drop a function that a live policy
-- still depends on.
drop policy if exists "companies_select" on workspaces;
drop policy if exists "companies_update" on workspaces;
drop policy if exists "companies_insert" on workspaces;
drop policy if exists "company_members_select" on workspace_members;
drop policy if exists "company_members_insert" on workspace_members;
drop policy if exists "company_members_update" on workspace_members;
drop policy if exists "company_members_delete" on workspace_members;

drop function if exists is_company_member(uuid, member_role[]);

create function is_workspace_member(target_workspace_id uuid, min_roles member_role[] default array['owner','manager','staff','consultant']::member_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(min_roles)
  );
$$;

create policy "workspaces_select" on workspaces for select
  using (is_workspace_member(id));
create policy "workspaces_update" on workspaces for update
  using (is_workspace_member(id, array['owner','manager']::member_role[]));
create policy "workspaces_insert" on workspaces for insert
  with check (true); -- creation happens via a server action that immediately inserts the owner membership

create policy "workspace_members_select" on workspace_members for select
  using (is_workspace_member(workspace_id));
create policy "workspace_members_insert" on workspace_members for insert
  with check (
    is_workspace_member(workspace_id, array['owner','manager']::member_role[])
    or (
      -- Bootstrap-only: the creating user may insert their own first
      -- membership row for a workspace, but ONLY while it has zero members —
      -- once a workspace has any member, all further inserts must go through
      -- the owner/manager path above. Without the "zero members" guard,
      -- any authenticated user could self-appoint as owner of any existing
      -- workspace by inserting {workspace_id: <target>, user_id: self, role:
      -- 'owner'} directly.
      user_id = auth.uid()
      and not exists (select 1 from workspace_members wm where wm.workspace_id = workspace_id)
    )
  );
create policy "workspace_members_update" on workspace_members for update
  using (is_workspace_member(workspace_id, array['owner','manager']::member_role[]));
create policy "workspace_members_delete" on workspace_members for delete
  using (is_workspace_member(workspace_id, array['owner','manager']::member_role[]));

-- Extend restaurant visibility: a workspace member can see every restaurant
-- under their workspace without needing an individual restaurant_members row.
drop policy if exists "restaurants_member_select" on restaurants;
create policy "restaurants_member_select" on restaurants for select
  using (
    is_restaurant_member(id)
    or (workspace_id is not null and is_workspace_member(workspace_id))
  );

-- ── workspace invites (mirrors restaurant_invites, plus restaurant assignment) ──
create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  role member_role not null default 'staff',
  restaurant_ids uuid[] not null default '{}', -- workspace restaurants this invite grants access to
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_workspace_invites_workspace on workspace_invites (workspace_id);
create index idx_workspace_invites_token on workspace_invites (token);

alter table workspace_invites enable row level security;
create policy "workspace_invites_select" on workspace_invites for select
  using (is_workspace_member(workspace_id, array['owner','manager']::member_role[]));
-- writes go through the admin client from server actions (mirrors
-- restaurant_invites) — no insert/update policy needed.

-- ── per-membership sidebar permission overlay (additive, never expands access) ──
alter table restaurant_members add column sidebar_permissions text[];
comment on column restaurant_members.sidebar_permissions is
  'Optional allow-list of nav item keys. NULL = unrestricted (default, backward compatible). When set, the sidebar shows the intersection of role-allowed items and this list — it can only narrow access, never grant beyond what member_role/RLS already allows.';

-- ── backfill: every restaurant must end up with a workspace_id ──────────
-- Restaurants already grouped via company_id (now workspace_id) are done —
-- the rename above already carried that link over. For restaurants with no
-- workspace, group them by owner: one workspace per distinct active owner,
-- processed oldest-membership-first for determinism.
--
-- Known limitation (documented, not solved here): a restaurant co-owned by
-- two different users gets claimed by whichever owner's iteration runs
-- first; the other co-owner is not automatically added to that workspace.
-- Run this query after migrating to find such cases for manual follow-up:
--   select res.id, res.name, array_agg(distinct m.user_id) as owners
--   from restaurants res
--   join restaurant_members m on m.restaurant_id = res.id and m.role = 'owner' and m.status = 'active'
--   group by res.id, res.name
--   having count(distinct m.user_id) > 1;
do $$
declare
  r record;
  new_workspace_id uuid;
begin
  for r in
    select m.user_id, min(m.created_at) as first_owned_at, array_agg(distinct rm.restaurant_id) as restaurant_ids
    from restaurant_members m
    join restaurant_members rm on rm.user_id = m.user_id and rm.role = 'owner' and rm.status = 'active'
    join restaurants res on res.id = rm.restaurant_id and res.workspace_id is null
    where m.role = 'owner' and m.status = 'active'
    group by m.user_id
    order by min(m.created_at) asc
  loop
    if exists (select 1 from restaurants where id = any(r.restaurant_ids) and workspace_id is null) then
      insert into workspaces (name)
      values (coalesce((select full_name from profiles where id = r.user_id), 'Mon workspace'))
      returning id into new_workspace_id;

      insert into workspace_members (workspace_id, user_id, role, status)
      values (new_workspace_id, r.user_id, 'owner', 'active')
      on conflict (workspace_id, user_id) do nothing;

      update restaurants set workspace_id = new_workspace_id
      where id = any(r.restaurant_ids) and workspace_id is null;
    end if;
  end loop;
end $$;

-- ── billing moves to the workspace level (see runbook in migration notes) ──
-- ⚠️ Before running this in production: run the collision-check query below
-- against the real database and reconcile any workspace with more than one
-- Stripe subscription in the Stripe dashboard first. This step involves
-- real customer billing state — do not treat the automated part as a full
-- migration; it deliberately only resolves the unambiguous case.
--
--   select r.workspace_id, array_agg(s.id) as subscription_ids, array_agg(s.status) as statuses
--   from subscriptions s join restaurants r on r.id = s.restaurant_id
--   where r.workspace_id is not null
--   group by r.workspace_id having count(*) > 1;
--
-- If that query returns zero rows, the automated assignment below covers
-- every workspace and this migration is safe to run as-is.
alter table subscriptions add column workspace_id uuid references workspaces (id) on delete cascade;

with ranked as (
  select
    s.id,
    r.workspace_id,
    row_number() over (
      partition by r.workspace_id
      order by
        case s.status
          when 'active' then 1
          when 'trialing' then 2
          when 'past_due' then 3
          when 'incomplete' then 4
          when 'unpaid' then 5
          when 'canceled' then 6
        end,
        s.created_at asc
    ) as rnk,
    count(*) over (partition by r.workspace_id) as workspace_sub_count
  from subscriptions s
  join restaurants r on r.id = s.restaurant_id
  where r.workspace_id is not null
)
update subscriptions s
set workspace_id = ranked.workspace_id
from ranked
where s.id = ranked.id
  and ranked.rnk = 1
  and ranked.workspace_sub_count = 1; -- only the unambiguous (single-subscription) case; ambiguous workspaces are left null for manual reconciliation

-- unique(workspace_id) allows multiple NULLs, so ambiguous/unreconciled
-- workspaces simply have no workspace-level subscription yet — safe to add
-- immediately without blocking on manual reconciliation.
alter table subscriptions add constraint subscriptions_workspace_id_key unique (workspace_id);
-- restaurant_id and its legacy unique constraint are left in place for now
-- (audit trail) — drop them in a follow-up migration once every workspace
-- has been reconciled and the app no longer reads subscriptions by restaurant_id.
-- It must become nullable now, though: upsertSubscription() only writes
-- workspace_id going forward, so the very first webhook-driven insert for a
-- brand-new workspace (no legacy restaurant-level row to conflict with)
-- would otherwise violate the old NOT NULL constraint.
alter table subscriptions alter column restaurant_id drop not null;

drop policy if exists "subscriptions_select" on subscriptions;
create policy "subscriptions_select" on subscriptions for select
  using (workspace_id is not null and is_workspace_member(workspace_id, array['owner']::member_role[]));

-- ── new owner signups get a workspace too, not just backfilled legacy ones ──
-- Mirrors the restaurant/owner-membership provisioning already in
-- handle_new_user() (0010_pending_lots_and_phases.sql) — same is_customer
-- guard, same security-definer trigger, now also creating a workspace and
-- linking the default restaurant to it.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
  new_workspace_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' then
    return new;
  end if;

  insert into public.workspaces (name)
  values ('Mon workspace')
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new_workspace_id, new.id, 'owner', 'active');

  insert into public.restaurants (name, workspace_id)
  values ('Mon restaurant', new_workspace_id)
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0011', 'workspaces') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0011_workspaces.sql <<<

-- >>> MIGRATION 0012_offers.sql >>>
-- Minerva Flow — client-facing offers (Phase 2: QR/mode client)
-- A lightweight, customer-facing promotions table — deliberately separate
-- from campaigns/revenue_programs (staff-only internal tracking with
-- cost/ROI/confidence fields that have no business being shown to a
-- customer). Public reads go through the admin client from the /m/[token]
-- flow, exactly like menu_items already does — the RLS below only gates
-- the staff management UI.

create table offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  title text not null check (title !~ '^[[:space:]]*$'),
  description text,
  image_url text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  constraint offers_window_ordered check (
    starts_at is null or ends_at is null or starts_at < ends_at
  )
);

create index idx_offers_restaurant on offers (restaurant_id, created_at desc);

alter table offers enable row level security;

create policy "offers_select" on offers for select
  using (is_restaurant_member(restaurant_id));
create policy "offers_insert" on offers for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "offers_update" on offers for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "offers_delete" on offers for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ── storage: offer images (public, one folder per restaurant) ───────────
insert into storage.buckets (id, name, public)
values ('offer-images', 'offer-images', true)
on conflict (id) do nothing;

create policy "offer_images_public_read" on storage.objects for select
  using (bucket_id = 'offer-images');
create policy "offer_images_manage_write" on storage.objects for insert
  with check (
    bucket_id = 'offer-images'
    and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );
create policy "offer_images_manage_delete" on storage.objects for delete
  using (
    bucket_id = 'offer-images'
    and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0012', 'offers') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0012_offers.sql <<<

-- >>> MIGRATION 0013_invite_signup_no_default_restaurant.sql >>>
-- Un utilisateur qui crée son compte depuis un lien d'invitation (invite
-- restaurant simple OU invite workspace) ne doit pas recevoir de restaurant
-- "Mon restaurant" par défaut : il rejoint déjà le(s) vrai(s) restaurant(s)
-- juste après, via redeemInvite() (lib/data/invites.ts et
-- lib/data/workspace-invites.ts). Sans ce garde-fou, tout employé invité se
-- retrouvait propriétaire d'un restaurant fantôme en plus de son vrai poste
-- — sur les DEUX flux d'invitation (l'ancien par restaurant et le nouveau
-- par workspace), qui coexistent encore dans l'app. Même pattern que le
-- garde-fou déjà en place pour is_customer.
--
-- AuthCard.tsx pose invite_token / workspace_invite_token dans
-- raw_user_meta_data pour le flux email/mot de passe ; le flux OAuth ne
-- peut pas transmettre de métadonnées custom, donc un filet de sécurité
-- (deletePhantomDefaultRestaurant, appelé par les deux redeemInvite())
-- nettoie après coup dans ce cas.

begin;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' then
    return new;
  end if;

  if (new.raw_user_meta_data ->> 'invite_token') is not null
     or (new.raw_user_meta_data ->> 'workspace_invite_token') is not null then
    return new;
  end if;

  insert into public.restaurants (name)
  values ('Mon restaurant')
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0013', 'invite_signup_no_default_restaurant') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0013_invite_signup_no_default_restaurant.sql <<<

-- >>> MIGRATION 0014_employee_self_service_rls.sql >>>
-- Portail libre-service employé (/mon-espace) : un employé doit pouvoir
-- lire ses propres quarts et revues de performance. Les policies select
-- existantes sur employee_shifts/employee_reviews (0010_...sql) étaient un
-- simple is_restaurant_member(restaurant_id) : n'importe quel membre actif
-- du restaurant pouvait donc déjà lire les quarts/revues de *tous* les
-- employés, pas seulement les siens. On resserre ici : owner/manager
-- gardent l'accès complet ; les autres rôles ne voient que les lignes de
-- l'employé auquel leur compte est lié (employees.linked_user_id).

begin;

drop policy if exists "employee_shifts_select" on employee_shifts;
create policy "employee_shifts_select" on employee_shifts for select
  using (
    is_restaurant_member(restaurant_id, array['owner','manager']::member_role[])
    or (
      is_restaurant_member(restaurant_id)
      and exists (
        select 1 from employees e
        where e.id = employee_shifts.employee_id and e.linked_user_id = auth.uid()
      )
    )
  );

drop policy if exists "employee_reviews_select" on employee_reviews;
create policy "employee_reviews_select" on employee_reviews for select
  using (
    is_restaurant_member(restaurant_id, array['owner','manager']::member_role[])
    or (
      is_restaurant_member(restaurant_id)
      and exists (
        select 1 from employees e
        where e.id = employee_reviews.employee_id and e.linked_user_id = auth.uid()
      )
    )
  );

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0014', 'employee_self_service_rls') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0014_employee_self_service_rls.sql <<<

-- >>> MIGRATION 0015_employee_tasks.sql >>>
-- Tâches assignées par l'employeur à un employé (checklist simple v1) —
-- affichées côté employeur dans la fiche employé, et côté employé dans
-- /mon-espace. Assignation par employee_id (même clé que
-- employee_shifts/employee_reviews), résolue vers le compte connecté via
-- employees.linked_user_id.

begin;

do $$ begin
  create type employee_task_status as enum ('a_faire', 'fait');
exception when duplicate_object then null;
end $$;

create table if not exists employee_tasks (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  title text not null,
  description text,
  status employee_task_status not null default 'a_faire',
  created_by uuid references auth.users (id),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_tasks_employee on employee_tasks (employee_id, created_at desc);

alter table employee_tasks enable row level security;

drop policy if exists "employee_tasks_select" on employee_tasks;
create policy "employee_tasks_select" on employee_tasks for select
  using (
    is_restaurant_member(restaurant_id, array['owner','manager']::member_role[])
    or (
      is_restaurant_member(restaurant_id)
      and exists (
        select 1 from employees e
        where e.id = employee_tasks.employee_id and e.linked_user_id = auth.uid()
      )
    )
  );

drop policy if exists "employee_tasks_manage_insert" on employee_tasks;
create policy "employee_tasks_manage_insert" on employee_tasks for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

drop policy if exists "employee_tasks_manage_delete" on employee_tasks;
create policy "employee_tasks_manage_delete" on employee_tasks for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- update : owner/manager peuvent tout modifier ; l'employé assigné peut
-- cocher/décocher sa propre tâche (v1 : la policy autorise la ligne
-- entière plutôt qu'une colonne précise, acceptable pour une checklist).
drop policy if exists "employee_tasks_manage_update" on employee_tasks;
create policy "employee_tasks_manage_update" on employee_tasks for update
  using (
    is_restaurant_member(restaurant_id, array['owner','manager']::member_role[])
    or exists (
      select 1 from employees e
      where e.id = employee_tasks.employee_id and e.linked_user_id = auth.uid()
    )
  );

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0015', 'employee_tasks') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0015_employee_tasks.sql <<<

-- >>> MIGRATION 0016_employee_login_invite.sql >>>
-- Permet d'inviter un employé (fiche HR dans `employees`) à se créer un
-- compte de connexion lié à sa fiche, pour accéder à /mon-espace. Réutilise
-- le flux restaurant_invites existant : quand l'invite porte un
-- employee_id, la redemption lie automatiquement employees.linked_user_id
-- au compte qui vient de rejoindre (lib/data/invites.ts:redeemInvite).

begin;

alter table restaurant_invites add column if not exists employee_id uuid references employees (id) on delete set null;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0016', 'employee_login_invite') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0016_employee_login_invite.sql <<<

-- >>> MIGRATION 0017_workspace_invite_employee_link.sql >>>
-- Ports the employee-login-invite flow (0016_employee_login_invite.sql) to
-- workspace_invites, now that /collaborateurs consolidates onto the
-- workspace invite system (restaurant_invites stays functional read-only
-- for previously-issued links, but no longer used to mint new ones). Same
-- shape: when an invite carries an employee_id, redemption links
-- employees.linked_user_id to the account that redeemed it
-- (lib/data/workspace-invites.ts:redeemInvite).

begin;

alter table workspace_invites add column if not exists employee_id uuid references employees (id) on delete set null;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0017', 'workspace_invite_employee_link') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0017_workspace_invite_employee_link.sql <<<

-- >>> MIGRATION 0018_restaurant_website_description.sql >>>
-- Backs the "carte fly-to + description auto" backlog item: a restaurant
-- can now record its own website, and its description gets pre-filled by
-- fetching that website's <meta name="description">/og:description
-- (lib/website-description.ts) whenever the website URL is set or changed
-- (mirrors the existing geocode-on-address-change pattern in
-- lib/data/restaurants.ts:updateRestaurant).

begin;

alter table restaurants add column if not exists website text;
alter table restaurants add column if not exists description text;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0018', 'restaurant_website_description') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0018_restaurant_website_description.sql <<<

-- >>> MIGRATION 0019_created_by_on_delete_set_null.sql >>>
-- Deleting a user whose account created any business record (an employee,
-- a service day, an order, ...) currently fails outright: every `created_by`
-- FK to auth.users across the schema was declared with no ON DELETE action,
-- which defaults to NO ACTION/RESTRICT in Postgres. Confirmed in production
-- via Supabase logs: "update or delete on table \"users\" violates foreign
-- key constraint ..." for employees_created_by_fkey, employee_tasks_created_by_fkey,
-- service_days_created_by_fkey — this also silently broke the E2E test suite's
-- own cleanup (auth.admin.deleteUser on any test user that had created data).
--
-- Switches every one to ON DELETE SET NULL: the record survives (it's real
-- business/audit data), only the "who created it" attribution is cleared —
-- the same safe precedent already used by employees.linked_user_id. A handful
-- were declared NOT NULL, which SET NULL would violate on delete, so those
-- drop the NOT NULL constraint too. Postgres's default constraint name for an
-- inline `references` is always <table>_<column>_fkey, confirmed by the error
-- messages above.

begin;

alter table service_days drop constraint if exists service_days_created_by_fkey;
alter table service_days add constraint service_days_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table revenue_programs drop constraint if exists revenue_programs_created_by_fkey;
alter table revenue_programs add constraint revenue_programs_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table campaigns drop constraint if exists campaigns_created_by_fkey;
alter table campaigns add constraint campaigns_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table chat_conversations alter column created_by drop not null;
alter table chat_conversations drop constraint if exists chat_conversations_created_by_fkey;
alter table chat_conversations add constraint chat_conversations_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table referral_codes alter column created_by drop not null;
alter table referral_codes drop constraint if exists referral_codes_created_by_fkey;
alter table referral_codes add constraint referral_codes_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table ad_platform_connections drop constraint if exists ad_platform_connections_created_by_fkey;
alter table ad_platform_connections add constraint ad_platform_connections_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table google_connections drop constraint if exists google_connections_created_by_fkey;
alter table google_connections add constraint google_connections_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table restaurant_invites alter column created_by drop not null;
alter table restaurant_invites drop constraint if exists restaurant_invites_created_by_fkey;
alter table restaurant_invites add constraint restaurant_invites_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table report_shares alter column created_by drop not null;
alter table report_shares drop constraint if exists report_shares_created_by_fkey;
alter table report_shares add constraint report_shares_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table employees drop constraint if exists employees_created_by_fkey;
alter table employees add constraint employees_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table employee_shifts drop constraint if exists employee_shifts_created_by_fkey;
alter table employee_shifts add constraint employee_shifts_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table ai_reviews drop constraint if exists ai_reviews_created_by_fkey;
alter table ai_reviews add constraint ai_reviews_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table incident_log drop constraint if exists incident_log_created_by_fkey;
alter table incident_log add constraint incident_log_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table pos_connections drop constraint if exists pos_connections_created_by_fkey;
alter table pos_connections add constraint pos_connections_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table changelog_entries drop constraint if exists changelog_entries_created_by_fkey;
alter table changelog_entries add constraint changelog_entries_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table reservations drop constraint if exists reservations_created_by_fkey;
alter table reservations add constraint reservations_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table shift_schedules drop constraint if exists shift_schedules_created_by_fkey;
alter table shift_schedules add constraint shift_schedules_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table purchase_orders drop constraint if exists purchase_orders_created_by_fkey;
alter table purchase_orders add constraint purchase_orders_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table reservation_platform_connections drop constraint if exists reservation_platform_connections_created_by_fkey;
alter table reservation_platform_connections add constraint reservation_platform_connections_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table schedule_shares alter column created_by drop not null;
alter table schedule_shares drop constraint if exists schedule_shares_created_by_fkey;
alter table schedule_shares add constraint schedule_shares_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table financial_transactions drop constraint if exists financial_transactions_created_by_fkey;
alter table financial_transactions add constraint financial_transactions_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table expense_shares alter column created_by drop not null;
alter table expense_shares drop constraint if exists expense_shares_created_by_fkey;
alter table expense_shares add constraint expense_shares_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table loyalty_transactions drop constraint if exists loyalty_transactions_created_by_fkey;
alter table loyalty_transactions add constraint loyalty_transactions_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table inventory_movements drop constraint if exists inventory_movements_created_by_fkey;
alter table inventory_movements add constraint inventory_movements_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table orders drop constraint if exists orders_created_by_fkey;
alter table orders add constraint orders_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table menu_shares drop constraint if exists menu_shares_created_by_fkey;
alter table menu_shares add constraint menu_shares_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table workspace_invites drop constraint if exists workspace_invites_created_by_fkey;
alter table workspace_invites add constraint workspace_invites_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table offers drop constraint if exists offers_created_by_fkey;
alter table offers add constraint offers_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table employee_tasks drop constraint if exists employee_tasks_created_by_fkey;
alter table employee_tasks add constraint employee_tasks_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0019', 'created_by_on_delete_set_null') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0019_created_by_on_delete_set_null.sql <<<

-- >>> MIGRATION 0020_fix_handle_new_user_workspace_regression.sql >>>
-- Fixes a real regression: 0013_invite_signup_no_default_restaurant.sql used
-- `create or replace function handle_new_user()` to add the invite-token
-- guard, but its body was written against the PRE-0011 version of the
-- function — it silently dropped 0011_workspaces.sql's workspace/
-- workspace_members inserts and reverted `restaurants` to being created
-- with no workspace_id at all. Since 0013 was applied, every normal signup
-- (not an invite redemption) has been provisioned with a workspace-less
-- restaurant.
--
-- Consequence discovered while testing the /collaborateurs → workspace
-- invite consolidation (this session, 2026-07-21): fresh users have no
-- workspace, so getCurrentWorkspaceMembership() returns null, so the
-- "Inviter un collaborateur" button never renders and employee invite-link
-- generation fails outright — this was misdiagnosed at first as Playwright/
-- Turbopack flakiness before the actual data was inspected directly.
--
-- Restores 0011's workspace + workspace_members inserts, keeps 0013's
-- is_customer and invite-token guards.

begin;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
  new_workspace_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' then
    return new;
  end if;

  if (new.raw_user_meta_data ->> 'invite_token') is not null
     or (new.raw_user_meta_data ->> 'workspace_invite_token') is not null then
    return new;
  end if;

  insert into public.workspaces (name)
  values ('Mon workspace')
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new_workspace_id, new.id, 'owner', 'active');

  insert into public.restaurants (name, workspace_id)
  values ('Mon restaurant', new_workspace_id)
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

-- Backfill: every existing restaurant-owning user who was signed up between
-- 0013 and this fix and still has no workspace gets one now — same
-- one-workspace-per-distinct-owner logic 0011 used for its own backfill.
do $$
declare
  r record;
  new_workspace_id uuid;
begin
  for r in
    select m.user_id, min(m.created_at) as first_owned_at, array_agg(distinct rm.restaurant_id) as restaurant_ids
    from restaurant_members m
    join restaurant_members rm on rm.user_id = m.user_id and rm.role = 'owner' and rm.status = 'active'
    join restaurants res on res.id = rm.restaurant_id and res.workspace_id is null
    where m.role = 'owner' and m.status = 'active'
    group by m.user_id
    order by min(m.created_at) asc
  loop
    if exists (select 1 from restaurants where id = any(r.restaurant_ids) and workspace_id is null) then
      insert into workspaces (name)
      values (coalesce((select full_name from profiles where id = r.user_id), 'Mon workspace'))
      returning id into new_workspace_id;

      insert into workspace_members (workspace_id, user_id, role, status)
      values (new_workspace_id, r.user_id, 'owner', 'active')
      on conflict (workspace_id, user_id) do nothing;

      update restaurants set workspace_id = new_workspace_id
      where id = any(r.restaurant_ids) and workspace_id is null;
    end if;
  end loop;
end $$;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0020', 'fix_handle_new_user_workspace_regression') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0020_fix_handle_new_user_workspace_regression.sql <<<

-- >>> MIGRATION 0021_restaurant_places_and_hours.sql >>>
-- Backs the Google Places import + extended website business-info extraction:
-- a restaurant can now record a phone number, precise per-day opening hours,
-- and the Google Place ID it was imported from (enables a future
-- "resynchroniser depuis Google" action without another migration).

begin;

alter table restaurants add column if not exists phone text;
alter table restaurants add column if not exists opening_hours jsonb;
alter table restaurants add column if not exists google_place_id text;

comment on column restaurants.opening_hours is
  'Plage horaire par jour, clé = jour de semaine (0=dimanche, même convention qu''operating_days). '
  'Forme : {"1": {"open": "11:00", "close": "22:00"}, ...}. Une seule plage par jour (simplification v1 — '
  'si une source (Google Places ou données structurées d''un site web) rapporte des services séparés '
  'pour un jour, on garde la première ouverture / dernière fermeture). Clé absente ou null = fermé ce jour.';

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0021', 'restaurant_places_and_hours') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0021_restaurant_places_and_hours.sql <<<

-- >>> MIGRATION 0022_employee_clock_in.sql >>>
-- Pointage employé : ajoute clock_in/clock_out à employee_shifts et permet
-- à un employé de pointer/dépointer lui-même (jusqu'ici seul owner/manager
-- pouvait écrire dans cette table, et il n'existait même pas de politique
-- UPDATE du tout). clock_in/clock_out restent null pour les quarts
-- historiques journalisés manuellement — hours_worked continue d'être la
-- source de vérité pour tout ce qui existe déjà.

begin;

alter table employee_shifts add column if not exists clock_in timestamptz;
alter table employee_shifts add column if not exists clock_out timestamptz;

-- Manquait entièrement : owner/manager ne pouvaient ni corriger un quart
-- ni dépointer un employé sans compte de connexion.
drop policy if exists "employee_shifts_manage_update" on employee_shifts;
create policy "employee_shifts_manage_update" on employee_shifts for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- L'employé peut créer sa propre ligne (pointer) et mettre à jour la ligne
-- qu'il vient de créer (se dépointer) — même précédent que employee_tasks,
-- où l'employé assigné peut modifier sa propre tâche.
drop policy if exists "employee_shifts_self_insert" on employee_shifts;
create policy "employee_shifts_self_insert" on employee_shifts for insert
  with check (
    exists (
      select 1 from employees e
      where e.id = employee_shifts.employee_id
        and e.linked_user_id = auth.uid()
    )
  );

drop policy if exists "employee_shifts_self_update" on employee_shifts;
create policy "employee_shifts_self_update" on employee_shifts for update
  using (created_by = auth.uid())
  with check (
    exists (
      select 1 from employees e
      where e.id = employee_shifts.employee_id
        and e.linked_user_id = auth.uid()
    )
  );

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0022', 'employee_clock_in') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0022_employee_clock_in.sql <<<

-- >>> MIGRATION 0023_remaining_user_fk_on_delete_set_null.sql >>>
-- 0019 fixed every `created_by` FK to auth.users that lacked an ON DELETE
-- action, but that migration was scoped to `created_by` specifically — every
-- other auth.users reference (used_by, assigned_to, author_id, reviewer_id,
-- replied_by, updated_by) was left with the same default NO ACTION/RESTRICT
-- gap. Confirmed in production via Supabase logs: "update or delete on table
-- \"users\" violates foreign key constraint \"workspace_invites_used_by_fkey\"
-- on table \"workspace_invites\"" — deleting a user who had accepted a
-- workspace invite fails outright, same root cause as 0019.
--
-- Same fix, same precedent: ON DELETE SET NULL, since these are all
-- attribution/reference columns on real business records that should survive
-- the referenced user's deletion. employee_reviews.reviewer_id was declared
-- NOT NULL, so it drops that constraint first, matching how 0019 handled
-- chat_conversations.created_by and referral_codes.created_by.

begin;

alter table alerts drop constraint if exists alerts_assigned_to_fkey;
alter table alerts add constraint alerts_assigned_to_fkey foreign key (assigned_to) references auth.users (id) on delete set null;

alter table notes drop constraint if exists notes_author_id_fkey;
alter table notes add constraint notes_author_id_fkey foreign key (author_id) references auth.users (id) on delete set null;

alter table chat_messages drop constraint if exists chat_messages_author_id_fkey;
alter table chat_messages add constraint chat_messages_author_id_fkey foreign key (author_id) references auth.users (id) on delete set null;

alter table restaurant_invites drop constraint if exists restaurant_invites_used_by_fkey;
alter table restaurant_invites add constraint restaurant_invites_used_by_fkey foreign key (used_by) references auth.users (id) on delete set null;

alter table workspace_invites drop constraint if exists workspace_invites_used_by_fkey;
alter table workspace_invites add constraint workspace_invites_used_by_fkey foreign key (used_by) references auth.users (id) on delete set null;

alter table support_requests drop constraint if exists support_requests_replied_by_fkey;
alter table support_requests add constraint support_requests_replied_by_fkey foreign key (replied_by) references auth.users (id) on delete set null;

alter table financial_transactions drop constraint if exists financial_transactions_updated_by_fkey;
alter table financial_transactions add constraint financial_transactions_updated_by_fkey foreign key (updated_by) references auth.users (id) on delete set null;

alter table employee_reviews alter column reviewer_id drop not null;
alter table employee_reviews drop constraint if exists employee_reviews_reviewer_id_fkey;
alter table employee_reviews add constraint employee_reviews_reviewer_id_fkey foreign key (reviewer_id) references auth.users (id) on delete set null;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0023', 'remaining_user_fk_on_delete_set_null') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0023_remaining_user_fk_on_delete_set_null.sql <<<

-- >>> MIGRATION 0024_customer_self_enrollment.sql >>>
-- Discovered while building loyalty-program link sharing: customers.user_id
-- (added by 0010 specifically so a customer can log into /portal via magic
-- link, RLS policy "customers_select_own" is auth.uid() = user_id) is never
-- actually set anywhere in the codebase. handle_new_user()'s is_customer
-- branch only inserts into profiles and returns — it never links the new
-- auth user back to any customers row. Concretely: a customer created by
-- staff on the Fidélisation page, or a brand-new self-enrolling customer,
-- can request a magic link and authenticate, but /portal will show zero
-- customer records forever, because user_id stays null. The whole customer
-- portal has been non-functional since it shipped.
--
-- Fix: when a new is_customer auth user is created, link every existing
-- customers row matching their email (case-insensitively) that doesn't
-- already have a user_id — covers both a pre-existing staff-created record
-- and a record pre-created by the new loyalty self-enrollment flow just
-- before the magic link is sent. A customer can legitimately be a loyalty
-- member at more than one restaurant under the same email, so this links
-- all matching rows, not just one.

begin;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
  new_workspace_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' then
    update public.customers
    set user_id = new.id
    where user_id is null
      and lower(email) = lower(new.email);
    return new;
  end if;

  if (new.raw_user_meta_data ->> 'invite_token') is not null
     or (new.raw_user_meta_data ->> 'workspace_invite_token') is not null then
    return new;
  end if;

  insert into public.workspaces (name)
  values ('Mon workspace')
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new_workspace_id, new.id, 'owner', 'active');

  insert into public.restaurants (name, workspace_id)
  values ('Mon restaurant', new_workspace_id)
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

-- Restaurant-facing loyalty share links ("Partager" on /fidelisation,
-- mirrors menu_shares/createMenuShare exactly) — a link/QR a restaurant
-- posts publicly so a stranger (not an existing customer, not referred by
-- one) can join the loyalty program on their own. Distinct from
-- customer_referral_links, which are per-customer and require an existing
-- customer to have generated them.
create table if not exists loyalty_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  token text not null unique,
  title text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_loyalty_shares_restaurant on loyalty_shares (restaurant_id);
create index if not exists idx_loyalty_shares_token on loyalty_shares (token);

alter table loyalty_shares enable row level security;

drop policy if exists "loyalty_shares_select" on loyalty_shares;
create policy "loyalty_shares_select" on loyalty_shares for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "loyalty_shares_manage" on loyalty_shares;
create policy "loyalty_shares_manage" on loyalty_shares for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0024', 'customer_self_enrollment') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0024_customer_self_enrollment.sql <<<

-- >>> MIGRATION 0025_reservation_delivery_connections.sql >>>
begin;

-- Réservations tierces (OpenTable, Resy) et livraison tierce (Uber Direct/
-- Eats) — mêmes deux catégories que le type `reservation`/`livraison` déjà
-- utilisé par la table `connections` générique, mais ces trois-là ont besoin
-- de stocker un identifiant de compte + une clé/API secret dans Vault
-- (comme pos_connections), ce que la table générique ne fait pas. Toutes
-- les trois sont des API partenaires à accès restreint (aucune n'a
-- d'inscription libre-service) : la ligne reste en statut 'attente' tant
-- qu'aucune credential n'a été saisie, ce qui n'arrivera qu'une fois le
-- partenariat d'affaires approuvé côté fournisseur.
do $$ begin
  create type reservation_delivery_category as enum ('reservation', 'livraison');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reservation_delivery_provider as enum ('opentable', 'resy', 'uber_direct');
exception when duplicate_object then null;
end $$;

create table if not exists reservation_delivery_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider reservation_delivery_provider not null,
  category reservation_delivery_category not null,
  external_account_id text,
  api_key_id uuid references vault.secrets (id) on delete set null,
  status pos_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (restaurant_id, provider)
);

create index if not exists idx_reservation_delivery_connections_restaurant
  on reservation_delivery_connections (restaurant_id);

alter table reservation_delivery_connections enable row level security;

-- Même précédent que pos_connections : lecture ouverte aux membres du
-- restaurant, toutes les écritures passent par le client service-role
-- depuis les server actions (gate requireManager), pas de policy insert/
-- update/delete ici.
drop policy if exists "reservation_delivery_connections_select" on reservation_delivery_connections;
create policy "reservation_delivery_connections_select" on reservation_delivery_connections for select
  using (is_restaurant_member(restaurant_id));

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0025', 'reservation_delivery_connections') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0025_reservation_delivery_connections.sql <<<

-- >>> MIGRATION 0026_stripe_connect_payments.sql >>>
begin;

-- Stripe Connect (paiements clients en ligne) — distinct de l'abonnement
-- Flow par Minerva (subscriptions/lib/stripe/config.ts). Un compte Express
-- par restaurant, jamais par workspace : chaque établissement a son propre
-- compte bancaire, comme tax_rate/accepts_tips.
alter table restaurants add column if not exists stripe_connect_account_id text unique;
alter table restaurants add column if not exists stripe_connect_charges_enabled boolean not null default false;
alter table restaurants add column if not exists stripe_connect_payouts_enabled boolean not null default false;
alter table restaurants add column if not exists stripe_connect_details_submitted boolean not null default false;
alter table restaurants add column if not exists stripe_connect_connected_at timestamptz;
alter table restaurants add column if not exists stripe_connect_account_api_version text not null default 'v1';
alter table restaurants add column if not exists stripe_connect_transfers_status text not null default 'unrequested';
alter table restaurants add column if not exists stripe_connect_recipient_payouts_status text not null default 'unrequested';
alter table restaurants add column if not exists stripe_connect_requirements_due_count integer not null default 0;
alter table restaurants
  drop constraint if exists restaurants_stripe_connect_account_api_version_check,
  add constraint restaurants_stripe_connect_account_api_version_check
    check (stripe_connect_account_api_version in ('v1', 'v2')),
  drop constraint if exists restaurants_stripe_connect_transfers_status_check,
  add constraint restaurants_stripe_connect_transfers_status_check
    check (stripe_connect_transfers_status in ('active', 'pending', 'restricted', 'unsupported', 'unrequested')),
  drop constraint if exists restaurants_stripe_connect_recipient_payouts_status_check,
  add constraint restaurants_stripe_connect_recipient_payouts_status_check
    check (stripe_connect_recipient_payouts_status in ('active', 'pending', 'restricted', 'unsupported', 'unrequested')),
  drop constraint if exists restaurants_stripe_connect_requirements_due_count_check,
  add constraint restaurants_stripe_connect_requirements_due_count_check
    check (stripe_connect_requirements_due_count >= 0);

do $$ begin
  create type order_payment_status as enum ('non_requis', 'en_attente', 'paye', 'echoue');
exception when duplicate_object then null;
end $$;

alter table orders add column if not exists payment_status order_payment_status not null default 'non_requis';
alter table orders add column if not exists stripe_payment_intent_id text unique;
alter table orders add column if not exists paid_at timestamptz;

create index if not exists idx_orders_stripe_payment_intent on orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0026', 'stripe_connect_payments') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0026_stripe_connect_payments.sql <<<

-- >>> MIGRATION 0027_fix_member_role_privilege_escalation.sql >>>
begin;

-- Security fix: "members_manage_update"/"members_manage_delete"/"members_manage_write"
-- only checked the ACTOR's own role via is_restaurant_member(restaurant_id, [...]),
-- never anything about the TARGET row. Since is_restaurant_member() re-queries the
-- caller's own (unchanged) membership row, any 'manager' passed every one of these
-- checks for literally any row in restaurant_members — including their own, or the
-- real owner's. Concretely, a manager could (a) UPDATE their own row to
-- role = 'owner' (self-promotion), (b) UPDATE or DELETE the actual owner's row
-- (demotion/removal), and (c) INSERT a brand-new row with role = 'owner' directly,
-- bypassing the invite-link flow entirely. All three are reachable straight from the
-- browser's own Supabase session — no server code required.
--
-- Fix: a manager may only write rows whose role is not, and will not become,
-- 'owner' — never touch (update/delete) an existing owner row, never create or
-- promote anyone to owner. Only an existing owner can do any of that.
drop policy if exists "members_manage_write" on restaurant_members;
create policy "members_manage_write" on restaurant_members for insert
  with check (
    is_restaurant_member(restaurant_id, array['owner']::member_role[])
    or (
      is_restaurant_member(restaurant_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

drop policy if exists "members_manage_update" on restaurant_members;
create policy "members_manage_update" on restaurant_members for update
  using (
    is_restaurant_member(restaurant_id, array['owner']::member_role[])
    or (
      is_restaurant_member(restaurant_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  )
  with check (
    is_restaurant_member(restaurant_id, array['owner']::member_role[])
    or (
      is_restaurant_member(restaurant_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

drop policy if exists "members_manage_delete" on restaurant_members;
create policy "members_manage_delete" on restaurant_members for delete
  using (
    is_restaurant_member(restaurant_id, array['owner']::member_role[])
    or (
      is_restaurant_member(restaurant_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

-- Same root cause, same fix, on workspace_members — this one gates subscription
-- billing (requireWorkspaceOwner()), so it's at least as sensitive. The insert
-- policy already had a bootstrap guard against a stranger self-appointing as
-- owner of an existing workspace, but its owner/manager branch still let a
-- manager insert a brand-new row with role = 'owner' for themselves or an
-- accomplice; update/delete had no target-row check at all, same as above.
drop policy if exists "workspace_members_insert" on workspace_members;
create policy "workspace_members_insert" on workspace_members for insert
  with check (
    is_workspace_member(workspace_id, array['owner']::member_role[])
    or (
      is_workspace_member(workspace_id, array['manager']::member_role[])
      and role <> 'owner'
    )
    or (
      -- Bootstrap-only: the creating user may insert their own first
      -- membership row for a workspace, but ONLY while it has zero members.
      user_id = auth.uid()
      and not exists (select 1 from workspace_members wm where wm.workspace_id = workspace_id)
    )
  );

drop policy if exists "workspace_members_update" on workspace_members;
create policy "workspace_members_update" on workspace_members for update
  using (
    is_workspace_member(workspace_id, array['owner']::member_role[])
    or (
      is_workspace_member(workspace_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  )
  with check (
    is_workspace_member(workspace_id, array['owner']::member_role[])
    or (
      is_workspace_member(workspace_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

drop policy if exists "workspace_members_delete" on workspace_members;
create policy "workspace_members_delete" on workspace_members for delete
  using (
    is_workspace_member(workspace_id, array['owner']::member_role[])
    or (
      is_workspace_member(workspace_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0027', 'fix_member_role_privilege_escalation') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0027_fix_member_role_privilege_escalation.sql <<<

-- >>> MIGRATION 0028_team_chat_channels_privacy_and_groups.sql >>>
begin;

-- ═══════════════════════════════════════════════════════════════════════
-- SECURITY FIX (pre-existing, found during this audit): team_chat_messages
-- has no migration file in this repo — its RLS policies were created
-- directly in the dashboard at some point and only ever checked
-- is_restaurant_member(restaurant_id), never actual channel membership.
-- team_channel_members / "Gérer les accès au canal" (ChannelAccessDrawer)
-- therefore did nothing at the database level: any restaurant member could
-- read or write ANY channel's messages via a direct API call regardless of
-- being excluded from team_channel_members for that channel. Confirmed live:
-- restricting #urgences to a different member id did not stop a non-member
-- from reading a probe message posted there.
--
-- This matters now more than ever: DMs are modeled below as a
-- team_channel_members-restricted 2-person channel, so this fix is a
-- prerequisite for DM privacy actually being real and not just a UI illusion.
-- ═══════════════════════════════════════════════════════════════════════

-- team_chat_messages AND team_channel_members both predate any migration in
-- this repo (created by hand in the Supabase dashboard — see comment above),
-- and neither's restaurant_id column turned out to be uuid like every other
-- table in this schema (confirmed live: the uuid-typed version of this
-- function failed first on team_channel_members, then again on
-- team_chat_messages once that was fixed). p_restaurant_id is plain text so
-- callers can pass either table's column as-is; it's cast to uuid only where
-- is_restaurant_member() strictly requires it.
create or replace function can_access_team_channel(p_restaurant_id text, p_channel text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    is_restaurant_member(p_restaurant_id::uuid) and (
      not exists (
        select 1 from team_channel_members tcm
        where tcm.restaurant_id::text = p_restaurant_id and tcm.channel = p_channel
      )
      or exists (
        select 1 from team_channel_members tcm
        where tcm.restaurant_id::text = p_restaurant_id
          and tcm.channel = p_channel
          and tcm.member_id::text = auth.uid()::text
      )
    );
$$;

-- Drop every existing policy on both tables (names unknown — never migrated
-- here) and replace with versions that call can_access_team_channel().
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename in ('team_chat_messages', 'team_channel_members')
  loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

alter table team_chat_messages enable row level security;

create policy "team_chat_messages_select" on team_chat_messages for select
  using (can_access_team_channel(restaurant_id::text, channel));
create policy "team_chat_messages_insert" on team_chat_messages for insert
  with check (can_access_team_channel(restaurant_id::text, channel));
create policy "team_chat_messages_update" on team_chat_messages for update
  using (can_access_team_channel(restaurant_id::text, channel));
create policy "team_chat_messages_delete" on team_chat_messages for delete
  using (can_access_team_channel(restaurant_id::text, channel));

alter table team_channel_members enable row level security;

-- Membership rows themselves: any restaurant member may read them (needed to
-- render the members list / gate the UI), but only owner/manager may write —
-- matches the existing ChannelAccessDrawer permission (canManageChannels).
-- is_restaurant_member() requires uuid; team_channel_members.restaurant_id
-- is cast explicitly since its live column type doesn't match uuid (see
-- can_access_team_channel comment above).
create policy "team_channel_members_select" on team_channel_members for select
  using (is_restaurant_member(restaurant_id::uuid));
create policy "team_channel_members_write" on team_channel_members for all
  using (is_restaurant_member(restaurant_id::uuid, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id::uuid, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Dynamic channels: custom groups and 1-to-1 DMs. The 4 legacy channels
-- (general/cuisine/service/urgences) keep working unchanged as bare string
-- values in team_chat_messages.channel — this table only registers NEW
-- dynamic ones so the UI can list/name them. A DM is just a channel with
-- type='dm' and exactly 2 rows in team_channel_members restricting it.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists team_channels (
  id text primary key,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  type text not null check (type in ('group', 'dm')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_channels_restaurant on team_channels (restaurant_id);

alter table team_channels enable row level security;

drop policy if exists "team_channels_select" on team_channels;
create policy "team_channels_select" on team_channels for select
  using (can_access_team_channel(restaurant_id::text, id));
drop policy if exists "team_channels_insert" on team_channels;
create policy "team_channels_insert" on team_channels for insert
  with check (is_restaurant_member(restaurant_id::uuid));

-- The old channel check constraints hard-coded the 4 legacy values on BOTH
-- tables — drop both so channel/team_channel_members.channel can also hold
-- a team_channels.id (validity enforced at the application layer instead,
-- same as before this migration for the legacy channels). Confirmed live:
-- leaving team_channel_members_channel_check in place silently blocked every
-- insert into team_channel_members for a dynamic group/DM id, which meant
-- can_access_team_channel()'s "no restriction rows exist for this channel"
-- branch always won — every new group/DM was actually open to the whole
-- restaurant despite the UI treating it as private.
alter table team_chat_messages drop constraint if exists team_chat_messages_channel_check;
alter table team_channel_members drop constraint if exists team_channel_members_channel_check;

-- Voice notes: nullable, purely additive — every existing row is unaffected.
alter table team_chat_messages add column if not exists audio_url text;

-- Storage: voice notes, private bucket — path convention
-- "<restaurant_id>/<channel>/<file>.webm" so the same channel-privacy check
-- (not just restaurant membership) gates playback of a DM's audio note.
insert into storage.buckets (id, name, public)
values ('team-voice-notes', 'team-voice-notes', false)
on conflict (id) do nothing;

drop policy if exists "team_voice_notes_read" on storage.objects;
create policy "team_voice_notes_read" on storage.objects for select
  using (
    bucket_id = 'team-voice-notes'
    and can_access_team_channel((storage.foldername(name))[1], (storage.foldername(name))[2])
  );
drop policy if exists "team_voice_notes_write" on storage.objects;
create policy "team_voice_notes_write" on storage.objects for insert
  with check (
    bucket_id = 'team-voice-notes'
    and can_access_team_channel((storage.foldername(name))[1], (storage.foldername(name))[2])
  );

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0028', 'team_chat_channels_privacy_and_groups') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0028_team_chat_channels_privacy_and_groups.sql <<<

-- >>> MIGRATION 0029_reservation_race_and_channel_atomicity.sql >>>
begin;

-- ═══════════════════════════════════════════════════════════════════════
-- CodeRabbit review on #32 flagged two real gaps in the previous migration
-- and this session's reservation fix. Both addressed here.
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Reservations: the JS-level pre-check (hasTableConflict) is good for UX
-- (immediate, friendly error) but has a TOCTOU race — two truly concurrent
-- requests can both pass the check before either inserts. A partial unique
-- index closes this at the database level; the application maps the
-- resulting 23505 violation back to the same RESERVATION_CONFLICT result the
-- pre-check already produces, so the UI doesn't need to distinguish them.
-- This app had no conflict prevention before this session's fix, so a
-- restaurant used for live/demo testing may already have real double-bookings
-- that would make the unique index below fail to build. Resolve them first by
-- clearing the table assignment on every row but the earliest in each
-- conflicting group — no reservation is deleted, only its table unassigned,
-- same as the "no table yet" state the UI already supports.
with ranked as (
  select id, row_number() over (
    partition by restaurant_id, table_id, reservation_time
    order by created_at
  ) as rn
  from reservations
  where table_id is not null and status <> 'annulee'
)
update reservations
set table_id = null
where id in (select id from ranked where rn > 1);

create unique index if not exists idx_reservations_no_double_booking
  on reservations (restaurant_id, table_id, reservation_time)
  where table_id is not null and status <> 'annulee';

-- 2) Chat channels: createGroupChannel/getOrCreateDmChannel previously did
-- two separate inserts (team_channels, then team_channel_members). If the
-- second insert failed partway (network blip, one bad member id), the
-- channel would exist with zero membership rows — and the previous version
-- of can_access_team_channel treated "zero membership rows" as "unrestricted",
-- which is exactly the failure mode the last migration fixed, just reachable
-- a different way. Two changes close this:
--   a) One atomic RPC creates the channel and all membership rows in a
--      single function call, so a failure rolls back both instead of leaving
--      a channel row with no membership rows.
--   b) can_access_team_channel now only treats a channel as unrestricted when
--      it is exactly one of the 4 fixed legacy names. Anything else —
--      including a dynamic channel id that failed to fully create, or was
--      never registered at all — now requires an explicit membership row to
--      be readable by anyone. An earlier version of this function instead
--      checked "not registered in team_channels", which left the exact same
--      fail-open gap for any channel id that was never created in the first
--      place (confirmed live during verification: a client-generated id for
--      a group whose creation failed was still fully readable/writable by
--      every restaurant member, since nothing distinguished it from a
--      legitimate legacy channel).
create or replace function can_access_team_channel(p_restaurant_id text, p_channel text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    is_restaurant_member(p_restaurant_id::uuid) and (
      p_channel in ('general', 'cuisine', 'service', 'urgences')
      or exists (
        select 1 from team_channel_members tcm
        where tcm.restaurant_id::text = p_restaurant_id
          and tcm.channel = p_channel
          and tcm.member_id::text = auth.uid()::text
      )
    );
$$;

-- security definer so the call works the same way every other function in
-- lib/data/team-chat.ts already does — through createAdminClient() (the
-- service-role key), same as the two-insert version this replaces. That
-- means there is no auth.uid() to check here: the service role has no user
-- session, so an is_restaurant_member() gate would always fail and silently
-- break creation for every caller (confirmed live — this was caught during
-- verification). Authorization for who may create a group/DM stays exactly
-- where it already lived: the "use server" action layer trusting its
-- session-derived restaurantId/createdBy params, matching every other
-- action in this table (e.g. createReservationAction).
create or replace function create_team_channel_atomic(
  p_restaurant_id uuid,
  p_id text,
  p_name text,
  p_type text,
  p_member_ids uuid[],
  p_created_by uuid
)
returns table (id text, name text, type text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_type not in ('group', 'dm') then
    raise exception 'invalid channel type: %', p_type;
  end if;
  if array_length(p_member_ids, 1) is null then
    raise exception 'a channel needs at least one member';
  end if;

  insert into team_channels (id, restaurant_id, name, type, created_by)
  values (p_id, p_restaurant_id, p_name, p_type, p_created_by);

  insert into team_channel_members (restaurant_id, channel, member_id, added_by)
  select p_restaurant_id, p_id, m, p_created_by
  from unnest(p_member_ids) as m;

  return query select p_id, p_name, p_type;
end;
$$;

-- Performance: can_access_team_channel runs its two exists-subqueries on
-- every message select/insert, every team_channels row, and every storage
-- object under RLS. team_channel_members predates this repo's migrations so
-- no index on it is guaranteed to exist.
create index if not exists idx_team_channel_members_lookup
  on team_channel_members (restaurant_id, channel, member_id);

-- Voice notes: restrict the private bucket to actual audio, reasonably sized.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-voice-notes', 'team-voice-notes', false, 10485760, array['audio/webm', 'audio/ogg', 'audio/mpeg'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Voice note storage policies: require exactly the "<restaurant_id>/<channel>/<file>"
-- shape before evaluating can_access_team_channel, rejecting any key that
-- doesn't have exactly two folder segments (e.g. a crafted top-level path).
drop policy if exists "team_voice_notes_read" on storage.objects;
create policy "team_voice_notes_read" on storage.objects for select
  using (
    bucket_id = 'team-voice-notes'
    and array_length(storage.foldername(name), 1) = 2
    and can_access_team_channel((storage.foldername(name))[1], (storage.foldername(name))[2])
  );
drop policy if exists "team_voice_notes_write" on storage.objects;
create policy "team_voice_notes_write" on storage.objects for insert
  with check (
    bucket_id = 'team-voice-notes'
    and array_length(storage.foldername(name), 1) = 2
    and can_access_team_channel((storage.foldername(name))[1], (storage.foldername(name))[2])
  );

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0029', 'reservation_race_and_channel_atomicity') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0029_reservation_race_and_channel_atomicity.sql <<<

-- >>> MIGRATION 0030_break_even_settings.sql >>>
-- Persists the Finance "Simulateur de Seuil de Rentabilité" assumptions
-- (fixed costs, gross margin %, average basket) per restaurant so the
-- simulator survives a reload and — per the product spec — the daily
-- client target it computes can be reflected back on Overview. Previously
-- this simulator was pure client-side useState with hardcoded defaults,
-- so adjusting it on /finance had no effect anywhere else in the app.
-- Nullable: a restaurant that hasn't touched the simulator yet falls back
-- to the same sensible defaults the component always used.
alter table restaurants add column if not exists break_even_fixed_costs numeric;
alter table restaurants add column if not exists break_even_gross_margin_pct numeric;
alter table restaurants add column if not exists break_even_avg_basket numeric;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0030', 'break_even_settings') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0030_break_even_settings.sql <<<

-- >>> MIGRATION 0031_recipe_items.sql >>>
-- Links a menu item to the inventory items it consumes per unit sold — the
-- missing piece of the product spec's "an order = inventory -1, revenue +X,
-- automatically" promise. Previously serving an order only bumped revenue
-- and menu-item popularity (see applyServedOrderEffects in lib/data/orders.ts);
-- there was no data model anywhere connecting a dish to the ingredients it
-- draws down, so inventory never moved as a side effect of a sale. This
-- table is optional per menu item (a dish with no recipe_items rows simply
-- doesn't affect inventory, same as today) so it can be adopted incrementally.
create table if not exists recipe_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  inventory_item_id uuid not null references inventory_items (id) on delete cascade,
  quantity_per_unit numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (menu_item_id, inventory_item_id)
);

create index if not exists idx_recipe_items_menu_item on recipe_items (menu_item_id);
create index if not exists idx_recipe_items_restaurant on recipe_items (restaurant_id);

alter table recipe_items enable row level security;

drop policy if exists "recipe_items_select" on recipe_items;
create policy "recipe_items_select" on recipe_items for select
  using (is_restaurant_member(restaurant_id));

drop policy if exists "recipe_items_write" on recipe_items;
create policy "recipe_items_write" on recipe_items for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

drop policy if exists "recipe_items_update" on recipe_items;
create policy "recipe_items_update" on recipe_items for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

drop policy if exists "recipe_items_delete" on recipe_items;
create policy "recipe_items_delete" on recipe_items for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0031', 'recipe_items') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0031_recipe_items.sql <<<

-- >>> MIGRATION 0032_atomic_service_day_revenue.sql >>>
-- Atomic increment for service_days.revenue, mirroring increment_inventory_quantity
-- (0010) and increment_menu_item_sales: two orders served concurrently on the
-- same day must not lose one write to a read-then-write race.
create or replace function increment_service_day_revenue(p_restaurant_id uuid, p_date date, p_amount numeric)
returns setof service_days
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_restaurant_member(p_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  return query
    insert into service_days (restaurant_id, date, revenue, main_source, rush_level)
    values (p_restaurant_id, p_date, p_amount, 'salle', 'normal')
    on conflict (restaurant_id, date)
    do update set revenue = service_days.revenue + excluded.revenue
    returning *;
end;
$$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0032', 'atomic_service_day_revenue') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0032_atomic_service_day_revenue.sql <<<

-- >>> MIGRATION 0033_prospects.sql >>>
-- ═══════════════════════════════════════════════════════════════════════
-- Prospects — "1-Click Ingestor" (panneau opérateur)
--
-- Un prospect est une démo autonome générée par un admin Minerva à partir
-- du menu d'un restaurant (collé manuellement, pas de scraping live ni de
-- LLM dans cette version). Volontairement séparée de `restaurants` : tant
-- qu'un prospect n'est pas converti en client, aucune donnée de démo ne
-- touche les tables de production (menus, membres, etc.).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,

  source_url text not null,
  source_platform text not null default 'other'
    check (source_platform in ('uber_eats', 'doordash', 'skipthedishes', 'direct_website', 'raw_text', 'other')),

  restaurant_name text not null default '',
  currency text not null default 'CAD',
  detected_address text,

  commission_rate_pct numeric(5, 2) not null default 28,
  assumed_monthly_orders integer not null default 300,

  status text not null default 'draft'
    check (status in ('draft', 'ready', 'contacte', 'converti', 'decline')),

  demo_slug text unique,
  menu_json jsonb not null default '{"categories": []}'::jsonb,
  notes text,

  demo_view_count integer not null default 0,
  last_viewed_at timestamptz,
  contacted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prospects_status on prospects (status);
create index if not exists idx_prospects_created_at on prospects (created_at desc);

alter table prospects enable row level security;

-- Panneau opérateur : accès complet aux admins Minerva.
drop policy if exists "prospects_admin_all" on prospects;
create policy "prospects_admin_all" on prospects for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- Page de démo publique (/demo/[slug]) : lisible par quiconque connaît le
-- slug généré, comme les autres pages à jeton public (/m/[token], /p/[code]).
-- Un prospect sans slug (brouillon jamais généré) reste invisible.
drop policy if exists "prospects_public_select" on prospects;
create policy "prospects_public_select" on prospects for select
  using (demo_slug is not null);

-- Incrémente le compteur de vues de démo sans exposer d'accès en écriture
-- direct à la table depuis le client public.
create or replace function increment_prospect_demo_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update prospects
  set demo_view_count = demo_view_count + 1,
      last_viewed_at = now()
  where demo_slug = p_slug;
$$;

grant execute on function increment_prospect_demo_view(text) to anon, authenticated;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0033', 'prospects') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0033_prospects.sql <<<

-- >>> MIGRATION 0034_prospect_website_audit.sql >>>
-- ═══════════════════════════════════════════════════════════════════════
-- Prospects — audit du site web du prospect
--
-- Rapport best-effort (vitesse, mobile, menu en ligne, réservation en
-- ligne, etc.) généré à la demande par un admin depuis la fiche prospect,
-- pour servir d'argument de vente. Stocké tel quel (jsonb) plutôt que
-- normalisé — c'est un instantané jetable, pas une donnée interrogée.
-- ═══════════════════════════════════════════════════════════════════════

alter table prospects
  add column if not exists audit_report jsonb,
  add column if not exists audit_generated_at timestamptz;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0034', 'prospect_website_audit') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0034_prospect_website_audit.sql <<<

-- >>> MIGRATION 0035_customer_consent_and_birthday.sql >>>
-- Adds marketing consent + birthday to customers, the legal and data
-- foundation for the automated retention engine (win-back / birthday
-- campaigns). Without a documented opt-in, automated SMS/email to
-- customers would be non-compliant with Canada's anti-spam law (CASL) —
-- so the retention engine (added in a later migration) will only ever
-- target customers with marketing_consent = true. consent_source/consent_at
-- exist purely as an audit trail (where/when consent was captured), not
-- used for any logic today.
alter table customers add column if not exists marketing_consent boolean not null default false;
alter table customers add column if not exists consent_source text;
alter table customers add column if not exists consent_at timestamptz;
alter table customers add column if not exists birthday date;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0035', 'customer_consent_and_birthday') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0035_customer_consent_and_birthday.sql <<<

-- >>> MIGRATION 0036_retention_engine.sql >>>
-- Automated customer-retention engine: settings per restaurant + a log
-- table used both as an audit trail and as the anti-spam frequency guard
-- (a customer already contacted within the cap window is skipped).
-- 21 days is the default inactivity threshold (matches the win-back example
-- used in the product positioning: "au bout de 21 jours d'inactivité").
alter table restaurants add column if not exists retention_engine_enabled boolean not null default false;
alter table restaurants add column if not exists retention_inactivity_days integer not null default 21;
alter table restaurants add column if not exists retention_frequency_cap_days integer not null default 30;
alter table restaurants add column if not exists retention_birthday_lead_days integer not null default 3;

do $$ begin
  create type retention_trigger_type as enum ('inactivity', 'birthday', 'value_drift');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type retention_channel as enum ('email', 'push', 'sms');
exception when duplicate_object then null;
end $$;

create table if not exists customer_retention_sends (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  trigger_type retention_trigger_type not null,
  channel retention_channel not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_retention_sends_customer on customer_retention_sends (customer_id, sent_at desc);
create index if not exists idx_retention_sends_restaurant on customer_retention_sends (restaurant_id, sent_at desc);

alter table customer_retention_sends enable row level security;

drop policy if exists "retention_sends_select" on customer_retention_sends;
create policy "retention_sends_select" on customer_retention_sends for select
  using (is_restaurant_member(restaurant_id));
-- No insert/update/delete policy for regular members — only the cron (service
-- role, which bypasses RLS) writes here, matching e.g. financial_transactions.
;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0036', 'retention_engine') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0036_retention_engine.sql <<<

-- >>> MIGRATION 0037_loyalty_tiers.sql >>>
-- Cumulative-spend thresholds for the premium loyalty tier system
-- (Habitué / Privilégié / Ambassadeur — see lib/loyalty-tiers.ts). Neutral
-- column names (tier_2/tier_3, not the tier labels themselves) so renaming
-- the tiers later never needs a migration.
alter table restaurants add column if not exists loyalty_tier_2_threshold numeric not null default 150;
alter table restaurants add column if not exists loyalty_tier_3_threshold numeric not null default 400;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0037', 'loyalty_tiers') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0037_loyalty_tiers.sql <<<

-- >>> MIGRATION 0038_referral_double_sided_reward.sql >>>
-- Double-sided referral reward: an immediate points bonus for BOTH the
-- referrer and the newly referred customer right at conversion (reservation
-- confirmed / order served), on top of the existing goal-based reward
-- (customer_referral_links.reward_claimed_at, still a flag the staff hands
-- out manually — unchanged). Previously NEITHER side got anything
-- automatic; converted_count was tracked but never translated into points.
alter table referral_programs add column if not exists new_customer_bonus_points integer not null default 0;
alter table referral_programs add column if not exists referrer_bonus_points integer not null default 0;

create or replace function credit_referral_conversion(p_reservation_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_referral_link_id uuid;
  v_new_customer_id uuid;
  v_new_count int;
  v_goal_count int;
  v_reward_claimed timestamptz;
  v_referrer_customer_id uuid;
  v_referral_program_id uuid;
  v_referrer_bonus int;
  v_new_customer_bonus int;
begin
  select restaurant_id, referral_link_id, customer_id
    into v_restaurant_id, v_referral_link_id, v_new_customer_id
  from reservations where id = p_reservation_id;

  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id) then
    raise exception 'Non autorisé';
  end if;

  if v_referral_link_id is null then
    return;
  end if;

  update customer_referral_conversions
  set credited_at = now()
  where reservation_id = p_reservation_id and credited_at is null;

  if not found then
    return;
  end if;

  update customer_referral_links
  set converted_count = converted_count + 1
  where id = v_referral_link_id
  returning converted_count, reward_claimed_at, customer_id, referral_program_id
    into v_new_count, v_reward_claimed, v_referrer_customer_id, v_referral_program_id;

  select goal_count, referrer_bonus_points, new_customer_bonus_points
    into v_goal_count, v_referrer_bonus, v_new_customer_bonus
  from referral_programs where id = v_referral_program_id;

  if v_new_count >= v_goal_count and v_reward_claimed is null then
    update customer_referral_links
    set reward_claimed_at = now()
    where id = v_referral_link_id;
  end if;

  if v_referrer_bonus > 0 and v_referrer_customer_id is not null then
    insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note)
    values (v_restaurant_id, v_referrer_customer_id, 'ajustement', v_referrer_bonus, 'Bonus de parrainage');
    update customers set loyalty_points = loyalty_points + v_referrer_bonus where id = v_referrer_customer_id;
  end if;

  if v_new_customer_bonus > 0 and v_new_customer_id is not null then
    insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note)
    values (v_restaurant_id, v_new_customer_id, 'ajustement', v_new_customer_bonus, 'Bonus de bienvenue — parrainage');
    update customers set loyalty_points = loyalty_points + v_new_customer_bonus where id = v_new_customer_id;
  end if;
end;
$$;

create or replace function credit_referral_conversion_for_order(p_order_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_referral_link_id uuid;
  v_new_customer_id uuid;
  v_new_count int;
  v_goal_count int;
  v_reward_claimed timestamptz;
  v_referrer_customer_id uuid;
  v_referral_program_id uuid;
  v_referrer_bonus int;
  v_new_customer_bonus int;
begin
  select restaurant_id, referral_link_id, customer_id
    into v_restaurant_id, v_referral_link_id, v_new_customer_id
  from orders where id = p_order_id;

  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id) then
    raise exception 'Non autorisé';
  end if;

  if v_referral_link_id is null then
    return;
  end if;

  update customer_referral_conversions
  set credited_at = now()
  where order_id = p_order_id and credited_at is null;

  if not found then
    return;
  end if;

  update customer_referral_links
  set converted_count = converted_count + 1
  where id = v_referral_link_id
  returning converted_count, reward_claimed_at, customer_id, referral_program_id
    into v_new_count, v_reward_claimed, v_referrer_customer_id, v_referral_program_id;

  select goal_count, referrer_bonus_points, new_customer_bonus_points
    into v_goal_count, v_referrer_bonus, v_new_customer_bonus
  from referral_programs where id = v_referral_program_id;

  if v_new_count >= v_goal_count and v_reward_claimed is null then
    update customer_referral_links
    set reward_claimed_at = now()
    where id = v_referral_link_id;
  end if;

  if v_referrer_bonus > 0 and v_referrer_customer_id is not null then
    insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note)
    values (v_restaurant_id, v_referrer_customer_id, 'ajustement', v_referrer_bonus, 'Bonus de parrainage');
    update customers set loyalty_points = loyalty_points + v_referrer_bonus where id = v_referrer_customer_id;
  end if;

  if v_new_customer_bonus > 0 and v_new_customer_id is not null then
    insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note)
    values (v_restaurant_id, v_new_customer_id, 'ajustement', v_new_customer_bonus, 'Bonus de bienvenue — parrainage');
    update customers set loyalty_points = loyalty_points + v_new_customer_bonus where id = v_new_customer_id;
  end if;
end;
$$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0038', 'referral_double_sided_reward') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0038_referral_double_sided_reward.sql <<<

-- >>> MIGRATION 0039_session_management.sql >>>
-- Self-serve "connected devices" visibility + revoke. auth.sessions isn't
-- exposed via PostgREST, so these SECURITY DEFINER functions read/write it
-- on the caller's behalf, always scoped to auth.uid() — never a
-- caller-supplied user id, so a user can only ever see or revoke their own
-- sessions. Deleting a session row invalidates its refresh token; the
-- device's current access token (short-lived) keeps working until it
-- naturally expires and tries to refresh — there's no live-socket "kill
-- this tab now" mechanism in Supabase Auth, so we don't claim one in the UI.

create or replace function public.list_my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  not_after timestamptz,
  user_agent text,
  ip text,
  is_current boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select
    s.id,
    s.created_at,
    s.updated_at,
    s.not_after,
    s.user_agent,
    s.ip::text,
    s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid as is_current
  from auth.sessions s
  where s.user_id = auth.uid()
  order by coalesce(s.updated_at, s.created_at) desc;
$$;

grant execute on function public.list_my_sessions() to authenticated;

create or replace function public.revoke_my_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_deleted int;
begin
  if p_session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid then
    raise exception 'Impossible de révoquer la session active depuis cet appareil — déconnectez-vous normalement.';
  end if;

  delete from auth.sessions
  where id = p_session_id and user_id = auth.uid();

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

grant execute on function public.revoke_my_session(uuid) to authenticated;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0039', 'session_management') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0039_session_management.sql <<<

-- >>> MIGRATION 0040_reward_redemptions.sql >>>
-- Reward catalog gets an optional description for richer portal cards.
alter table loyalty_rewards add column if not exists description text;

-- Redemption tracking: client redeems in the portal (self-serve) → gets a
-- short code → shows it to staff in person → staff validates it. Points are
-- deducted at request time (same guard as the existing staff-initiated
-- redeem_customer_reward), not at claim time, to avoid a double-spend
-- window across multiple pending requests.
create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  reward_id uuid not null references loyalty_rewards (id) on delete cascade,
  reward_name text not null,
  points_spent int not null,
  code text not null,
  status text not null default 'pending' check (status in ('pending', 'claimed')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid references auth.users (id)
);

create unique index if not exists idx_reward_redemptions_code on reward_redemptions (restaurant_id, code);
create index if not exists idx_reward_redemptions_customer on reward_redemptions (customer_id);

alter table reward_redemptions enable row level security;

drop policy if exists "reward_redemptions_select" on reward_redemptions;
create policy "reward_redemptions_select" on reward_redemptions for select
  using (
    is_restaurant_member(restaurant_id)
    or exists (select 1 from customers c where c.id = reward_redemptions.customer_id and c.user_id = auth.uid())
  );

-- Self-serve redemption: the customer spends their own points for a
-- reward, generating a code to show staff in person. Mirrors
-- redeem_customer_reward's balance guard exactly, just callable by the
-- customer themselves (resolved via their own customers row) instead of
-- staff acting on their behalf.
create or replace function self_redeem_reward(p_reward_id uuid)
returns reward_redemptions
language plpgsql
security definer set search_path = public
as $$
declare
  v_customer_id uuid;
  v_restaurant_id uuid;
  v_points_cost int;
  v_reward_name text;
  v_code text;
  v_row reward_redemptions%rowtype;
begin
  select c.id, c.restaurant_id into v_customer_id, v_restaurant_id
  from customers c
  where c.user_id = auth.uid()
    and c.restaurant_id = (select lr.restaurant_id from loyalty_rewards lr where lr.id = p_reward_id);

  if v_customer_id is null then
    raise exception 'Non autorisé';
  end if;

  select points_cost, name into v_points_cost, v_reward_name
  from loyalty_rewards where id = p_reward_id and restaurant_id = v_restaurant_id and active = true;

  if v_points_cost is null then
    raise exception 'Récompense introuvable';
  end if;

  update customers
  set loyalty_points = loyalty_points - v_points_cost
  where id = v_customer_id and loyalty_points >= v_points_cost;

  if not found then
    raise exception 'Solde de points insuffisant';
  end if;

  insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note, created_by)
  values (v_restaurant_id, v_customer_id, 'echange', -v_points_cost, 'Échange : ' || v_reward_name, auth.uid());

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into reward_redemptions (restaurant_id, customer_id, reward_id, reward_name, points_spent, code, status)
  values (v_restaurant_id, v_customer_id, p_reward_id, v_reward_name, v_points_cost, v_code, 'pending')
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function self_redeem_reward(uuid) to authenticated;

-- Staff validates a code the client is showing in person, marking the
-- redemption as claimed. Fails (raises) if the code doesn't exist for this
-- restaurant or was already claimed — idempotent-safe against a double-tap.
create or replace function staff_claim_reward_redemption(p_restaurant_id uuid, p_code text)
returns table (
  id uuid,
  reward_name text,
  points_spent int,
  customer_name text,
  claimed_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not is_restaurant_member(p_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  update reward_redemptions rr
  set status = 'claimed', claimed_at = now(), claimed_by = auth.uid()
  where rr.restaurant_id = p_restaurant_id and upper(rr.code) = upper(p_code) and rr.status = 'pending'
  returning rr.id into v_id;

  if v_id is null then
    raise exception 'Code introuvable ou déjà utilisé';
  end if;

  return query
    select rr.id, rr.reward_name, rr.points_spent, c.name, rr.claimed_at
    from reward_redemptions rr
    join customers c on c.id = rr.customer_id
    where rr.id = v_id;
end;
$$;

grant execute on function staff_claim_reward_redemption(uuid, text) to authenticated;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0040', 'reward_redemptions') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0040_reward_redemptions.sql <<<

-- >>> MIGRATION 0041_changelog_images.sql >>>
-- Changelog entries get an optional screenshot — a picture of the actual
-- feature reads faster than another bullet point, especially for owners
-- who don't want to read a wall of release notes.
alter table changelog_entries add column if not exists image_url text;

-- ── storage: changelog screenshots (bucket public, patron "menu-item-images") ──
insert into storage.buckets (id, name, public)
values ('changelog-images', 'changelog-images', true)
on conflict (id) do nothing;

drop policy if exists "changelog_images_public_read" on storage.objects;
create policy "changelog_images_public_read" on storage.objects for select
  using (bucket_id = 'changelog-images');
drop policy if exists "changelog_images_write" on storage.objects;
create policy "changelog_images_write" on storage.objects for insert
  with check (bucket_id = 'changelog-images' and is_platform_admin());
drop policy if exists "changelog_images_delete" on storage.objects;
create policy "changelog_images_delete" on storage.objects for delete
  using (bucket_id = 'changelog-images' and is_platform_admin());
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0041', 'changelog_images') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0041_changelog_images.sql <<<

-- >>> MIGRATION 0042_reward_reminder_trigger.sql >>>
-- A fourth retention-engine trigger: a customer already has enough points
-- to redeem a reward but hasn't — this reminds them, same anti-spam
-- frequency cap and channel fallback as inactivity/birthday/value_drift,
-- just a different reason to reach out.
alter type retention_trigger_type add value if not exists 'reward_available';
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0042', 'reward_reminder_trigger') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0042_reward_reminder_trigger.sql <<<

-- >>> MIGRATION 0043_feature_feedback.sql >>>
-- Lightweight feature poll + free-text suggestion box on /support. Kept
-- separate from support_requests (bug/question/amelioration tickets, which
-- an admin resolves one at a time) — this is a fire-and-forget signal that
-- gets emailed out, not something anyone replies to in-app.
create table if not exists feature_feedback (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  poll_option text,
  suggestion text,
  created_at timestamptz not null default now(),
  constraint feature_feedback_has_content check (poll_option is not null or suggestion is not null)
);

create index if not exists idx_feature_feedback_user on feature_feedback (user_id, created_at desc);

alter table feature_feedback enable row level security;

drop policy if exists "feature_feedback_insert_own" on feature_feedback;
create policy "feature_feedback_insert_own" on feature_feedback for insert
  with check (user_id = auth.uid());
drop policy if exists "feature_feedback_select_own" on feature_feedback;
create policy "feature_feedback_select_own" on feature_feedback for select
  using (user_id = auth.uid());
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0043', 'feature_feedback') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0043_feature_feedback.sql <<<

-- >>> MIGRATION 0044_customer_city.sql >>>
-- Lets a loyalty customer record their city from the portal (name only,
-- no street address — kept minimal on purpose) so restaurants can see
-- where their repeat customers come from geographically. Nullable: every
-- existing customer row simply has no city until they (or staff) fill it in.
alter table customers add column if not exists city text;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0044', 'customer_city') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0044_customer_city.sql <<<

-- >>> MIGRATION 0045_api_keys.sql >>>
-- Migration 0045: API Keys for MCP & Developers
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] DEFAULT ARRAY['all:minerva-flow']::text[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_used_at timestamptz,
  revoked boolean DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS api_keys_restaurant_id_idx ON public.api_keys(restaurant_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their restaurant api keys"
  ON public.api_keys
  FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Managers and owners can insert api keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (is_restaurant_member(restaurant_id, ARRAY['owner'::member_role, 'manager'::member_role]));

CREATE POLICY "Managers and owners can update api keys"
  ON public.api_keys
  FOR UPDATE
  USING (is_restaurant_member(restaurant_id, ARRAY['owner'::member_role, 'manager'::member_role]));

CREATE POLICY "Managers and owners can delete api keys"
  ON public.api_keys
  FOR DELETE
  USING (is_restaurant_member(restaurant_id, ARRAY['owner'::member_role, 'manager'::member_role]));
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0045', 'api_keys') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0045_api_keys.sql <<<

-- >>> MIGRATION 0046_prospects_status_pipeline.sql >>>
-- Migration 0046: widen prospects.status to the real Reach pipeline states.
--
-- The application (lib/prospects/types.ts ProspectStatus, the admin prospects
-- actions, both MCP tool implementations, and the relance cron) has always
-- written/read nouveau, audit_envoye, relance_1, relance_2 and rdv_fixe, but
-- the original check constraint only allowed draft/ready/contacte/converti/
-- decline — every one of those writes has been silently rejected at the DB
-- layer since the table was created, so the automated relance pipeline could
-- never actually progress a prospect past "contacte".
alter table public.prospects drop constraint if exists prospects_status_check;

alter table public.prospects add constraint prospects_status_check
  check (status in (
    'draft',
    'nouveau',
    'ready',
    'contacte',
    'audit_envoye',
    'relance_1',
    'relance_2',
    'rdv_fixe',
    'converti',
    'decline'
  ));
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0046', 'prospects_status_pipeline') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0046_prospects_status_pipeline.sql <<<

-- >>> MIGRATION 0047_prospect_contact_name.sql >>>
-- Migration 0047: real contact_name column on prospects.
--
-- lib/prospects/types.ts's Prospect type has always declared `contactName`,
-- and the Reach webhook + both MCP tool implementations have always accepted
-- a contactName input, but with no real column to write it to they fell back
-- to burying it inside the free-text `notes` field — so it could never be
-- read back out as a distinct value (mapProspect never populated it, the
-- admin UI never displayed or edited it). Give it a real column, matching
-- how suppliers.contact_name already works correctly.
alter table public.prospects add column if not exists contact_name text;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0047', 'prospect_contact_name') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0047_prospect_contact_name.sql <<<

-- >>> MIGRATION 0048_visit_reward_tiers.sql >>>
-- Visit-count-triggered automatic loyalty rewards (V1→V2→V3) — distinct from
-- the spend-based tier system in loyalty_tier_2/3_threshold: this one fires
-- off the customer's raw visit_count, not total_spent. Ships enabled with
-- starter tiers; logVisit() only notifies on a NEW crossing (visitBefore <
-- threshold <= visitAfter), so existing customers are never retroactively
-- emailed when this ships.
alter table restaurants add column if not exists visit_rewards_enabled boolean not null default true;
alter table restaurants add column if not exists visit_reward_tiers jsonb not null default '[
  {"id":"v1","label":"Palier 1","visits":5,"reward":"Café offert","active":true},
  {"id":"v2","label":"Palier 2","visits":12,"reward":"Dessert offert","active":true},
  {"id":"v3","label":"Palier 3","visits":25,"reward":"15% de réduction","active":true}
]'::jsonb;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0048', 'visit_reward_tiers') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0048_visit_reward_tiers.sql <<<

-- >>> MIGRATION 0049_report_shares_watermark_expiry.sql >>>
-- Shareable-report watermark + link expiry. RLS is unaffected: the public
-- /r/[token] read already goes through the admin client (no anonymous RLS
-- policy exists on report_shares), so expiry is enforced in application
-- code (getReportShareByToken), not in a policy.
alter table report_shares add column if not exists watermark boolean not null default true;
alter table report_shares add column if not exists expires_at timestamptz;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0049', 'report_shares_watermark_expiry') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0049_report_shares_watermark_expiry.sql <<<

-- >>> MIGRATION 0050_perf_indexes_and_rls_tuning.sql >>>
-- ═══════════════════════════════════════════════════════════════════════
-- 0050: Database Performance & RLS Query Optimization
--
-- 1. Composite & foreign key indexes on hot operational tables:
--    - team_chat_messages (restaurant_id, channel, created_at desc)
--    - orders (restaurant_id, status, created_at desc)
--    - order_items (order_id, menu_item_id)
--    - inventory_movements (restaurant_id, created_at desc)
--    - loyalty_transactions (restaurant_id, created_at desc)
--    - customers (restaurant_id, user_id) & (restaurant_id, created_at desc)
--    - alerts & notifications unread lookups
--    - financial_transactions & service_days range filters
--
-- 2. STABLE & SECURITY DEFINER RLS function hardening:
--    - is_restaurant_member
--    - can_access_team_channel
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Team Chat & Collaboration Indexes
create index if not exists idx_team_chat_messages_restaurant_channel_created
  on team_chat_messages (restaurant_id, channel, created_at desc);

create index if not exists idx_team_channel_members_member_lookup
  on team_channel_members (member_id, restaurant_id);

-- 2. Live Orders & POS Ingestion Indexes
create index if not exists idx_orders_restaurant_status_created
  on orders (restaurant_id, status, created_at desc);

create index if not exists idx_orders_restaurant_created_desc
  on orders (restaurant_id, created_at desc);

create index if not exists idx_order_items_order_menu_item
  on order_items (order_id, menu_item_id);

-- 3. Inventory & Movements Indexes
create index if not exists idx_inventory_movements_restaurant_created
  on inventory_movements (restaurant_id, created_at desc);

create index if not exists idx_inventory_movements_item_created
  on inventory_movements (inventory_item_id, created_at desc);

-- 4. Loyalty, Retention & Customer Hub Indexes
create index if not exists idx_loyalty_transactions_restaurant_created
  on loyalty_transactions (restaurant_id, created_at desc);

create index if not exists idx_customers_restaurant_user
  on customers (restaurant_id, user_id);

create index if not exists idx_customers_restaurant_created
  on customers (restaurant_id, created_at desc);

-- 5. Realtime Alerts & Topbar Notifications Indexes
create index if not exists idx_alerts_restaurant_unread
  on alerts (restaurant_id, read, created_at desc);

create index if not exists idx_notifications_user_unread
  on notifications (user_id, read, created_at desc);

-- 6. Financial Transactions & Service Days Filter Indexes
create index if not exists idx_financial_transactions_restaurant_category_date
  on financial_transactions (restaurant_id, category, date desc);

create index if not exists idx_service_days_restaurant_rush
  on service_days (restaurant_id, rush_level);

-- 7. Hardened STABLE RLS Helper Functions
create or replace function is_restaurant_member(
  target_restaurant_id uuid,
  min_roles member_role[] default array['owner','manager','staff','consultant']::member_role[]
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
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

create or replace function can_access_team_channel(p_restaurant_id text, p_channel text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    is_restaurant_member(p_restaurant_id::uuid) and (
      p_channel in ('general', 'cuisine', 'service', 'urgences')
      or exists (
        select 1 from team_channel_members tcm
        where tcm.restaurant_id::text = p_restaurant_id
          and tcm.channel = p_channel
          and tcm.member_id::text = auth.uid()::text
      )
    );
$$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0050', 'perf_indexes_and_rls_tuning') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0050_perf_indexes_and_rls_tuning.sql <<<

-- >>> MIGRATION 0051_library_assets.sql >>>
-- The Library page ("Documents") let staff pick a file, showed an "upload in
-- progress" spinner, then only ever held the result in React state — the
-- file itself was never sent anywhere, and the entry vanished on refresh.
-- This adds a real table + storage bucket so an upload is actually
-- persisted, following the exact chat_attachments/chat-attachments pattern
-- (0002_chat_and_referrals.sql).

create table library_assets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  storage_path text not null, -- "{restaurantId}/{uuid}-{filename}" in the library-assets bucket
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_library_assets_restaurant on library_assets (restaurant_id, created_at desc);

alter table library_assets enable row level security;

create policy "library_assets_select" on library_assets for select
  using (is_restaurant_member(restaurant_id));
create policy "library_assets_insert" on library_assets for insert
  with check (is_restaurant_member(restaurant_id));
create policy "library_assets_delete" on library_assets for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ── storage: library assets (private, same shape as chat-attachments) ─────
insert into storage.buckets (id, name, public)
values ('library-assets', 'library-assets', false)
on conflict (id) do nothing;

create policy "library_assets_bucket_read" on storage.objects for select
  using (bucket_id = 'library-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid));
create policy "library_assets_bucket_write" on storage.objects for insert
  with check (bucket_id = 'library-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid));
create policy "library_assets_bucket_delete" on storage.objects for delete
  using (bucket_id = 'library-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[]));
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0051', 'library_assets') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0051_library_assets.sql <<<

-- >>> MIGRATION 0052_restore_handle_new_user.sql >>>
-- The live handle_new_user() trigger on this project had been overwritten
-- by a different Minerva product's version — referencing client_invites,
-- allowed_emails, and a CRM-shaped profiles/notification_preferences
-- schema (lead_activity_enabled, department, skills, github_url — none of
-- which belong to this app). Concretely: new Flow signups got an auth user
-- + a profiles row and nothing else — no restaurant, no workspace, no
-- membership — leaving the app completely unusable post-signup, and
-- causing the e2e suite's login-timeout failures across several unrelated
-- specs (fresh test accounts hitting this exact gap).
--
-- This restores Flow's own version verbatim from
-- 0024_customer_self_enrollment.sql (the last migration in this repo to
-- touch the function) as a new migration rather than editing 0024, so the
-- repo's migration history stays an honest append-only record of what
-- actually happened, instead of rewriting history to look like the
-- contamination never occurred.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
  new_workspace_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' then
    update public.customers
    set user_id = new.id
    where user_id is null
      and lower(email) = lower(new.email);
    return new;
  end if;

  if (new.raw_user_meta_data ->> 'invite_token') is not null
     or (new.raw_user_meta_data ->> 'workspace_invite_token') is not null then
    return new;
  end if;

  insert into public.workspaces (name)
  values ('Mon workspace')
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new_workspace_id, new.id, 'owner', 'active');

  insert into public.restaurants (name, workspace_id)
  values ('Mon restaurant', new_workspace_id)
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0052', 'restore_handle_new_user') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0052_restore_handle_new_user.sql <<<

-- >>> MIGRATION 0053_ai_token_quotas_and_usage.sql >>>
-- 0053_ai_token_quotas_and_usage.sql
-- Minerva Flow: Suivi de la consommation de tokens IA et gestion des quotas par plan d'abonnement

create table if not exists workspace_ai_usage (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  plan_tier text not null default 'starter' check (plan_tier in ('starter', 'pro', 'enterprise')),
  monthly_token_quota integer not null default 100000,
  tokens_used_current_period integer not null default 0,
  period_start timestamptz not null default date_trunc('month', now()),
  period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  total_lifetime_tokens bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_ai_usage_workspace on workspace_ai_usage(workspace_id);

alter table workspace_ai_usage enable row level security;

create policy "workspace_ai_usage_select" on workspace_ai_usage
  for select
  using (is_workspace_member(workspace_id));

-- Fonction atomique pour incrémenter la consommation et réinitialiser automatiquement si nouvelle période
create or replace function record_workspace_ai_tokens(
  p_workspace_id uuid,
  p_tokens integer,
  p_default_quota integer default 100000,
  p_plan_tier text default 'starter'
)
returns table (
  tokens_used integer,
  monthly_quota integer,
  is_quota_exceeded boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_period_start timestamptz := date_trunc('month', v_now);
  v_period_end timestamptz := v_period_start + interval '1 month';
  v_rec record;
begin
  insert into workspace_ai_usage (
    workspace_id,
    plan_tier,
    monthly_token_quota,
    tokens_used_current_period,
    period_start,
    period_end,
    total_lifetime_tokens,
    updated_at
  )
  values (
    p_workspace_id,
    p_plan_tier,
    p_default_quota,
    p_tokens,
    v_period_start,
    v_period_end,
    p_tokens,
    v_now
  )
  on conflict (workspace_id) do update
  set
    tokens_used_current_period = case
      when workspace_ai_usage.period_end <= v_now then p_tokens
      else workspace_ai_usage.tokens_used_current_period + p_tokens
    end,
    period_start = case
      when workspace_ai_usage.period_end <= v_now then v_period_start
      else workspace_ai_usage.period_start
    end,
    period_end = case
      when workspace_ai_usage.period_end <= v_now then v_period_end
      else workspace_ai_usage.period_end
    end,
    total_lifetime_tokens = workspace_ai_usage.total_lifetime_tokens + p_tokens,
    updated_at = v_now
  returning workspace_ai_usage.tokens_used_current_period, workspace_ai_usage.monthly_token_quota
  into v_rec;

  return query select
    v_rec.tokens_used_current_period,
    v_rec.monthly_token_quota,
    (v_rec.tokens_used_current_period > v_rec.monthly_token_quota);
end;
$$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0053', 'ai_token_quotas_and_usage') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0053_ai_token_quotas_and_usage.sql <<<

-- >>> MIGRATION 0054_fix_service_day_revenue_conflation.sql >>>
-- Fixes a real revenue-accuracy bug: `increment_service_day_revenue` (called when a direct/
-- self-service order is served) creates a fresh service_days row with no explicit
-- revenue_source, so it silently inherited the column's default of 'manuel'. That made it
-- indistinguishable from a real owner manual entry, which caused
-- upsertSyncedServiceDayRevenue() to permanently skip ("skipped_manual") every future Square
-- sync for that day. And even when sync order was reversed, upsertSyncedServiceDayRevenue()
-- did a full REPLACE of `revenue` on every sync, silently discarding any order-driven revenue
-- accumulated since the previous sync. Restaurants using both Square and direct ordering (the
-- flagship "commandes directes sans commission" feature) were quietly under-counting revenue
-- with no error surfaced anywhere.
--
-- Fix: (1) order-serving explicitly tags fresh rows 'commandes' instead of defaulting to
-- 'manuel', so it's never conflated with a real owner override; (2) POS sync tracks the amount
-- IT last contributed (revenue_pos_amount) and replaces only that portion on resync, instead
-- of overwriting the whole day.

alter table service_days add column if not exists revenue_pos_amount numeric not null default 0;

do $$ begin
  alter table service_days drop constraint if exists service_days_revenue_source_check;
  alter table service_days add constraint service_days_revenue_source_check
    check (revenue_source in ('manuel', 'commandes', 'square', 'lightspeed', 'clover'));
exception when duplicate_object then null;
end $$;

create or replace function increment_service_day_revenue(p_restaurant_id uuid, p_date date, p_amount numeric)
returns setof service_days
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_restaurant_member(p_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  return query
    insert into service_days (restaurant_id, date, revenue, main_source, rush_level, revenue_source)
    values (p_restaurant_id, p_date, p_amount, 'salle', 'normal', 'commandes')
    on conflict (restaurant_id, date)
    do update set revenue = service_days.revenue + excluded.revenue
    returning *;
end;
$$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0054', 'fix_service_day_revenue_conflation') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0054_fix_service_day_revenue_conflation.sql <<<

-- >>> MIGRATION 0055_alerts_computed_key.sql >>>
-- The `alerts` table has never been written to anywhere in the app — computeAlerts()
-- (lib/engine/alerts.ts) is a pure, on-the-fly rule engine whose output was only ever
-- shown live (Overview, Flow AI context), never persisted. That silently broke the
-- notification bell (always empty) and the "combinedAlerts" merge Overview's own code
-- already expects (app/[locale]/(app)/overview/page.tsx merges live alerts with
-- `unreadTableAlerts` from this table). This adds a stable identity so a periodic sync
-- (app/api/cron/sync-alerts) can upsert computeAlerts() output idempotently — computeAlerts
-- already produces deterministic per-alert ids like `low-stock-<itemId>`; that's the key.

alter table alerts add column if not exists computed_key text;

create unique index if not exists alerts_restaurant_computed_key_key
  on alerts (restaurant_id, computed_key)
  where computed_key is not null;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0055', 'alerts_computed_key') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0055_alerts_computed_key.sql <<<

-- >>> MIGRATION 0056_fix_alerts_computed_key_index.sql >>>
-- 0055's partial unique index (`where computed_key is not null`) can't serve as an
-- ON CONFLICT arbiter for a plain `onConflict: "restaurant_id,computed_key"` upsert —
-- Postgres only honors a partial index that way when the ON CONFLICT clause repeats
-- the exact same WHERE predicate, which supabase-js's string form can't express.
-- Every syncComputedAlerts() upsert was failing with 42P10 (no matching unique
-- constraint), silently, on every restaurant, every run. A plain unique index has the
-- same real-world effect here — computed_key is only ever set by that one write path,
-- Postgres already treats distinct NULLs as non-conflicting, so nothing else changes.

drop index if exists alerts_restaurant_computed_key_key;

create unique index if not exists alerts_restaurant_computed_key_key
  on alerts (restaurant_id, computed_key);
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0056', 'fix_alerts_computed_key_index') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0056_fix_alerts_computed_key_index.sql <<<

-- >>> MIGRATION 0057_instagram_provider.sql >>>
-- Adds "instagram" as its own ad_provider / ad_channel value, distinct from
-- "meta" (which stays scoped to Meta Ads attribution). Content-publishing
-- scopes (instagram_basic, instagram_content_publish, pages_show_list,
-- pages_read_engagement) are a different consent grant than the Ads-only
-- scope (ads_read, business_management) — an owner may connect one without
-- the other, so they need separate rows in ad_platform_connections rather
-- than overloading the existing "meta" row with mixed scopes.
--
-- Additive-only (ALTER TYPE ... ADD VALUE), safe to run against a live
-- database — existing "meta"/"google" rows and the RLS policies on
-- ad_platform_connections (which check role, not provider) are unaffected.

alter type ad_provider add value 'instagram';
alter type ad_channel add value 'instagram';
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0057', 'instagram_provider') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0057_instagram_provider.sql <<<

-- >>> MIGRATION 0058_marketing_exports_bucket.sql >>>
-- Public storage bucket for Marketing Studio exports that need to be
-- reachable by a third party over plain HTTP — specifically Instagram's
-- Content Publishing API, whose /media endpoint fetches image_url itself
-- rather than accepting a direct upload. Objects are stored under
-- {restaurant_id}/... same folder-scoping convention as library-assets
-- (0051), but public:true (like changelog-images, 0041) since Meta's
-- servers have no Supabase session to authenticate with.
insert into storage.buckets (id, name, public)
values ('marketing-exports', 'marketing-exports', true)
on conflict (id) do nothing;

create policy "marketing_exports_public_read" on storage.objects for select
  using (bucket_id = 'marketing-exports');
create policy "marketing_exports_write" on storage.objects for insert
  with check (
    bucket_id = 'marketing-exports'
    and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );
create policy "marketing_exports_delete" on storage.objects for delete
  using (
    bucket_id = 'marketing-exports'
    and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0058', 'marketing_exports_bucket') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0058_marketing_exports_bucket.sql <<<

-- >>> MIGRATION 0059_quickbooks_provider.sql >>>
-- Adds QuickBooks as a pos_connections provider — same OAuth-token-in-Vault
-- pattern as Square/Lightspeed, used here for expense sync rather than
-- point-of-sale, matching how "Comptes & Intégrations" already treats
-- pos_connections as the general external-financial-source table.
alter type pos_provider add value if not exists 'quickbooks';
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0059', 'quickbooks_provider') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0059_quickbooks_provider.sql <<<

-- >>> MIGRATION 0060_expense_category_description.sql >>>
-- Backs the new category detail page (/finance/categories/[id]) — explains
-- what the category is for, not just its name.
alter table expense_categories add column if not exists description text;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0060', 'expense_category_description') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0060_expense_category_description.sql <<<

-- >>> MIGRATION 0061_reward_menu_item_link.sql >>>
-- Lets a "free item" loyalty reward point at a real menu item so its true
-- cost (menu_items.food_cost) can be tracked instead of guessed from a
-- flat points-to-dollar conversion. Optional: a reward with no linked item
-- (a discount %, a points bonus, ...) keeps working exactly as before.
alter table loyalty_rewards
  add column if not exists menu_item_id uuid references menu_items (id) on delete set null;

create index if not exists idx_loyalty_rewards_menu_item on loyalty_rewards (menu_item_id) where menu_item_id is not null;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0061', 'reward_menu_item_link') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0061_reward_menu_item_link.sql <<<

-- >>> MIGRATION 0062_city_geocodes.sql >>>
-- Shared, restaurant-agnostic cache of city name -> coordinates, so the
-- "Provenance des clients" map doesn't re-geocode the same city (e.g.
-- "Montréal") once per restaurant that happens to have a customer there.
-- Non-sensitive reference data (a city's approximate coordinates), so any
-- authenticated user can read and contribute to it.
create table if not exists city_geocodes (
  city_key text primary key,
  city_label text not null,
  lat numeric not null,
  lng numeric not null,
  created_at timestamptz not null default now()
);

alter table city_geocodes enable row level security;

drop policy if exists "city_geocodes_select" on city_geocodes;
create policy "city_geocodes_select" on city_geocodes for select
  to authenticated using (true);

drop policy if exists "city_geocodes_insert" on city_geocodes;
create policy "city_geocodes_insert" on city_geocodes for insert
  to authenticated with check (true);
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0062', 'city_geocodes') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0062_city_geocodes.sql <<<

-- >>> MIGRATION 0063_user_lifecycle_emails.sql >>>
-- Minerva Flow — Séquences d'emails automatisés basés sur le cycle de vie & comportement utilisateur
-- Permet de suivre l'envoi des étapes (welcome, activation, feature_highlight, support_checkin, case_study, conversion, reactivation)
-- et d'éviter tout doublon.

create table if not exists public.user_lifecycle_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  step text not null,
  status text not null default 'sent', -- 'sent', 'failed', 'skipped'
  sent_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  constraint user_lifecycle_step_unique unique (user_id, step)
);

create index if not exists idx_user_lifecycle_emails_user_id on public.user_lifecycle_emails(user_id);
create index if not exists idx_user_lifecycle_emails_step on public.user_lifecycle_emails(step);
create index if not exists idx_user_lifecycle_emails_sent_at on public.user_lifecycle_emails(sent_at);

alter table public.user_lifecycle_emails enable row level security;

-- Seuls le rôle de service (cron / serveur) et les administrateurs ont accès direct
create policy "Service role full access on user_lifecycle_emails"
  on public.user_lifecycle_emails
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0063', 'user_lifecycle_emails') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0063_user_lifecycle_emails.sql <<<

-- >>> MIGRATION 0064_flow_ai_workspace_and_canvas.sql >>>
-- Minerva Flow — Flow AI Workspace, Canvas Docs, RAG Dossiers & Custom Agents
-- Version 0064

-- ── 1. Extensions de la table chat_conversations ───────────────────────────
alter table chat_conversations
  add column if not exists is_pinned boolean not null default false,
  add column if not exists agent_id text not null default 'general',
  add column if not exists active_dossiers text[] not null default array['menu', 'finance', 'loyalty', 'operations']::text[];

create index if not exists idx_chat_conversations_pinned
  on chat_conversations (restaurant_id, is_pinned desc, updated_at desc);

-- ── 2. Documents Canvas WYSIWYG ───────────────────────────────────────────
create table if not exists chat_canvas_docs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  conversation_id uuid references chat_conversations (id) on delete set null,
  title text not null default 'Document sans titre',
  content text not null default '',
  content_json jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_canvas_docs_restaurant
  on chat_canvas_docs (restaurant_id, updated_at desc);

create index if not exists idx_chat_canvas_docs_conversation
  on chat_canvas_docs (conversation_id, updated_at desc);

alter table chat_canvas_docs enable row level security;

create policy "chat_canvas_docs_select" on chat_canvas_docs
  for select using (is_restaurant_member(restaurant_id));

create policy "chat_canvas_docs_insert" on chat_canvas_docs
  for insert with check (is_restaurant_member(restaurant_id));

create policy "chat_canvas_docs_update" on chat_canvas_docs
  for update using (is_restaurant_member(restaurant_id));

create policy "chat_canvas_docs_delete" on chat_canvas_docs
  for delete using (is_restaurant_member(restaurant_id));

-- ── 3. Dossiers Contextuels RAG & Documents de Référence ────────────────────
create table if not exists chat_project_folders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  icon text not null default 'Folder',
  color text not null default '#167F5B',
  is_system boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(restaurant_id, slug)
);

create index if not exists idx_chat_project_folders_restaurant
  on chat_project_folders (restaurant_id);

alter table chat_project_folders enable row level security;

create policy "chat_project_folders_select" on chat_project_folders
  for select using (is_restaurant_member(restaurant_id));

create policy "chat_project_folders_insert" on chat_project_folders
  for insert with check (is_restaurant_member(restaurant_id));

create policy "chat_project_folders_update" on chat_project_folders
  for update using (is_restaurant_member(restaurant_id));

create policy "chat_project_folders_delete" on chat_project_folders
  for delete using (is_restaurant_member(restaurant_id) and not is_system);

create table if not exists chat_project_docs (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references chat_project_folders (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'sop',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_project_docs_folder
  on chat_project_docs (folder_id, updated_at desc);

create index if not exists idx_chat_project_docs_restaurant
  on chat_project_docs (restaurant_id);

alter table chat_project_docs enable row level security;

create policy "chat_project_docs_select" on chat_project_docs
  for select using (is_restaurant_member(restaurant_id));

create policy "chat_project_docs_insert" on chat_project_docs
  for insert with check (is_restaurant_member(restaurant_id));

create policy "chat_project_docs_update" on chat_project_docs
  for update using (is_restaurant_member(restaurant_id));

create policy "chat_project_docs_delete" on chat_project_docs
  for delete using (is_restaurant_member(restaurant_id));

-- ── 4. Agents Personnalisés du Restaurant ──────────────────────────────────
create table if not exists restaurant_custom_agents (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  role text not null,
  avatar text not null default '👨‍🍳',
  description text,
  system_prompt text not null,
  tone text not null default 'expert_chaleureux',
  skills jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_restaurant_custom_agents_restaurant
  on restaurant_custom_agents (restaurant_id, is_active);

alter table restaurant_custom_agents enable row level security;

create policy "restaurant_custom_agents_select" on restaurant_custom_agents
  for select using (is_restaurant_member(restaurant_id));

create policy "restaurant_custom_agents_insert" on restaurant_custom_agents
  for insert with check (is_restaurant_member(restaurant_id));

create policy "restaurant_custom_agents_update" on restaurant_custom_agents
  for update using (is_restaurant_member(restaurant_id));

create policy "restaurant_custom_agents_delete" on restaurant_custom_agents
  for delete using (is_restaurant_member(restaurant_id));
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0064', 'flow_ai_workspace_and_canvas') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0064_flow_ai_workspace_and_canvas.sql <<<

-- >>> MIGRATION 0065_billing_tiers_and_lifecycle.sql >>>
-- 0065_billing_tiers_and_lifecycle.sql
-- Minerva Flow: passage du plan Stripe unique à 3 paliers (Starter/Pro/Entreprise),
-- + traçabilité des épisodes past_due/annulation pour les relances automatisées,
-- + historique des annulations (raison + offre de rétention),
-- + idempotence des emails de cycle de vie facturation (dunning, quota, win-back).

alter table subscriptions
  add column if not exists stripe_price_id text,
  add column if not exists billing_interval text check (billing_interval in ('monthly', 'yearly')),
  add column if not exists plan_tier text check (plan_tier in ('starter', 'pro', 'enterprise')),
  -- Horodatage du début de l'épisode past_due courant (null si le compte n'est pas en retard de
  -- paiement). Réinitialisé par le webhook à chaque transition d'état — sert de référence stable
  -- pour la relance J+3, indépendamment de updated_at qui bouge à chaque écriture.
  add column if not exists past_due_since timestamptz,
  -- Copie de Stripe subscription.canceled_at — référence stable pour la relance de reconquête,
  -- distincte de updated_at pour la même raison que past_due_since ci-dessus.
  add column if not exists canceled_at timestamptz;

-- Historique des annulations : raison donnée, offre de rétention présentée/acceptée.
-- Alimente le flow d'annulation (cancel-subscription-dialog) et la relance win-back.
create table if not exists public.subscription_cancellations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stripe_subscription_id text,
  reason text,
  feedback text,
  retention_offer_shown boolean not null default false,
  retention_offer_accepted boolean not null default false,
  canceled_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_subscription_cancellations_workspace
  on public.subscription_cancellations (workspace_id);

alter table public.subscription_cancellations enable row level security;

create policy "subscription_cancellations_select" on public.subscription_cancellations
  for select
  using (is_workspace_member(workspace_id));

create policy "subscription_cancellations_insert" on public.subscription_cancellations
  for insert
  with check (is_workspace_member(workspace_id));

-- Idempotence des emails de cycle de vie facturation (essai qui finit, paiement échoué,
-- relance J+3, quota atteint, reconquête post-annulation). dedupe_key distingue les épisodes
-- répétables (ex: deux périodes past_due distinctes) d'un même step — contrairement à
-- user_lifecycle_emails (0063) qui est one-shot par utilisateur, ceci est par workspace et
-- peut se redéclencher à chaque nouvel épisode.
create table if not exists public.workspace_billing_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  step text not null,
  dedupe_key text not null,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  constraint workspace_billing_email_unique unique (workspace_id, step, dedupe_key)
);

create index if not exists idx_workspace_billing_emails_workspace
  on public.workspace_billing_emails (workspace_id);

alter table public.workspace_billing_emails enable row level security;

create policy "Service role full access on workspace_billing_emails"
  on public.workspace_billing_emails
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0065', 'billing_tiers_and_lifecycle') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0065_billing_tiers_and_lifecycle.sql <<<

-- >>> MIGRATION 0066_customer_self_service.sql >>>
-- Backfills this repo's migration history: customers_update_own,
-- favorite_offer_ids, and notification_frequency were applied directly to
-- the live "Minerva Flow" project (vcfaianbdjowmiqaheee) while building the
-- native app's customer-portal self-service settings, but the migration
-- file documenting that change was never committed — discovered while
-- auditing the schema for this migration's own governing history. Written
-- idempotently (if not exists / or replace) since the live database
-- already has these; this file exists so a fresh environment, a review of
-- `supabase/migrations`, or `supabase db reset` produces the same schema
-- the production project actually has.
--
-- Before this policy existed, customers_update was staff-only
-- (is_restaurant_member with owner/manager/staff) — a customer saving
-- their own notification preference from the portal or native app
-- silently did nothing under RLS, with no error surfaced anywhere.

begin;

alter table customers
  add column if not exists favorite_offer_ids uuid[] not null default '{}';

alter table customers
  add column if not exists notification_frequency text not null default 'all';

drop policy if exists "customers_update_own" on customers;
create policy "customers_update_own" on customers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0066', 'customer_self_service') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0066_customer_self_service.sql <<<

-- >>> MIGRATION 0067_oauth_customer_login.sql >>>
-- Google/Facebook sign-in was added to the customer portal login
-- (app/[locale]/portal/login/page.tsx) via supabase.auth.signInWithOAuth,
-- but that method has no equivalent of signInWithOtp's `data:
-- {is_customer: true}` — there is no way to tag a brand-new OAuth user's
-- raw_user_meta_data before handle_new_user() fires. Without a fix, a
-- returning loyalty customer who authenticates with Google for the first
-- time would fall through to the owner-provisioning branch and get a fake
-- "Mon restaurant" instead of being linked to their real customer record.
--
-- Fix: treat "a customers row already exists for this email, unclaimed"
-- as an equally valid signal that this is a customer login, independent
-- of the is_customer metadata flag. This is strictly additive — the
-- flag-based path (email OTP) is untouched — and it matches how a person
-- actually becomes a customer in this app: staff creates their row, or a
-- self-enrollment link pre-creates it, always before they ever
-- authenticate. The portal login page is a return-login surface for
-- someone who already has such a row, never a cold-signup surface, so
-- "no matching row exists" correctly continues to the owner path.

begin;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
  new_workspace_id uuid;
  is_pending_customer boolean;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  select exists(
    select 1 from public.customers
    where user_id is null and lower(email) = lower(new.email)
  ) into is_pending_customer;

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' or is_pending_customer then
    update public.customers
    set user_id = new.id
    where user_id is null
      and lower(email) = lower(new.email);
    return new;
  end if;

  if (new.raw_user_meta_data ->> 'invite_token') is not null
     or (new.raw_user_meta_data ->> 'workspace_invite_token') is not null then
    return new;
  end if;

  insert into public.workspaces (name)
  values ('Mon workspace')
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new_workspace_id, new.id, 'owner', 'active');

  insert into public.restaurants (name, workspace_id)
  values ('Mon restaurant', new_workspace_id)
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0067', 'oauth_customer_login') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0067_oauth_customer_login.sql <<<

-- >>> MIGRATION 0068_customer_profile_editing.sql >>>
-- Customer self-service profile editing (name/avatar/email) needs two
-- things the schema doesn't have yet:
--   1. Nowhere to store an avatar URL on the customer's own record.
--   2. A way for customers.email to stay in sync once someone actually
--      completes Supabase's email-change confirmation flow
--      (auth.updateUser({email}) only changes auth.users.email once the
--      confirmation link is clicked — nothing currently propagates that
--      back to the customers row it's denormalized onto for staff-facing
--      views).
--
-- Reuses the existing public "avatars" storage bucket (already policied
-- per-auth.uid() folder, see avatars_owner_write/update/delete) rather
-- than creating a new bucket — a loyalty customer has a real auth.uid()
-- once linked, same as staff.

begin;

alter table customers
  add column if not exists avatar_url text;

create or replace function sync_customer_email_from_auth()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.customers
    set email = new.email
    where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row
  execute function sync_customer_email_from_auth();

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0068', 'customer_profile_editing') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0068_customer_profile_editing.sql <<<

-- >>> MIGRATION 0069_menu_ratings_and_push_tokens.sql >>>
-- Three independent additions for the native app's deeper menu/discovery
-- work:
--   1. menu_items.image_urls — a real photo carousel needs more than the
--      single legacy image_url.
--   2. menu_item_reviews — a Google-Maps-style rating/review system.
--      Reads are public (not gated behind is_restaurant_member or an
--      existing customer relationship) because the entire point is
--      letting someone who has NEVER visited a restaurant see its rating
--      before deciding to go — same as Google Maps reviews. Writes are
--      restricted to someone who is actually a loyalty customer of that
--      restaurant (has a customers row there), so reviews stay tied to
--      real patrons, not anonymous drive-bys.
--   3. device_push_tokens — APNs device token registry, one row per
--      (user, device). Written only by the owning user; read only by the
--      admin client (server-side, when actually sending a push) — no
--      SELECT policy needed for anon/authenticated since nothing in the
--      client ever needs to read another device's token, or even its own.

begin;

alter table menu_items
  add column if not exists image_urls text[] not null default '{}';

create table if not exists menu_item_reviews (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (menu_item_id, customer_id)
);

create index if not exists idx_menu_item_reviews_item on menu_item_reviews (menu_item_id);
create index if not exists idx_menu_item_reviews_restaurant on menu_item_reviews (restaurant_id);

alter table menu_item_reviews enable row level security;

drop policy if exists "menu_item_reviews_public_select" on menu_item_reviews;
create policy "menu_item_reviews_public_select" on menu_item_reviews for select
  using (true);

drop policy if exists "menu_item_reviews_customer_insert" on menu_item_reviews;
create policy "menu_item_reviews_customer_insert" on menu_item_reviews for insert
  with check (
    exists (
      select 1 from customers c
      where c.id = menu_item_reviews.customer_id
        and c.restaurant_id = menu_item_reviews.restaurant_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "menu_item_reviews_customer_update" on menu_item_reviews;
create policy "menu_item_reviews_customer_update" on menu_item_reviews for update
  using (
    exists (select 1 from customers c where c.id = menu_item_reviews.customer_id and c.user_id = auth.uid())
  );

drop policy if exists "menu_item_reviews_customer_delete" on menu_item_reviews;
create policy "menu_item_reviews_customer_delete" on menu_item_reviews for delete
  using (
    exists (select 1 from customers c where c.id = menu_item_reviews.customer_id and c.user_id = auth.uid())
  );

create table if not exists device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null default 'ios',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists idx_device_push_tokens_user on device_push_tokens (user_id);

alter table device_push_tokens enable row level security;

drop policy if exists "device_push_tokens_owner_all" on device_push_tokens;
create policy "device_push_tokens_owner_all" on device_push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0069', 'menu_ratings_and_push_tokens') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0069_menu_ratings_and_push_tokens.sql <<<

-- >>> MIGRATION 0070_customer_rewards_offers_select.sql >>>
-- Real bug, confirmed live: loyalty_rewards_select and offers_select are
-- both `is_restaurant_member(restaurant_id)` only — a loyalty customer is
-- never a restaurant_members row, so SupabaseManager.loadPortalData()'s
-- direct queries for both tables have silently returned zero rows for
-- every native customer since the app shipped (Home's "next reward" card
-- and offers feed always rendered empty, regardless of what the
-- restaurant actually configured). The web portal never hit this because
-- getPortalData() reads both through the admin client, not RLS.
--
-- Fix: add a customer-scoped SELECT policy on each, same shape as
-- loyalty_transactions_select_own — neither table holds anything
-- sensitive (no pricing internals, no other customers' data), so a direct
-- RLS policy is the right fix here, not a bridge route.

begin;

drop policy if exists "loyalty_rewards_select_own" on loyalty_rewards;
create policy "loyalty_rewards_select_own" on loyalty_rewards for select
  using (
    exists (
      select 1 from customers c
      where c.restaurant_id = loyalty_rewards.restaurant_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "offers_select_own" on offers;
create policy "offers_select_own" on offers for select
  using (
    exists (
      select 1 from customers c
      where c.restaurant_id = offers.restaurant_id and c.user_id = auth.uid()
    )
  );

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0070', 'customer_rewards_offers_select') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0070_customer_rewards_offers_select.sql <<<

-- >>> MIGRATION 0071_offer_price_and_inclusions.sql >>>
-- Offer detail depth: price and what's included/excluded, so the native
-- app's OfferDetailView can show real structured terms instead of only
-- free-text description. Owner-editable, same as title/description.

begin;

alter table offers
  add column if not exists price numeric,
  add column if not exists included_items text[] not null default '{}',
  add column if not exists excluded_items text[] not null default '{}';

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0071', 'offer_price_and_inclusions') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0071_offer_price_and_inclusions.sql <<<

-- >>> MIGRATION 0072_restaurant_image_gallery.sql >>>
-- Restaurant photo gallery for the native discovery flow's
-- RestaurantDetailView carousel — owner-uploaded via the web dashboard
-- (reusing the existing MenuImageUpload/offer-images pattern), consumed
-- read-only via the /api/portal/discover bridge.

begin;

alter table restaurants add column if not exists image_urls text[] not null default '{}';

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0072', 'restaurant_image_gallery') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0072_restaurant_image_gallery.sql <<<

-- >>> MIGRATION 0073_restaurant_google_maps_url.sql >>>
-- Owner-configurable Google Maps listing URL — surfaced in the native
-- discovery app's RestaurantDetailView as a "Voir sur Google Maps" link,
-- and used for the post-order review nudge (send the customer to leave a
-- real review on the restaurant's own listing, never something offered
-- in exchange for it — soliciting reviews with an incentive is against
-- Google's own policy and, in several jurisdictions, consumer protection
-- law).

begin;

alter table restaurants add column if not exists google_maps_url text;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0073', 'restaurant_google_maps_url') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0073_restaurant_google_maps_url.sql <<<

-- >>> MIGRATION 0074_customer_signup_marketing_consent.sql >>>
-- Real bug found while auditing consent handling: the native app's signup
-- screen (AuthView.swift) collects a marketing opt-in checkbox and passes
-- it as `marketing_opt_in` in the Supabase Auth signup metadata
-- (SupabaseManager.sendCode), but handle_new_user() has never read that
-- key — it only ever sets customers.user_id. Every native customer who
-- explicitly opted in has had marketing_consent silently stuck at its
-- `false` default (see 0035_customer_consent_and_birthday.sql), so the
-- CASL-gated retention engine has never been allowed to reach them despite
-- their real consent. This is additive to the customer-linking UPDATE
-- already there (0067_oauth_customer_login.sql) — same rows, one more
-- column set only when the metadata flag is present and true.
begin;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
  new_workspace_id uuid;
  is_pending_customer boolean;
  opted_in_marketing boolean;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  select exists(
    select 1 from public.customers
    where user_id is null and lower(email) = lower(new.email)
  ) into is_pending_customer;

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' or is_pending_customer then
    opted_in_marketing := (new.raw_user_meta_data ->> 'marketing_opt_in') = 'true';

    update public.customers
    set user_id = new.id,
        marketing_consent = case when opted_in_marketing then true else marketing_consent end,
        consent_source = case when opted_in_marketing then 'native_signup' else consent_source end,
        consent_at = case when opted_in_marketing then now() else consent_at end
    where user_id is null
      and lower(email) = lower(new.email);
    return new;
  end if;

  if (new.raw_user_meta_data ->> 'invite_token') is not null
     or (new.raw_user_meta_data ->> 'workspace_invite_token') is not null then
    return new;
  end if;

  insert into public.workspaces (name)
  values ('Mon workspace')
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new_workspace_id, new.id, 'owner', 'active');

  insert into public.restaurants (name, workspace_id)
  values ('Mon restaurant', new_workspace_id)
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0074', 'customer_signup_marketing_consent') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0074_customer_signup_marketing_consent.sql <<<

-- >>> MIGRATION 0075_demo_restaurants_menu_seed.sql >>>
-- Demo-data completeness (Phase 2 of the reviewed feedback batch): four
-- restaurants that already appear on the native discovery map (any
-- restaurant with lat/lng, regardless of workspace) had zero menu items,
-- offers, or rewards — a customer tapping into them saw an empty profile,
-- which is exactly the "les nouveaux restaurants n'ont pas de menu"
-- complaint. Seeds a small, realistic menu/offer/reward/photo set for
-- each so the demo experience is representative end to end. Demo-only
-- data, not tied to any real customer or transaction.

begin;

-- Minerva — Plateau Mont-Royal
insert into menu_items (restaurant_id, name, category, price, description, active) values
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Latte', 'Boissons', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Cappuccino', 'Boissons', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Thé glacé maison', 'Boissons', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Bol déjeuner protéiné', 'Plats', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Toast avocat', 'Plats', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Cookie choco-noisette', 'Desserts', 3.75, 'Cuit sur place chaque matin.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Duo café + pâtisserie', 'Un café au choix avec un cookie, à petit prix.', true, 7.50, array['Café au choix','Cookie choco-noisette'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Café offert', 60, 'Un café chaud ou glacé de votre choix.', true),
('c122ce6e-7cbb-404b-b712-6c055154d7c2', 'Bol déjeuner offert', 180, 'Le bol déjeuner protéiné, gratuit.', true)
on conflict do nothing;

update restaurants set image_urls = array[
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000&q=80',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1000&q=80'
] where id = 'c122ce6e-7cbb-404b-b712-6c055154d7c2' and coalesce(array_length(image_urls, 1), 0) = 0;

-- Minerva — Vieux-Québec
insert into menu_items (restaurant_id, name, category, price, description, active) values
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Chocolat chaud', 'Boissons', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Café allongé', 'Boissons', 3.50, 'Simple, sans détour.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Croissant', 'Pâtisserie', 3.25, 'Pur beurre, feuilleté maison.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Pain au chocolat', 'Pâtisserie', 3.50, 'Deux bâtons de chocolat noir.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Croque-monsieur', 'Plats', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Formule matinale', 'Café allongé et croissant pour bien commencer.', true, 6.00, array['Café allongé','Croissant'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Chocolat chaud offert', 50, 'Notre chocolat chaud maison, gratuit.', true),
('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d', 'Croque-monsieur offert', 150, 'Le classique, gratuit.', true)
on conflict do nothing;

update restaurants set image_urls = array[
  'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=1000&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80'
] where id = '94ddcaa0-51e3-4bd2-9d1e-30e2d696213d' and coalesce(array_length(image_urls, 1), 0) = 0;

-- Mon restaurant (Montréal)
insert into menu_items (restaurant_id, name, category, price, description, active) values
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Limonade maison', 'Boissons', 4.25, 'Citrons frais pressés, sirop léger.', true),
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Burger classique', 'Plats', 15.95, 'Boeuf, cheddar, laitue, tomate, sauce maison.', true),
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Salade César', 'Plats', 12.50, 'Laitue romaine, parmesan, croûtons, poulet grillé.', true),
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Tarte au sucre', 'Desserts', 5.95, 'Recette traditionnelle québécoise.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Combo burger', 'Burger classique avec une limonade maison.', true, 18.95, array['Burger classique','Limonade maison'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Dessert offert', 70, 'La tarte au sucre, gratuite.', true),
('996dd4ba-1059-4cd9-8ea9-8436b860ec1b', 'Burger offert', 200, 'Le burger classique, gratuit.', true)
on conflict do nothing;

update restaurants set image_urls = array[
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1000&q=80'
] where id = '996dd4ba-1059-4cd9-8ea9-8436b860ec1b' and coalesce(array_length(image_urls, 1), 0) = 0;

-- Minevra (petit café)
insert into menu_items (restaurant_id, name, category, price, description, active) values
('a991f13e-1f6a-46c2-b024-b4820eb97180', 'Espresso', 'Boissons', 3.00, 'Simple ou double.', true),
('a991f13e-1f6a-46c2-b024-b4820eb97180', 'Sandwich jambon-brie', 'Plats', 9.50, 'Baguette fraîche, jambon blanc, brie.', true)
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('a991f13e-1f6a-46c2-b024-b4820eb97180', 'Espresso offert', 40, 'Un espresso, gratuit.', true)
on conflict do nothing;

update restaurants set image_urls = array[
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000&q=80'
] where id = 'a991f13e-1f6a-46c2-b024-b4820eb97180' and coalesce(array_length(image_urls, 1), 0) = 0;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0075', 'demo_restaurants_menu_seed') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0075_demo_restaurants_menu_seed.sql <<<

-- >>> MIGRATION 0076_restaurant_reviews.sql >>>
-- Phase 5 of the reviewed feedback batch: restaurant-level reviews, not
-- just per-menu-item ones (menu_item_reviews, 0069). A customer tapping
-- into a restaurant's own profile page had no way to rate or read about
-- the place as a whole — same "avis Google Maps" expectation as the
-- per-dish reviews, but for the overall experience. One review per
-- customer per restaurant (unique constraint), up to 6 photos per review
-- (checked, not just a UI-side limit). Reads are public for the same
-- reason menu_item_reviews' are: someone deciding whether to visit a
-- restaurant they've never been to needs to see its rating before joining.

begin;

create table if not exists restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (restaurant_id, customer_id),
  constraint restaurant_reviews_max_six_images check (
    image_urls is null or array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 6
  )
);

create index if not exists idx_restaurant_reviews_restaurant on restaurant_reviews (restaurant_id);

alter table restaurant_reviews enable row level security;

drop policy if exists "restaurant_reviews_public_select" on restaurant_reviews;
create policy "restaurant_reviews_public_select" on restaurant_reviews for select
  using (true);

drop policy if exists "restaurant_reviews_customer_insert" on restaurant_reviews;
create policy "restaurant_reviews_customer_insert" on restaurant_reviews for insert
  with check (
    exists (
      select 1 from customers c
      where c.id = restaurant_reviews.customer_id
        and c.restaurant_id = restaurant_reviews.restaurant_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "restaurant_reviews_customer_update" on restaurant_reviews;
create policy "restaurant_reviews_customer_update" on restaurant_reviews for update
  using (
    exists (select 1 from customers c where c.id = restaurant_reviews.customer_id and c.user_id = auth.uid())
  );

drop policy if exists "restaurant_reviews_customer_delete" on restaurant_reviews;
create policy "restaurant_reviews_customer_delete" on restaurant_reviews for delete
  using (
    exists (select 1 from customers c where c.id = restaurant_reviews.customer_id and c.user_id = auth.uid())
  );

-- ── storage: review photos ───────────────────────────────────────────────
-- Same per-auth.uid()-folder pattern as the existing "avatars" bucket
-- (0001_init.sql) — a customer uploads under their own folder, publicly
-- readable once attached to a review.
insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

create policy "review_images_public_read" on storage.objects for select
  using (bucket_id = 'review-images');
create policy "review_images_owner_write" on storage.objects for insert
  with check (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "review_images_owner_delete" on storage.objects for delete
  using (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0076', 'restaurant_reviews') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0076_restaurant_reviews.sql <<<

-- >>> MIGRATION 0077_demo_order_history_seed.sql >>>
-- Phase 6 of the reviewed feedback batch needs real order_items to rank
-- against ("Populaire près de vous" — see app/api/portal/popular).
-- Production had only 9 order_items total across every restaurant, not
-- enough to demonstrate a real ranking. Seeds a handful of served orders
-- across several demo restaurants, weighting Latte / Phở bò / Croissant
-- so a clear popularity signal exists. Applied directly via execute_sql
-- and verified; this file documents it for repo history (re-running
-- would duplicate orders — there is no natural unique key to dedupe on).

begin;

with o1 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('63f93302-0ab4-431b-b66e-2deba424367c','servie',17.95,2.69,20.64,'Client démo', now() - interval '2 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'dd378740-daed-4cb4-8d8c-563e9f7b886c', 'Tartare de saumon', 17.95, 1 from o1;

with o2 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('63f93302-0ab4-431b-b66e-2deba424367c','servie',14.50,2.17,16.67,'Client démo', now() - interval '5 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'f7024c64-8ea5-4de9-90e4-7e18787353aa', 'Croque-monsieur', 14.50, 1 from o2;

with o3 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('da568e75-dd95-446d-89ef-00a6d46be984','servie',13.00,1.95,14.95,'Client démo', now() - interval '1 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select o3.id, m.id, m.name, m.price, 2 from o3, menu_items m where m.restaurant_id = 'da568e75-dd95-446d-89ef-00a6d46be984' limit 1;

with o4 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('cbfcb330-6d1b-4663-8727-8402dbbf8c0e','servie',10.00,1.50,11.50,'Client démo', now() - interval '3 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select o4.id, m.id, m.name, m.price, 2 from o4, menu_items m where m.restaurant_id = 'cbfcb330-6d1b-4663-8727-8402dbbf8c0e' limit 1;

with o5 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('6b322c70-76d4-4d04-8af9-2ab82fe40333','servie',9.00,1.35,10.35,'Client démo', now() - interval '4 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select o5.id, m.id, m.name, m.price, 1 from o5, menu_items m where m.restaurant_id = '6b322c70-76d4-4d04-8af9-2ab82fe40333' limit 1;

with o6 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('f2a51496-edff-45f9-b3e0-70a43f75f869','servie',13.95,2.09,16.04,'Client démo', now() - interval '1 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, '879c2b75-59e4-4b01-8a0f-4f455f38d0cf', 'Phở bò', 13.95, 2 from o6;
with o7 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('f2a51496-edff-45f9-b3e0-70a43f75f869','servie',13.95,2.09,16.04,'Client démo', now() - interval '3 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, '879c2b75-59e4-4b01-8a0f-4f455f38d0cf', 'Phở bò', 13.95, 3 from o7;

with o8 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('c122ce6e-7cbb-404b-b712-6c055154d7c2','servie',5.25,0.79,6.04,'Client démo', now() - interval '2 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'a924d049-0365-4026-9922-87d03c409529', 'Latte', 5.25, 4 from o8;
with o9 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('c122ce6e-7cbb-404b-b712-6c055154d7c2','servie',5.25,0.79,6.04,'Client démo', now() - interval '5 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'a924d049-0365-4026-9922-87d03c409529', 'Latte', 5.25, 3 from o9;

with o10 as (insert into orders (restaurant_id, status, subtotal, tax_amount, total, guest_name, created_at) values ('94ddcaa0-51e3-4bd2-9d1e-30e2d696213d','servie',3.25,0.49,3.74,'Client démo', now() - interval '1 days') returning id)
insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity) select id, 'e75a0938-5975-4cb9-bc29-c240200249ab', 'Croissant', 3.25, 5 from o10;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0077', 'demo_order_history_seed') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0077_demo_order_history_seed.sql <<<

-- >>> MIGRATION 0078_platform_announcements_and_ecosystem_proposals.sql >>>
-- Migration 0078: Platform Announcements, In-App Surveys and Ecosystem App Proposals
-- Supports editorial client-side announcements, 1-click micro-polls on Web Portal & iOS,
-- and ecosystem app idea submissions on the pro profile page.

begin;

-- ── 1. Platform Announcements & In-App Surveys ─────────────────────────────
create table if not exists platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  badge_label text not null default 'Nouveauté',
  category text not null default 'feature',
  call_to_action_label text,
  call_to_action_url text,
  poll_question text,
  poll_options jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_announcements_active 
  on platform_announcements (is_active, created_at desc);

alter table platform_announcements enable row level security;

drop policy if exists "platform_announcements_public_select" on platform_announcements;
create policy "platform_announcements_public_select" on platform_announcements
  for select using (is_active = true);

-- ── 2. Survey Responses ───────────────────────────────────────────────────
create table if not exists platform_survey_responses (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references platform_announcements (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  customer_id uuid references customers (id) on delete set null,
  selected_option text not null,
  feedback_text text,
  platform text not null default 'web' check (platform in ('web', 'ios')),
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_survey_responses_announcement 
  on platform_survey_responses (announcement_id);

alter table platform_survey_responses enable row level security;

drop policy if exists "platform_survey_responses_insert" on platform_survey_responses;
create policy "platform_survey_responses_insert" on platform_survey_responses
  for insert with check (true);

drop policy if exists "platform_survey_responses_user_select" on platform_survey_responses;
create policy "platform_survey_responses_user_select" on platform_survey_responses
  for select using (
    auth.uid() = user_id or exists (
      select 1 from customers c where c.id = customer_id and c.user_id = auth.uid()
    )
  );

-- ── 3. Ecosystem App Proposals (Pro Profile) ──────────────────────────────
create table if not exists ecosystem_app_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid references restaurants (id) on delete set null,
  app_name text not null,
  category text not null,
  description text not null,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'planned', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ecosystem_app_proposals_user 
  on ecosystem_app_proposals (user_id, created_at desc);

alter table ecosystem_app_proposals enable row level security;

drop policy if exists "ecosystem_app_proposals_user_select" on ecosystem_app_proposals;
create policy "ecosystem_app_proposals_user_select" on ecosystem_app_proposals
  for select using (auth.uid() = user_id);

drop policy if exists "ecosystem_app_proposals_user_insert" on ecosystem_app_proposals;
create policy "ecosystem_app_proposals_user_insert" on ecosystem_app_proposals
  for insert with check (auth.uid() = user_id);

-- ── 4. Seed Initial Announcement with Poll ────────────────────────────────
insert into platform_announcements (
  title,
  body,
  badge_label,
  category,
  poll_question,
  poll_options,
  is_active
)
values (
  'Votre avis compte pour Minerva Flow',
  'Nous concevons en permanence de nouveaux modules et avantages exclusifs pour enrichir votre quotidien dans vos établissements favoris.',
  'Sondage exclusif',
  'feature',
  'Seriez-vous intéressé·e par de nouvelles fonctionnalités dans votre espace client ?',
  '["Oui, absolument !", "Peut-être, selon les nouveautés", "Pas pour l''instant"]'::jsonb,
  true
)
on conflict do nothing;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0078', 'platform_announcements_and_ecosystem_proposals') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0078_platform_announcements_and_ecosystem_proposals.sql <<<

-- >>> MIGRATION 0079_restaurant_plan_tier.sql >>>
-- Phase 2 of the pricing-tier pivot (via /grill-me): a single, additive
-- column is the whole gating mechanism — not a git branch. One codebase,
-- behavior conditioned on this field, so moving a restaurant from
-- essentiel to croissance is a one-row update, not a redeploy.
--
-- Defaults every existing (and future) restaurant to 'essentiel', the
-- $99/mo single-restaurant loyalty tier — nothing changes for anyone
-- until a feature actually starts checking this column (see Phase 3:
-- discovery scoped to same-workspace for 'essentiel').

begin;

alter table restaurants
  add column if not exists plan_tier text not null default 'essentiel'
  check (plan_tier in ('essentiel', 'croissance', 'marque_blanche'));

create index if not exists idx_restaurants_plan_tier on restaurants (plan_tier);

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0079', 'restaurant_plan_tier') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0079_restaurant_plan_tier.sql <<<

-- >>> MIGRATION 0080_consolidate_billing_plan_tiers.sql >>>
-- 0080_consolidate_billing_plan_tiers.sql
-- Minerva Flow: consolidates the two plan-tier naming systems into one.
--
-- Until now, `restaurants.plan_tier` (0079, per-restaurant feature gating:
-- essentiel/croissance/marque_blanche) and `subscriptions.plan_tier` /
-- `workspace_ai_usage.plan_tier` (0053/0065, workspace-level billing:
-- starter/pro/enterprise) used different names for what the business has
-- decided is the same three-tier concept, at $99/$250/$500 respectively.
-- This migration renames the billing-side values to match. Confirmed zero
-- rows exist in either subscriptions or workspace_ai_usage in production —
-- the UPDATEs below are defensive (in case that changes between review and
-- apply), not a real data migration.

begin;

update workspace_ai_usage
set plan_tier = case plan_tier
  when 'starter' then 'essentiel'
  when 'pro' then 'croissance'
  when 'enterprise' then 'marque_blanche'
  else plan_tier
end
where plan_tier in ('starter', 'pro', 'enterprise');

update subscriptions
set plan_tier = case plan_tier
  when 'starter' then 'essentiel'
  when 'pro' then 'croissance'
  when 'enterprise' then 'marque_blanche'
  else plan_tier
end
where plan_tier in ('starter', 'pro', 'enterprise');

alter table workspace_ai_usage drop constraint if exists workspace_ai_usage_plan_tier_check;
alter table workspace_ai_usage add constraint workspace_ai_usage_plan_tier_check
  check (plan_tier in ('essentiel', 'croissance', 'marque_blanche'));
alter table workspace_ai_usage alter column plan_tier set default 'essentiel';

alter table subscriptions drop constraint if exists subscriptions_plan_tier_check;
alter table subscriptions add constraint subscriptions_plan_tier_check
  check (plan_tier in ('essentiel', 'croissance', 'marque_blanche'));

-- Default parameter can't be altered in place — recreate with the exact same
-- body as 0053_ai_token_quotas_and_usage.sql, only the default value changes.
create or replace function record_workspace_ai_tokens(
  p_workspace_id uuid,
  p_tokens integer,
  p_default_quota integer default 100000,
  p_plan_tier text default 'essentiel'
)
returns table (
  tokens_used integer,
  monthly_quota integer,
  is_quota_exceeded boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_period_start timestamptz := date_trunc('month', v_now);
  v_period_end timestamptz := v_period_start + interval '1 month';
  v_rec record;
begin
  insert into workspace_ai_usage (
    workspace_id,
    plan_tier,
    monthly_token_quota,
    tokens_used_current_period,
    period_start,
    period_end,
    total_lifetime_tokens,
    updated_at
  )
  values (
    p_workspace_id,
    p_plan_tier,
    p_default_quota,
    p_tokens,
    v_period_start,
    v_period_end,
    p_tokens,
    v_now
  )
  on conflict (workspace_id) do update
  set
    tokens_used_current_period = case
      when workspace_ai_usage.period_end <= v_now then p_tokens
      else workspace_ai_usage.tokens_used_current_period + p_tokens
    end,
    period_start = case
      when workspace_ai_usage.period_end <= v_now then v_period_start
      else workspace_ai_usage.period_start
    end,
    period_end = case
      when workspace_ai_usage.period_end <= v_now then v_period_end
      else workspace_ai_usage.period_end
    end,
    total_lifetime_tokens = workspace_ai_usage.total_lifetime_tokens + p_tokens,
    updated_at = v_now
  returning workspace_ai_usage.tokens_used_current_period, workspace_ai_usage.monthly_token_quota
  into v_rec;

  return query select
    v_rec.tokens_used_current_period,
    v_rec.monthly_token_quota,
    (v_rec.tokens_used_current_period > v_rec.monthly_token_quota);
end;
$$;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0080', 'consolidate_billing_plan_tiers') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0080_consolidate_billing_plan_tiers.sql <<<

-- >>> MIGRATION 0081_email_events.sql >>>
-- Minerva Flow — Suivi des résultats des séquences d'emails (lifecycle,
-- rétention, facturation). Reçoit les événements Resend (delivered, opened,
-- clicked, bounced, complained) via app/api/webhooks/resend/route.ts et les
-- journalise, corrélés au resend_id déjà stocké dans
-- user_lifecycle_emails.metadata.resend_id / customer_retention_sends.
-- Journal brut (pas de projection d'état) : un email ouvert 3 fois produit
-- 3 lignes "opened" — suffisant pour un taux d'ouverture/clic par étape,
-- sans avoir à gérer de mise à jour concurrente d'un compteur.

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text not null,
  event_type text not null, -- 'sent' | 'delivered' | 'delivery_delayed' | 'complained' | 'bounced' | 'opened' | 'clicked'
  recipient text,
  link_url text, -- present only for 'clicked'
  occurred_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_events_resend_email_id on public.email_events(resend_email_id);
create index if not exists idx_email_events_event_type on public.email_events(event_type);
create index if not exists idx_email_events_occurred_at on public.email_events(occurred_at);

alter table public.email_events enable row level security;

-- Écrit uniquement par le webhook (service role) ; lu par les admins Minerva
-- pour le suivi des séquences — aucun accès restaurant/membre direct.
create policy "Service role full access on email_events"
  on public.email_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0081', 'email_events') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0081_email_events.sql <<<

-- >>> MIGRATION 0082_physical_touchpoints.sql >>>
-- Physical touchpoint attribution layer: every NFC tag / QR sticker / table
-- chevalet a restaurant places in its venue points at
-- https://minervaflow.app/t/[code] instead of a fixed destination. The
-- redirect route (app/[locale]/t/[code]/route.ts) logs a
-- 'touchpoint_opened' event then 302s onward to the real existing flow
-- (loyalty join /f/[token], menu /m/[token], a Google review link, etc.),
-- carrying the code as ?tp= so downstream pages can attribute
-- signup_started/signup_completed/loyalty_activated/etc. back to the exact
-- physical spot that drove it. See AGENTS.md for the full funnel spec.

begin;

create table if not exists physical_touchpoints (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  type text not null check (type in ('caisse', 'comptoir', 'table', 'vitrine', 'sortie', 'sac_recu', 'carte_client', 'autre')),
  label text not null,
  code text not null unique,
  destination_kind text not null check (destination_kind in ('loyalty_join', 'menu', 'review', 'custom_url')),
  -- loyalty_join/menu: a token resolved against the matching share table at
  -- redirect time. review/custom_url: a raw URL, stored as-is (a Google
  -- review link never lives in this app's own tables).
  destination_value text not null,
  campaign_id uuid references campaigns (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_physical_touchpoints_restaurant on physical_touchpoints (restaurant_id);

create table if not exists physical_touchpoint_events (
  id uuid primary key default gen_random_uuid(),
  touchpoint_id uuid not null references physical_touchpoints (id) on delete cascade,
  event_type text not null check (event_type in (
    'touchpoint_opened', 'app_opened', 'app_installed_or_download_clicked',
    'signup_started', 'signup_completed', 'venue_joined', 'loyalty_activated',
    'offer_redeemed', 'review_flow_started', 'review_submitted'
  )),
  occurred_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_physical_touchpoint_events_touchpoint on physical_touchpoint_events (touchpoint_id);
create index if not exists idx_physical_touchpoint_events_type on physical_touchpoint_events (event_type);

alter table physical_touchpoints enable row level security;
alter table physical_touchpoint_events enable row level security;

-- Management (create/edit/delete the physical inventory) is owner/manager
-- only, same gate as the existing Partage/QR tooling it extends.
drop policy if exists "physical_touchpoints_manage_select" on physical_touchpoints;
create policy "physical_touchpoints_manage_select" on physical_touchpoints for select
  using (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

drop policy if exists "physical_touchpoints_manage_insert" on physical_touchpoints;
create policy "physical_touchpoints_manage_insert" on physical_touchpoints for insert
  with check (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

drop policy if exists "physical_touchpoints_manage_update" on physical_touchpoints;
create policy "physical_touchpoints_manage_update" on physical_touchpoints for update
  using (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

drop policy if exists "physical_touchpoints_manage_delete" on physical_touchpoints;
create policy "physical_touchpoints_manage_delete" on physical_touchpoints for delete
  using (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

-- Events are written anonymously from the public /t/[code] redirect (via
-- the admin client, same as customer_referral_links' recordClick) and read
-- by owner/manager for the attribution dashboard.
drop policy if exists "physical_touchpoint_events_manage_select" on physical_touchpoint_events;
create policy "physical_touchpoint_events_manage_select" on physical_touchpoint_events for select
  using (
    exists (
      select 1 from physical_touchpoints tp
      where tp.id = physical_touchpoint_events.touchpoint_id
        and is_restaurant_member(tp.restaurant_id, array['owner', 'manager']::member_role[])
    )
  );

drop policy if exists "physical_touchpoint_events_service_insert" on physical_touchpoint_events;
create policy "physical_touchpoint_events_service_insert" on physical_touchpoint_events for insert
  with check (auth.role() = 'service_role');

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0082', 'physical_touchpoints') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0082_physical_touchpoints.sql <<<

-- >>> MIGRATION 0083_nfc_card_orders.sql >>>
-- Fulfillment record for the $75 CAD "carte NFC personnalisée" one-time
-- add-on (see scripts/create-stripe-nfc-card-price.ts). Only ever written
-- once Stripe confirms payment (app/api/stripe/webhook/route.ts) — an
-- abandoned Checkout session leaves no row here, Stripe's own dashboard is
-- the record of that. Shipping details are copied out of the Checkout
-- session at webhook time purely so Kael doesn't have to open the Stripe
-- dashboard to pack an order.

begin;

create table if not exists nfc_card_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  quantity int not null check (quantity > 0),
  unit_price_cad numeric(10, 2) not null,
  total_amount_cad numeric(10, 2) not null,
  status text not null default 'paid' check (status in ('paid', 'shipped', 'fulfilled', 'cancelled')),
  shipping_name text,
  shipping_address jsonb,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_nfc_card_orders_restaurant on nfc_card_orders (restaurant_id);

alter table nfc_card_orders enable row level security;

drop policy if exists "nfc_card_orders_manage_select" on nfc_card_orders;
create policy "nfc_card_orders_manage_select" on nfc_card_orders for select
  using (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

drop policy if exists "nfc_card_orders_service_insert" on nfc_card_orders;
create policy "nfc_card_orders_service_insert" on nfc_card_orders for insert
  with check (auth.role() = 'service_role');

drop policy if exists "nfc_card_orders_service_update" on nfc_card_orders;
create policy "nfc_card_orders_service_update" on nfc_card_orders for update
  using (auth.role() = 'service_role');

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0083', 'nfc_card_orders') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0083_nfc_card_orders.sql <<<

-- >>> MIGRATION 0084_demo_customer_and_menu_seed.sql >>>
-- The native app's dev-test customer (dev-test@minervaflow.app, used by
-- the #if DEBUG bypass button in AuthView.swift) was linked to a leftover,
-- empty auto-provisioned restaurant from before the OTP/is_customer
-- linking logic existed — a different "Mon restaurant" row than the one
-- actually used for owner-side testing. That empty restaurant, plus the
-- owner-side one *also* having zero menu items/offers/rewards, is what
-- produced "Aucun profil trouvé" / an empty Home & Rewards screen: real
-- customer row, but nothing behind it to show.
--
-- Re-points the demo customer at the real owner-side restaurant and seeds
-- it with a full menu/offers/rewards set, so both the web (owner) and
-- native (customer) sides of manual testing reflect the same restaurant
-- with real data. Never touches auth.users or the customers row's
-- identity — only which restaurant it points to.

begin;

update customers
set restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3'
where user_id = 'f43acb06-4025-4953-b225-666587619c64';

insert into menu_items (restaurant_id, name, category, price, description, active) values
('38038211-f045-4f1c-af96-a44cb51179a3', 'Espresso', 'Boissons', 3.25, 'Simple, double sur demande.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Latte', 'Boissons', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cappuccino', 'Boissons', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Chocolat chaud maison', 'Boissons', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Thé glacé maison', 'Boissons', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Croissant', 'Pâtisserie', 3.25, 'Pur beurre, feuilleté maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pain au chocolat', 'Pâtisserie', 3.50, 'Deux bâtons de chocolat noir.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cookie choco-noisette', 'Pâtisserie', 3.75, 'Cuit sur place chaque matin.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bol déjeuner protéiné', 'Plats', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Toast avocat', 'Plats', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Croque-monsieur', 'Plats', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Salade César au poulet', 'Plats', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger Wagyu', 'Plats', 18.95, 'Boeuf wagyu, cheddar vieilli, oignons caramélisés.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Tarte au citron', 'Desserts', 6.25, 'Citron frais, meringue italienne.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('38038211-f045-4f1c-af96-a44cb51179a3', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café au choix','Pâtisserie au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Formule dîner', 'Un plat principal avec une boisson chaude ou froide.', true, 15.95, array['Plat au choix','Boisson au choix'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('38038211-f045-4f1c-af96-a44cb51179a3', 'Café offert', 60, 'Un café chaud ou glacé de votre choix.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pâtisserie offerte', 90, 'Une pâtisserie au choix, gratuite.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bol déjeuner offert', 180, 'Le bol déjeuner protéiné, gratuit.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger Wagyu offert', 320, 'Notre burger signature, gratuit.', true)
on conflict do nothing;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0084', 'demo_customer_and_menu_seed') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0084_demo_customer_and_menu_seed.sql <<<

-- >>> MIGRATION 0085_demo_restaurant_coordinates.sql >>>
-- Second half of the demo-account fix (0084): the map/discover screen
-- requires lat/lng (see app/api/portal/discover/route.ts's
-- .not("lat", "is", null).not("lng", "is", null)) — the owner-side demo
-- restaurant had neither, so it never appeared on the native map even
-- after 0084 gave it menu items/offers/rewards. Same root cause as the
-- Home/Rewards bug, different missing field. Repentigny, QC town center —
-- close enough for a demo pin, not claiming a specific street address that
-- was never actually set by the owner.

begin;

update restaurants
set lat = 45.7407,
    lng = -73.4544,
    city = coalesce(city, 'Repentigny'),
    province = coalesce(province, 'QC')
where id = '38038211-f045-4f1c-af96-a44cb51179a3';

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0085', 'demo_restaurant_coordinates') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0085_demo_restaurant_coordinates.sql <<<

-- >>> MIGRATION 0086_pairing_codes.sql >>>
-- Card pairing code: a rotating 6-digit code (+ QR of the same digits) shown
-- on the customer's digital card (MyCardView, native app), just below the
-- existing per-restaurant checkout QR. Unlike reward_redemptions.code (single
-- use, minted per redemption, scoped to one restaurant_id), this code is
-- anchored to the customer's auth user_id so the SAME code works at whichever
-- participating restaurant looks it up -- "pairs directly to their account."
-- Staff resolve it manually (no camera scanning exists on the web dashboard
-- today, see FidelisationView's RewardValidationCard for the precedent this
-- follows) to identify the customer, then log a visit in the same panel
-- using the existing logVisit/increment_customer_visit flow -- this feature
-- only needs to solve "look up by code," not points math (already exists).

begin;

create table pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references auth.users (id),
  used_restaurant_id uuid references restaurants (id)
);

-- Only ever looked up by (unexpired, unused) code, so partial index keeps
-- the hot lookup path small regardless of how many expired/used rows pile up.
create unique index pairing_codes_active_code_idx
  on pairing_codes (code)
  where used_at is null;

create index pairing_codes_user_id_idx on pairing_codes (user_id);

alter table pairing_codes enable row level security;

-- No direct table access from clients at all -- every interaction goes
-- through the two security-definer RPCs below, which enforce who can mint
-- (the code's own owner) and who can resolve (a member of the restaurant
-- doing the lookup). This mirrors reward_redemptions' RLS-plus-RPC shape.
create policy "pairing_codes_no_direct_access"
  on pairing_codes for all
  using (false)
  with check (false);

-- Mints a fresh code for the calling auth user, invalidating any code they
-- already had outstanding (defensive: a customer reopening MyCardView
-- shouldn't accumulate live codes, and an old code a staff member wrote down
-- must stop working the moment a new one is minted).
create or replace function mint_pairing_code()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_expires_at timestamptz := now() + interval '5 minutes';
  v_attempts int := 0;
begin
  if v_user_id is null then
    raise exception 'Authentification requise.';
  end if;

  -- Expire (not delete) this user's prior outstanding code so used_by/
  -- used_restaurant_id history for support/debugging isn't lost.
  update pairing_codes
  set expires_at = now()
  where user_id = v_user_id
    and used_at is null
    and expires_at > now();

  loop
    v_attempts := v_attempts + 1;
    v_code := lpad(floor(random() * 1000000)::text, 6, '0');

    begin
      insert into pairing_codes (user_id, code, expires_at)
      values (v_user_id, v_code, v_expires_at);
      exit;
    exception when unique_violation then
      if v_attempts >= 10 then
        raise exception 'Impossible de générer un code, réessayez.';
      end if;
      -- Loop again with a new random code; the partial unique index only
      -- blocks a collision against another still-active code.
    end;
  end loop;

  return query select v_code, v_expires_at;
end;
$$;

grant execute on function mint_pairing_code() to authenticated;

-- Resolves a code for a staff member of a specific restaurant, identifying
-- the customer and marking the code used in the same call. Deliberately
-- does NOT log a visit itself -- the caller (FidelisationView's new panel)
-- chains this into the existing logVisitAction once it has the customer id,
-- so points math stays in exactly one place.
create or replace function resolve_pairing_code(p_restaurant_id uuid, p_code text)
returns table (
  customer_id uuid,
  customer_name text,
  loyalty_points int,
  visit_count int,
  total_spent numeric,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row pairing_codes%rowtype;
  v_customer customers%rowtype;
begin
  if not is_restaurant_member(p_restaurant_id) then
    raise exception 'Accès refusé.';
  end if;

  if p_code is null or length(trim(p_code)) <> 6 then
    raise exception 'Code invalide.';
  end if;

  select * into v_row
  from pairing_codes
  where code = trim(p_code) and used_at is null
  limit 1;

  if not found then
    raise exception 'Code invalide ou déjà utilisé.';
  end if;

  if v_row.expires_at <= now() then
    raise exception 'Ce code a expiré, demandez au client d''en régénérer un.';
  end if;

  select * into v_customer
  from customers
  where user_id = v_row.user_id and restaurant_id = p_restaurant_id
  limit 1;

  if not found then
    raise exception 'Ce client n''est pas encore membre de cet établissement.';
  end if;

  update pairing_codes
  set used_at = now(), used_by = auth.uid(), used_restaurant_id = p_restaurant_id
  where id = v_row.id;

  return query
  select v_customer.id, v_customer.name, v_customer.loyalty_points,
         v_customer.visit_count, v_customer.total_spent, v_customer.avatar_url;
end;
$$;

grant execute on function resolve_pairing_code(uuid, text) to authenticated;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0086', 'pairing_codes') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0086_pairing_codes.sql <<<

-- >>> MIGRATION 0087_demo_menu_expansion.sql >>>
-- 0084 seeded the demo restaurant with a thin 14-item/2-offer café menu —
-- enough to prove the Commander screen could render real data, but nowhere
-- near "a real restaurant and café" as requested for manual testing.
-- Replaces that seed with a genuinely large, categorized menu. Only deletes
-- the menu_items/offers rows THIS project seeded in 0084 for restaurant
-- 38038211 — never touches the customers row, auth.users, or the
-- restaurant row itself (see the standing "never destroy the demo account"
-- constraint). loyalty_rewards is left as-is: its four reward
-- descriptions are free text, not FK-linked to a specific menu_items row,
-- and the anchor items they describe (an espresso-style coffee, a
-- pastry, the protein breakfast bowl, the Wagyu burger) all still exist
-- by name below, so no reward-side change is needed for them to keep
-- reading sensibly.

begin;

delete from offers where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';
delete from menu_items where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';

insert into menu_items (restaurant_id, name, category, price, description, active) values
-- Café & boissons chaudes
('38038211-f045-4f1c-af96-a44cb51179a3', 'Espresso', 'Café & boissons chaudes', 3.25, 'Simple, double sur demande.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Americano', 'Café & boissons chaudes', 3.75, 'Espresso allongé à l''eau chaude.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Latte', 'Café & boissons chaudes', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cappuccino', 'Café & boissons chaudes', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Flat White', 'Café & boissons chaudes', 5.10, 'Double espresso, lait micro-moussé.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Café mocha', 'Café & boissons chaudes', 5.50, 'Espresso, chocolat noir, lait vapeur, chantilly.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Chai latte', 'Café & boissons chaudes', 5.15, 'Thé épicé infusé, lait vapeur.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Chocolat chaud maison', 'Café & boissons chaudes', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Thé en feuilles', 'Café & boissons chaudes', 3.50, 'Sélection de thés noirs, verts et infusions.', true),
-- Boissons froides
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cold brew', 'Boissons froides', 4.75, 'Infusion à froid 18h, servi sur glace.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Iced latte', 'Boissons froides', 5.50, 'Espresso, lait froid, glace.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Thé glacé maison', 'Boissons froides', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Limonade fraise-basilic', 'Boissons froides', 4.95, 'Citron pressé, fraises fraîches, basilic.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Kombucha maison', 'Boissons froides', 5.25, 'Fermentation locale, saveur du moment.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Eau pétillante et citron', 'Boissons froides', 2.75, 'Rafraîchissante, servie glacée.', true),
-- Brunch
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bol déjeuner protéiné', 'Brunch', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Toast avocat', 'Brunch', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Œufs bénédictine', 'Brunch', 14.95, 'Muffin anglais, jambon fumé, sauce hollandaise maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Croque-monsieur', 'Brunch', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pain doré brioché', 'Brunch', 11.50, 'Sirop d''érable, beurre, fruits rouges.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Omelette du chef', 'Brunch', 12.50, 'Fromage suisse, champignons sautés, fines herbes.', true),
-- Entrées
('38038211-f045-4f1c-af96-a44cb51179a3', 'Soupe du jour', 'Entrées', 6.95, 'Recette maison, change chaque semaine.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Planche de fromages québécois', 'Entrées', 16.95, 'Trois fromages locaux, confiture, craquelins.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Calmars frits', 'Entrées', 12.95, 'Panure légère, aïoli citronné.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bruschetta tomates-basilic', 'Entrées', 9.50, 'Pain grillé, tomates fraîches, huile d''olive.', true),
-- Salades
('38038211-f045-4f1c-af96-a44cb51179a3', 'Salade César au poulet', 'Salades', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Salade de quinoa et légumes rôtis', 'Salades', 12.95, 'Quinoa, courge, betterave, vinaigrette érable-moutarde.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Salade grecque', 'Salades', 11.95, 'Feta, olives kalamata, concombre, tomate, oignon rouge.', true),
-- Burgers
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger Wagyu', 'Burgers', 18.95, 'Boeuf wagyu, cheddar vieilli, oignons caramélisés.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger classique maison', 'Burgers', 15.50, 'Boeuf haché frais, laitue, tomate, sauce maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger poulet croustillant', 'Burgers', 15.95, 'Poulet pané, slaw croquant, mayo épicée.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Burger végé maison', 'Burgers', 14.95, 'Galette de légumineuses maison, avocat, roquette.', true),
-- Pâtes
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pâtes à la carbonara', 'Pâtes', 16.50, 'Pancetta, jaune d''œuf, parmesan, poivre noir.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pâtes bolognaise maison', 'Pâtes', 15.95, 'Sauce mijotée 6h, boeuf et porc.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Risotto aux champignons sauvages', 'Pâtes', 17.95, 'Riz arborio, parmesan, huile de truffe.', true),
-- Sandwichs
('38038211-f045-4f1c-af96-a44cb51179a3', 'Club sandwich classique', 'Sandwichs', 13.95, 'Poulet, bacon, laitue, tomate, mayo maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Panini au jambon et brie', 'Sandwichs', 11.95, 'Jambon fumé, brie, confiture de figues.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Wrap au saumon fumé', 'Sandwichs', 13.50, 'Saumon fumé, fromage à la crème, câpres, aneth.', true),
-- Pizza
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pizza margherita', 'Pizza', 14.95, 'Sauce tomate, mozzarella fraîche, basilic.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pizza pepperoni', 'Pizza', 15.95, 'Pepperoni, mozzarella, sauce tomate épicée.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pizza végétarienne', 'Pizza', 15.50, 'Légumes grillés, feta, pesto.', true),
-- Plats principaux
('38038211-f045-4f1c-af96-a44cb51179a3', 'Saumon grillé, légumes de saison', 'Plats principaux', 22.95, 'Saumon de l''Atlantique, purée maison, légumes rôtis.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Bavette de boeuf, frites maison', 'Plats principaux', 24.95, 'Bavette grillée, beurre aux herbes, frites fraîches.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Poitrine de poulet farcie', 'Plats principaux', 19.95, 'Farcie aux épinards et fromage de chèvre.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Curry de légumes et pois chiches', 'Plats principaux', 16.95, 'Lait de coco, riz basmati, coriandre fraîche.', true),
-- Desserts
('38038211-f045-4f1c-af96-a44cb51179a3', 'Tarte au citron', 'Desserts', 6.25, 'Citron frais, meringue italienne.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Gâteau au fromage new-yorkais', 'Desserts', 7.50, 'Coulis de fruits rouges maison.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Fondant au chocolat', 'Desserts', 7.95, 'Coeur coulant, crème glacée vanille.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Cookie choco-noisette', 'Desserts', 3.75, 'Cuit sur place chaque matin.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Pain au chocolat', 'Desserts', 3.50, 'Deux bâtons de chocolat noir.', true),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Croissant', 'Desserts', 3.25, 'Pur beurre, feuilleté maison.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('38038211-f045-4f1c-af96-a44cb51179a3', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café ou boisson chaude au choix','Pâtisserie au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Formule dîner', 'Un plat principal avec une boisson chaude ou froide.', true, 15.95, array['Plat au choix (Salades, Burgers, Sandwichs ou Pâtes)','Boisson au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Brunch de la fin de semaine', 'Un plat brunch avec un café ou un jus.', true, 16.95, array['Plat brunch au choix','Café ou boisson froide au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Soirée pizza en duo', 'Deux pizzas au choix pour partager.', true, 27.95, array['Deux pizzas au choix']),
('38038211-f045-4f1c-af96-a44cb51179a3', 'Table d''hôte du soir', 'Entrée, plat principal et dessert.', true, 34.95, array['Entrée au choix','Plat principal au choix','Dessert au choix'])
on conflict do nothing;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0087', 'demo_menu_expansion') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0087_demo_menu_expansion.sql <<<

-- >>> MIGRATION 0088_fix_mint_pairing_code_ambiguity.sql >>>
-- Real bug caught via live testing: RETURNS TABLE (code text, expires_at
-- timestamptz) implicitly declares `code`/`expires_at` as PL/pgSQL
-- variables in scope for the whole function body, which collided with
-- pairing_codes' own `code`/`expires_at` columns in the invalidate-prior-
-- code UPDATE's WHERE clause — Postgres error 42702 "column reference
-- expires_at is ambiguous" on every call, confirmed by calling the RPC
-- directly as the real dev-test user. Qualifying every reference to the
-- table's own columns with the table name removes the ambiguity.

begin;

create or replace function mint_pairing_code()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_expires_at timestamptz := now() + interval '5 minutes';
  v_attempts int := 0;
begin
  if v_user_id is null then
    raise exception 'Authentification requise.';
  end if;

  update pairing_codes
  set expires_at = now()
  where pairing_codes.user_id = v_user_id
    and pairing_codes.used_at is null
    and pairing_codes.expires_at > now();

  loop
    v_attempts := v_attempts + 1;
    v_code := lpad(floor(random() * 1000000)::text, 6, '0');

    begin
      insert into pairing_codes (user_id, code, expires_at)
      values (v_user_id, v_code, v_expires_at);
      exit;
    exception when unique_violation then
      if v_attempts >= 10 then
        raise exception 'Impossible de générer un code, réessayez.';
      end if;
    end;
  end loop;

  return query select v_code, v_expires_at;
end;
$$;

grant execute on function mint_pairing_code() to authenticated;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0088', 'fix_mint_pairing_code_ambiguity') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0088_fix_mint_pairing_code_ambiguity.sql <<<

-- >>> MIGRATION 0089_fix_demo_restaurant_pointer.sql >>>
-- Corrects a real setup mistake surfaced by live testing: the native
-- dev-test customer (0084) was pointed at "Mon restaurant" (38038211),
-- which is actually quebecsaas@gmail.com's real production restaurant —
-- not a demo one. The real, already-set-up demo restaurant is
-- "Minerva Flow — Démo" (60a59423, owned by a separate demo@minervaflow.app
-- account), which already had its own real menu/offers/rewards and
-- coordinates before this session touched anything. Never touches
-- auth.users or deletes the customers row — only which restaurant it
-- points to, same as 0084's own re-point, plus removing the test content
-- 0084/0087 wrongly seeded into the user's real restaurant.

begin;

-- Drop today's test artifacts created against the wrong restaurant —
-- neither is real production history, both were generated during this
-- session's own testing of the mis-scoped setup.
delete from reward_redemptions
where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3'
  and customer_id = 'b6bdc959-a32f-4239-bd66-d69756c6f208';

delete from loyalty_transactions
where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3'
  and customer_id = 'b6bdc959-a32f-4239-bd66-d69756c6f208';

-- Move the customer to the real demo restaurant and reset accumulated
-- stats to a clean baseline — those numbers were earned under the wrong
-- restaurant's context and would misrepresent a brand-new relationship
-- with this one otherwise.
update customers
set restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1',
    loyalty_points = 0,
    visit_count = 0,
    total_spent = 0,
    last_visit_at = null
where user_id = 'f43acb06-4025-4953-b225-666587619c64';

-- Restore the user's real restaurant to a clean state — it should never
-- have had test menu content in the first place.
delete from offers where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';
delete from menu_items where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';
delete from loyalty_rewards where restaurant_id = '38038211-f045-4f1c-af96-a44cb51179a3';

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0089', 'fix_demo_restaurant_pointer') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0089_fix_demo_restaurant_pointer.sql <<<

-- >>> MIGRATION 0090_seed_correct_demo_restaurant_menu.sql >>>
-- Applies the expanded restaurant+café menu (originally 0087, wrongly
-- targeted at the user's real restaurant — see 0089) to the actual demo
-- restaurant, "Minerva Flow — Démo" (60a59423), replacing its thin
-- 16-item/2-offer placeholder. Its 4 existing loyalty_rewards are left
-- untouched — generic enough ("Café ou thé offert", "Dessert offert",
-- "10% de rabais", "Menu du jour offert") to keep reading sensibly
-- against this larger menu without any changes.

begin;

delete from offers where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1';
delete from menu_items where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

insert into menu_items (restaurant_id, name, category, price, description, active) values
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Espresso', 'Café & boissons chaudes', 3.25, 'Simple, double sur demande.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Americano', 'Café & boissons chaudes', 3.75, 'Espresso allongé à l''eau chaude.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Latte', 'Café & boissons chaudes', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Cappuccino', 'Café & boissons chaudes', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Flat White', 'Café & boissons chaudes', 5.10, 'Double espresso, lait micro-moussé.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Café mocha', 'Café & boissons chaudes', 5.50, 'Espresso, chocolat noir, lait vapeur, chantilly.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Chai latte', 'Café & boissons chaudes', 5.15, 'Thé épicé infusé, lait vapeur.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Chocolat chaud maison', 'Café & boissons chaudes', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Thé en feuilles', 'Café & boissons chaudes', 3.50, 'Sélection de thés noirs, verts et infusions.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Cold brew', 'Boissons froides', 4.75, 'Infusion à froid 18h, servi sur glace.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Iced latte', 'Boissons froides', 5.50, 'Espresso, lait froid, glace.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Thé glacé maison', 'Boissons froides', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Limonade fraise-basilic', 'Boissons froides', 4.95, 'Citron pressé, fraises fraîches, basilic.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Kombucha maison', 'Boissons froides', 5.25, 'Fermentation locale, saveur du moment.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Eau pétillante et citron', 'Boissons froides', 2.75, 'Rafraîchissante, servie glacée.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Bol déjeuner protéiné', 'Brunch', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Toast avocat', 'Brunch', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Œufs bénédictine', 'Brunch', 14.95, 'Muffin anglais, jambon fumé, sauce hollandaise maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Croque-monsieur', 'Brunch', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pain doré brioché', 'Brunch', 11.50, 'Sirop d''érable, beurre, fruits rouges.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Omelette du chef', 'Brunch', 12.50, 'Fromage suisse, champignons sautés, fines herbes.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Soupe du jour', 'Entrées', 6.95, 'Recette maison, change chaque semaine.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Planche de fromages québécois', 'Entrées', 16.95, 'Trois fromages locaux, confiture, craquelins.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Calmars frits', 'Entrées', 12.95, 'Panure légère, aïoli citronné.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Bruschetta tomates-basilic', 'Entrées', 9.50, 'Pain grillé, tomates fraîches, huile d''olive.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Salade César au poulet', 'Salades', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Salade de quinoa et légumes rôtis', 'Salades', 12.95, 'Quinoa, courge, betterave, vinaigrette érable-moutarde.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Salade grecque', 'Salades', 11.95, 'Feta, olives kalamata, concombre, tomate, oignon rouge.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Burger Wagyu', 'Burgers', 18.95, 'Boeuf wagyu, cheddar vieilli, oignons caramélisés.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Burger classique maison', 'Burgers', 15.50, 'Boeuf haché frais, laitue, tomate, sauce maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Burger poulet croustillant', 'Burgers', 15.95, 'Poulet pané, slaw croquant, mayo épicée.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Burger végé maison', 'Burgers', 14.95, 'Galette de légumineuses maison, avocat, roquette.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pâtes à la carbonara', 'Pâtes', 16.50, 'Pancetta, jaune d''œuf, parmesan, poivre noir.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pâtes bolognaise maison', 'Pâtes', 15.95, 'Sauce mijotée 6h, boeuf et porc.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Risotto aux champignons sauvages', 'Pâtes', 17.95, 'Riz arborio, parmesan, huile de truffe.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Club sandwich classique', 'Sandwichs', 13.95, 'Poulet, bacon, laitue, tomate, mayo maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Panini au jambon et brie', 'Sandwichs', 11.95, 'Jambon fumé, brie, confiture de figues.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Wrap au saumon fumé', 'Sandwichs', 13.50, 'Saumon fumé, fromage à la crème, câpres, aneth.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pizza margherita', 'Pizza', 14.95, 'Sauce tomate, mozzarella fraîche, basilic.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pizza pepperoni', 'Pizza', 15.95, 'Pepperoni, mozzarella, sauce tomate épicée.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pizza végétarienne', 'Pizza', 15.50, 'Légumes grillés, feta, pesto.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Saumon grillé, légumes de saison', 'Plats principaux', 22.95, 'Saumon de l''Atlantique, purée maison, légumes rôtis.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Bavette de boeuf, frites maison', 'Plats principaux', 24.95, 'Bavette grillée, beurre aux herbes, frites fraîches.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Poitrine de poulet farcie', 'Plats principaux', 19.95, 'Farcie aux épinards et fromage de chèvre.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Curry de légumes et pois chiches', 'Plats principaux', 16.95, 'Lait de coco, riz basmati, coriandre fraîche.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Tarte au citron', 'Desserts', 6.25, 'Citron frais, meringue italienne.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Gâteau au fromage new-yorkais', 'Desserts', 7.50, 'Coulis de fruits rouges maison.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Fondant au chocolat', 'Desserts', 7.95, 'Coeur coulant, crème glacée vanille.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Cookie choco-noisette', 'Desserts', 3.75, 'Cuit sur place chaque matin.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Pain au chocolat', 'Desserts', 3.50, 'Deux bâtons de chocolat noir.', true),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Croissant', 'Desserts', 3.25, 'Pur beurre, feuilleté maison.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café ou boisson chaude au choix','Pâtisserie au choix']),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Formule dîner', 'Un plat principal avec une boisson chaude ou froide.', true, 15.95, array['Plat au choix (Salades, Burgers, Sandwichs ou Pâtes)','Boisson au choix']),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Brunch de la fin de semaine', 'Un plat brunch avec un café ou un jus.', true, 16.95, array['Plat brunch au choix','Café ou boisson froide au choix']),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Soirée pizza en duo', 'Deux pizzas au choix pour partager.', true, 27.95, array['Deux pizzas au choix']),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'Table d''hôte du soir', 'Entrée, plat principal et dessert.', true, 34.95, array['Entrée au choix','Plat principal au choix','Dessert au choix'])
on conflict do nothing;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0090', 'seed_correct_demo_restaurant_menu') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0090_seed_correct_demo_restaurant_menu.sql <<<

-- >>> MIGRATION 0091_demo_franchise_second_location.sql >>>
-- The "franchise" carousel the user asked to add to Commander already
-- exists end-to-end: essentiel-tier customers' /api/portal/discover call
-- is already scoped to same-workspace restaurants only (see
-- lib/data/discovery-scope.ts), MenuView.swift's otherRestaurantsSection
-- already renders that list as a horizontal carousel, and tapping one
-- already opens RestaurantDetailView — full menu/offers browsing AND an
-- "Itinéraire" button (MKMapItem.openInMaps with driving directions). The
-- only reason it showed nothing is the demo restaurant had no
-- workspace_id and no sibling location to show. This creates both.

begin;

insert into workspaces (id, name)
values ('7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d', 'Minerva Flow — Groupe démo');

insert into workspace_members (workspace_id, user_id, role, status)
values ('7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d', 'fbcf1300-e360-4804-b0a0-46807ccecb4d', 'owner', 'active');

update restaurants
set workspace_id = '7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d'
where id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

insert into restaurants (id, name, address, city, province, lat, lng, service_model, workspace_id, plan_tier)
values (
  'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
  'Minerva Flow — Démo (Laval)',
  '1600 Boulevard le Corbusier',
  'Laval',
  'QC',
  45.6066,
  -73.7124,
  'hybrid',
  '7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d',
  'essentiel'
);

insert into restaurant_members (restaurant_id, user_id, role, status)
values ('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'fbcf1300-e360-4804-b0a0-46807ccecb4d', 'owner', 'active');

insert into menu_items (restaurant_id, name, category, price, description, active) values
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Espresso', 'Café & boissons chaudes', 3.25, 'Simple, double sur demande.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Latte', 'Café & boissons chaudes', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Cappuccino', 'Café & boissons chaudes', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Chocolat chaud maison', 'Café & boissons chaudes', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Cold brew', 'Boissons froides', 4.75, 'Infusion à froid 18h, servi sur glace.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Thé glacé maison', 'Boissons froides', 4.50, 'Thé noir infusé, citron frais, menthe.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Croissant', 'Pâtisserie', 3.25, 'Pur beurre, feuilleté maison.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Pain au chocolat', 'Pâtisserie', 3.50, 'Deux bâtons de chocolat noir.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Cookie choco-noisette', 'Pâtisserie', 3.75, 'Cuit sur place chaque matin.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Bol déjeuner protéiné', 'Brunch', 12.95, 'Yogourt grec, granola maison, fruits de saison.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Croque-monsieur', 'Brunch', 11.95, 'Jambon blanc, gruyère, sauce béchamel maison.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Salade César au poulet', 'Salades', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café ou boisson chaude au choix','Pâtisserie au choix'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Café ou thé offert', 50, 'Tout format, toute la journée.', true),
('b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'Pâtisserie offerte', 90, 'Une pâtisserie au choix, gratuite.', true)
on conflict do nothing;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0091', 'demo_franchise_second_location') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0091_demo_franchise_second_location.sql <<<

-- >>> MIGRATION 0092_more_franchise_locations.sql >>>
-- Rounds the demo franchise out to 3 locations total so the Commander
-- carousel reads as a real chain rather than a single sibling — two more
-- under the same workspace as 0091 (Laval), each with its own small menu.

begin;

insert into restaurants (id, name, address, city, province, lat, lng, service_model, workspace_id, plan_tier)
values
  (
    'c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c',
    'Minerva Flow — Démo (Vieux-Port)',
    '400 Rue Saint-Paul Est',
    'Montréal',
    'QC',
    45.5075,
    -73.5540,
    'cafe',
    '7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d',
    'essentiel'
  ),
  (
    'd4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e',
    'Minerva Flow — Démo (Québec)',
    '1037 Rue Saint-Jean',
    'Québec',
    'QC',
    46.8123,
    -71.2065,
    'restaurant',
    '7a3f9c1e-2b4d-4e6a-9f8c-1d5e6a7b8c9d',
    'essentiel'
  );

insert into restaurant_members (restaurant_id, user_id, role, status) values
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'fbcf1300-e360-4804-b0a0-46807ccecb4d', 'owner', 'active'),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'fbcf1300-e360-4804-b0a0-46807ccecb4d', 'owner', 'active');

insert into menu_items (restaurant_id, name, category, price, description, active) values
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Espresso', 'Café & boissons chaudes', 3.25, 'Simple, double sur demande.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Cappuccino', 'Café & boissons chaudes', 4.95, 'Espresso, mousse de lait onctueuse.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Cold brew', 'Boissons froides', 4.75, 'Infusion à froid 18h, servi sur glace.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Croissant', 'Pâtisserie', 3.25, 'Pur beurre, feuilleté maison.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Cookie choco-noisette', 'Pâtisserie', 3.75, 'Cuit sur place chaque matin.', true),
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Toast avocat', 'Brunch', 10.50, 'Pain au levain, avocat écrasé, radis, graines de tournesol.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Latte', 'Café & boissons chaudes', 5.25, 'Espresso, lait mousseux, une touche de vanille.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Chocolat chaud maison', 'Café & boissons chaudes', 4.75, 'Chocolat noir fondu, lait chaud, chantilly.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Salade César au poulet', 'Salades', 13.50, 'Poulet grillé, parmesan, croûtons maison.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Burger classique maison', 'Burgers', 15.50, 'Boeuf haché frais, laitue, tomate, sauce maison.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Bavette de boeuf, frites maison', 'Plats principaux', 24.95, 'Bavette grillée, beurre aux herbes, frites fraîches.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Tarte au citron', 'Desserts', 6.25, 'Citron frais, meringue italienne.', true)
on conflict do nothing;

insert into offers (restaurant_id, title, description, active, price, included_items) values
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Duo café + pâtisserie', 'Un café au choix avec une pâtisserie, à petit prix.', true, 7.50, array['Café ou boisson chaude au choix','Pâtisserie au choix']),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Formule dîner', 'Un plat principal avec une boisson chaude ou froide.', true, 15.95, array['Plat au choix','Boisson au choix'])
on conflict do nothing;

insert into loyalty_rewards (restaurant_id, name, points_cost, description, active) values
('c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c', 'Café ou thé offert', 50, 'Tout format, toute la journée.', true),
('d4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e', 'Menu du jour offert', 450, 'Un menu du jour au choix, un par visite.', true)
on conflict do nothing;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0092', 'more_franchise_locations') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0092_more_franchise_locations.sql <<<

-- >>> MIGRATION 0093_join_restaurant_as_customer.sql >>>
-- Browsing a restaurant you're not yet a member of was a dead end — the
-- native app could show its menu/offers (RestaurantDetailView) but had no
-- way to actually become a loyalty customer there (QRScannerView.swift's
-- own comment calls this out: "browse-only, become a customer to order").
-- Idempotent self-serve join: safe to call again for a restaurant you're
-- already a member of, returns the existing row instead of erroring.

begin;

create or replace function join_restaurant_as_customer(p_restaurant_id uuid)
returns customers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing customers%rowtype;
  v_new customers%rowtype;
  v_name text;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Authentification requise.';
  end if;

  if not exists (select 1 from restaurants where id = p_restaurant_id) then
    raise exception 'Restaurant introuvable.';
  end if;

  select * into v_existing
  from customers
  where user_id = v_user_id and restaurant_id = p_restaurant_id
  limit 1;

  if found then
    return v_existing;
  end if;

  select full_name, email into v_name, v_email
  from profiles
  where id = v_user_id;

  insert into customers (restaurant_id, user_id, name, email)
  values (p_restaurant_id, v_user_id, coalesce(v_name, v_email, 'Client'), v_email)
  returning * into v_new;

  return v_new;
end;
$$;

grant execute on function join_restaurant_as_customer(uuid) to authenticated;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0093', 'join_restaurant_as_customer') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0093_join_restaurant_as_customer.sql <<<

-- >>> MIGRATION 0094_workspace_logo.sql >>>
-- Lets a franchise owner configure a shared brand image for their
-- workspace — shown as the sharp foreground image on the native app's
-- "other locations" carousel cards (MenuView.swift's franchiseCardImage),
-- which previously always fell back to a generic storefront icon since no
-- per-restaurant photo is required for a location to exist.

begin;

alter table workspaces add column if not exists logo_url text;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0094', 'workspace_logo') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0094_workspace_logo.sql <<<

-- >>> MIGRATION 0095_workspace_logo_bucket.sql >>>
-- Storage for the workspace brand logo (0094), one folder per workspace —
-- same public-bucket-with-folder-scoped-write pattern as offer-images
-- (0012_offers.sql), using is_workspace_member instead of
-- is_restaurant_member since this is workspace-scoped, not restaurant-scoped.

begin;

insert into storage.buckets (id, name, public)
values ('workspace-logos', 'workspace-logos', true)
on conflict (id) do nothing;

create policy "workspace_logos_public_read" on storage.objects for select
  using (bucket_id = 'workspace-logos');

create policy "workspace_logos_manage_write" on storage.objects for insert
  with check (
    bucket_id = 'workspace-logos'
    and is_workspace_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );

create policy "workspace_logos_manage_delete" on storage.objects for delete
  using (
    bucket_id = 'workspace-logos'
    and is_workspace_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[])
  );

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0095', 'workspace_logo_bucket') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0095_workspace_logo_bucket.sql <<<

-- >>> MIGRATION 0096_seed_demo_restaurant_photos.sql >>>
-- RestaurantDetailView's photo carousel already works end-to-end (owner
-- uploads via /etablissement's RestaurantGalleryUpload -> restaurants.image_urls
-- -> /api/portal/discover/[id] -> native photoCarousel), but every demo
-- restaurant had an empty image_urls, so the header showed nothing above
-- the title (confirmed via screenshot). Seeds real, stable, freely-licensed
-- placeholder photos (picsum.photos, a well-known reliable image service —
-- the stable picsum.photos/id/<n>/<w>/<h> URL, not the ephemeral signed
-- redirect target it 302s to) so the already-built carousel has something
-- to show for demo/testing purposes.

begin;

update restaurants set image_urls = array[
  'https://picsum.photos/id/292/1200/800',
  'https://picsum.photos/id/225/1200/800',
  'https://picsum.photos/id/1080/1200/800'
] where id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

update restaurants set image_urls = array[
  'https://picsum.photos/id/431/1200/800',
  'https://picsum.photos/id/1060/1200/800'
] where id = 'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

update restaurants set image_urls = array[
  'https://picsum.photos/id/312/1200/800',
  'https://picsum.photos/id/163/1200/800'
] where id = 'c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c';

update restaurants set image_urls = array[
  'https://picsum.photos/id/1076/1200/800',
  'https://picsum.photos/id/1069/1200/800'
] where id = 'd4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e';

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0096', 'seed_demo_restaurant_photos') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0096_seed_demo_restaurant_photos.sql <<<

-- >>> MIGRATION 0097_restore_demo_customer_history.sql >>>
-- Restores the dev-test customer's points/visit history that was reset to
-- zero in 0089_fix_demo_restaurant_pointer.sql when moving the customer
-- off the wrong restaurant — the user only wanted the restaurant pointer
-- fixed, not their accumulated test progress wiped. Recreates the same 4
-- visits + 1 adjustment (same dates/point deltas the customer had before,
-- totaling 180 points / 4 visits / ~$152 spent) under the now-correct
-- restaurant instead of the old one.

begin;

update customers
set loyalty_points = 180,
    visit_count = 4,
    total_spent = 152.00,
    last_visit_at = '2026-09-03 12:00:00+00'
where user_id = 'f43acb06-4025-4953-b225-666587619c64'
  and restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

insert into loyalty_transactions (restaurant_id, customer_id, type, amount_spent, points_delta, created_at) values
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'visite', 32.00, 40, '2026-08-07 12:00:00+00'),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'visite', 36.00, 45, '2026-08-17 12:00:00+00'),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'visite', 44.00, 55, '2026-08-27 12:00:00+00'),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'visite', 40.00, 50, '2026-09-03 12:00:00+00'),
('60a59423-c7a0-4d92-a866-3058f34c17d1', 'b6bdc959-a32f-4239-bd66-d69756c6f208', 'ajustement', null, -10, '2026-09-04 12:00:00+00');

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0097', 'restore_demo_customer_history') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0097_restore_demo_customer_history.sql <<<

-- >>> MIGRATION 0098_review_star_gating_and_offer_reviews.sql >>>
-- Phase 1 of the reputation-system bundle:
--   1. restaurant_reviews gains a visibility split — 4-5* reviews stay
--      public (same "Google Maps style" read-for-anyone as before); 1-3*
--      reviews become private (visible only to their own author and
--      restaurant staff), and automatically raise an alert so the owner
--      sees it on the new Reputation page (Phase 2) instead of it either
--      going nowhere or airing publicly.
--   2. owner_response/owner_responded_at columns, for Phase 2's respond
--      flow — the response is visible to the review's own author
--      (RLS already grants that via the author-sees-own-row clause).
--   3. offer_reviews — a structural copy of menu_item_reviews (0069),
--      giving offers the same rating/review capability dishes already
--      have. No star-gating/Google-Maps logic applies here — that stays
--      scoped to the overall-restaurant experience.

begin;

alter table restaurant_reviews
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private')),
  add column if not exists owner_response text,
  add column if not exists owner_responded_at timestamptz;

drop policy if exists "restaurant_reviews_public_select" on restaurant_reviews;
drop policy if exists "restaurant_reviews_select" on restaurant_reviews;
create policy "restaurant_reviews_select" on restaurant_reviews for select
  using (
    visibility = 'public'
    or exists (select 1 from customers c where c.id = restaurant_reviews.customer_id and c.user_id = auth.uid())
    or is_restaurant_member(restaurant_id)
  );

-- restaurant_reviews_customer_update (existing, unchanged) lets a customer
-- update their own review row — but RLS policies grant/deny whole rows,
-- not individual columns, so without this guard that same policy would
-- also let a customer silently overwrite or erase the owner's response.
-- The guard reverts owner_response/owner_responded_at to their prior
-- value on any UPDATE except one that goes through respond_to_review()
-- below (which sets a transaction-local flag), regardless of which client
-- issues the raw UPDATE.
create or replace function protect_owner_response_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.allow_owner_response_write', true), 'false') <> 'true' then
    new.owner_response := old.owner_response;
    new.owner_responded_at := old.owner_responded_at;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_reviews_protect_owner_response on restaurant_reviews;
create trigger restaurant_reviews_protect_owner_response
  before update on restaurant_reviews
  for each row execute function protect_owner_response_columns();

-- Owner responds via the Reputation page (Phase 2) — security definer so
-- it can write regardless of the restaurant_reviews RLS policies, but it
-- re-checks is_restaurant_member itself using the caller's own auth
-- context (this must be called through the normal session-scoped
-- client, not the admin client, for that check to mean anything).
create or replace function respond_to_review(p_review_id uuid, p_response text)
returns restaurant_reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_restaurant_id uuid;
  v_row restaurant_reviews%rowtype;
begin
  select restaurant_id into v_restaurant_id from restaurant_reviews where id = p_review_id;
  if v_restaurant_id is null then
    raise exception 'Avis introuvable.';
  end if;
  if not is_restaurant_member(v_restaurant_id, array['owner', 'manager', 'staff']::member_role[]) then
    raise exception 'Accès refusé.';
  end if;
  if p_response is null or length(trim(p_response)) = 0 then
    raise exception 'La réponse ne peut pas être vide.';
  end if;

  perform set_config('app.allow_owner_response_write', 'true', true);
  update restaurant_reviews
  set owner_response = p_response, owner_responded_at = now()
  where id = p_review_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function respond_to_review(uuid, text) to authenticated;

create or replace function set_review_visibility()
returns trigger
language plpgsql
as $$
begin
  new.visibility := case when new.rating < 4 then 'private' else 'public' end;
  return new;
end;
$$;

drop trigger if exists restaurant_reviews_set_visibility on restaurant_reviews;
create trigger restaurant_reviews_set_visibility
  before insert or update of rating on restaurant_reviews
  for each row execute function set_review_visibility();

create or replace function sync_review_alert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := 'review_' || new.id::text;
begin
  if new.rating < 4 then
    insert into alerts (restaurant_id, type, severity, title, detail, related_entity_type, related_entity_id, computed_key)
    values (
      new.restaurant_id,
      'review_needs_response',
      (case when new.rating <= 2 then 'critique' else 'important' end)::alert_severity,
      'Nouvel avis à traiter (' || new.rating || '★)',
      coalesce(new.comment, 'Aucun commentaire laissé.'),
      'restaurant_review',
      new.id,
      v_key
    )
    on conflict (restaurant_id, computed_key) do update
      set severity = excluded.severity, title = excluded.title, detail = excluded.detail;
  else
    -- A customer editing their review up to 4-5* resolves the concern —
    -- remove any lingering alert rather than leaving a stale one open.
    delete from alerts where restaurant_id = new.restaurant_id and computed_key = v_key;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_reviews_sync_alert on restaurant_reviews;
create trigger restaurant_reviews_sync_alert
  after insert or update of rating on restaurant_reviews
  for each row execute function sync_review_alert();

create table if not exists offer_reviews (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (offer_id, customer_id)
);

create index if not exists idx_offer_reviews_offer on offer_reviews (offer_id);
create index if not exists idx_offer_reviews_restaurant on offer_reviews (restaurant_id);

alter table offer_reviews enable row level security;

drop policy if exists "offer_reviews_public_select" on offer_reviews;
create policy "offer_reviews_public_select" on offer_reviews for select
  using (true);

drop policy if exists "offer_reviews_customer_insert" on offer_reviews;
create policy "offer_reviews_customer_insert" on offer_reviews for insert
  with check (
    exists (
      select 1 from customers c
      where c.id = offer_reviews.customer_id
        and c.restaurant_id = offer_reviews.restaurant_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "offer_reviews_customer_update" on offer_reviews;
create policy "offer_reviews_customer_update" on offer_reviews for update
  using (
    exists (select 1 from customers c where c.id = offer_reviews.customer_id and c.user_id = auth.uid())
  );

drop policy if exists "offer_reviews_customer_delete" on offer_reviews;
create policy "offer_reviews_customer_delete" on offer_reviews for delete
  using (
    exists (select 1 from customers c where c.id = offer_reviews.customer_id and c.user_id = auth.uid())
  );

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0098', 'review_star_gating_and_offer_reviews') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0098_review_star_gating_and_offer_reviews.sql <<<

-- >>> MIGRATION 0099_google_reviews.sql >>>
-- Phase 3 of the reputation-system bundle: synced Google Maps reviews,
-- distinct from restaurant_reviews (0076, in-app-only). Owner responds
-- here the same way as an in-app private review (Phase 2's Reputation
-- page); unlike restaurant_reviews there's no customer_id (Google
-- reviewers aren't necessarily loyalty customers), so no native-app
-- sync-back applies to this table.

begin;

create table if not exists google_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  google_review_id text not null,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  review_text text,
  published_at timestamptz,
  owner_response text,
  owner_responded_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (restaurant_id, google_review_id)
);

create index if not exists idx_google_reviews_restaurant on google_reviews (restaurant_id);

alter table google_reviews enable row level security;

create policy "google_reviews_staff_select" on google_reviews for select
  using (is_restaurant_member(restaurant_id));

-- No insert/update/delete policy for authenticated/anon — every write to
-- this table comes from the poll-google-reviews cron (admin/service-role
-- client, bypasses RLS) or respond_to_google_review() below.

create or replace function respond_to_google_review(p_review_id uuid, p_response text)
returns google_reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_restaurant_id uuid;
  v_row google_reviews%rowtype;
begin
  select restaurant_id into v_restaurant_id from google_reviews where id = p_review_id;
  if v_restaurant_id is null then
    raise exception 'Avis introuvable.';
  end if;
  if not is_restaurant_member(v_restaurant_id, array['owner', 'manager', 'staff']::member_role[]) then
    raise exception 'Accès refusé.';
  end if;
  if p_response is null or length(trim(p_response)) = 0 then
    raise exception 'La réponse ne peut pas être vide.';
  end if;

  update google_reviews
  set owner_response = trim(p_response), owner_responded_at = now()
  where id = p_review_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function respond_to_google_review(uuid, text) to authenticated;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0099', 'google_reviews') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0099_google_reviews.sql <<<

-- >>> MIGRATION 0100_pairing_visit_tracking_and_erp_metrics.sql >>>
-- ERP reporting: track which visits were logged via a resolved pairing
-- code (Scanner tab / MyCardView jumelage flow) so the Fidélisation
-- dashboard can report on that path specifically, plus a money
-- distributed-vs-retained estimate built from existing loyalty_transactions
-- data (no new ledger needed).

begin;

alter table loyalty_transactions
  add column if not exists via_pairing_code boolean not null default false;

-- Same body as the 0010 original, just threading through the new flag —
-- the FidelisationView's PairingCodeCard calls logVisitAction right after
-- resolvePairingCodeAction, so it's the one call site that can truthfully
-- set this to true.
create or replace function increment_customer_visit(
  p_customer_id uuid, p_restaurant_id uuid, p_amount_spent numeric, p_points_delta int, p_note text,
  p_via_pairing_code boolean default false
)
returns setof customers
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from customers where id = p_customer_id;
  if v_restaurant_id is null or v_restaurant_id != p_restaurant_id
     or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  insert into loyalty_transactions (restaurant_id, customer_id, type, amount_spent, points_delta, note, created_by, via_pairing_code)
  values (v_restaurant_id, p_customer_id, 'visite', p_amount_spent, p_points_delta, p_note, auth.uid(), p_via_pairing_code);

  return query
    update customers
    set visit_count = visit_count + 1,
        total_spent = total_spent + p_amount_spent,
        loyalty_points = loyalty_points + p_points_delta,
        last_visit_at = now()
    where id = p_customer_id
    returning *;
end;
$$;

grant execute on function increment_customer_visit(uuid, uuid, numeric, int, text, boolean) to authenticated;

-- pairing_codes has no restaurant_id until resolved, and its RLS blocks all
-- direct client access (mint/resolve go through the RPCs in 0086) — a
-- restaurant-scoped read for reporting needs its own security-definer RPC
-- rather than a relaxed select policy.
create index if not exists pairing_codes_used_restaurant_idx
  on pairing_codes (used_restaurant_id, used_at)
  where used_restaurant_id is not null;

create or replace function get_pairing_code_resolved_count(p_restaurant_id uuid, p_since timestamptz)
returns bigint
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select count(*)
  from pairing_codes
  where used_restaurant_id = p_restaurant_id
    and used_at >= p_since
    and is_restaurant_member(p_restaurant_id);
$$;

grant execute on function get_pairing_code_resolved_count(uuid, timestamptz) to authenticated;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0100', 'pairing_visit_tracking_and_erp_metrics') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0100_pairing_visit_tracking_and_erp_metrics.sql <<<

-- >>> MIGRATION 0101_toast_pos_provider.sql >>>
-- Adds Toast POS as a pos_connections provider and extends service_days
-- revenue_source constraint to include 'toast'.
alter type pos_provider add value if not exists 'toast';

do $$ begin
  alter table service_days drop constraint if exists service_days_revenue_source_check;
  alter table service_days add constraint service_days_revenue_source_check
    check (revenue_source in ('manuel', 'commandes', 'square', 'lightspeed', 'clover', 'toast'));
exception when duplicate_object then null;
end $$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0101', 'toast_pos_provider') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0101_toast_pos_provider.sql <<<

-- >>> MIGRATION 0102_menu_and_offer_review_photos.sql >>>
-- Menu-item and offer reviews only supported a star rating + comment;
-- restaurant_reviews already supports up to 6 photos (0076). Bringing
-- the other two review types to parity — same column, same cap, reusing
-- the existing "review-images" storage bucket (no new bucket needed,
-- uploadReviewImage in SupabaseManager.swift already writes there).

begin;

alter table menu_item_reviews
  add column if not exists image_urls text[] not null default '{}';

alter table menu_item_reviews
  add constraint menu_item_reviews_image_urls_max_6
    check (array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 6);

alter table offer_reviews
  add column if not exists image_urls text[] not null default '{}';

alter table offer_reviews
  add constraint offer_reviews_image_urls_max_6
    check (array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 6);

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0102', 'menu_and_offer_review_photos') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0102_menu_and_offer_review_photos.sql <<<

-- >>> MIGRATION 0102_pos_item_mappings_and_orders_idempotency.sql >>>
-- Table for mapping external POS catalog items to Minerva Flow menu items
create table if not exists pos_item_mappings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider pos_provider not null,
  external_item_id text not null,
  external_item_name text not null,
  menu_item_id uuid references menu_items (id) on delete set null,
  auto_matched boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, provider, external_item_id)
);

create index if not exists idx_pos_item_mappings_restaurant on pos_item_mappings (restaurant_id, provider);
create index if not exists idx_pos_item_mappings_menu_item on pos_item_mappings (menu_item_id);

alter table pos_item_mappings enable row level security;

drop policy if exists "pos_item_mappings_select" on pos_item_mappings;
create policy "pos_item_mappings_select" on pos_item_mappings for select
  using (is_restaurant_member(restaurant_id));

drop policy if exists "pos_item_mappings_write" on pos_item_mappings;
create policy "pos_item_mappings_write" on pos_item_mappings for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Extend orders table for POS tickets idempotency
alter table orders add column if not exists pos_provider text;
alter table orders add column if not exists external_order_id text;

-- Unique constraint ensuring POS tickets are never double-counted or double-ingested
do $$ begin
  create unique index if not exists idx_orders_restaurant_pos_external 
    on orders (restaurant_id, pos_provider, external_order_id)
    where pos_provider is not null and external_order_id is not null;
exception when duplicate_object then null;
end $$;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0102', 'pos_item_mappings_and_orders_idempotency') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0102_pos_item_mappings_and_orders_idempotency.sql <<<

-- >>> MIGRATION 0103_seed_reward_menu_item_link_demo.sql >>>
-- Demo data only: links the "Café ou thé offert" reward to an actual menu
-- item (Latte) on the demo restaurant, and gives that item a photo — the
-- reward_menu_item_link column already existed but nothing native ever
-- surfaced it, so there was nothing to visually verify against before now
-- (see RewardDetailView.swift's new linked-item card/photo).

update menu_items
set image_url = 'https://picsum.photos/seed/minerva-latte/800/600'
where id = 'e8ce0a24-341e-43da-926b-bcb5ae8ffdec' and image_url is null;

update loyalty_rewards
set menu_item_id = 'e8ce0a24-341e-43da-926b-bcb5ae8ffdec'
where id = 'f43e6de4-d92c-401e-9e52-7dc656572e65';
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0103', 'seed_reward_menu_item_link_demo') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0103_seed_reward_menu_item_link_demo.sql <<<

-- >>> MIGRATION 0104_seed_demo_reviews.sql >>>
-- Realistic-looking (fake) reviews across all 4 demo restaurants —
-- restaurant-level, menu-item, and offer reviews — mostly positive with a
-- minority low-rated on purpose: the review-star-gating trigger (0098)
-- automatically marks rating<4 restaurant reviews 'private' and raises a
-- Reputation alert, so this is also what first populates the Reputation
-- page with something real to respond to. A subset of rows get a seeded
-- picsum photo, matching the pattern already used for restaurant/menu
-- photos elsewhere in this session.
--
-- Demo-only: every insert is scoped to the 4 known demo restaurant ids.

begin;

do $$
declare
  v_restaurant record;
  v_item record;
  v_offer record;
  v_customer_ids uuid[];
  v_customer_id uuid;
  v_idx int;
  v_rating int;
  v_comment text;
  v_images text[];
  counter int := 0;

  positive5 text[] := array[
    'Service impeccable et ambiance chaleureuse, on reviendra sans hésiter !',
    'Meilleur café du quartier, le personnel est toujours souriant.',
    'Une valeur sûre — j''y vais chaque semaine, jamais déçu.',
    'Cadre magnifique, plats savoureux, je recommande à 100 %.',
    'Excellent rapport qualité-prix, portions généreuses.',
    'L''équipe est aux petits soins, on se sent comme à la maison.'
  ];
  positive4 text[] := array[
    'Très bonne expérience dans l''ensemble, juste un peu d''attente aux heures de pointe.',
    'Bon plat, service rapide, rien à redire de plus.',
    'J''aime beaucoup cet endroit, le café pourrait être un peu plus chaud.',
    'Belle découverte, on y retournera avec plaisir.'
  ];
  negative text[] := array[
    'Attente beaucoup trop longue pour un service qui n''était pas à la hauteur.',
    'Plat froid à l''arrivée, déçu de mon expérience cette fois.',
    'Le personnel semblait débordé, communication difficile.',
    'Prix élevé pour la qualité reçue, je m''attendais à mieux.'
  ];
  item5 text[] := array[
    'Absolument délicieux, je le recommande fortement !',
    'Un classique réussi, toujours aussi bon.',
    'Portion généreuse et super savoureux.',
    'Mon plat préféré du menu, sans hésitation.'
  ];
  item4 text[] := array[
    'Très bon, j''aurais aimé un peu plus d''assaisonnement.',
    'Bien présenté et savoureux, une valeur sûre.'
  ];
  item3 text[] := array[
    'Correct sans plus, rien d''exceptionnel.'
  ];
  item_neg text[] := array[
    'Un peu déçu, je m''attendais à mieux pour le prix.',
    'Froid à la réception, dommage.'
  ];
  offer5 text[] := array[
    'Excellent rapport qualité-prix pour cette offre, à ne pas manquer !',
    'Profité de cette promo, vraiment satisfait.'
  ];
  offer4 text[] := array[
    'Bonne offre, service au rendez-vous.'
  ];
  offer_neg text[] := array[
    'L''offre était bien mais la quantité un peu juste.'
  ];
begin
  -- Extra walk-in reviewer profiles for the 3 franchise siblings, which
  -- otherwise have 0-1 customer each — not enough distinct people for a
  -- Google-Maps-style spread of reviews. The main demo restaurant already
  -- has 51.
  for v_restaurant in
    select id from restaurants
    where id in (
      'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
      'c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c',
      'd4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e'
    )
  loop
    insert into customers (restaurant_id, name) values
      (v_restaurant.id, 'Camille Roy'),
      (v_restaurant.id, 'Simon Bélanger'),
      (v_restaurant.id, 'Léa Fortin'),
      (v_restaurant.id, 'Nathan Girard'),
      (v_restaurant.id, 'Olivia Bergeron'),
      (v_restaurant.id, 'Antoine Morin');
  end loop;

  -- Restaurant-level reviews: 6 per restaurant, mostly positive.
  for v_restaurant in
    select id from restaurants
    where id in (
      '60a59423-c7a0-4d92-a866-3058f34c17d1',
      'b2e4f6a8-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
      'c3f5a7b9-2d4e-4f6a-9b8c-1e2d3f4a5b6c',
      'd4a6b8c0-3e5f-4a7b-8c9d-2f3a4b5c6d7e'
    )
  loop
    select array_agg(id) into v_customer_ids from customers where restaurant_id = v_restaurant.id;
    if v_customer_ids is null or array_length(v_customer_ids, 1) < 1 then
      continue;
    end if;

    for v_idx in 1..6 loop
      v_customer_id := v_customer_ids[1 + ((v_idx - 1) % array_length(v_customer_ids, 1))];
      counter := counter + 1;

      if v_idx <= 3 then
        v_rating := 5;
        v_comment := positive5[1 + (counter % array_length(positive5, 1))];
      elsif v_idx <= 5 then
        v_rating := 4;
        v_comment := positive4[1 + (counter % array_length(positive4, 1))];
      else
        v_rating := 2;
        v_comment := negative[1 + (counter % array_length(negative, 1))];
      end if;

      if counter % 5 = 0 then
        v_images := array[format('https://picsum.photos/seed/rrev-%s/700/500', counter)];
      else
        v_images := '{}';
      end if;

      insert into restaurant_reviews (restaurant_id, customer_id, rating, comment, image_urls)
      values (v_restaurant.id, v_customer_id, v_rating, v_comment, v_images)
      on conflict (restaurant_id, customer_id) do nothing;
    end loop;
  end loop;

  -- Menu-item reviews: skip roughly a third of items for an organic look,
  -- up to 2 reviews on the rest.
  counter := 0;
  for v_item in select id, restaurant_id from menu_items where active = true loop
    counter := counter + 1;
    if counter % 3 = 0 then
      continue;
    end if;

    select array_agg(id) into v_customer_ids from customers where restaurant_id = v_item.restaurant_id;
    if v_customer_ids is null or array_length(v_customer_ids, 1) < 1 then
      continue;
    end if;

    for v_idx in 1..least(2, array_length(v_customer_ids, 1)) loop
      v_customer_id := v_customer_ids[1 + ((counter + v_idx - 1) % array_length(v_customer_ids, 1))];

      if v_idx = 1 then
        if counter % 7 = 0 then
          v_rating := 2;
          v_comment := item_neg[1 + (counter % array_length(item_neg, 1))];
        elsif counter % 4 = 0 then
          v_rating := 3;
          v_comment := item3[1 + (counter % array_length(item3, 1))];
        else
          v_rating := 5;
          v_comment := item5[1 + (counter % array_length(item5, 1))];
        end if;
      else
        v_rating := 4;
        v_comment := item4[1 + (counter % array_length(item4, 1))];
      end if;

      if v_idx = 1 and counter % 6 = 0 then
        v_images := array[format('https://picsum.photos/seed/mrev-%s/700/500', counter)];
      else
        v_images := '{}';
      end if;

      insert into menu_item_reviews (menu_item_id, restaurant_id, customer_id, rating, comment, image_urls)
      values (v_item.id, v_item.restaurant_id, v_customer_id, v_rating, v_comment, v_images)
      on conflict (menu_item_id, customer_id) do nothing;
    end loop;
  end loop;

  -- Offer reviews: up to 3 per offer.
  counter := 0;
  for v_offer in select id, restaurant_id from offers where active = true loop
    select array_agg(id) into v_customer_ids from customers where restaurant_id = v_offer.restaurant_id;
    if v_customer_ids is null or array_length(v_customer_ids, 1) < 1 then
      continue;
    end if;

    for v_idx in 1..least(3, array_length(v_customer_ids, 1)) loop
      counter := counter + 1;
      v_customer_id := v_customer_ids[1 + ((counter - 1) % array_length(v_customer_ids, 1))];

      if v_idx = 3 then
        v_rating := 2;
        v_comment := offer_neg[1 + (counter % array_length(offer_neg, 1))];
      elsif v_idx = 2 then
        v_rating := 4;
        v_comment := offer4[1 + (counter % array_length(offer4, 1))];
      else
        v_rating := 5;
        v_comment := offer5[1 + (counter % array_length(offer5, 1))];
      end if;

      insert into offer_reviews (offer_id, restaurant_id, customer_id, rating, comment, image_urls)
      values (v_offer.id, v_offer.restaurant_id, v_customer_id, v_rating, v_comment, '{}')
      on conflict (offer_id, customer_id) do nothing;
    end loop;
  end loop;
end $$;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0104', 'seed_demo_reviews') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0104_seed_demo_reviews.sql <<<

-- >>> MIGRATION 0105_nfc_card_order_touchpoint_link.sql >>>
-- Connects "which link gets encoded on this physical card" to the actual
-- card order, which today are two completely disconnected records:
-- nfc_card_orders is pure fulfillment/payment, physical_touchpoints is the
-- link/QR itself. Nullable + on delete set null: an order predates this
-- column for existing rows, and deleting a touchpoint later shouldn't
-- retroactively invalidate order history.

begin;

alter table nfc_card_orders
  add column if not exists touchpoint_id uuid references physical_touchpoints(id) on delete set null;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0105', 'nfc_card_order_touchpoint_link') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0105_nfc_card_order_touchpoint_link.sql <<<

-- >>> MIGRATION 0106_link_dev_test_customer_to_demo.sql >>>
-- 0106_link_dev_test_customer_to_demo.sql
-- Ensures dev-test@minervaflow.app (f43acb06-4025-4953-b225-666587619c64 / b6bdc959-a32f-4239-bd66-d69756c6f208)
-- is properly linked as a customer to the demo restaurant (60a59423-c7a0-4d92-a866-3058f34c17d1)
-- with email populated and realistic test loyalty history.

begin;

-- Ensure email is populated for dev-test customer
update customers
set email = 'dev-test@minervaflow.app',
    name = coalesce(nullif(name, ''), 'Dev Test')
where (user_id = 'f43acb06-4025-4953-b225-666587619c64' or id = 'b6bdc959-a32f-4239-bd66-d69756c6f208');

-- Ensure customer points to the demo restaurant
update customers
set restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1'
where (user_id = 'f43acb06-4025-4953-b225-666587619c64' or id = 'b6bdc959-a32f-4239-bd66-d69756c6f208')
  and restaurant_id != '60a59423-c7a0-4d92-a866-3058f34c17d1';

-- Populate fallback emails for demo customers where missing, so the UI consistently shows emails
update customers
set email = lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) || '@client.minervaflow.app'
where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1'
  and (email is null or email = '')
  and id != 'b6bdc959-a32f-4239-bd66-d69756c6f208';

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0106', 'link_dev_test_customer_to_demo') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0106_link_dev_test_customer_to_demo.sql <<<

-- >>> MIGRATION 0107_add_video_urls_to_menu_and_offers.sql >>>
-- 0107_add_video_urls_to_menu_and_offers.sql
-- Adds video_url to menu_items and offers for rich multimedia display in the app.

begin;

alter table menu_items
  add column if not exists video_url text;

alter table offers
  add column if not exists video_url text;

-- Seed demo videos on a couple of demo items and offers so the UI immediately showcases the feature
update menu_items
set video_url = 'https://assets.mixkit.co/videos/preview/mixkit-barista-pouring-coffee-into-a-cup-41142-large.mp4'
where id = (
  select id from menu_items
  where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1'
    and video_url is null
    and (name ilike '%café%' or name ilike '%latte%' or name ilike '%espresso%')
  limit 1
);

update offers
set video_url = 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-delicious-hamburger-40332-large.mp4'
where id = (
  select id from offers
  where restaurant_id = '60a59423-c7a0-4d92-a866-3058f34c17d1'
    and video_url is null
  limit 1
);

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0107', 'add_video_urls_to_menu_and_offers') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0107_add_video_urls_to_menu_and_offers.sql <<<

-- >>> MIGRATION 0108_order_fulfillment_modes.sql >>>
-- 0108_order_fulfillment_modes.sql
-- Lets a restaurant offer up to 3 explicit order modes to customers:
--   immediat              — pay online now (today's "En ligne maintenant")
--   sur_place             — pay in person at pickup (today's default/only mode)
--   prep_apres_paiement   — pay online, kitchen only preps once payment is confirmed
-- order_modes_enabled controls which of the 3 the owner offers at checkout.
-- fulfillment_mode records which one a given order was placed under, so the
-- "à préparer après paiement" gate (a later migration) knows which orders to hold.

begin;

alter table restaurants
  add column if not exists order_modes_enabled text[] not null default '{immediat,sur_place}';

alter table orders
  add column if not exists fulfillment_mode text;

alter table orders
  add constraint orders_fulfillment_mode_check
  check (fulfillment_mode is null or fulfillment_mode in ('immediat', 'sur_place', 'prep_apres_paiement'));

-- Backfill from the existing payment signal: any order that went through
-- online payment (or tried to) was effectively "immediat" under today's
-- binary choice; everything else was pay-on-site.
update orders
set fulfillment_mode = case
  when payment_status in ('paye', 'en_attente', 'echoue') then 'immediat'
  else 'sur_place'
end
where fulfillment_mode is null;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0108', 'order_fulfillment_modes') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0108_order_fulfillment_modes.sql <<<

-- >>> MIGRATION 0109_order_ready_and_busy_mode.sql >>>
-- 0109_order_ready_and_busy_mode.sql
-- "Commande prête" manual notification (#7) + "message d'attente si chargé" (#8).

begin;

alter table orders
  add column if not exists ready_notified_at timestamptz;

-- busy_mode_manual: staff-flipped "on est débordés" toggle.
-- busy_threshold: auto-busy when count of orders currently "en_preparation"
-- reaches this number — null disables the automatic side, manual still works.
alter table restaurants
  add column if not exists busy_mode_manual boolean not null default false,
  add column if not exists busy_threshold integer;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0109', 'order_ready_and_busy_mode') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0109_order_ready_and_busy_mode.sql <<<

-- >>> MIGRATION 0110_favorite_menu_items_and_alerts.sql >>>
-- 0110_favorite_menu_items_and_alerts.sql
-- Item #11: favorites now cover menu items too (favorite_offer_ids already
-- existed since 0066 but was never wired up), feeding the "c'est de retour"
-- availability alert when a favorited item/offer flips active: false -> true.

begin;

alter table customers
  add column if not exists favorite_menu_item_ids uuid[] not null default '{}';

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0110', 'favorite_menu_items_and_alerts') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0110_favorite_menu_items_and_alerts.sql <<<

-- >>> MIGRATION 0111_demo_showcases_all_order_modes.sql >>>
-- 0111_demo_showcases_all_order_modes.sql
-- Item #12: without this, the demo restaurant defaults to {immediat,sur_place}
-- like every other restaurant, and a prospect exploring the demo would never
-- see the third order mode ("prep_apres_paiement") at all.

begin;

update restaurants
set order_modes_enabled = '{immediat,sur_place,prep_apres_paiement}'
where id = '60a59423-c7a0-4d92-a866-3058f34c17d1';

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0111', 'demo_showcases_all_order_modes') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0111_demo_showcases_all_order_modes.sql <<<

-- >>> MIGRATION 0112_estimated_ready_time_and_auto_notify.sql >>>
-- 0112_estimated_ready_time_and_auto_notify.sql
-- "Prêt dans X minutes" — a default prep-time estimate the owner sets once
-- (default_prep_minutes), applied to every order at creation (bumped when
-- the restaurant is busy), staff can override per order
-- (orders.estimated_ready_at), and a cron auto-sends the "commande prête"
-- notification once it elapses — see lib/orders/eta.ts and
-- app/api/cron/order-ready-eta/route.ts.

begin;

alter table restaurants
  add column if not exists default_prep_minutes integer;

alter table orders
  add column if not exists estimated_ready_at timestamptz;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0112', 'estimated_ready_time_and_auto_notify') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0112_estimated_ready_time_and_auto_notify.sql <<<

-- >>> MIGRATION 0113_pos_catalog_sync_foundation.sql >>>
-- Foundation for bidirectional Clover/Square menu + inventory catalog sync.
--
-- menu_items/inventory_items gain updated_at so we can tell whether the
-- Minerva Flow side changed since the last push — last-write-wins conflict
-- resolution compares this against the mapping's external_updated_at.
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table menu_items add column if not exists updated_at timestamptz not null default now();
drop trigger if exists menu_items_touch_updated_at on menu_items;
create trigger menu_items_touch_updated_at
  before update on menu_items
  for each row execute function touch_updated_at();

alter table inventory_items add column if not exists updated_at timestamptz not null default now();
drop trigger if exists inventory_items_touch_updated_at on inventory_items;
create trigger inventory_items_touch_updated_at
  before update on inventory_items
  for each row execute function touch_updated_at();

-- pos_item_mappings (menu items) already exists as of the previous
-- migration; extend it with the bookkeeping bidirectional sync needs.
-- external_updated_at: last known modification time on the POS side.
-- local_synced_at: last time Minerva Flow's state was successfully pushed out.
alter table pos_item_mappings add column if not exists external_updated_at timestamptz;
alter table pos_item_mappings add column if not exists local_synced_at timestamptz;

drop trigger if exists pos_item_mappings_touch_updated_at on pos_item_mappings;
create trigger pos_item_mappings_touch_updated_at
  before update on pos_item_mappings
  for each row execute function touch_updated_at();

-- Same shape as pos_item_mappings, but for inventory_items — no equivalent
-- table existed before this, since inventory items were only ever matched
-- by free-text name at purchase-order receiving time (see
-- receivePurchaseOrderItems in lib/data/inventory.ts).
create table if not exists pos_inventory_mappings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider pos_provider not null,
  external_item_id text not null,
  external_item_name text not null,
  inventory_item_id uuid references inventory_items (id) on delete set null,
  auto_matched boolean not null default false,
  external_updated_at timestamptz,
  local_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, provider, external_item_id)
);

create index if not exists idx_pos_inventory_mappings_restaurant on pos_inventory_mappings (restaurant_id, provider);
create index if not exists idx_pos_inventory_mappings_inventory_item on pos_inventory_mappings (inventory_item_id);

alter table pos_inventory_mappings enable row level security;

drop policy if exists "pos_inventory_mappings_select" on pos_inventory_mappings;
create policy "pos_inventory_mappings_select" on pos_inventory_mappings for select
  using (is_restaurant_member(restaurant_id));

drop policy if exists "pos_inventory_mappings_write" on pos_inventory_mappings;
create policy "pos_inventory_mappings_write" on pos_inventory_mappings for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

drop trigger if exists pos_inventory_mappings_touch_updated_at on pos_inventory_mappings;
create trigger pos_inventory_mappings_touch_updated_at
  before update on pos_inventory_mappings
  for each row execute function touch_updated_at();
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0113', 'pos_catalog_sync_foundation') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0113_pos_catalog_sync_foundation.sql <<<

-- >>> MIGRATION 0114_pos_item_mappings_square_variation_id.sql >>>
-- Square's Orders API keys line items by ITEM_VARIATION id (used by
-- ticket-ingestion's existing external_item_id), but catalog push/delete
-- operates on the parent ITEM id. Store both so catalog-sync.ts can push
-- inventory counts (needs the variation id) without disturbing the
-- itemId-keyed external_item_id used elsewhere.
alter table pos_item_mappings add column if not exists external_variation_id text;
alter table pos_inventory_mappings add column if not exists external_variation_id text;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0114', 'pos_item_mappings_square_variation_id') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0114_pos_item_mappings_square_variation_id.sql <<<

-- >>> MIGRATION 0115_add_cost_to_offers.sql >>>
-- Minerva Flow — Offer margin & owner cost tracking
-- Adds 'cost' (food cost / cost of goods) to the offers table so the owner
-- can track profit margin and food cost percentage on promotional offers.
-- Deliberately staff-facing only — never exposed on public customer routes (/m/*).

begin;

alter table offers
  add column if not exists cost numeric;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0115', 'add_cost_to_offers') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0115_add_cost_to_offers.sql <<<

-- >>> MIGRATION 0116_link_purchase_order_items_to_inventory.sql >>>
-- Link purchase_order_items to inventory_items and track received quantities for partial receipts
alter table purchase_order_items
  add column if not exists inventory_item_id uuid references inventory_items (id) on delete set null,
  add column if not exists received_quantity numeric;

create index if not exists idx_purchase_order_items_inventory
  on purchase_order_items (inventory_item_id);
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0116', 'link_purchase_order_items_to_inventory') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0116_link_purchase_order_items_to_inventory.sql <<<

-- >>> MIGRATION 0117_pos_customer_identification_and_phone_index.sql >>>
-- Migration 0117: POS customer identification, phone lookup index, and linking flags

begin;

-- Fast index on restaurant customers by phone
create index if not exists customers_restaurant_phone_idx
  on customers (restaurant_id, phone)
  where phone is not null;

-- External POS customer ID reference
alter table customers
  add column if not exists pos_customer_id text;

-- Add customer_id & via_pos_sync to orders
alter table orders
  add column if not exists customer_id uuid references customers (id) on delete set null,
  add column if not exists via_pos_sync boolean not null default false;

create index if not exists orders_restaurant_customer_idx
  on orders (restaurant_id, customer_id)
  where customer_id is not null;

-- Add flags to loyalty_transactions to distinguish origin
alter table loyalty_transactions
  add column if not exists via_pos_sync boolean not null default false,
  add column if not exists via_phone_lookup boolean not null default false;

-- Enhance increment_customer_visit RPC to support via_pos_sync and via_phone_lookup
create or replace function increment_customer_visit(
  p_customer_id uuid,
  p_restaurant_id uuid,
  p_amount_spent numeric,
  p_points_delta int,
  p_note text,
  p_via_pairing_code boolean default false,
  p_via_pos_sync boolean default false,
  p_via_phone_lookup boolean default false
)
returns setof customers
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from customers where id = p_customer_id;
  if v_restaurant_id is null or v_restaurant_id != p_restaurant_id then
    raise exception 'Restaurant invalide';
  end if;

  if auth.role() <> 'service_role' and not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  insert into loyalty_transactions (
    restaurant_id, customer_id, type, amount_spent, points_delta, note, created_by,
    via_pairing_code, via_pos_sync, via_phone_lookup
  )
  values (
    v_restaurant_id, p_customer_id, 'visite', p_amount_spent, p_points_delta, p_note, auth.uid(),
    p_via_pairing_code, p_via_pos_sync, p_via_phone_lookup
  );

  return query
    update customers
    set visit_count = visit_count + 1,
        total_spent = total_spent + coalesce(p_amount_spent, 0),
        loyalty_points = loyalty_points + p_points_delta,
        last_visit_at = now()
    where id = p_customer_id
    returning *;
end;
$$;

grant execute on function increment_customer_visit(uuid, uuid, numeric, int, text, boolean, boolean, boolean) to authenticated;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0117', 'pos_customer_identification_and_phone_index') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0117_pos_customer_identification_and_phone_index.sql <<<

-- >>> MIGRATION 0118_customer_consents_and_campaign_triggers.sql >>>
-- Migration 0118: Customer consent audit log for CASL/LCAP compliance and campaign triggers
begin;
-- Immutable consent audit log for Canadian CASL/LCAP legal proof
create table if not exists customer_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  consent_type text not null check (consent_type in ('service', 'marketing')),
  status text not null check (status in ('opt_in', 'opt_out')),
  channels text [] not null default array ['email', 'sms'],
  consent_text text not null,
  consent_source text not null check (
    consent_source in (
      'qr_code',
      'pos_cashier',
      'website',
      'portal',
      'share_link',
      'sms_keyword',
      'unsubscribe_link',
      'staff'
    )
  ),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists customer_consents_customer_idx on customer_consents (customer_id, consent_type, created_at desc);
create index if not exists customer_consents_restaurant_idx on customer_consents (restaurant_id, created_at desc);
alter table customer_consents enable row level security;
create policy "restaurant_members_view_consents" on customer_consents for
select using (is_restaurant_member(restaurant_id));
create policy "service_role_manage_consents" on customer_consents for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "authenticated_insert_consents" on customer_consents for
insert with check (
    is_restaurant_member(restaurant_id)
    or auth.uid() is not null
  );
-- Campaign automation triggers configuration on restaurants table
alter table restaurants
add column if not exists campaign_welcome_enabled boolean not null default true,
  add column if not exists campaign_second_visit_enabled boolean not null default true,
  add column if not exists campaign_reactivation_21d_enabled boolean not null default true;
commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0118', 'customer_consents_and_campaign_triggers') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0118_customer_consents_and_campaign_triggers.sql <<<

-- >>> MIGRATION 0119_lifecycle_events_and_funnel_tracking.sql >>>
-- Migration 0119: Lifecycle events for customer journey and retention funnel tracking

begin;

create table if not exists lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid references customers (id) on delete cascade,
  event_type text not null check (event_type in (
    'qr_code_displayed',
    'qr_code_scanned',
    'form_started',
    'registration_completed',
    'sms_consent_given',
    'first_visit_recognized',
    'second_visit_recognized',
    'reward_unlocked',
    'reward_redeemed',
    'campaign_sent',
    'message_delivered',
    'unsubscribed',
    'campaign_visit_generated',
    'referral_sent',
    'referral_converted'
  )),
  touchpoint_id uuid references physical_touchpoints (id) on delete set null,
  campaign_id uuid references campaigns (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lifecycle_events_restaurant_type_created
  on lifecycle_events (restaurant_id, event_type, created_at desc);

create index if not exists idx_lifecycle_events_customer_created
  on lifecycle_events (customer_id, created_at desc);

create index if not exists idx_lifecycle_events_restaurant_created
  on lifecycle_events (restaurant_id, created_at desc);

alter table lifecycle_events enable row level security;

create policy "lifecycle_events_select"
  on lifecycle_events for select
  using (is_restaurant_member(restaurant_id));

create policy "lifecycle_events_service_role"
  on lifecycle_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "lifecycle_events_authenticated_insert"
  on lifecycle_events for insert
  with check (is_restaurant_member(restaurant_id) or auth.uid() is not null);

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0119', 'lifecycle_events_and_funnel_tracking') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0119_lifecycle_events_and_funnel_tracking.sql <<<

-- >>> MIGRATION 0120_additional_campaign_templates_and_triggers.sql >>>
-- Migration 0120: Additional campaign templates and triggers for SMS & Email retention
begin;

-- Expand retention_trigger_type enum with new campaign triggers
alter type retention_trigger_type add value if not exists 'welcome';
alter type retention_trigger_type add value if not exists 'second_visit';
alter type retention_trigger_type add value if not exists 'off_peak';
alter type retention_trigger_type add value if not exists 'vip_upgrade';
alter type retention_trigger_type add value if not exists 'referral_share';
alter type retention_trigger_type add value if not exists 'winback_60d';

-- Add configuration columns on restaurants for the new automated campaigns
alter table restaurants
  add column if not exists campaign_reward_available_enabled boolean not null default true,
  add column if not exists campaign_vip_upgrade_enabled boolean not null default true,
  add column if not exists campaign_referral_share_enabled boolean not null default true,
  add column if not exists campaign_winback_60d_enabled boolean not null default true;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0120', 'additional_campaign_templates_and_triggers') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0120_additional_campaign_templates_and_triggers.sql <<<

-- >>> MIGRATION 0121_workspace_white_label_branding.sql >>>
-- White-label foundation: a workspace is one customer brand with one or more
-- establishments. This is deliberately a separate one-to-one table so the
-- existing workspace/billing hierarchy remains backwards compatible.

create table workspace_brand_settings (
  workspace_id uuid primary key references workspaces (id) on delete cascade,
  brand_name text not null,
  logo_url text,
  primary_color text not null default '#167F5B',
  secondary_color text not null default '#0E5A40',
  accent_color text not null default '#DFFF5F',
  heading_font text not null default 'new_york',
  body_font text not null default 'plus_jakarta_sans',
  preferred_locale text not null default 'fr-CA',
  ai_tone text not null default 'professionnel',
  enabled_modules jsonb not null default '{}',
  enabled_integrations text[] not null default '{}',
  requested_custom_domain text,
  custom_domain_status text not null default 'non_configure',
  email_sender_name text,
  email_reply_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_brand_primary_color_hex check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint workspace_brand_secondary_color_hex check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint workspace_brand_accent_color_hex check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint workspace_brand_heading_font_allowed check (heading_font in ('new_york', 'playfair_display', 'system_serif')),
  constraint workspace_brand_body_font_allowed check (body_font in ('plus_jakarta_sans', 'inter', 'system_sans')),
  constraint workspace_brand_locale_allowed check (preferred_locale in ('fr-CA', 'fr-FR', 'en-CA', 'en-US')),
  constraint workspace_brand_ai_tone_allowed check (ai_tone in ('professionnel', 'chaleureux', 'direct', 'luxe')),
  constraint workspace_brand_domain_status_allowed check (custom_domain_status in ('non_configure', 'en_attente', 'verifie', 'erreur')),
  constraint workspace_brand_requested_domain_format check (
    requested_custom_domain is null
    or requested_custom_domain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  ),
  constraint workspace_brand_reply_to_format check (
    email_reply_to is null or email_reply_to ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint workspace_brand_modules_object check (jsonb_typeof(enabled_modules) = 'object')
);

-- Domains are compared case-insensitively. Their DNS verification is handled
-- by a server-side flow in Phase 2; this table only records a requested name.
create unique index workspace_brand_settings_requested_domain_unique
  on workspace_brand_settings (lower(requested_custom_domain))
  where requested_custom_domain is not null;

-- Migrate every existing workspace without changing its current visual
-- identity. logo_url has already been used for workspace-level branding.
insert into workspace_brand_settings (workspace_id, brand_name, logo_url)
select id, name, logo_url
from workspaces
on conflict (workspace_id) do nothing;

create or replace function initialize_workspace_brand_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_brand_settings (workspace_id, brand_name, logo_url)
  values (new.id, new.name, new.logo_url)
  on conflict (workspace_id) do nothing;
  return new;
end;
$$;

drop trigger if exists workspaces_initialize_brand_settings on workspaces;
create trigger workspaces_initialize_brand_settings
  after insert on workspaces
  for each row execute function initialize_workspace_brand_settings();

drop trigger if exists workspace_brand_settings_touch_updated_at on workspace_brand_settings;
create trigger workspace_brand_settings_touch_updated_at
  before update on workspace_brand_settings
  for each row execute function touch_updated_at();

alter table workspace_brand_settings enable row level security;

create policy "workspace_brand_settings_select" on workspace_brand_settings for select
  using (is_workspace_member(workspace_id));

-- Brand, domain, sender and module changes affect every establishment of a
-- customer. They are restricted to the workspace owner; managers retain their
-- operational workspace permissions but cannot impersonate the business.
create policy "workspace_brand_settings_insert_owner" on workspace_brand_settings for insert
  with check (is_workspace_member(workspace_id, array['owner']::member_role[]));

create policy "workspace_brand_settings_update_owner" on workspace_brand_settings for update
  using (is_workspace_member(workspace_id, array['owner']::member_role[]))
  with check (is_workspace_member(workspace_id, array['owner']::member_role[]));

comment on table workspace_brand_settings is
  'White-label configuration for a workspace/customer brand. Credentials are intentionally excluded and stay in provider-specific encrypted stores.';
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0121', 'workspace_white_label_branding') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0121_workspace_white_label_branding.sql <<<

-- >>> MIGRATION 0122_workspace_custom_domain_verification.sql >>>
-- A domain is not activated merely because an owner typed it into the UI.
-- Each workspace receives a DNS proof token; the server verifies its TXT
-- record before custom_domain_status can be promoted to 'verifie'.

alter table workspace_brand_settings
  add column custom_domain_verification_token text;

update workspace_brand_settings
set custom_domain_verification_token = encode(gen_random_bytes(24), 'hex')
where custom_domain_verification_token is null;

alter table workspace_brand_settings
  alter column custom_domain_verification_token set not null;

alter table workspace_brand_settings
  add constraint workspace_brand_settings_domain_token_unique unique (custom_domain_verification_token);

create or replace function protect_workspace_custom_domain_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Owners may request or replace a domain, but they cannot assert that they
  -- control DNS by directly writing 'verifie' through the client API.
  if new.custom_domain_status = 'verifie'
    and old.custom_domain_status is distinct from 'verifie'
    and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'custom domain verification must be completed by the server verifier';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_brand_settings_protect_domain_verification on workspace_brand_settings;
create trigger workspace_brand_settings_protect_domain_verification
  before update on workspace_brand_settings
  for each row execute function protect_workspace_custom_domain_verification();

comment on column workspace_brand_settings.custom_domain_verification_token is
  'DNS TXT proof token. Regenerated whenever requested_custom_domain changes; it is not an application credential.';
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0122', 'workspace_custom_domain_verification') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0122_workspace_custom_domain_verification.sql <<<

-- >>> MIGRATION 0123_default_workspace_domain_verification_token.sql >>>
-- 0122 made the proof token mandatory. New workspaces are created by the
-- existing after-insert trigger, so the column must generate its own value.
alter table workspace_brand_settings
  alter column custom_domain_verification_token set default encode(gen_random_bytes(24), 'hex');
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0123', 'default_workspace_domain_verification_token') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0123_default_workspace_domain_verification_token.sql <<<

-- >>> MIGRATION 0124_daily_menu_views_and_order_source.sql >>>
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
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0124', 'daily_menu_views_and_order_source') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0124_daily_menu_views_and_order_source.sql <<<

-- >>> MIGRATION 0125_delivery_orders_and_pricing.sql >>>
begin;

alter table restaurants
  add column if not exists delivery_enabled boolean not null default false,
  add column if not exists delivery_base_fee numeric(10,2) not null default 3.99,
  add column if not exists delivery_per_km_fee numeric(10,2) not null default 1.25,
  add column if not exists delivery_free_km numeric(10,2) not null default 2,
  add column if not exists delivery_max_km numeric(10,2) not null default 10,
  add column if not exists delivery_average_speed_kmh numeric(10,2) not null default 25;

alter table orders
  add column if not exists delivery_address text,
  add column if not exists delivery_lat numeric(10,7),
  add column if not exists delivery_lng numeric(10,7),
  add column if not exists delivery_distance_km numeric(10,2),
  add column if not exists delivery_fee numeric(10,2) not null default 0,
  add column if not exists delivery_eta_minutes integer;

alter table orders drop constraint if exists orders_fulfillment_mode_check;
alter table orders add constraint orders_fulfillment_mode_check
  check (fulfillment_mode is null or fulfillment_mode in ('immediat', 'sur_place', 'prep_apres_paiement', 'livraison'));

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0125', 'delivery_orders_and_pricing') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0125_delivery_orders_and_pricing.sql <<<

-- >>> MIGRATION 0126_referral_channel_attribution.sql >>>
-- Preserve referral source and invitee attribution without changing the
-- existing share codes or aggregate counters.
begin;

alter table customer_referral_conversions
  add column if not exists invited_customer_id uuid references customers (id) on delete set null,
  add column if not exists invitation_channel text not null default 'direct';

alter table customer_referral_conversions
  drop constraint if exists customer_referral_conversions_invitation_channel_check;
alter table customer_referral_conversions
  add constraint customer_referral_conversions_invitation_channel_check
  check (invitation_channel in ('qr', 'share', 'copy', 'code', 'direct'));

create table if not exists customer_referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_link_id uuid not null references customer_referral_links (id) on delete cascade,
  event_type text not null check (event_type in ('click', 'conversion')),
  invitation_channel text not null default 'direct'
    check (invitation_channel in ('qr', 'share', 'copy', 'code', 'direct')),
  invited_customer_id uuid references customers (id) on delete set null,
  conversion_id uuid references customer_referral_conversions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customer_referral_events_link_date_idx
  on customer_referral_events (referral_link_id, created_at desc);
create index if not exists customer_referral_events_invitee_idx
  on customer_referral_events (invited_customer_id)
  where invited_customer_id is not null;
create unique index if not exists customer_referral_events_conversion_unique
  on customer_referral_events (conversion_id)
  where conversion_id is not null;

create or replace function record_customer_referral_conversion_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.credited_at is null and new.credited_at is not null and new.invited_customer_id is not null then
    insert into customer_referral_events (
      referral_link_id, event_type, invitation_channel, invited_customer_id, conversion_id, created_at
    ) values (
      new.referral_link_id, 'conversion', new.invitation_channel,
      new.invited_customer_id, new.id, new.credited_at
    ) on conflict (conversion_id) where conversion_id is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists customer_referral_conversion_event on customer_referral_conversions;
create trigger customer_referral_conversion_event
  after update of credited_at on customer_referral_conversions
  for each row execute function record_customer_referral_conversion_event();

alter table customer_referral_events enable row level security;
drop policy if exists "customer_referral_events_select" on customer_referral_events;
create policy "customer_referral_events_select" on customer_referral_events for select
  using (exists (
    select 1
    from customer_referral_links crl
    join referral_programs rp on rp.id = crl.referral_program_id
    where crl.id = customer_referral_events.referral_link_id
      and is_restaurant_member(rp.restaurant_id, array['owner','manager']::member_role[])
  ));

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0126', 'referral_channel_attribution') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0126_referral_channel_attribution.sql <<<

-- >>> MIGRATION 0127_birthday_special_offers.sql >>>
-- A restaurant can designate client-facing offers for the customer's
-- birthday. These are kept out of shared/public menus and surfaced only
-- inside the eligible customer's authenticated app session.
begin;

alter table offers
  add column if not exists is_birthday_special boolean not null default false;

create index if not exists idx_offers_birthday_special
  on offers (restaurant_id, created_at desc)
  where is_birthday_special = true and active = true;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0127', 'birthday_special_offers') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0127_birthday_special_offers.sql <<<

-- >>> MIGRATION 0128_preorders_quotes_and_meal_suggestions.sql >>>
begin;

-- A scheduled fulfillment time is stored as an instant; clients submit an
-- ISO timestamp in the restaurant's local timezone and the API normalizes it.
alter table orders
  add column if not exists order_kind text not null default 'standard',
  add column if not exists requested_ready_at timestamptz;
alter table orders add column if not exists deposit_paid_amount numeric(10,2) not null default 0;

alter table menu_items
  add column if not exists is_draft boolean not null default false,
  add column if not exists allergens text[] not null default '{}',
  add column if not exists allergens_confirmed boolean not null default false;

-- A POS sync may see the same paid ticket via cron, webhook, and manual
-- retry. The ledger key makes point credit exactly-once across all three.
alter table loyalty_transactions
  add column if not exists pos_provider text,
  add column if not exists external_order_id text,
  add column if not exists via_pos_sync boolean not null default false,
  add column if not exists via_phone_lookup boolean not null default false;
alter table loyalty_transactions drop constraint if exists loyalty_transactions_pos_provider_check;
alter table loyalty_transactions add constraint loyalty_transactions_pos_provider_check
  check (pos_provider is null or pos_provider in ('square', 'lightspeed', 'clover', 'toast'));
create unique index if not exists idx_loyalty_transactions_pos_ticket
  on loyalty_transactions (restaurant_id, pos_provider, external_order_id)
  where pos_provider is not null and external_order_id is not null;

create or replace function increment_customer_visit_from_pos(
  p_customer_id uuid,
  p_restaurant_id uuid,
  p_amount_spent numeric,
  p_points_delta integer,
  p_note text,
  p_via_phone_lookup boolean,
  p_pos_provider text,
  p_external_order_id text
) returns table (applied boolean, customer customers)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer customers%rowtype;
  v_existing loyalty_transactions%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  if p_pos_provider not in ('square','lightspeed','clover','toast')
     or nullif(trim(p_external_order_id), '') is null
     or p_amount_spent is null or p_amount_spent < 0
     or p_points_delta is null or p_points_delta < 0 then
    raise exception 'invalid_pos_visit' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || ':' || p_pos_provider || ':' || p_external_order_id, 0));
  select * into v_existing from loyalty_transactions
    where restaurant_id = p_restaurant_id and pos_provider = p_pos_provider and external_order_id = p_external_order_id;
  if found then
    if v_existing.customer_id <> p_customer_id then raise exception 'pos_ticket_customer_conflict' using errcode = '23505'; end if;
    return query select false, c from customers c where c.id = p_customer_id and c.restaurant_id = p_restaurant_id;
    return;
  end if;

  select * into v_customer from customers where id = p_customer_id and restaurant_id = p_restaurant_id for update;
  if not found then raise exception 'customer_restaurant_mismatch' using errcode = '42501'; end if;
  insert into loyalty_transactions (
    restaurant_id, customer_id, type, amount_spent, points_delta, note,
    created_by, via_pos_sync, via_phone_lookup, pos_provider, external_order_id
  ) values (
    p_restaurant_id, p_customer_id, 'visite', p_amount_spent, p_points_delta, p_note,
    null, true, coalesce(p_via_phone_lookup, false), p_pos_provider, p_external_order_id
  );
  update customers set
    visit_count = visit_count + 1,
    total_spent = total_spent + p_amount_spent,
    loyalty_points = loyalty_points + p_points_delta,
    last_visit_at = now()
    where id = p_customer_id and restaurant_id = p_restaurant_id
    returning * into v_customer;
  return query select true, v_customer;
end;
$$;
revoke all on function increment_customer_visit_from_pos(uuid, uuid, numeric, integer, text, boolean, text, text) from public, anon, authenticated;
grant execute on function increment_customer_visit_from_pos(uuid, uuid, numeric, integer, text, boolean, text, text) to service_role;

alter table orders drop constraint if exists orders_order_kind_check;
alter table orders add constraint orders_order_kind_check
  check (order_kind in ('standard', 'custom', 'catering'));
create index if not exists idx_orders_restaurant_requested_ready
  on orders (restaurant_id, requested_ready_at) where requested_ready_at is not null;

-- Quotes cover custom meal requests and catering. They are deliberately
-- separate from orders: acceptance/deposit must happen before production.
create table if not exists service_quotes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  quote_type text not null check (quote_type in ('custom_meal', 'catering')),
  status text not null default 'requested'
    check (status in ('requested', 'quoted', 'accepted', 'declined', 'expired', 'converted', 'cancelled')),
  guest_name text not null,
  guest_phone text,
  guest_email text,
  description text not null,
  event_at timestamptz,
  guest_count integer,
  fulfillment_mode text not null default 'sur_place'
    check (fulfillment_mode in ('sur_place', 'livraison')),
  delivery_address text,
  currency text not null default 'CAD',
  subtotal numeric(10,2),
  tax_amount numeric(10,2),
  total numeric(10,2),
  deposit_percent numeric(5,2) not null default 0
    check (deposit_percent >= 0 and deposit_percent <= 100),
  deposit_amount numeric(10,2),
  expires_at timestamptz,
  client_notes text,
  owner_notes text,
  accepted_at timestamptz,
  converted_order_id uuid references orders(id) on delete set null,
  stripe_payment_intent_id text,
  checkout_session_id text unique,
  checkout_url text,
  checkout_attempt integer not null default 0 check (checkout_attempt >= 0),
  checkout_payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (guest_count is null or guest_count between 1 and 10000),
  check (subtotal is null or subtotal >= 0),
  check (tax_amount is null or tax_amount >= 0),
  check (total is null or total >= 0),
  check (deposit_amount is null or deposit_amount >= 0)
);

create index if not exists idx_service_quotes_restaurant_status_created
  on service_quotes (restaurant_id, status, created_at desc);
create index if not exists idx_service_quotes_customer_created
  on service_quotes (customer_id, created_at desc) where customer_id is not null;
create unique index if not exists idx_service_quotes_converted_order
  on service_quotes (converted_order_id) where converted_order_id is not null;

create table if not exists service_quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references service_quotes(id) on delete cascade,
  name text not null,
  description text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_service_quote_lines_quote on service_quote_lines(quote_id, sort_order);

alter table service_quotes enable row level security;
alter table service_quote_lines enable row level security;
drop policy if exists service_quotes_restaurant_select on service_quotes;
create policy service_quotes_restaurant_select on service_quotes for select
  using (is_restaurant_member(restaurant_id) or exists (
    select 1 from customers c where c.id = service_quotes.customer_id and c.user_id = auth.uid()
  ));
drop policy if exists service_quotes_restaurant_manage on service_quotes;
create policy service_quotes_restaurant_manage on service_quotes for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists service_quote_lines_select on service_quote_lines;
create policy service_quote_lines_select on service_quote_lines for select
  using (exists (select 1 from service_quotes q where q.id = service_quote_lines.quote_id
    and (is_restaurant_member(q.restaurant_id) or exists (
      select 1 from customers c where c.id = q.customer_id and c.user_id = auth.uid()
    ))));
drop policy if exists service_quote_lines_manage on service_quote_lines;
create policy service_quote_lines_manage on service_quote_lines for all
  using (exists (select 1 from service_quotes q where q.id = service_quote_lines.quote_id
    and is_restaurant_member(q.restaurant_id, array['owner','manager']::member_role[])))
  with check (exists (select 1 from service_quotes q where q.id = service_quote_lines.quote_id
    and is_restaurant_member(q.restaurant_id, array['owner','manager']::member_role[])));

-- Owner/manager quote issuance is transactional: itemization, tax, total,
-- deposit, and status can never disagree if any validation or write fails.
create or replace function issue_service_quote(
  p_quote_id uuid,
  p_lines jsonb,
  p_tax_rate numeric,
  p_deposit_percent numeric,
  p_expires_at timestamptz,
  p_checkout_payload_hash text
) returns table (subtotal numeric, tax_amount numeric, total numeric, deposit_amount numeric, checkout_attempt integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote service_quotes%rowtype;
  v_subtotal_raw numeric;
  v_subtotal numeric(10,2);
  v_tax numeric(10,2);
  v_total numeric(10,2);
  v_deposit numeric(10,2);
  v_count integer;
  v_reissue boolean;
  v_resume boolean;
begin
  select * into v_quote from service_quotes where id = p_quote_id for update;
  if not found or not is_restaurant_member(v_quote.restaurant_id, array['owner','manager']::member_role[]) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  v_reissue := v_quote.status = 'expired' or (v_quote.status = 'quoted' and v_quote.expires_at <= now());
  v_resume := v_quote.status = 'quoted' and not v_reissue and v_quote.checkout_url is null;
  if v_quote.status not in ('requested', 'quoted', 'expired')
    or (v_quote.status = 'quoted' and not v_reissue and not v_resume) then
    raise exception 'quote_not_editable' using errcode = '22023';
  end if;
  if p_checkout_payload_hash is null or length(p_checkout_payload_hash) <> 64 then
    raise exception 'invalid_checkout_payload_hash' using errcode = '22023';
  end if;
  if v_resume and v_quote.checkout_payload_hash is distinct from p_checkout_payload_hash then
    raise exception 'quote_issue_already_claimed' using errcode = '40001';
  end if;
  if jsonb_typeof(p_lines) <> 'array' then raise exception 'invalid_quote_lines' using errcode = '22023'; end if;
  select count(*) into v_count from jsonb_array_elements(p_lines);
  if v_count < 1 or v_count > 50 then raise exception 'invalid_quote_line_count' using errcode = '22023'; end if;
  if p_tax_rate is null or p_tax_rate < 0 or p_tax_rate > 0.30 then raise exception 'invalid_tax_rate' using errcode = '22023'; end if;
  if p_deposit_percent is null or p_deposit_percent <= 0 or p_deposit_percent > 100 then raise exception 'invalid_deposit_percent' using errcode = '22023'; end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '90 days' then
    raise exception 'invalid_quote_expiry' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_lines) x
    where length(trim(coalesce(x->>'name',''))) not between 1 and 120
      or coalesce((x->>'quantity')::integer, 0) not between 1 and 10000
      or coalesce((x->>'unitPrice')::numeric, -1) < 0
      or coalesce((x->>'unitPrice')::numeric, -1) > 100000
      or length(coalesce(x->>'description','')) > 500
  ) then raise exception 'invalid_quote_line' using errcode = '22023'; end if;

  select round(sum((x->>'quantity')::integer * (x->>'unitPrice')::numeric), 2)
    into v_subtotal_raw from jsonb_array_elements(p_lines) x;
  if v_subtotal_raw > 99999999.99 then raise exception 'quote_total_too_large' using errcode = '22023'; end if;
  v_subtotal := v_subtotal_raw;
  v_tax := round(v_subtotal * p_tax_rate, 2);
  v_total := v_subtotal + v_tax;
  if v_total > 99999999.99 then raise exception 'quote_total_too_large' using errcode = '22023'; end if;
  v_deposit := round(v_total * p_deposit_percent / 100, 2);
  if v_deposit < 0.50 then raise exception 'deposit_below_stripe_minimum' using errcode = '22023'; end if;

  if not v_resume then
    delete from service_quote_lines where quote_id = p_quote_id;
    insert into service_quote_lines (quote_id, name, description, quantity, unit_price, sort_order)
    select p_quote_id, trim(x->>'name'), nullif(trim(x->>'description'), ''),
      (x->>'quantity')::integer, (x->>'unitPrice')::numeric, ordinality::integer
    from jsonb_array_elements(p_lines) with ordinality as entries(x, ordinality);
  end if;

  update service_quotes set status = 'quoted', subtotal = v_subtotal, tax_amount = v_tax,
    total = v_total, deposit_percent = p_deposit_percent, deposit_amount = v_deposit,
    checkout_session_id = case when v_reissue then null else checkout_session_id end,
    checkout_url = case when v_reissue then null else checkout_url end,
    checkout_attempt = service_quotes.checkout_attempt + case when v_resume then 0 else 1 end,
    checkout_payload_hash = p_checkout_payload_hash,
    expires_at = p_expires_at, updated_at = now()
  where id = p_quote_id;
  return query select v_subtotal, v_tax, v_total, v_deposit,
    (select q.checkout_attempt from service_quotes q where q.id = p_quote_id);
end;
$$;
revoke all on function issue_service_quote(uuid, jsonb, numeric, numeric, timestamptz, text) from public, anon;
grant execute on function issue_service_quote(uuid, jsonb, numeric, numeric, timestamptz, text) to authenticated;

-- Stripe is the authority for payment completion. This single transaction
-- converts a paid quote into its production order exactly once, even when
-- Stripe retries the webhook or two workers receive it concurrently.
create or replace function complete_service_quote_payment(
  p_quote_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote service_quotes%rowtype;
  v_order_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_quote_id::text, 0));
  select * into v_quote from service_quotes where id = p_quote_id for update;
  if not found then raise exception 'service_quote_not_found' using errcode = 'P0002'; end if;
  if v_quote.converted_order_id is not null then return v_quote.converted_order_id; end if;
  if v_quote.status <> 'quoted' or v_quote.checkout_session_id is distinct from p_checkout_session_id then
    raise exception 'service_quote_payment_not_expected' using errcode = '22023';
  end if;
  if v_quote.total is null or v_quote.deposit_amount is null or v_quote.deposit_amount <= 0 then
    raise exception 'service_quote_amount_invalid' using errcode = '22023';
  end if;

  insert into orders (
    restaurant_id, status, guest_name, guest_phone, subtotal, tax_amount, total,
    payment_method, payment_status, stripe_payment_intent_id, paid_at,
    fulfillment_mode, is_public_request, customer_id, notes, requested_ready_at,
    order_kind, deposit_paid_amount
  ) values (
    v_quote.restaurant_id, 'confirmee', v_quote.guest_name, v_quote.guest_phone,
    v_quote.subtotal, v_quote.tax_amount, v_quote.total, 'Carte (Stripe)',
    case when v_quote.deposit_amount >= v_quote.total then 'paye'::order_payment_status
      else 'en_attente'::order_payment_status end,
    p_payment_intent_id, now(),
    case when v_quote.fulfillment_mode = 'livraison' then 'livraison' else 'sur_place' end,
    true, v_quote.customer_id,
    concat_ws(E'\n', nullif(v_quote.client_notes, ''), nullif(v_quote.owner_notes, ''),
      case when v_quote.deposit_amount < v_quote.total then 'Acompte encaissé : ' || v_quote.deposit_amount::text || ' ' || v_quote.currency else null end),
    v_quote.event_at,
    case when v_quote.quote_type = 'catering' then 'catering' else 'custom' end,
    v_quote.deposit_amount
  ) returning id into v_order_id;

  insert into order_items (order_id, item_name, unit_price, quantity, notes)
  select v_order_id, l.name, l.unit_price, l.quantity, l.description
  from service_quote_lines l where l.quote_id = p_quote_id order by l.sort_order, l.created_at;

  update service_quotes set
    status = 'converted',
    stripe_payment_intent_id = p_payment_intent_id,
    accepted_at = now(),
    converted_order_id = v_order_id,
    updated_at = now()
  where id = p_quote_id;
  return v_order_id;
end;
$$;

revoke all on function complete_service_quote_payment(uuid, text, text) from public, anon, authenticated;
grant execute on function complete_service_quote_payment(uuid, text, text) to service_role;

-- Suggestions/votes are customer-authenticated records, not public counters.
create table if not exists meal_suggestions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'under_review', 'draft_added', 'declined', 'archived')),
  menu_item_id uuid references menu_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(title)) between 3 and 120),
  check (description is null or char_length(description) <= 1000)
);
create index if not exists idx_meal_suggestions_restaurant_status
  on meal_suggestions (restaurant_id, status, created_at desc);

create table if not exists meal_suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references meal_suggestions(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (suggestion_id, customer_id)
);
create index if not exists idx_meal_suggestion_votes_customer on meal_suggestion_votes(customer_id);

alter table meal_suggestions enable row level security;
alter table meal_suggestion_votes enable row level security;
drop policy if exists meal_suggestions_restaurant_select on meal_suggestions;
create policy meal_suggestions_restaurant_select on meal_suggestions for select
  using (is_restaurant_member(restaurant_id) or exists (
    select 1 from customers c where c.id = meal_suggestions.customer_id and c.user_id = auth.uid()
  ));
drop policy if exists meal_suggestions_owner_manage on meal_suggestions;
create policy meal_suggestions_owner_manage on meal_suggestions for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists meal_suggestion_votes_select on meal_suggestion_votes;
create policy meal_suggestion_votes_select on meal_suggestion_votes for select
  using (exists (select 1 from meal_suggestions s where s.id = meal_suggestion_votes.suggestion_id
    and (is_restaurant_member(s.restaurant_id) or exists (
      select 1 from customers c where c.id = meal_suggestion_votes.customer_id and c.user_id = auth.uid()
    ))));
drop policy if exists meal_suggestion_votes_customer_insert on meal_suggestion_votes;
create policy meal_suggestion_votes_customer_insert on meal_suggestion_votes for insert
  with check (exists (select 1 from customers c where c.id = meal_suggestion_votes.customer_id and c.user_id = auth.uid())
    and exists (select 1 from meal_suggestions s where s.id = meal_suggestion_votes.suggestion_id and s.status = 'open'));
drop policy if exists meal_suggestion_votes_customer_delete on meal_suggestion_votes;
create policy meal_suggestion_votes_customer_delete on meal_suggestion_votes for delete
  using (exists (select 1 from customers c where c.id = meal_suggestion_votes.customer_id and c.user_id = auth.uid()));

-- Customer RPCs resolve customer_id from auth.uid(); the mobile/web client
-- never gets to claim another customer's identity or submit raw vote counts.
create or replace function submit_meal_suggestion(
  p_restaurant_id uuid,
  p_title text,
  p_description text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_suggestion_id uuid;
begin
  select c.id into v_customer_id from customers c
  where c.user_id = auth.uid() and c.restaurant_id = p_restaurant_id
  order by c.created_at asc limit 1 for update;
  if v_customer_id is null then raise exception 'customer_not_found' using errcode = '42501'; end if;
  if length(trim(coalesce(p_title, ''))) not between 3 and 120 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if length(coalesce(p_description, '')) > 1000 then
    raise exception 'description_too_long' using errcode = '22023';
  end if;
  if (select count(*) from meal_suggestions s where s.customer_id = v_customer_id
      and s.created_at >= now() - interval '24 hours') >= 5 then
    raise exception 'daily_suggestion_limit' using errcode = '54000';
  end if;

  insert into meal_suggestions (restaurant_id, customer_id, created_by_user_id, title, description)
  values (p_restaurant_id, v_customer_id, auth.uid(), trim(p_title), nullif(trim(coalesce(p_description, '')), ''))
  returning id into v_suggestion_id;
  return v_suggestion_id;
end;
$$;

create or replace function vote_meal_suggestion(p_suggestion_id uuid)
returns table (vote_count bigint, has_voted boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_restaurant_id uuid;
begin
  select s.restaurant_id into v_restaurant_id from meal_suggestions s
  where s.id = p_suggestion_id and s.status = 'open';
  if v_restaurant_id is null then raise exception 'suggestion_not_open' using errcode = '22023'; end if;
  select c.id into v_customer_id from customers c
  where c.user_id = auth.uid() and c.restaurant_id = v_restaurant_id
  order by c.created_at asc limit 1;
  if v_customer_id is null then raise exception 'customer_not_found' using errcode = '42501'; end if;

  insert into meal_suggestion_votes (suggestion_id, customer_id)
  values (p_suggestion_id, v_customer_id)
  on conflict (suggestion_id, customer_id) do nothing;

  return query select count(*)::bigint, true from meal_suggestion_votes v
    where v.suggestion_id = p_suggestion_id;
end;
$$;

create or replace function get_meal_suggestions(p_restaurant_id uuid)
returns table (
  id uuid,
  restaurant_id uuid,
  title text,
  description text,
  status text,
  menu_item_id uuid,
  created_at timestamptz,
  vote_count bigint,
  has_voted boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_restaurant_member(p_restaurant_id) and not exists (
    select 1 from customers c where c.restaurant_id = p_restaurant_id and c.user_id = auth.uid()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  select s.id, s.restaurant_id, s.title, s.description, s.status, s.menu_item_id, s.created_at,
    (select count(*)::bigint from meal_suggestion_votes v where v.suggestion_id = s.id),
    exists (
      select 1 from meal_suggestion_votes v
      join customers c on c.id = v.customer_id
      where v.suggestion_id = s.id and c.user_id = auth.uid()
    )
  from meal_suggestions s
  where s.restaurant_id = p_restaurant_id and s.status in ('open', 'under_review', 'draft_added')
  order by (select count(*) from meal_suggestion_votes v where v.suggestion_id = s.id) desc, s.created_at desc;
end;
$$;

revoke all on function submit_meal_suggestion(uuid, text, text) from public, anon;
revoke all on function vote_meal_suggestion(uuid) from public, anon;
revoke all on function get_meal_suggestions(uuid) from public, anon;
grant execute on function submit_meal_suggestion(uuid, text, text) to authenticated;
grant execute on function vote_meal_suggestion(uuid) to authenticated;
grant execute on function get_meal_suggestions(uuid) to authenticated;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0128', 'preorders_quotes_and_meal_suggestions') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0128_preorders_quotes_and_meal_suggestions.sql <<<

-- >>> MIGRATION 0129_portal_order_checkout_sessions.sql >>>
-- Hosted Stripe Checkout for customer-portal and native menu orders.
-- Payment state remains webhook-authoritative; returning from Stripe is not
-- proof that a payment succeeded.
begin;

alter table public.orders
  add column if not exists stripe_checkout_session_id text;

create unique index if not exists orders_stripe_checkout_session_id_uidx
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0129', 'portal_order_checkout_sessions') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0129_portal_order_checkout_sessions.sql <<<

-- >>> MIGRATION 0130_delivery_time_pricing.sql >>>
-- Optional charge for estimated driving time, in addition to distance-based
-- pricing. A zero default preserves existing restaurant pricing.
begin;

alter table public.restaurants
  add column if not exists delivery_per_minute_fee numeric(10,2) not null default 0
    check (delivery_per_minute_fee >= 0 and delivery_per_minute_fee <= 100);

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0130', 'delivery_time_pricing') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0130_delivery_time_pricing.sql <<<

-- >>> MIGRATION 0131_customer_suggestion_menu_drafts.sql >>>
begin;

-- Owners can promote a popular customer idea into an unpublished draft.
-- The row lock and existing menu_item_id make retries safe and prevent two
-- concurrent clicks from creating duplicate draft dishes.
create or replace function public.create_menu_draft_from_suggestion(p_suggestion_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_suggestion public.meal_suggestions%rowtype;
  v_menu_item_id uuid;
begin
  select * into v_suggestion
  from public.meal_suggestions
  where id = p_suggestion_id
  for update;

  if not found or not is_restaurant_member(v_suggestion.restaurant_id, array['owner','manager']::member_role[]) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_suggestion.status = 'draft_added' and v_suggestion.menu_item_id is not null then
    return v_suggestion.menu_item_id;
  end if;
  if v_suggestion.status not in ('open', 'under_review') then
    raise exception 'suggestion_not_actionable' using errcode = '22023';
  end if;

  insert into public.menu_items (
    restaurant_id, name, category, price, food_cost, description,
    active, is_draft, allergens_confirmed
  ) values (
    v_suggestion.restaurant_id, v_suggestion.title, 'Plats', 0, 0,
    coalesce(v_suggestion.description, 'Idée proposée par un client — à compléter avant publication.'),
    false, true, false
  ) returning id into v_menu_item_id;

  update public.meal_suggestions
  set status = 'draft_added', menu_item_id = v_menu_item_id, updated_at = now()
  where id = p_suggestion_id;

  return v_menu_item_id;
end;
$$;

revoke all on function public.create_menu_draft_from_suggestion(uuid) from public, anon;
grant execute on function public.create_menu_draft_from_suggestion(uuid) to authenticated;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0131', 'customer_suggestion_menu_drafts') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0131_customer_suggestion_menu_drafts.sql <<<

-- >>> MIGRATION 0132_secure_birthday_loyalty_bonus.sql >>>
begin;

-- Make birthday loyalty awards auditable and safe to retry. A deterministic
-- ledger key prevents duplicate bonuses if the owner double-clicks or the
-- browser retries after a network timeout.
alter table loyalty_transactions
  add column if not exists idempotency_key text;

create unique index if not exists idx_loyalty_transactions_idempotency_key
  on loyalty_transactions (restaurant_id, idempotency_key)
  where idempotency_key is not null;

create or replace function grant_customer_birthday_bonus(
  p_restaurant_id uuid,
  p_customer_id uuid
) returns table (applied boolean, customer customers)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer customers%rowtype;
  v_timezone text;
  v_today date;
  v_next_birthday date;
  v_birthday_year integer;
  v_month integer;
  v_day integer;
  v_idempotency_key text;
begin
  if auth.uid() is null
     or not is_restaurant_member(p_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(tz.name, 'America/Toronto')
    into v_timezone
  from restaurants r
  left join pg_timezone_names tz on tz.name = r.timezone
  where r.id = p_restaurant_id;
  if not found then
    raise exception 'restaurant_not_found' using errcode = 'P0002';
  end if;
  v_today := (now() at time zone v_timezone)::date;

  select * into v_customer
  from customers c
  where c.id = p_customer_id and c.restaurant_id = p_restaurant_id
  for update;
  if not found then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;
  if v_customer.birthday is null then
    raise exception 'birthday_missing' using errcode = '22023';
  end if;

  v_month := extract(month from v_customer.birthday)::integer;
  v_day := extract(day from v_customer.birthday)::integer;
  v_birthday_year := extract(year from v_today)::integer;

  -- Celebrate Feb 29 on Feb 28 during non-leap years, matching the native app.
  if v_month = 2 and v_day = 29
     and not (v_birthday_year % 4 = 0 and (v_birthday_year % 100 <> 0 or v_birthday_year % 400 = 0)) then
    v_next_birthday := make_date(v_birthday_year, 2, 28);
  else
    v_next_birthday := make_date(v_birthday_year, v_month, v_day);
  end if;

  if v_next_birthday < v_today then
    v_birthday_year := v_birthday_year + 1;
    if v_month = 2 and v_day = 29
       and not (v_birthday_year % 4 = 0 and (v_birthday_year % 100 <> 0 or v_birthday_year % 400 = 0)) then
      v_next_birthday := make_date(v_birthday_year, 2, 28);
    else
      v_next_birthday := make_date(v_birthday_year, v_month, v_day);
    end if;
  end if;

  if v_next_birthday > v_today + 14 then
    raise exception 'birthday_bonus_not_eligible' using errcode = '22023';
  end if;

  v_idempotency_key := 'birthday:' || p_customer_id::text || ':' || v_birthday_year::text;
  if exists (
    select 1 from loyalty_transactions lt
    where lt.restaurant_id = p_restaurant_id and lt.idempotency_key = v_idempotency_key
  ) then
    return query select false, v_customer;
    return;
  end if;

  insert into loyalty_transactions (
    restaurant_id, customer_id, type, points_delta, note, created_by, idempotency_key
  ) values (
    p_restaurant_id,
    p_customer_id,
    'ajustement',
    50,
    'Bonus anniversaire ' || v_birthday_year::text,
    auth.uid(),
    v_idempotency_key
  );

  update customers c
  set loyalty_points = c.loyalty_points + 50
  where c.id = p_customer_id and c.restaurant_id = p_restaurant_id
  returning c.* into v_customer;

  return query select true, v_customer;
end;
$$;

revoke all on function grant_customer_birthday_bonus(uuid, uuid) from public, anon;
grant execute on function grant_customer_birthday_bonus(uuid, uuid) to authenticated;

commit;
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('0132', 'secure_birthday_loyalty_bonus') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
-- <<< END MIGRATION 0132_secure_birthday_loyalty_bonus.sql <<<
