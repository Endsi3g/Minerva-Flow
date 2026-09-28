-- Enable scoped Postgres Changes for the web and native realtime buses.
-- The client subscriptions still apply restaurant/customer filters, while
-- RLS remains the authorization boundary. Only tables with RLS enabled and
-- a restaurant_id column are added; device tokens and auth tables stay out.
begin;

do $$
declare
  v_table text;
  v_tables text[] := array[
    'activity_log',
    'alerts',
    'campaigns',
    'customers',
    'employees',
    'financial_transactions',
    'inventory_items',
    'inventory_low_stock_state',
    'loyalty_rewards',
    'loyalty_transactions',
    'menu_items',
    'notifications',
    'offers',
    'order_status_events',
    'orders',
    'purchase_orders',
    'reservation_status_events',
    'reservations',
    'restaurant_members',
    'revenue_programs',
    'reward_redemptions',
    'service_days',
    'shift_schedules',
    'suppliers',
    'team_chat_messages'
  ];
  v_oid oid;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Required Supabase publication supabase_realtime does not exist';
  end if;

  foreach v_table in array v_tables loop
    v_oid := to_regclass(format('public.%I', v_table));
    if v_oid is null then
      continue;
    end if;
    if not exists (
      select 1
      from pg_attribute a
      where a.attrelid = v_oid and a.attname = 'restaurant_id'
        and a.attnum > 0 and not a.attisdropped
    ) then
      continue;
    end if;
    if not (select c.relrowsecurity from pg_class c where c.oid = v_oid) then
      raise exception 'Refusing to publish public.% without row-level security', v_table;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end
$$;

commit;
