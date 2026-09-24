-- Auth may omit optional metadata for OAuth, invited, legacy, and E2E users.
-- Missing consent must remain false (not NULL), because the profile column is
-- NOT NULL and consent must never be inferred from absence.
begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
  new_workspace_id uuid;
  is_pending_customer boolean;
  opted_in_marketing boolean;
  opted_in_product_updates boolean := coalesce(
    (new.raw_user_meta_data ->> 'product_updates_opt_in') = 'true',
    false
  );
begin
  insert into public.profiles (
    id, email, full_name, product_updates_opt_in, product_updates_opt_in_at
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    opted_in_product_updates,
    case when opted_in_product_updates then now() else null end
  );

  if opted_in_product_updates then
    insert into public.product_update_email_consent_events
      (user_id, consented, source, policy_version)
    values
      (new.id, true, 'signup_form', 'product-updates-2026-09-v1');
  end if;

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
