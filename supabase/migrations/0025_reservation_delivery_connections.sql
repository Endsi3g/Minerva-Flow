begin;

-- Réservations tierces (OpenTable, Resy) et livraison tierce (Uber Direct/
-- Eats) — mêmes deux catégories que le type `reservation`/`livraison` déjà
-- utilisé par la table `connections` générique, mais ces trois-là ont besoin
-- de stocker un identifiant de compte + une clé/API secret dans Vault
-- (comme pos_connections), ce que la table générique ne fait pas. Toutes
-- les trois sont des API partenaires à accès restreint (aucune n'a
-- d'inscription libre-service) : la ligne reste en statut 'attente' tant
-- qu'aucune credential n'a été saisie, ce qui n'arrivera qu'une fois le
-- partenariat d'affaires approuvé côté fournisseur.
do $$ begin
  create type reservation_delivery_category as enum ('reservation', 'livraison');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reservation_delivery_provider as enum ('opentable', 'resy', 'uber_direct');
exception when duplicate_object then null;
end $$;

create table if not exists reservation_delivery_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider reservation_delivery_provider not null,
  category reservation_delivery_category not null,
  external_account_id text,
  api_key_id uuid references vault.secrets (id) on delete set null,
  status pos_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (restaurant_id, provider)
);

create index if not exists idx_reservation_delivery_connections_restaurant
  on reservation_delivery_connections (restaurant_id);

alter table reservation_delivery_connections enable row level security;

-- Même précédent que pos_connections : lecture ouverte aux membres du
-- restaurant, toutes les écritures passent par le client service-role
-- depuis les server actions (gate requireManager), pas de policy insert/
-- update/delete ici.
drop policy if exists "reservation_delivery_connections_select" on reservation_delivery_connections;
create policy "reservation_delivery_connections_select" on reservation_delivery_connections for select
  using (is_restaurant_member(restaurant_id));

commit;
