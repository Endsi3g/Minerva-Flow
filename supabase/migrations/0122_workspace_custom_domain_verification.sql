-- A domain is not activated merely because an owner typed it into the UI.
-- Each workspace receives a DNS proof token; the server verifies its TXT
-- record before custom_domain_status can be promoted to 'verifie'.

alter table workspace_brand_settings
  add column custom_domain_verification_token text;

update workspace_brand_settings
set custom_domain_verification_token = encode(gen_random_bytes(24), 'hex')
where custom_domain_verification_token is null;

alter table workspace_brand_settings
  alter column custom_domain_verification_token set not null;

alter table workspace_brand_settings
  add constraint workspace_brand_settings_domain_token_unique unique (custom_domain_verification_token);

create or replace function protect_workspace_custom_domain_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Owners may request or replace a domain, but they cannot assert that they
  -- control DNS by directly writing 'verifie' through the client API.
  if new.custom_domain_status = 'verifie'
    and old.custom_domain_status is distinct from 'verifie'
    and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'custom domain verification must be completed by the server verifier';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_brand_settings_protect_domain_verification on workspace_brand_settings;
create trigger workspace_brand_settings_protect_domain_verification
  before update on workspace_brand_settings
  for each row execute function protect_workspace_custom_domain_verification();

comment on column workspace_brand_settings.custom_domain_verification_token is
  'DNS TXT proof token. Regenerated whenever requested_custom_domain changes; it is not an application credential.';
