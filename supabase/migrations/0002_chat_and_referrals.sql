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
