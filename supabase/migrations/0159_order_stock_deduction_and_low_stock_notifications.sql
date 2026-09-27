-- Consume inventory exactly once when a customer order is confirmed/paid.
-- A POS ticket starts at "servie", so its order lines are handled by the
-- order_items trigger below. A cancellation before service returns stock.
begin;

create table if not exists public.order_inventory_applications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity_applied numeric not null check (quantity_applied > 0),
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_item_id, inventory_item_id)
);
create index if not exists order_inventory_applications_order_idx
  on public.order_inventory_applications(order_id) where reversed_at is null;
alter table public.order_inventory_applications enable row level security;
drop policy if exists order_inventory_applications_select on public.order_inventory_applications;
create policy order_inventory_applications_select on public.order_inventory_applications
  for select using (public.is_restaurant_member(restaurant_id));

comment on table public.order_inventory_applications is
  'Idempotency ledger for recipe-based stock consumption, linked to each order line and inventory item.';

-- Keep the running inventory movement ledger in step with the stock update in
-- the same database transaction. A failed movement insert rolls back the stock.
create or replace function public.apply_order_inventory(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_applied public.order_inventory_applications%rowtype;
  v_short_id text;
  v_available numeric;
  v_requested numeric;
  v_consumed numeric;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return; end if;
  v_short_id := left(v_order.id::text, 8);

  -- Cancelled before service: reverse every outstanding reservation once.
  -- Served orders represent completed sales and are never restored here.
  if v_order.status = 'annulee' then
    if v_order.status_changed_at is distinct from v_order.created_at
       and exists (
         select 1 from public.order_status_events e
         where e.order_id = v_order.id and e.to_status = 'servie'
       ) then
      return;
    end if;
    for v_applied in
      update public.order_inventory_applications
      set reversed_at = now()
      where order_id = v_order.id and reversed_at is null
      returning *
    loop
      update public.inventory_items
      set quantity_on_hand = quantity_on_hand + v_applied.quantity_applied
      where id = v_applied.inventory_item_id
        and restaurant_id = v_order.restaurant_id;
      insert into public.inventory_movements(inventory_item_id, type, quantity, reason)
      values (v_applied.inventory_item_id, 'ajustement', v_applied.quantity_applied,
        'Annulation de commande #' || v_short_id || ' — stock remis en inventaire');
    end loop;
    return;
  end if;

  -- Public orders are held until confirmed; a payment webhook can authorize
  -- consumption earlier if payment is completed. POS tickets are imported as
  -- served, and their lines arrive afterwards.
  if v_order.status <> 'confirmee' and v_order.status <> 'servie'
     and v_order.payment_status <> 'paye' then
    return;
  end if;

  for v_item in
    select oi.id as order_item_id, oi.menu_item_id, oi.quantity,
           ri.inventory_item_id, ri.quantity_per_unit,
           ii.restaurant_id as inventory_restaurant_id
    from public.order_items oi
    join public.menu_items mi on mi.id = oi.menu_item_id
      and mi.restaurant_id = v_order.restaurant_id
    join public.recipe_items ri on ri.menu_item_id = mi.id
      and ri.restaurant_id = v_order.restaurant_id
    join public.inventory_items ii on ii.id = ri.inventory_item_id
      and ii.restaurant_id = v_order.restaurant_id
    where oi.order_id = v_order.id and oi.quantity > 0 and ri.quantity_per_unit > 0
  loop
    v_requested := v_item.quantity * v_item.quantity_per_unit;
    select quantity_on_hand into v_available
    from public.inventory_items
    where id = v_item.inventory_item_id and restaurant_id = v_order.restaurant_id
    for update;
    v_consumed := least(greatest(0, coalesce(v_available, 0)), v_requested);
    if v_consumed <= 0 then
      continue;
    end if;

    insert into public.order_inventory_applications(
      restaurant_id, order_id, order_item_id, inventory_item_id, quantity_applied
    ) values (
      v_order.restaurant_id, v_order.id, v_item.order_item_id,
      v_item.inventory_item_id, v_consumed
    )
    on conflict(order_item_id, inventory_item_id) do nothing
    returning * into v_applied;

    if found then
      update public.inventory_items
      set quantity_on_hand = greatest(0, quantity_on_hand - v_applied.quantity_applied)
      where id = v_applied.inventory_item_id
        and restaurant_id = v_order.restaurant_id;
      insert into public.inventory_movements(inventory_item_id, type, quantity, reason)
      values (v_applied.inventory_item_id, 'utilisation', v_applied.quantity_applied,
        'Commande #' || v_short_id || ' confirmée');
    end if;
  end loop;
end;
$$;
revoke all on function public.apply_order_inventory(uuid) from public, anon, authenticated;

create or replace function public.apply_order_inventory_from_order()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.apply_order_inventory(new.id);
  return new;
end;
$$;
drop trigger if exists orders_apply_inventory on public.orders;
create trigger orders_apply_inventory
  after update of status, payment_status on public.orders
  for each row execute function public.apply_order_inventory_from_order();

create or replace function public.apply_order_inventory_from_item()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.apply_order_inventory(new.order_id);
  return new;
end;
$$;
drop trigger if exists order_items_apply_inventory on public.order_items;
create trigger order_items_apply_inventory
  after insert or update of menu_item_id, quantity on public.order_items
  for each row execute function public.apply_order_inventory_from_item();

-- Remember whether each inventory item is actively below its configured
-- replenishment target so owners get one notification on entry into low stock,
-- with another possible after restocking clears the condition.
create table if not exists public.inventory_low_stock_state (
  inventory_item_id uuid primary key references public.inventory_items(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  is_low boolean not null default false,
  last_notified_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.inventory_low_stock_state enable row level security;
drop policy if exists inventory_low_stock_state_select on public.inventory_low_stock_state;
create policy inventory_low_stock_state_select on public.inventory_low_stock_state
  for select using (public.is_restaurant_member(restaurant_id));

create or replace function public.notify_inventory_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  v_low := new.par_level > 0
    and new.quantity_on_hand <= new.par_level * greatest(0, v_threshold) / 100;

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
$$;
drop trigger if exists inventory_notify_low_stock on public.inventory_items;
create trigger inventory_notify_low_stock
  after insert or update of quantity_on_hand, par_level on public.inventory_items
  for each row
  execute function public.notify_inventory_low_stock();

-- Default the existing owner alert to the requested 30% target. Restaurants
-- can still change it in Alertes et paramètres; items without par_level are
-- deliberately excluded because their percentage cannot be calculated.
insert into public.alert_rules(restaurant_id, rule_type, threshold, enabled, notify)
select id, 'low_stock', 30, true, true from public.restaurants
on conflict(restaurant_id, rule_type) do nothing;

commit;
