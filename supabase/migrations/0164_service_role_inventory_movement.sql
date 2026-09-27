-- The MCP tool uses the service-role client for API-key authentication, so it
-- cannot call increment_inventory_quantity (which intentionally requires an
-- authenticated restaurant member). Keep its stock ledger write and balance
-- update atomic, and bind the item to the restaurant resolved from the key.
begin;

create or replace function public.record_inventory_movement_via_service_role(
  p_restaurant_id uuid,
  p_item_id uuid,
  p_type public.inventory_movement_type,
  p_quantity numeric,
  p_reason text default null
)
returns setof public.inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric;
  v_updated public.inventory_items;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_restaurant_id is null or p_item_id is null or p_quantity is null or p_quantity = 0 then
    raise exception 'invalid_inventory_movement' using errcode = '22023';
  end if;
  if p_reason is not null and char_length(p_reason) > 500 then
    raise exception 'inventory_movement_reason_too_long' using errcode = '22023';
  end if;

  if p_type = 'reception' then
    v_delta := abs(p_quantity);
  elsif p_type = 'ajustement' then
    v_delta := p_quantity;
  elsif p_type in ('utilisation', 'gaspillage') then
    if p_quantity < 0 then
      raise exception 'quantity_must_be_positive' using errcode = '22023';
    end if;
    v_delta := -p_quantity;
  else
    raise exception 'invalid_inventory_movement_type' using errcode = '22023';
  end if;

  -- Lock and verify the tenant-scoped inventory item before recording any
  -- movement. A forged item UUID can never move another restaurant's stock.
  select * into v_updated
  from public.inventory_items
  where id = p_item_id and restaurant_id = p_restaurant_id
  for update;
  if not found then
    raise exception 'inventory_item_not_found' using errcode = 'P0002';
  end if;

  insert into public.inventory_movements(inventory_item_id, type, quantity, reason)
  values (p_item_id, p_type, v_delta, p_reason);

  update public.inventory_items
  set quantity_on_hand = greatest(0, quantity_on_hand + v_delta)
  where id = p_item_id and restaurant_id = p_restaurant_id
  returning * into v_updated;

  return next v_updated;
end;
$$;

revoke all on function public.record_inventory_movement_via_service_role(uuid, uuid, public.inventory_movement_type, numeric, text)
  from public, anon, authenticated;
grant execute on function public.record_inventory_movement_via_service_role(uuid, uuid, public.inventory_movement_type, numeric, text)
  to service_role;

comment on function public.record_inventory_movement_via_service_role(uuid, uuid, public.inventory_movement_type, numeric, text) is
  'Atomically records an MCP stock movement and updates the quantity for an item belonging to the restaurant resolved from the API key. Service-role only.';

commit;
