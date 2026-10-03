-- GTM funnel (/equipe): a demo/test marker so seeded and test restaurants
-- stop inflating "restaurants inscrits / activés", the counts as one SQL
-- function (a client-side count would silently truncate at PostgREST's
-- 1 000-row limit), and a fifth monthly goal for activation.

alter table public.restaurants add column if not exists is_demo boolean not null default false;

alter table public.team_monthly_goals drop constraint if exists team_monthly_goals_metric_check;
alter table public.team_monthly_goals add constraint team_monthly_goals_metric_check
  check (metric in ('restaurants_new', 'activated_restaurants', 'active_subscriptions', 'mrr', 'visitors'));

-- "Activated" = at least one published (non-draft) menu item AND at least one
-- enrolled customer: the first moment a loyalty product delivers value.
create or replace function public.team_funnel_counts()
returns table (restaurants bigint, activated bigint, demos_excluded bigint)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    count(*) filter (where not r.is_demo),
    count(*) filter (
      where not r.is_demo
        and exists (select 1 from public.menu_items m where m.restaurant_id = r.id and coalesce(m.is_draft, false) = false)
        and exists (select 1 from public.customers c where c.restaurant_id = r.id)
    ),
    count(*) filter (where r.is_demo)
  from public.restaurants r;
$$;

-- Cross-tenant totals: only the server (service role) may call it, never a user session.
revoke all on function public.team_funnel_counts() from public, anon, authenticated;
grant execute on function public.team_funnel_counts() to service_role;
