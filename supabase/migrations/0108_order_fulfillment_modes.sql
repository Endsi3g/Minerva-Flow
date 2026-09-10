-- 0108_order_fulfillment_modes.sql
-- Lets a restaurant offer up to 3 explicit order modes to customers:
--   immediat              — pay online now (today's "En ligne maintenant")
--   sur_place             — pay in person at pickup (today's default/only mode)
--   prep_apres_paiement   — pay online, kitchen only preps once payment is confirmed
-- order_modes_enabled controls which of the 3 the owner offers at checkout.
-- fulfillment_mode records which one a given order was placed under, so the
-- "à préparer après paiement" gate (a later migration) knows which orders to hold.

begin;

alter table restaurants
  add column if not exists order_modes_enabled text[] not null default '{immediat,sur_place}';

alter table orders
  add column if not exists fulfillment_mode text;

alter table orders
  add constraint orders_fulfillment_mode_check
  check (fulfillment_mode is null or fulfillment_mode in ('immediat', 'sur_place', 'prep_apres_paiement'));

-- Backfill from the existing payment signal: any order that went through
-- online payment (or tried to) was effectively "immediat" under today's
-- binary choice; everything else was pay-on-site.
update orders
set fulfillment_mode = case
  when payment_status in ('paye', 'en_attente', 'echoue') then 'immediat'
  else 'sur_place'
end
where fulfillment_mode is null;

commit;
