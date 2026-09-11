-- Migration 0119: Lifecycle events for customer journey and retention funnel tracking

begin;

create table if not exists lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid references customers (id) on delete cascade,
  event_type text not null check (event_type in (
    'qr_code_displayed',
    'qr_code_scanned',
    'form_started',
    'registration_completed',
    'sms_consent_given',
    'first_visit_recognized',
    'second_visit_recognized',
    'reward_unlocked',
    'reward_redeemed',
    'campaign_sent',
    'message_delivered',
    'unsubscribed',
    'campaign_visit_generated',
    'referral_sent',
    'referral_converted'
  )),
  touchpoint_id uuid references physical_touchpoints (id) on delete set null,
  campaign_id uuid references campaigns (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lifecycle_events_restaurant_type_created
  on lifecycle_events (restaurant_id, event_type, created_at desc);

create index if not exists idx_lifecycle_events_customer_created
  on lifecycle_events (customer_id, created_at desc);

create index if not exists idx_lifecycle_events_restaurant_created
  on lifecycle_events (restaurant_id, created_at desc);

alter table lifecycle_events enable row level security;

create policy "lifecycle_events_select"
  on lifecycle_events for select
  using (is_restaurant_member(restaurant_id));

create policy "lifecycle_events_service_role"
  on lifecycle_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "lifecycle_events_authenticated_insert"
  on lifecycle_events for insert
  with check (is_restaurant_member(restaurant_id) or auth.uid() is not null);

commit;
