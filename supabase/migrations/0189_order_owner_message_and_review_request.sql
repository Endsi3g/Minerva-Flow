-- Owner → customer note on an order (e.g. "About 20 minutes, busy tonight")
-- and the one-per-order Google review request sent 30 minutes after the
-- order is ready.
alter table orders
  add column if not exists owner_message text check (owner_message is null or char_length(owner_message) <= 240),
  add column if not exists owner_message_at timestamptz,
  add column if not exists review_requested_at timestamptz;

create index if not exists idx_orders_review_pending
  on orders (status_changed_at)
  where review_requested_at is null and status in ('prete', 'servie');
