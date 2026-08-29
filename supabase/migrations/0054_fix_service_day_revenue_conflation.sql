-- Fixes a real revenue-accuracy bug: `increment_service_day_revenue` (called when a direct/
-- self-service order is served) creates a fresh service_days row with no explicit
-- revenue_source, so it silently inherited the column's default of 'manuel'. That made it
-- indistinguishable from a real owner manual entry, which caused
-- upsertSyncedServiceDayRevenue() to permanently skip ("skipped_manual") every future Square
-- sync for that day. And even when sync order was reversed, upsertSyncedServiceDayRevenue()
-- did a full REPLACE of `revenue` on every sync, silently discarding any order-driven revenue
-- accumulated since the previous sync. Restaurants using both Square and direct ordering (the
-- flagship "commandes directes sans commission" feature) were quietly under-counting revenue
-- with no error surfaced anywhere.
--
-- Fix: (1) order-serving explicitly tags fresh rows 'commandes' instead of defaulting to
-- 'manuel', so it's never conflated with a real owner override; (2) POS sync tracks the amount
-- IT last contributed (revenue_pos_amount) and replaces only that portion on resync, instead
-- of overwriting the whole day.

alter table service_days add column if not exists revenue_pos_amount numeric not null default 0;

do $$ begin
  alter table service_days drop constraint if exists service_days_revenue_source_check;
  alter table service_days add constraint service_days_revenue_source_check
    check (revenue_source in ('manuel', 'commandes', 'square', 'lightspeed', 'clover'));
exception when duplicate_object then null;
end $$;

create or replace function increment_service_day_revenue(p_restaurant_id uuid, p_date date, p_amount numeric)
returns setof service_days
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_restaurant_member(p_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  return query
    insert into service_days (restaurant_id, date, revenue, main_source, rush_level, revenue_source)
    values (p_restaurant_id, p_date, p_amount, 'salle', 'normal', 'commandes')
    on conflict (restaurant_id, date)
    do update set revenue = service_days.revenue + excluded.revenue
    returning *;
end;
$$;
