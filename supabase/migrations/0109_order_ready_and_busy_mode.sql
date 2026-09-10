-- 0109_order_ready_and_busy_mode.sql
-- "Commande prête" manual notification (#7) + "message d'attente si chargé" (#8).

begin;

alter table orders
  add column if not exists ready_notified_at timestamptz;

-- busy_mode_manual: staff-flipped "on est débordés" toggle.
-- busy_threshold: auto-busy when count of orders currently "en_preparation"
-- reaches this number — null disables the automatic side, manual still works.
alter table restaurants
  add column if not exists busy_mode_manual boolean not null default false,
  add column if not exists busy_threshold integer;

commit;
