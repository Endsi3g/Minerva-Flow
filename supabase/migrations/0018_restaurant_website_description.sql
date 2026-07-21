-- Backs the "carte fly-to + description auto" backlog item: a restaurant
-- can now record its own website, and its description gets pre-filled by
-- fetching that website's <meta name="description">/og:description
-- (lib/website-description.ts) whenever the website URL is set or changed
-- (mirrors the existing geocode-on-address-change pattern in
-- lib/data/restaurants.ts:updateRestaurant).

begin;

alter table restaurants add column if not exists website text;
alter table restaurants add column if not exists description text;

commit;
