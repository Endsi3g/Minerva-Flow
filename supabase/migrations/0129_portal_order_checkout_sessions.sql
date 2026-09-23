-- Hosted Stripe Checkout for customer-portal and native menu orders.
-- Payment state remains webhook-authoritative; returning from Stripe is not
-- proof that a payment succeeded.
begin;

alter table public.orders
  add column if not exists stripe_checkout_session_id text;

create unique index if not exists orders_stripe_checkout_session_id_uidx
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

commit;
