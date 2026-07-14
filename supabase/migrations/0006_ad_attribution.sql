-- Minerva Flow — ad platform attribution (Meta Ads + Google Ads)
-- OAuth tokens are stored via Supabase Vault (pgsodium), never as plain
-- columns — ad_platform_connections only holds a reference (key id) into
-- vault.secrets. Only the service-role client (lib/supabase/admin.ts) can
-- read vault.decrypted_secrets; RLS on ad_platform_connections itself
-- still gates who can see that a connection exists at all.

create extension if not exists "pgsodium" schema pgsodium;
create extension if not exists "supabase_vault";

create type ad_provider as enum ('meta', 'google');
create type ad_connection_status as enum ('connecte', 'erreur', 'attente');
create type ad_channel as enum ('organic', 'meta', 'google');

create table ad_platform_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider ad_provider not null,
  external_account_id text,
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  status ad_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create index idx_ad_platform_connections_restaurant on ad_platform_connections (restaurant_id);

create table ad_conversions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  ad_platform_connection_id uuid references ad_platform_connections (id) on delete set null,
  channel ad_channel not null default 'organic',
  city text,
  lng double precision,
  lat double precision,
  converted_online boolean not null default false,
  revenue numeric(12,2),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_ad_conversions_restaurant on ad_conversions (restaurant_id, occurred_at desc);
create index idx_ad_conversions_channel on ad_conversions (restaurant_id, channel);

alter table ad_platform_connections enable row level security;
alter table ad_conversions enable row level security;

-- connection management (which is billing/security-adjacent, holds OAuth
-- account links) mirrors the existing connections_manage convention:
-- owner/manager only, read and write together.
create policy "ad_platform_connections_manage" on ad_platform_connections for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- conversion data (aggregate, non-sensitive) is readable by any active
-- member, same as the rest of the marketing/campaign data; writes happen
-- only via the service-role sync job (no client-facing insert policy).
create policy "ad_conversions_select" on ad_conversions for select
  using (is_restaurant_member(restaurant_id));

-- ── vault access wrappers ────────────────────────────────────────────────
-- The vault schema isn't exposed over PostgREST directly, so these thin
-- security-definer wrappers expose exactly the two operations needed
-- (store / decrypt a token) as callable RPCs — restricted to service_role
-- only, since decrypt_secret must never be reachable by a regular user
-- (it would let them read any secret in the vault by id).
create function store_vault_secret(secret text, secret_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  new_id uuid;
begin
  new_id := vault.create_secret(secret, secret_name);
  return new_id;
end;
$$;

create function read_vault_secret(secret_id uuid)
returns text
language sql
security definer
set search_path = public, vault
stable
as $$
  select decrypted_secret from vault.decrypted_secrets where id = secret_id;
$$;

revoke execute on function store_vault_secret(text, text) from public, anon, authenticated;
revoke execute on function read_vault_secret(uuid) from public, anon, authenticated;
grant execute on function store_vault_secret(text, text) to service_role;
grant execute on function read_vault_secret(uuid) to service_role;
