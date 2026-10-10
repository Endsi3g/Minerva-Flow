-- Native owner Finances screen: one round trip for the period chart, the
-- expense breakdown, the comparison with the previous period of equal length
-- and the latest transactions. SECURITY INVOKER keeps financial_transactions'
-- own RLS: a caller only aggregates restaurants they can already read.
create or replace function public.owner_finance_summary(p_restaurant_id uuid, p_days int default 30)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select greatest(least(p_days, 366), 1) as n,
           (now() at time zone coalesce((select timezone from restaurants where id = p_restaurant_id), 'America/Toronto'))::date as today
  ),
  days as (
    select generate_series((select today - (n - 1) from params), (select today from params), interval '1 day')::date as day
  ),
  cur as (
    select * from financial_transactions
    where restaurant_id = p_restaurant_id
      and date >= (select today - (n - 1) from params) and date <= (select today from params)
  ),
  prev as (
    select * from financial_transactions
    where restaurant_id = p_restaurant_id
      and date >= (select today - (2 * n - 1) from params) and date < (select today - (n - 1) from params)
  ),
  cats as (
    select category, sum(amount)::float8 as amount
    from cur where direction = 'out'
    group by category
    order by 2 desc
  ),
  top_cats as (select category, amount from cats limit 5),
  other_cats as (select 'Autres'::text as category, sum(amount)::float8 as amount from (select amount from cats offset 5) x having sum(amount) > 0)
  select jsonb_build_object(
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', days.day,
        'income', coalesce((select sum(amount) from cur where cur.date = days.day and direction = 'in'), 0),
        'expense', coalesce((select sum(amount) from cur where cur.date = days.day and direction = 'out'), 0)
      ) order by days.day) from days
    ), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('category', category, 'amount', amount) order by amount desc) from (select * from top_cats union all select * from other_cats) c), '[]'::jsonb),
    'income', coalesce((select sum(amount) from cur where direction = 'in'), 0),
    'expense', coalesce((select sum(amount) from cur where direction = 'out'), 0),
    'prev_income', coalesce((select sum(amount) from prev where direction = 'in'), 0),
    'prev_expense', coalesce((select sum(amount) from prev where direction = 'out'), 0),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'date', date, 'description', description, 'amount', amount, 'direction', direction, 'category', category) order by date desc, created_at desc)
      from (select * from cur order by date desc, created_at desc limit 60) r
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.owner_finance_summary(uuid, int) to authenticated;
