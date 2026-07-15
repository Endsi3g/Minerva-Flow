-- Minerva Flow — Phase 5 (feuille de route) : facturation Stripe (abonnement
-- mensuel fixe par établissement) + activation du parrainage.

begin;

create type subscription_status as enum (
  'incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status subscription_status not null default 'incomplete',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id)
);

create index idx_subscriptions_restaurant on subscriptions (restaurant_id);
create index idx_subscriptions_stripe_customer on subscriptions (stripe_customer_id);

alter table subscriptions enable row level security;

create policy "subscriptions_select" on subscriptions for select
  using (is_restaurant_member(restaurant_id, array['owner']::member_role[]));

commit;
