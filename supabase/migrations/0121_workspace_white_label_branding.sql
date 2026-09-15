-- White-label foundation: a workspace is one customer brand with one or more
-- establishments. This is deliberately a separate one-to-one table so the
-- existing workspace/billing hierarchy remains backwards compatible.

create table workspace_brand_settings (
  workspace_id uuid primary key references workspaces (id) on delete cascade,
  brand_name text not null,
  logo_url text,
  primary_color text not null default '#167F5B',
  secondary_color text not null default '#0E5A40',
  accent_color text not null default '#DFFF5F',
  heading_font text not null default 'new_york',
  body_font text not null default 'plus_jakarta_sans',
  preferred_locale text not null default 'fr-CA',
  ai_tone text not null default 'professionnel',
  enabled_modules jsonb not null default '{}',
  enabled_integrations text[] not null default '{}',
  requested_custom_domain text,
  custom_domain_status text not null default 'non_configure',
  email_sender_name text,
  email_reply_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_brand_primary_color_hex check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint workspace_brand_secondary_color_hex check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint workspace_brand_accent_color_hex check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint workspace_brand_heading_font_allowed check (heading_font in ('new_york', 'playfair_display', 'system_serif')),
  constraint workspace_brand_body_font_allowed check (body_font in ('plus_jakarta_sans', 'inter', 'system_sans')),
  constraint workspace_brand_locale_allowed check (preferred_locale in ('fr-CA', 'fr-FR', 'en-CA', 'en-US')),
  constraint workspace_brand_ai_tone_allowed check (ai_tone in ('professionnel', 'chaleureux', 'direct', 'luxe')),
  constraint workspace_brand_domain_status_allowed check (custom_domain_status in ('non_configure', 'en_attente', 'verifie', 'erreur')),
  constraint workspace_brand_requested_domain_format check (
    requested_custom_domain is null
    or requested_custom_domain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  ),
  constraint workspace_brand_reply_to_format check (
    email_reply_to is null or email_reply_to ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint workspace_brand_modules_object check (jsonb_typeof(enabled_modules) = 'object')
);

-- Domains are compared case-insensitively. Their DNS verification is handled
-- by a server-side flow in Phase 2; this table only records a requested name.
create unique index workspace_brand_settings_requested_domain_unique
  on workspace_brand_settings (lower(requested_custom_domain))
  where requested_custom_domain is not null;

-- Migrate every existing workspace without changing its current visual
-- identity. logo_url has already been used for workspace-level branding.
insert into workspace_brand_settings (workspace_id, brand_name, logo_url)
select id, name, logo_url
from workspaces
on conflict (workspace_id) do nothing;

create or replace function initialize_workspace_brand_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_brand_settings (workspace_id, brand_name, logo_url)
  values (new.id, new.name, new.logo_url)
  on conflict (workspace_id) do nothing;
  return new;
end;
$$;

drop trigger if exists workspaces_initialize_brand_settings on workspaces;
create trigger workspaces_initialize_brand_settings
  after insert on workspaces
  for each row execute function initialize_workspace_brand_settings();

drop trigger if exists workspace_brand_settings_touch_updated_at on workspace_brand_settings;
create trigger workspace_brand_settings_touch_updated_at
  before update on workspace_brand_settings
  for each row execute function touch_updated_at();

alter table workspace_brand_settings enable row level security;

create policy "workspace_brand_settings_select" on workspace_brand_settings for select
  using (is_workspace_member(workspace_id));

-- Brand, domain, sender and module changes affect every establishment of a
-- customer. They are restricted to the workspace owner; managers retain their
-- operational workspace permissions but cannot impersonate the business.
create policy "workspace_brand_settings_insert_owner" on workspace_brand_settings for insert
  with check (is_workspace_member(workspace_id, array['owner']::member_role[]));

create policy "workspace_brand_settings_update_owner" on workspace_brand_settings for update
  using (is_workspace_member(workspace_id, array['owner']::member_role[]))
  with check (is_workspace_member(workspace_id, array['owner']::member_role[]));

comment on table workspace_brand_settings is
  'White-label configuration for a workspace/customer brand. Credentials are intentionally excluded and stay in provider-specific encrypted stores.';
