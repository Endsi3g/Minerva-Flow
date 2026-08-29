-- 0055's partial unique index (`where computed_key is not null`) can't serve as an
-- ON CONFLICT arbiter for a plain `onConflict: "restaurant_id,computed_key"` upsert —
-- Postgres only honors a partial index that way when the ON CONFLICT clause repeats
-- the exact same WHERE predicate, which supabase-js's string form can't express.
-- Every syncComputedAlerts() upsert was failing with 42P10 (no matching unique
-- constraint), silently, on every restaurant, every run. A plain unique index has the
-- same real-world effect here — computed_key is only ever set by that one write path,
-- Postgres already treats distinct NULLs as non-conflicting, so nothing else changes.

drop index if exists alerts_restaurant_computed_key_key;

create unique index if not exists alerts_restaurant_computed_key_key
  on alerts (restaurant_id, computed_key);
