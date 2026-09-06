-- Offer detail depth: price and what's included/excluded, so the native
-- app's OfferDetailView can show real structured terms instead of only
-- free-text description. Owner-editable, same as title/description.

begin;

alter table offers
  add column if not exists price numeric,
  add column if not exists included_items text[] not null default '{}',
  add column if not exists excluded_items text[] not null default '{}';

commit;
