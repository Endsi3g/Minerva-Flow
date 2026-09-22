begin;

alter table restaurants
  add column if not exists delivery_enabled boolean not null default false,
  add column if not exists delivery_base_fee numeric(10,2) not null default 3.99,
  add column if not exists delivery_per_km_fee numeric(10,2) not null default 1.25,
  add column if not exists delivery_free_km numeric(10,2) not null default 2,
  add column if not exists delivery_max_km numeric(10,2) not null default 10,
  add column if not exists delivery_average_speed_kmh numeric(10,2) not null default 25;

alter table orders
  add column if not exists delivery_address text,
  add column if not exists delivery_lat numeric(10,7),
  add column if not exists delivery_lng numeric(10,7),
  add column if not exists delivery_distance_km numeric(10,2),
  add column if not exists delivery_fee numeric(10,2) not null default 0,
  add column if not exists delivery_eta_minutes integer;

alter table orders drop constraint if exists orders_fulfillment_mode_check;
alter table orders add constraint orders_fulfillment_mode_check
  check (fulfillment_mode is null or fulfillment_mode in ('immediat', 'sur_place', 'prep_apres_paiement', 'livraison'));

commit;
