-- The `alerts` table has never been written to anywhere in the app — computeAlerts()
-- (lib/engine/alerts.ts) is a pure, on-the-fly rule engine whose output was only ever
-- shown live (Overview, Flow AI context), never persisted. That silently broke the
-- notification bell (always empty) and the "combinedAlerts" merge Overview's own code
-- already expects (app/[locale]/(app)/overview/page.tsx merges live alerts with
-- `unreadTableAlerts` from this table). This adds a stable identity so a periodic sync
-- (app/api/cron/sync-alerts) can upsert computeAlerts() output idempotently — computeAlerts
-- already produces deterministic per-alert ids like `low-stock-<itemId>`; that's the key.

alter table alerts add column if not exists computed_key text;

create unique index if not exists alerts_restaurant_computed_key_key
  on alerts (restaurant_id, computed_key)
  where computed_key is not null;
