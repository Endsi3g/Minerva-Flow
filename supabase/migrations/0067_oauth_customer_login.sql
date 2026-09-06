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
