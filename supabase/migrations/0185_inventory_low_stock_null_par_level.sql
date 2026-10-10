-- Inserting an inventory item without a replenishment target (par_level NULL)
-- failed: the low-stock trigger computed v_low as NULL and wrote it into the
-- NOT NULL column inventory_low_stock_state.is_low. A missing target now simply
-- means "not low".
create or replace function public.notify_inventory_low_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_threshold numeric := 30;
  v_enabled boolean := true;
  v_notify boolean := true;
  v_low boolean;
  v_was_low boolean := false;
begin
  select coalesce(ar.threshold, 30), coalesce(ar.enabled, true), coalesce(ar.notify, true)
    into v_threshold, v_enabled, v_notify
  from (select 1) seed
  left join public.alert_rules ar
    on ar.restaurant_id = new.restaurant_id and ar.rule_type = 'low_stock';

  v_low := coalesce(
    new.par_level > 0
      and new.quantity_on_hand <= new.par_level * greatest(0, v_threshold) / 100,
    false
  );

  select is_low into v_was_low
  from public.inventory_low_stock_state
  where inventory_item_id = new.id
  for update;
  if not found then v_was_low := false; end if;

  insert into public.inventory_low_stock_state(inventory_item_id, restaurant_id, is_low, updated_at)
  values (new.id, new.restaurant_id, v_low, now())
  on conflict(inventory_item_id) do update
    set restaurant_id = excluded.restaurant_id, is_low = excluded.is_low, updated_at = now();

  -- Notify once on entry into low stock. Restocking clears the state so a
  -- later crossing produces a fresh notification.
  if v_low and not v_was_low and v_enabled and v_notify then
    insert into public.notifications(restaurant_id, user_id, type, title, body, link, dedupe_key)
    select new.restaurant_id, rm.user_id, 'inventory_low_stock',
      'Stock bientôt épuisé : ' || new.name,
      'Il reste ' || new.quantity_on_hand || ' ' || new.unit || ' (' || round(
        100 * new.quantity_on_hand / nullif(new.par_level, 0), 0
      ) || ' % de la cible). Pensez à planifier le réapprovisionnement.',
      '/inventaire',
      'inventory-low:' || new.id::text || ':' || floor(extract(epoch from now()))::text || ':' || rm.user_id::text
    from public.restaurant_members rm
    where rm.restaurant_id = new.restaurant_id
      and rm.status = 'active'
      and rm.role in ('owner', 'manager');
  end if;

  return new;
end;
$function$;
