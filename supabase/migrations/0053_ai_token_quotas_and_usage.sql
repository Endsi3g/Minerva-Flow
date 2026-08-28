-- 0053_ai_token_quotas_and_usage.sql
-- Minerva Flow: Suivi de la consommation de tokens IA et gestion des quotas par plan d'abonnement

create table if not exists workspace_ai_usage (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  plan_tier text not null default 'starter' check (plan_tier in ('starter', 'pro', 'enterprise')),
  monthly_token_quota integer not null default 100000,
  tokens_used_current_period integer not null default 0,
  period_start timestamptz not null default date_trunc('month', now()),
  period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  total_lifetime_tokens bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_ai_usage_workspace on workspace_ai_usage(workspace_id);

alter table workspace_ai_usage enable row level security;

create policy "workspace_ai_usage_select" on workspace_ai_usage
  for select
  using (is_workspace_member(workspace_id));

-- Fonction atomique pour incrémenter la consommation et réinitialiser automatiquement si nouvelle période
create or replace function record_workspace_ai_tokens(
  p_workspace_id uuid,
  p_tokens integer,
  p_default_quota integer default 100000,
  p_plan_tier text default 'starter'
)
returns table (
  tokens_used integer,
  monthly_quota integer,
  is_quota_exceeded boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_period_start timestamptz := date_trunc('month', v_now);
  v_period_end timestamptz := v_period_start + interval '1 month';
  v_rec record;
begin
  insert into workspace_ai_usage (
    workspace_id,
    plan_tier,
    monthly_token_quota,
    tokens_used_current_period,
    period_start,
    period_end,
    total_lifetime_tokens,
    updated_at
  )
  values (
    p_workspace_id,
    p_plan_tier,
    p_default_quota,
    p_tokens,
    v_period_start,
    v_period_end,
    p_tokens,
    v_now
  )
  on conflict (workspace_id) do update
  set
    tokens_used_current_period = case
      when workspace_ai_usage.period_end <= v_now then p_tokens
      else workspace_ai_usage.tokens_used_current_period + p_tokens
    end,
    period_start = case
      when workspace_ai_usage.period_end <= v_now then v_period_start
      else workspace_ai_usage.period_start
    end,
    period_end = case
      when workspace_ai_usage.period_end <= v_now then v_period_end
      else workspace_ai_usage.period_end
    end,
    total_lifetime_tokens = workspace_ai_usage.total_lifetime_tokens + p_tokens,
    updated_at = v_now
  returning workspace_ai_usage.tokens_used_current_period, workspace_ai_usage.monthly_token_quota
  into v_rec;

  return query select
    v_rec.tokens_used_current_period,
    v_rec.monthly_token_quota,
    (v_rec.tokens_used_current_period > v_rec.monthly_token_quota);
end;
$$;
