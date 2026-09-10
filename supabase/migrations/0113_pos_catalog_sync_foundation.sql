-- Foundation for bidirectional Clover/Square menu + inventory catalog sync.
--
-- menu_items/inventory_items gain updated_at so we can tell whether the
-- Minerva Flow side changed since the last push — last-write-wins conflict
-- resolution compares this against the mapping's external_updated_at.
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table menu_items add column if not exists updated_at timestamptz not null default now();
drop trigger if exists menu_items_touch_updated_at on menu_items;
create trigger menu_items_touch_updated_at
  before update on menu_items
  for each row execute function touch_updated_at();

alter table inventory_items add column if not exists updated_at timestamptz not null default now();
drop trigger if exists inventory_items_touch_updated_at on inventory_items;
create trigger inventory_items_touch_updated_at
  before update on inventory_items
  for each row execute function touch_updated_at();

-- pos_item_mappings (menu items) already exists as of the previous
-- migration; extend it with the bookkeeping bidirectional sync needs.
-- external_updated_at: last known modification time on the POS side.
-- local_synced_at: last time Minerva Flow's state was successfully pushed out.
alter table pos_item_mappings add column if not exists external_updated_at timestamptz;
alter table pos_item_mappings add column if not exists local_synced_at timestamptz;

drop trigger if exists pos_item_mappings_touch_updated_at on pos_item_mappings;
create trigger pos_item_mappings_touch_updated_at
  before update on pos_item_mappings
  for each row execute function touch_updated_at();

-- Same shape as pos_item_mappings, but for inventory_items — no equivalent
-- table existed before this, since inventory items were only ever matched
-- by free-text name at purchase-order receiving time (see
-- receivePurchaseOrderItems in lib/data/inventory.ts).
create table if not exists pos_inventory_mappings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider pos_provider not null,
  external_item_id text not null,
  external_item_name text not null,
  inventory_item_id uuid references inventory_items (id) on delete set null,
  auto_matched boolean not null default false,
  external_updated_at timestamptz,
  local_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, provider, external_item_id)
);

create index if not exists idx_pos_inventory_mappings_restaurant on pos_inventory_mappings (restaurant_id, provider);
create index if not exists idx_pos_inventory_mappings_inventory_item on pos_inventory_mappings (inventory_item_id);

alter table pos_inventory_mappings enable row level security;

drop policy if exists "pos_inventory_mappings_select" on pos_inventory_mappings;
create policy "pos_inventory_mappings_select" on pos_inventory_mappings for select
  using (is_restaurant_member(restaurant_id));

drop policy if exists "pos_inventory_mappings_write" on pos_inventory_mappings;
create policy "pos_inventory_mappings_write" on pos_inventory_mappings for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

drop trigger if exists pos_inventory_mappings_touch_updated_at on pos_inventory_mappings;
create trigger pos_inventory_mappings_touch_updated_at
  before update on pos_inventory_mappings
  for each row execute function touch_updated_at();
