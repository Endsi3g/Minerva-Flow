-- Shared, restaurant-agnostic cache of city name -> coordinates, so the
-- "Provenance des clients" map doesn't re-geocode the same city (e.g.
-- "Montréal") once per restaurant that happens to have a customer there.
-- Non-sensitive reference data (a city's approximate coordinates), so any
-- authenticated user can read and contribute to it.
create table if not exists city_geocodes (
  city_key text primary key,
  city_label text not null,
  lat numeric not null,
  lng numeric not null,
  created_at timestamptz not null default now()
);

alter table city_geocodes enable row level security;

drop policy if exists "city_geocodes_select" on city_geocodes;
create policy "city_geocodes_select" on city_geocodes for select
  to authenticated using (true);

drop policy if exists "city_geocodes_insert" on city_geocodes;
create policy "city_geocodes_insert" on city_geocodes for insert
  to authenticated with check (true);
