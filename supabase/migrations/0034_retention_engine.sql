-- Automated customer-retention engine: settings per restaurant + a log
-- table used both as an audit trail and as the anti-spam frequency guard
-- (a customer already contacted within the cap window is skipped).
-- 21 days is the default inactivity threshold (matches the win-back example
-- used in the product positioning: "au bout de 21 jours d'inactivité").
alter table restaurants add column if not exists retention_engine_enabled boolean not null default false;
alter table restaurants add column if not exists retention_inactivity_days integer not null default 21;
alter table restaurants add column if not exists retention_frequency_cap_days integer not null default 30;
alter table restaurants add column if not exists retention_birthday_lead_days integer not null default 3;

do $$ begin
  create type retention_trigger_type as enum ('inactivity', 'birthday', 'value_drift');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type retention_channel as enum ('email', 'push', 'sms');
exception when duplicate_object then null;
end $$;

create table if not exists customer_retention_sends (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  trigger_type retention_trigger_type not null,
  channel retention_channel not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_retention_sends_customer on customer_retention_sends (customer_id, sent_at desc);
create index if not exists idx_retention_sends_restaurant on customer_retention_sends (restaurant_id, sent_at desc);

alter table customer_retention_sends enable row level security;

drop policy if exists "retention_sends_select" on customer_retention_sends;
create policy "retention_sends_select" on customer_retention_sends for select
  using (is_restaurant_member(restaurant_id));
-- No insert/update/delete policy for regular members — only the cron (service
-- role, which bypasses RLS) writes here, matching e.g. financial_transactions.
