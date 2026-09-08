-- Fulfillment record for the $75 CAD "carte NFC personnalisée" one-time
-- add-on (see scripts/create-stripe-nfc-card-price.ts). Only ever written
-- once Stripe confirms payment (app/api/stripe/webhook/route.ts) — an
-- abandoned Checkout session leaves no row here, Stripe's own dashboard is
-- the record of that. Shipping details are copied out of the Checkout
-- session at webhook time purely so Kael doesn't have to open the Stripe
-- dashboard to pack an order.

begin;

create table if not exists nfc_card_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  quantity int not null check (quantity > 0),
  unit_price_cad numeric(10, 2) not null,
  total_amount_cad numeric(10, 2) not null,
  status text not null default 'paid' check (status in ('paid', 'shipped', 'fulfilled', 'cancelled')),
  shipping_name text,
  shipping_address jsonb,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_nfc_card_orders_restaurant on nfc_card_orders (restaurant_id);

alter table nfc_card_orders enable row level security;

drop policy if exists "nfc_card_orders_manage_select" on nfc_card_orders;
create policy "nfc_card_orders_manage_select" on nfc_card_orders for select
  using (is_restaurant_member(restaurant_id, array['owner', 'manager']::member_role[]));

drop policy if exists "nfc_card_orders_service_insert" on nfc_card_orders;
create policy "nfc_card_orders_service_insert" on nfc_card_orders for insert
  with check (auth.role() = 'service_role');

drop policy if exists "nfc_card_orders_service_update" on nfc_card_orders;
create policy "nfc_card_orders_service_update" on nfc_card_orders for update
  using (auth.role() = 'service_role');

commit;
