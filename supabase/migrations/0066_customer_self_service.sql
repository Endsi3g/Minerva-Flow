-- Fixes a real bug: the customer portal's "Enregistrer" button on Profile
-- (updateMyProfileAction -> updateCustomer) has never actually persisted
-- anything for a genuine customer account. `customers_update` only grants
-- staff (owner/manager/staff via is_restaurant_member); there has never been
-- a policy letting a customer update their own row, so PostgREST silently
-- matches zero rows and returns success with nothing changed. Mirrors the
-- existing customers_select_own pattern.
drop policy if exists "customers_update_own" on customers;
create policy "customers_update_own" on customers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Customer-chosen favorite offers (Home tab pinning) — a plain id array on
-- the customer's own row rather than a join table, since it's a small,
-- purely-personal ordering preference with no reporting need of its own.
alter table customers add column if not exists favorite_offer_ids uuid[] not null default '{}';

-- Notification frequency preference, read by the retention-engine cron:
-- 'all' sends every trigger as today; 'important_only' skips the two
-- routine nudges (inactivity, value_drift) and keeps the two occasion-based
-- ones (birthday, reward_available).
alter table customers add column if not exists notification_frequency text not null default 'all'
  check (notification_frequency in ('all', 'important_only'));
