-- Links a menu item to the inventory items it consumes per unit sold — the
-- missing piece of the product spec's "an order = inventory -1, revenue +X,
-- automatically" promise. Previously serving an order only bumped revenue
-- and menu-item popularity (see applyServedOrderEffects in lib/data/orders.ts);
-- there was no data model anywhere connecting a dish to the ingredients it
-- draws down, so inventory never moved as a side effect of a sale. This
-- table is optional per menu item (a dish with no recipe_items rows simply
-- doesn't affect inventory, same as today) so it can be adopted incrementally.
create table if not exists recipe_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  inventory_item_id uuid not null references inventory_items (id) on delete cascade,
  quantity_per_unit numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (menu_item_id, inventory_item_id)
);

create index if not exists idx_recipe_items_menu_item on recipe_items (menu_item_id);
create index if not exists idx_recipe_items_restaurant on recipe_items (restaurant_id);

alter table recipe_items enable row level security;

drop policy if exists "recipe_items_select" on recipe_items;
create policy "recipe_items_select" on recipe_items for select
  using (is_restaurant_member(restaurant_id));

drop policy if exists "recipe_items_write" on recipe_items;
create policy "recipe_items_write" on recipe_items for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

drop policy if exists "recipe_items_update" on recipe_items;
create policy "recipe_items_update" on recipe_items for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

drop policy if exists "recipe_items_delete" on recipe_items;
create policy "recipe_items_delete" on recipe_items for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
