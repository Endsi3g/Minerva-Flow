-- Table for mapping external POS catalog items to Minerva Flow menu items
create table if not exists pos_item_mappings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider pos_provider not null,
  external_item_id text not null,
  external_item_name text not null,
  menu_item_id uuid references menu_items (id) on delete set null,
  auto_matched boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, provider, external_item_id)
);

create index if not exists idx_pos_item_mappings_restaurant on pos_item_mappings (restaurant_id, provider);
create index if not exists idx_pos_item_mappings_menu_item on pos_item_mappings (menu_item_id);

alter table pos_item_mappings enable row level security;

drop policy if exists "pos_item_mappings_select" on pos_item_mappings;
create policy "pos_item_mappings_select" on pos_item_mappings for select
  using (is_restaurant_member(restaurant_id));

drop policy if exists "pos_item_mappings_write" on pos_item_mappings;
create policy "pos_item_mappings_write" on pos_item_mappings for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Extend orders table for POS tickets idempotency
alter table orders add column if not exists pos_provider text;
alter table orders add column if not exists external_order_id text;

-- Unique constraint ensuring POS tickets are never double-counted or double-ingested
do $$ begin
  create unique index if not exists idx_orders_restaurant_pos_external 
    on orders (restaurant_id, pos_provider, external_order_id)
    where pos_provider is not null and external_order_id is not null;
exception when duplicate_object then null;
end $$;
