-- Native owner connection to the restaurant's verified Google Business Profile.
-- OAuth credentials remain in Supabase Vault through google_connections; only
-- opaque Google resource names and display metadata are kept on the row.
alter table public.google_connections
  add column if not exists business_profile_account_name text,
  add column if not exists business_profile_location_name text,
  add column if not exists business_profile_location_title text,
  add column if not exists business_profile_synced_at timestamptz;

comment on column public.google_connections.business_profile_account_name is
  'Google Business Profile account resource selected by the restaurant owner.';
comment on column public.google_connections.business_profile_location_name is
  'Verified Google Business Profile location resource selected by the restaurant owner.';
