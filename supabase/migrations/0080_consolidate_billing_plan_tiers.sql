-- 0080_consolidate_billing_plan_tiers.sql
-- Minerva Flow: consolidates the two plan-tier naming systems into one.
--
-- Until now, `restaurants.plan_tier` (0079, per-restaurant feature gating:
-- essentiel/croissance/marque_blanche) and `subscriptions.plan_tier` /
-- `workspace_ai_usage.plan_tier` (0053/0065, workspace-level billing:
-- starter/pro/enterprise) used different names for what the business has
-- decided is the same three-tier concept, at $99/$250/$500 respectively.
-- This migration renames the billing-side values to match. Confirmed zero
-- rows exist in either subscriptions or workspace_ai_usage in production —
-- the UPDATEs below are defensive (in case that changes between review and
-- apply), not a real data migration.

begin;

update workspace_ai_usage
set plan_tier = case plan_tier
  when 'starter' then 'essentiel'
  when 'pro' then 'croissance'
  when 'enterprise' then 'marque_blanche'
  else plan_tier
end
where plan_tier in ('starter', 'pro', 'enterprise');

update subscriptions
set plan_tier = case plan_tier
  when 'starter' then 'essentiel'
  when 'pro' then 'croissance'
  when 'enterprise' then 'marque_blanche'
  else plan_tier
end
where plan_tier in ('starter', 'pro', 'enterprise');

alter table workspace_ai_usage drop constraint if exists workspace_ai_usage_plan_tier_check;
alter table workspace_ai_usage add constraint workspace_ai_usage_plan_tier_check
  check (plan_tier in ('essentiel', 'croissance', 'marque_blanche'));
alter table workspace_ai_usage alter column plan_tier set default 'essentiel';

alter table subscriptions drop constraint if exists subscriptions_plan_tier_check;
alter table subscriptions add constraint subscriptions_plan_tier_check
  check (plan_tier in ('essentiel', 'croissance', 'marque_blanche'));

-- Default parameter can't be altered in place — recreate with the exact same
-- body as 0053_ai_token_quotas_and_usage.sql, only the default value changes.
create or replace function record_workspace_ai_tokens(
  p_workspace_id uuid,
  p_tokens integer,
  p_default_quota integer default 100000,
  p_plan_tier text default 'essentiel'
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

commit;
