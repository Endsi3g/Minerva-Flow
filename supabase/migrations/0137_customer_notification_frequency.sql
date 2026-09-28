-- Notification frequency preference, read by the retention-engine cron:
-- 'all' sends every trigger as today; 'important_only' skips the two
-- routine nudges (inactivity, value_drift) and keeps the two occasion-based
-- ones (birthday, reward_available).
begin;

alter table public.customers
  add column if not exists notification_frequency text not null default 'all'
    check (notification_frequency in ('all', 'important_only'));

comment on column public.customers.notification_frequency is
  'Customer-chosen frequency for retention-engine messages. "important_only" skips routine nudges (inactivity, value_drift) but keeps occasion-based ones (birthday, reward_available).';

commit;
