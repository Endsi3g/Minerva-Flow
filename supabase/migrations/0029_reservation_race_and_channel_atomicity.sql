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
