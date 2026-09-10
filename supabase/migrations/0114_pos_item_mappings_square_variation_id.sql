-- Square's Orders API keys line items by ITEM_VARIATION id (used by
-- ticket-ingestion's existing external_item_id), but catalog push/delete
-- operates on the parent ITEM id. Store both so catalog-sync.ts can push
-- inventory counts (needs the variation id) without disturbing the
-- itemId-keyed external_item_id used elsewhere.
alter table pos_item_mappings add column if not exists external_variation_id text;
alter table pos_inventory_mappings add column if not exists external_variation_id text;
