-- Adds an opt-in "frequent" level to the customer notification preference.
-- Default stays 'all'. 'frequent' is chosen by the customer in the app and is
-- bounded by the retention engine (daily cap, minimum gap, quiet hours, push
-- only, marketing consent required). See lib/retention/frequent.ts.

begin;

alter table public.customers
  drop constraint if exists customers_notification_frequency_check;

alter table public.customers
  add constraint customers_notification_frequency_check
  check (notification_frequency in ('all', 'important_only', 'frequent'));

comment on column public.customers.notification_frequency is
  'Customer-chosen frequency for retention-engine messages. "important_only" skips routine nudges; "all" is the default cadence; "frequent" is an opt-in higher cadence (max 2 push per day, 4 h apart, 9:00-20:00 Montréal).';

commit;
