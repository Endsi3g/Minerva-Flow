-- One round trip for the native owner home (Aperçu): daily sales series,
-- busiest hours, best sellers and the week's loyalty activity.
-- SECURITY INVOKER on purpose: every table read below keeps its own RLS, so
-- a caller only ever aggregates restaurants they can already read.
create or replace function public.owner_overview_insights(p_restaurant_id uuid, p_days int default 60)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with tz as (
    select coalesce((select timezone from restaurants where id = p_restaurant_id), 'America/Toronto') as name
  ),
  today as (
    select (now() at time zone (select name from tz))::date as d
  ),
  days as (
    select generate_series((select d from today) - (greatest(p_days, 1) - 1), (select d from today), interval '1 day')::date as day
  ),
  rev as (
    select date as day, sum(revenue)::float8 as revenue
    from service_days
    where restaurant_id = p_restaurant_id and date >= (select d from today) - (greatest(p_days, 1) - 1)
    group by date
  ),
  ord as (
    select (created_at at time zone (select name from tz))::date as day, count(*)::int as orders
    from orders
    where restaurant_id = p_restaurant_id and status <> 'annulee'
      and created_at >= now() - make_interval(days => greatest(p_days, 1) + 1)
    group by 1
  ),
  hourly as (
    select extract(hour from created_at at time zone (select name from tz))::int as hour, count(*)::int as orders
    from orders
    where restaurant_id = p_restaurant_id and status <> 'annulee' and created_at >= now() - interval '30 days'
    group by 1
  ),
  top_items as (
    select oi.item_name as name, sum(oi.quantity)::int as quantity
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.restaurant_id = p_restaurant_id and o.status <> 'annulee' and o.created_at >= now() - interval '7 days'
    group by oi.item_name
    order by 2 desc, 1
    limit 5
  )
  select jsonb_build_object(
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', days.day, 'revenue', coalesce(rev.revenue, 0), 'orders', coalesce(ord.orders, 0)) order by days.day)
      from days left join rev on rev.day = days.day left join ord on ord.day = days.day
    ), '[]'::jsonb),
    'hourly', coalesce((select jsonb_agg(jsonb_build_object('hour', hour, 'orders', orders) order by hour) from hourly), '[]'::jsonb),
    'top_items', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity) order by quantity desc, name) from top_items), '[]'::jsonb),
    'week', jsonb_build_object(
      'new_customers', (select count(*) from customers where restaurant_id = p_restaurant_id and created_at >= now() - interval '7 days'),
      'credited_visits', (select count(*) from loyalty_transactions where restaurant_id = p_restaurant_id and type = 'visite' and created_at >= now() - interval '7 days'),
      'redemptions', (select count(*) from reward_redemptions where restaurant_id = p_restaurant_id and created_at >= now() - interval '7 days'),
      'review_avg', (select round(avg(rating)::numeric, 1)::float8 from restaurant_reviews where restaurant_id = p_restaurant_id),
      'review_count', (select count(*) from restaurant_reviews where restaurant_id = p_restaurant_id),
      'members', (select count(*) from customers where restaurant_id = p_restaurant_id),
      'returning_pct', (select case when count(*) filter (where visit_count >= 1) = 0 then null
                         else round(100.0 * count(*) filter (where visit_count > 1) / count(*) filter (where visit_count >= 1))::int end
                        from customers where restaurant_id = p_restaurant_id)
    )
  );
$$;

grant execute on function public.owner_overview_insights(uuid, int) to authenticated;
