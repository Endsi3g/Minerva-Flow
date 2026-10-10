begin;
create table public.clover_webhook_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  merchant_id text not null,
  environment text not null check (environment in ('sandbox','production')),
  sales_date date not null,
  revision bigint not null default 1,
  status text not null default 'queued' check(status in ('queued','done')),
  lease_id uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  updated_at timestamptz not null default now(),
  unique(restaurant_id,merchant_id,environment,sales_date)
);
alter table public.clover_webhook_sync_jobs enable row level security;
revoke all on public.clover_webhook_sync_jobs from public,anon,authenticated;
grant all on public.clover_webhook_sync_jobs to service_role;
create index clover_webhook_sync_work on public.clover_webhook_sync_jobs(next_attempt_at) where status='queued';

create function public.enqueue_clover_webhook_sync(p_restaurant_id uuid,p_merchant_id text,p_environment text,p_date date)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_environment not in ('sandbox','production') or p_environment is null or p_date is null then return false; end if;
  if not exists(select 1 from public.pos_connections where restaurant_id=p_restaurant_id and provider='clover'
    and external_account_id=p_merchant_id and clover_environment=p_environment) then return false; end if;
  insert into public.clover_webhook_sync_jobs(restaurant_id,merchant_id,environment,sales_date)
    values(p_restaurant_id,p_merchant_id,p_environment,p_date)
    on conflict(restaurant_id,merchant_id,environment,sales_date) do update
      set revision=clover_webhook_sync_jobs.revision+1,status='queued',next_attempt_at=now(),updated_at=now();
  return true;
end $$;
create function public.claim_clover_webhook_sync(p_environment text)
returns setof public.clover_webhook_sync_jobs language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  select id into v_id from public.clover_webhook_sync_jobs where environment=p_environment and status='queued'
    and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by next_attempt_at for update skip locked limit 1;
  return query update public.clover_webhook_sync_jobs set lease_id=gen_random_uuid(),lease_until=now()+interval '3 minutes',
    attempts=attempts+1 where id=v_id returning *;
end $$;
create function public.finish_clover_webhook_sync(p_id uuid,p_lease uuid,p_revision bigint,p_error text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  update public.clover_webhook_sync_jobs set
    status=case when p_error is null and revision=p_revision then 'done' else 'queued' end,
    next_attempt_at=case when revision<>p_revision then now() else now()+interval '1 minute'*least(60,power(2,least(attempts,6))::integer) end,
    last_error_code=p_error,lease_id=null,lease_until=null,updated_at=now()
    where id=p_id and lease_id=p_lease and lease_until>now();
  get diagnostics v_count=row_count; return v_count=1;
end $$;
revoke all on function public.enqueue_clover_webhook_sync(uuid,text,text,date),public.claim_clover_webhook_sync(text),
  public.finish_clover_webhook_sync(uuid,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.enqueue_clover_webhook_sync(uuid,text,text,date),public.claim_clover_webhook_sync(text),
  public.finish_clover_webhook_sync(uuid,uuid,bigint,text) to service_role;
commit;
