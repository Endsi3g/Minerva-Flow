-- Minerva Flow — Phase 4 (feuille de route) : scaffold d'intégration POS.
-- Suit exactement le même schéma que ad_platform_connections
-- (0006_ad_attribution.sql) — jetons stockés dans Supabase Vault, jamais
-- en clair dans une colonne. Commence par Square (API la mieux
-- documentée) ; Lightspeed et Clover suivent le même schéma quand leurs
-- identifiants d'app seront disponibles.

begin;

create type pos_provider as enum ('square', 'lightspeed', 'clover');
create type pos_connection_status as enum ('connecte', 'erreur', 'attente');

create table pos_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider pos_provider not null,
  external_account_id text,
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  status pos_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create index idx_pos_connections_restaurant on pos_connections (restaurant_id);

alter table pos_connections enable row level security;

create policy "pos_connections_select" on pos_connections for select
  using (is_restaurant_member(restaurant_id));

commit;
