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

drop policy if exists "companies_select" on workspaces;
drop policy if exists "companies_update" on workspaces;
drop policy if exists "companies_insert" on workspaces;
create policy "workspaces_select" on workspaces for select
  using (is_workspace_member(id));
create policy "workspaces_update" on workspaces for update
  using (is_workspace_member(id, array['owner','manager']::member_role[]));
create policy "workspaces_insert" on workspaces for insert
  with check (true); -- creation happens via a server action that immediately inserts the owner membership

drop policy if exists "company_members_select" on workspace_members;
drop policy if exists "company_members_insert" on workspace_members;
drop policy if exists "company_members_update" on workspace_members;
drop policy if exists "company_members_delete" on workspace_members;
create policy "workspace_members_select" on workspace_members for select
  using (is_workspace_member(workspace_id));
create policy "workspace_members_insert" on workspace_members for insert
  with check (is_workspace_member(workspace_id, array['owner','manager']::member_role[]) or user_id = auth.uid());
  -- the "or user_id = auth.uid()" covers the moment a workspace is first created:
  -- the creating user has no membership row yet, so they insert their own
  -- owner row directly (same bootstrap gap as restaurants_owner_insert).
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
