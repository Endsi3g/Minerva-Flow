-- Physical touchpoint attribution layer: every NFC tag / QR sticker / table
-- chevalet a restaurant places in its venue points at
-- https://minervaflow.app/t/[code] instead of a fixed destination. The
-- redirect route (app/[locale]/t/[code]/route.ts) logs a
-- 'touchpoint_opened' event then 302s onward to the real existing flow
-- (loyalty join /f/[token], menu /m/[token], a Google review link, etc.),
-- carrying the code as ?tp= so downstream pages can attribute
-- signup_started/signup_completed/loyalty_activated/etc. back to the exact
-- physical spot that drove it. See AGENTS.md for the full funnel spec.

begin;

create table if not exists physical_touchpoints (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  type text not null check (type in ('caisse', 'comptoir', 'table', 'vitrine', 'sortie', 'sac_recu', 'carte_client', 'autre')),
  label text not null,
  code text not null unique,
  destination_kind text not null check (destination_kind in ('loyalty_join', 'menu', 'review', 'custom_url')),
  -- loyalty_join/menu: a token resolved against the matching share table at
  -- redirect time. review/custom_url: a raw URL, stored as-is (a Google
  -- review link never lives in this app's own tables).
  destination_value text not null,
  campaign_id uuid references campaigns (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_physical_touchpoints_restaurant on physical_touchpoints (restaurant_id);

create table if not exists physical_touchpoint_events (
  id uuid primary key default gen_random_uuid(),
  touchpoint_id uuid not null references physical_touchpoints (id) on delete cascade,
  event_type text not null check (event_type in (
    'touchpoint_opened', 'app_opened', 'app_installed_or_download_clicked',
    'signup_started', 'signup_completed', 'venue_joined', 'loyalty_activated',
    'offer_redeemed', 'review_flow_started', 'review_submitted'
  )),
  occurred_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_physical_touchpoint_events_touchpoint on physical_touchpoint_events (touchpoint_id);
create index if not exists idx_physical_touchpoint_events_type on physical_touchpoint_events (event_type);

alter table physical_touchpoints enable row level security;
alter table physical_touchpoint_events enable row level security;

-- Management (create/edit/delete the physical inventory) is owner/manager
-- only, same gate as the existing Partage/QR tooling it extends.
drop policy if exists "physical_touchpoints_manage_select" on physical_touchpoints;
create policy "physical_touchpoints_manage_select" on physical_touchpoints for select
  using (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

drop policy if exists "physical_touchpoints_manage_insert" on physical_touchpoints;
create policy "physical_touchpoints_manage_insert" on physical_touchpoints for insert
  with check (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

drop policy if exists "physical_touchpoints_manage_update" on physical_touchpoints;
create policy "physical_touchpoints_manage_update" on physical_touchpoints for update
  using (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

drop policy if exists "physical_touchpoints_manage_delete" on physical_touchpoints;
create policy "physical_touchpoints_manage_delete" on physical_touchpoints for delete
  using (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

-- Events are written anonymously from the public /t/[code] redirect (via
-- the admin client, same as customer_referral_links' recordClick) and read
-- by owner/manager for the attribution dashboard.
drop policy if exists "physical_touchpoint_events_manage_select" on physical_touchpoint_events;
create policy "physical_touchpoint_events_manage_select" on physical_touchpoint_events for select
  using (
    exists (
      select 1 from physical_touchpoints tp
      where tp.id = physical_touchpoint_events.touchpoint_id
        and is_restaurant_member(tp.restaurant_id, array['owner', 'manager']::member_role[])
    )
  );

drop policy if exists "physical_touchpoint_events_service_insert" on physical_touchpoint_events;
create policy "physical_touchpoint_events_service_insert" on physical_touchpoint_events for insert
  with check (auth.role() = 'service_role');

commit;
