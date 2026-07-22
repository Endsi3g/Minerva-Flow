begin;

-- Stripe Connect (paiements clients en ligne) — distinct de l'abonnement
-- Flow par Minerva (subscriptions/lib/stripe/config.ts). Un compte Express
-- par restaurant, jamais par workspace : chaque établissement a son propre
-- compte bancaire, comme tax_rate/accepts_tips.
alter table restaurants add column if not exists stripe_connect_account_id text unique;
alter table restaurants add column if not exists stripe_connect_charges_enabled boolean not null default false;
alter table restaurants add column if not exists stripe_connect_payouts_enabled boolean not null default false;
alter table restaurants add column if not exists stripe_connect_details_submitted boolean not null default false;
alter table restaurants add column if not exists stripe_connect_connected_at timestamptz;

do $$ begin
  create type order_payment_status as enum ('non_requis', 'en_attente', 'paye', 'echoue');
exception when duplicate_object then null;
end $$;

alter table orders add column if not exists payment_status order_payment_status not null default 'non_requis';
alter table orders add column if not exists stripe_payment_intent_id text unique;
alter table orders add column if not exists paid_at timestamptz;

create index if not exists idx_orders_stripe_payment_intent on orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

commit;
