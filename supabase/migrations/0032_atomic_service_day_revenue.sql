-- Atomic increment for service_days.revenue, mirroring increment_inventory_quantity
-- (0010) and increment_menu_item_sales: two orders served concurrently on the
-- same day must not lose one write to a read-then-write race.
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
    insert into service_days (restaurant_id, date, revenue, main_source, rush_level)
    values (p_restaurant_id, p_date, p_amount, 'salle', 'normal')
    on conflict (restaurant_id, date)
    do update set revenue = service_days.revenue + excluded.revenue
    returning *;
end;
$$;
