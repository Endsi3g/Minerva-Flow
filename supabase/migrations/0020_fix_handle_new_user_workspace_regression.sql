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
