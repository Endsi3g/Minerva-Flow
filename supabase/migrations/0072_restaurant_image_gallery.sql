-- Restaurant photo gallery for the native discovery flow's
-- RestaurantDetailView carousel — owner-uploaded via the web dashboard
-- (reusing the existing MenuImageUpload/offer-images pattern), consumed
-- read-only via the /api/portal/discover bridge.

begin;

alter table restaurants add column if not exists image_urls text[] not null default '{}';

commit;
