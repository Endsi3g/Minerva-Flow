-- Second half of the demo-account fix (0084): the map/discover screen
-- requires lat/lng (see app/api/portal/discover/route.ts's
-- .not("lat", "is", null).not("lng", "is", null)) — the owner-side demo
-- restaurant had neither, so it never appeared on the native map even
-- after 0084 gave it menu items/offers/rewards. Same root cause as the
-- Home/Rewards bug, different missing field. Repentigny, QC town center —
-- close enough for a demo pin, not claiming a specific street address that
-- was never actually set by the owner.

begin;

update restaurants
set lat = 45.7407,
    lng = -73.4544,
    city = coalesce(city, 'Repentigny'),
    province = coalesce(province, 'QC')
where id = '38038211-f045-4f1c-af96-a44cb51179a3';

commit;
