-- 0112_estimated_ready_time_and_auto_notify.sql
-- "Prêt dans X minutes" — a default prep-time estimate the owner sets once
-- (default_prep_minutes), applied to every order at creation (bumped when
-- the restaurant is busy), staff can override per order
-- (orders.estimated_ready_at), and a cron auto-sends the "commande prête"
-- notification once it elapses — see lib/orders/eta.ts and
-- app/api/cron/order-ready-eta/route.ts.

begin;

alter table restaurants
  add column if not exists default_prep_minutes integer;

alter table orders
  add column if not exists estimated_ready_at timestamptz;

commit;
