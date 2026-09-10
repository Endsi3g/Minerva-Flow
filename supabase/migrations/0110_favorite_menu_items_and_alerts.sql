-- 0110_favorite_menu_items_and_alerts.sql
-- Item #11: favorites now cover menu items too (favorite_offer_ids already
-- existed since 0066 but was never wired up), feeding the "c'est de retour"
-- availability alert when a favorited item/offer flips active: false -> true.

begin;

alter table customers
  add column if not exists favorite_menu_item_ids uuid[] not null default '{}';

commit;
