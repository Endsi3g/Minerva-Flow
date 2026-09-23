-- Optional, explicit consent for Minerva Flow product-update emails.
-- The default remains opted out; consent for restaurant customers is separate.
begin;

alter table public.profiles
  add column if not exists product_updates_opt_in boolean not null default false,
  add column if not exists product_updates_opt_in_at timestamptz;

create table if not exists public.product_update_email_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consented boolean not null,
  source text not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_update_email_consent_events_user_created
  on public.product_update_email_consent_events (user_id, created_at desc);

alter table public.product_update_email_consent_events enable row level security;

drop policy if exists product_update_email_consent_events_select_own
  on public.product_update_email_consent_events;
create policy product_update_email_consent_events_select_own
  on public.product_update_email_consent_events for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.product_update_email_consent_events from anon, authenticated;
grant select on public.product_update_email_consent_events to authenticated;

create or replace function public.set_product_updates_email_consent(p_consented boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  update public.profiles
  set product_updates_opt_in = p_consented,
      product_updates_opt_in_at = case when p_consented then now() else product_updates_opt_in_at end,
      updated_at = now()
  where id = actor_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  insert into public.product_update_email_consent_events
    (user_id, consented, source, policy_version)
  values
    (actor_id, p_consented, 'profile_settings', 'product-updates-2026-09-v1');
end;
$$;

revoke all on function public.set_product_updates_email_consent(boolean) from public;
grant execute on function public.set_product_updates_email_consent(boolean) to authenticated;

-- These views are the two named, live audience segments. They are readable
-- only by service_role so email addresses never become client-facing data.
create or replace view public.email_audience_all_accounts
with (security_invoker = true)
as
  select id as profile_id, email, full_name, product_updates_opt_in
  from public.profiles;

create or replace view public.email_audience_product_updates_opted_in
with (security_invoker = true)
as
  select id as profile_id, email, full_name, product_updates_opt_in_at
  from public.profiles
  where product_updates_opt_in = true;

revoke all on public.email_audience_all_accounts from anon, authenticated;
revoke all on public.email_audience_product_updates_opted_in from anon, authenticated;
grant select on public.email_audience_all_accounts to service_role;
grant select on public.email_audience_product_updates_opted_in to service_role;

commit;
