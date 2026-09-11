-- Link purchase_order_items to inventory_items and track received quantities for partial receipts
alter table purchase_order_items
  add column if not exists inventory_item_id uuid references inventory_items (id) on delete set null,
  add column if not exists received_quantity numeric;

create index if not exists idx_purchase_order_items_inventory
  on purchase_order_items (inventory_item_id);
