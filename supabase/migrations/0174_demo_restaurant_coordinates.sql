-- Demo cafés and restaurants had no coordinates, so they never appeared on the
-- customer map. Approximate Montréal positions (not real addresses); matched by
-- exact name and is_demo so no real restaurant is touched.
-- Already applied to production on 2026-10-03; re-running is a no-op.

begin;

update public.restaurants r
set lat = v.lat, lng = v.lng, city = 'Montréal', province = 'QC'
from (values
  ('Bureau & Brew',   45.5088, -73.5617),
  ('Burger Nomade',   45.4920, -73.5600),
  ('Café Lucide',     45.5230, -73.5810),
  ('Câlin Café',      45.5240, -73.6000),
  ('Le Trèfle Doré',  45.5400, -73.6200),
  ('Poutine & Cie',   45.5560, -73.5900)
) as v(name, lat, lng)
where r.name = v.name and r.is_demo and r.lat is null;

commit;
