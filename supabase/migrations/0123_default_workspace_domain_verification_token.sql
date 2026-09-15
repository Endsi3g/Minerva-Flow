-- 0122 made the proof token mandatory. New workspaces are created by the
-- existing after-insert trigger, so the column must generate its own value.
alter table workspace_brand_settings
  alter column custom_domain_verification_token set default encode(gen_random_bytes(24), 'hex');
