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
