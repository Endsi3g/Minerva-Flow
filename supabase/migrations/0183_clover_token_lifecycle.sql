-- Clover v2 refresh tokens are single-use. A persisted attempt is never
-- reclaimed for another POST, even if the process dies or its reply is lost.
begin;

alter table public.pos_connections
  add column clover_environment text check (clover_environment in ('sandbox','production')),
  add column clover_app_id text,
  add column refresh_expires_at timestamptz,
  add column token_version bigint not null default 0,
  add column refresh_attempt_id uuid,
  add column refresh_started_at timestamptz,
  add column refresh_state text not null default 'idle' check (refresh_state in ('idle','sending','uncertain')),
  add column last_refresh_attempt_id uuid;

-- No environment is inferred for historical credentials: reconnect Clover.
create function public.store_clover_connection(
  p_restaurant_id uuid, p_actor_id uuid, p_environment text, p_app_id text,
  p_merchant_id text, p_access_token text, p_refresh_token text,
  p_access_expires_at timestamptz, p_refresh_expires_at timestamptz
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_access uuid; v_refresh uuid; v_member uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_environment not in ('sandbox','production') or p_environment is null
    or nullif(trim(p_access_token),'') is null or p_merchant_id !~ '^[A-Za-z0-9_-]{1,128}$' or p_merchant_id is null
    or (p_refresh_token is not null and (nullif(trim(p_refresh_token),'') is null or p_access_expires_at is null))
    or (p_access_expires_at is not null and p_access_expires_at <= now())
    or (p_refresh_expires_at is not null and p_refresh_expires_at <= now()) then
    raise exception 'invalid_clover_credentials' using errcode='22023';
  end if;
  -- Lock the active manager membership until credentials are committed.
  select m.id into v_member from public.restaurant_members m where m.restaurant_id=p_restaurant_id
    and m.user_id=p_actor_id and m.status='active' and m.role in ('owner','manager') for share;
  if not found then raise exception 'clover_management_required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('clover-connection:' || p_restaurant_id::text,0));
  perform 1 from public.pos_connections where restaurant_id=p_restaurant_id and provider='clover' for update;
  v_access := vault.create_secret(p_access_token);
  if p_refresh_token is not null then v_refresh := vault.create_secret(p_refresh_token); end if;
  -- Vault writes and connection metadata roll back together on any failure.
  insert into public.pos_connections(restaurant_id,provider,external_account_id,access_token_id,refresh_token_id,
    expires_at,refresh_expires_at,status,created_by,clover_environment,clover_app_id,token_version)
  values(p_restaurant_id,'clover',p_merchant_id,v_access,v_refresh,p_access_expires_at,p_refresh_expires_at,
    'connecte',p_actor_id,p_environment,p_app_id,1)
  on conflict (restaurant_id,provider) do update set external_account_id=excluded.external_account_id,
    access_token_id=excluded.access_token_id,refresh_token_id=excluded.refresh_token_id,
    expires_at=excluded.expires_at,refresh_expires_at=excluded.refresh_expires_at,status='connecte',
    clover_environment=p_environment,clover_app_id=p_app_id,token_version=pos_connections.token_version+1,
    refresh_state='idle',refresh_attempt_id=null,refresh_started_at=null,last_refresh_attempt_id=null;
  return true;
end $$;

create function public.read_clover_token_state(p_restaurant_id uuid,p_environment text,p_app_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.pos_connections%rowtype; v_access text; v_refresh text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  select * into v from public.pos_connections where restaurant_id=p_restaurant_id and provider='clover'
    and clover_environment=p_environment and clover_app_id is not distinct from p_app_id and status='connecte';
  if not found then return null; end if;
  select decrypted_secret into v_access from vault.decrypted_secrets where id=v.access_token_id;
  select decrypted_secret into v_refresh from vault.decrypted_secrets where id=v.refresh_token_id;
  return jsonb_build_object('accessToken',v_access,'refreshToken',v_refresh,'expiresAt',v.expires_at,
    'refreshExpiresAt',v.refresh_expires_at,'merchantId',v.external_account_id,'version',v.token_version,
    'refreshState',v.refresh_state,'lastRefreshAttemptId',v.last_refresh_attempt_id);
end $$;

create function public.begin_clover_token_refresh(p_restaurant_id uuid,p_environment text,p_app_id text,p_version bigint,p_attempt_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_attempt_id is null then return false; end if;
  update public.pos_connections set refresh_state='sending',refresh_attempt_id=p_attempt_id,refresh_started_at=now()
    where restaurant_id=p_restaurant_id and provider='clover' and status='connecte'
      and clover_environment=p_environment and clover_app_id is not distinct from p_app_id
      and token_version=p_version and refresh_state='idle' and refresh_token_id is not null
      and expires_at <= now()+interval '60 seconds'
      and (refresh_expires_at is null or refresh_expires_at > now());
  get diagnostics v_count=row_count; return v_count=1;
end $$;

create function public.complete_clover_token_refresh(
  p_restaurant_id uuid,p_environment text,p_app_id text,p_version bigint,p_attempt_id uuid,
  p_access_token text,p_refresh_token text,p_access_expires_at timestamptz,p_refresh_expires_at timestamptz
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.pos_connections%rowtype; v_access uuid; v_refresh uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  select * into v from public.pos_connections where restaurant_id=p_restaurant_id and provider='clover'
    and clover_environment=p_environment and clover_app_id is not distinct from p_app_id
    and token_version=p_version and refresh_attempt_id=p_attempt_id and refresh_state='sending' and status='connecte' for update;
  if not found then return false; end if;
  if nullif(trim(p_access_token),'') is null or nullif(trim(p_refresh_token),'') is null
    or p_access_expires_at is null or p_access_expires_at <= now()
    or p_refresh_expires_at is null or p_refresh_expires_at <= now() then
    raise exception 'invalid_clover_refresh_response' using errcode='22023';
  end if;
  v_access := vault.create_secret(p_access_token); v_refresh := vault.create_secret(p_refresh_token);
  update public.pos_connections set access_token_id=v_access,refresh_token_id=v_refresh,
    expires_at=p_access_expires_at,refresh_expires_at=p_refresh_expires_at,token_version=token_version+1,
    refresh_state='idle',refresh_attempt_id=null,refresh_started_at=null,last_refresh_attempt_id=p_attempt_id where id=v.id;
  return true;
end $$;

create function public.fail_clover_token_refresh(p_restaurant_id uuid,p_environment text,p_app_id text,p_version bigint,p_attempt_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  update public.pos_connections set refresh_state='uncertain',status='erreur'
    where restaurant_id=p_restaurant_id and provider='clover' and clover_environment=p_environment
      and clover_app_id is not distinct from p_app_id and token_version=p_version
      and refresh_attempt_id=p_attempt_id and refresh_state='sending';
  get diagnostics v_count=row_count; return v_count=1;
end $$;

revoke all on function public.store_clover_connection(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz),
  public.read_clover_token_state(uuid,text,text),public.begin_clover_token_refresh(uuid,text,text,bigint,uuid),
  public.complete_clover_token_refresh(uuid,text,text,bigint,uuid,text,text,timestamptz,timestamptz),
  public.fail_clover_token_refresh(uuid,text,text,bigint,uuid) from public,anon,authenticated;
grant execute on function public.store_clover_connection(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz),
  public.read_clover_token_state(uuid,text,text),public.begin_clover_token_refresh(uuid,text,text,bigint,uuid),
  public.complete_clover_token_refresh(uuid,text,text,bigint,uuid,text,text,timestamptz,timestamptz),
  public.fail_clover_token_refresh(uuid,text,text,bigint,uuid) to service_role;
commit;
