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
