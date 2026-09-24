-- Store only a customer-declared locality. This is intentionally not an
-- address or device/GPS coordinate; map placement stays approximate.
alter table public.customers
  add column if not exists neighborhood text;

alter table public.customers
  drop constraint if exists customers_neighborhood_length;
alter table public.customers
  add constraint customers_neighborhood_length
  check (neighborhood is null or char_length(neighborhood) <= 80);
