-- Owner-configurable Google Maps listing URL — surfaced in the native
-- discovery app's RestaurantDetailView as a "Voir sur Google Maps" link,
-- and used for the post-order review nudge (send the customer to leave a
-- real review on the restaurant's own listing, never something offered
-- in exchange for it — soliciting reviews with an incentive is against
-- Google's own policy and, in several jurisdictions, consumer protection
-- law).

begin;

alter table restaurants add column if not exists google_maps_url text;

commit;
