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
