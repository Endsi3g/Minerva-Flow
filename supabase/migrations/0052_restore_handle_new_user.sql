-- The live handle_new_user() trigger on this project had been overwritten
-- by a different Minerva product's version — referencing client_invites,
-- allowed_emails, and a CRM-shaped profiles/notification_preferences
-- schema (lead_activity_enabled, department, skills, github_url — none of
-- which belong to this app). Concretely: new Flow signups got an auth user
-- + a profiles row and nothing else — no restaurant, no workspace, no
-- membership — leaving the app completely unusable post-signup, and
-- causing the e2e suite's login-timeout failures across several unrelated
-- specs (fresh test accounts hitting this exact gap).
--
-- This restores Flow's own version verbatim from
-- 0024_customer_self_enrollment.sql (the last migration in this repo to
-- touch the function) as a new migration rather than editing 0024, so the
-- repo's migration history stays an honest append-only record of what
-- actually happened, instead of rewriting history to look like the
-- contamination never occurred.

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
