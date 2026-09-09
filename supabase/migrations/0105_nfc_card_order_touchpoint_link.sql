-- Connects "which link gets encoded on this physical card" to the actual
-- card order, which today are two completely disconnected records:
-- nfc_card_orders is pure fulfillment/payment, physical_touchpoints is the
-- link/QR itself. Nullable + on delete set null: an order predates this
-- column for existing rows, and deleting a touchpoint later shouldn't
-- retroactively invalidate order history.

begin;

alter table nfc_card_orders
  add column if not exists touchpoint_id uuid references physical_touchpoints(id) on delete set null;

commit;
