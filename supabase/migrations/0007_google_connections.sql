-- Minerva Flow — unified Google Workspace connection (Gmail, Sheets, Drive,
-- Calendar, Analytics) — one row per restaurant, scopes accumulate as the
-- user opts into individual features via the in-app consent modal.
-- Distinct from ad_platform_connections (0006), which is Meta/Google Ads
-- specific and stays that way; both share GOOGLE_CLIENT_ID/SECRET but are
-- separate OAuth flows with separate token sets.

create table google_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade unique,
  connected_email text,
  granted_scopes text[] not null default '{}',
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  calendar_id text, -- Google Calendar id for the dedicated "Minerva Flow" calendar, created on first sync
  drive_folder_id text, -- Drive folder id for exported reports, created on first export
  ga4_property_id text, -- GA4 property id, entered manually by the user (no reliable discovery without an extra scope)
  status ad_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_google_connections_restaurant on google_connections (restaurant_id);

alter table google_connections enable row level security;

create policy "google_connections_manage" on google_connections for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
