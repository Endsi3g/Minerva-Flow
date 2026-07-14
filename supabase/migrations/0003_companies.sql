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
