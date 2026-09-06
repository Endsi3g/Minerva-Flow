-- Backfills this repo's migration history: customers_update_own,
-- favorite_offer_ids, and notification_frequency were applied directly to
-- the live "Minerva Flow" project (vcfaianbdjowmiqaheee) while building the
-- native app's customer-portal self-service settings, but the migration
-- file documenting that change was never committed — discovered while
-- auditing the schema for this migration's own governing history. Written
-- idempotently (if not exists / or replace) since the live database
-- already has these; this file exists so a fresh environment, a review of
-- `supabase/migrations`, or `supabase db reset` produces the same schema
-- the production project actually has.
--
-- Before this policy existed, customers_update was staff-only
-- (is_restaurant_member with owner/manager/staff) — a customer saving
-- their own notification preference from the portal or native app
-- silently did nothing under RLS, with no error surfaced anywhere.

begin;

alter table customers
  add column if not exists favorite_offer_ids uuid[] not null default '{}';

alter table customers
  add column if not exists notification_frequency text not null default 'all';

drop policy if exists "customers_update_own" on customers;
create policy "customers_update_own" on customers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
