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

-- Existing deployments created these tables manually. Define the same
-- baseline when bootstrapping a clean project so this migration chain is
-- reproducible; restaurant_id remains text for compatibility with deployed
-- schemas and is cast only where is_restaurant_member() requires uuid.
create table if not exists team_chat_messages (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null,
  channel text not null check (channel in ('general', 'cuisine', 'service', 'urgences')),
  author_id text not null,
  author_name text not null,
  author_role text,
  author_avatar_url text,
  content text not null,
  is_ai_response boolean not null default false,
  is_pinned boolean not null default false,
  deleted boolean not null default false,
  reply_to jsonb,
  reactions jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists team_channel_members (
  restaurant_id text not null,
  channel text not null check (channel in ('general', 'cuisine', 'service', 'urgences')),
  member_id text not null,
  added_by text,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, channel, member_id)
);

-- p_restaurant_id is plain text so callers can pass either table's column
-- as-is; it is cast to uuid only where is_restaurant_member() requires it.
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
