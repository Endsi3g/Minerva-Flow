-- Backs the Google Places import + extended website business-info extraction:
-- a restaurant can now record a phone number, precise per-day opening hours,
-- and the Google Place ID it was imported from (enables a future
-- "resynchroniser depuis Google" action without another migration).

begin;

alter table restaurants add column if not exists phone text;
alter table restaurants add column if not exists opening_hours jsonb;
alter table restaurants add column if not exists google_place_id text;

comment on column restaurants.opening_hours is
  'Plage horaire par jour, clé = jour de semaine (0=dimanche, même convention qu''operating_days). '
  'Forme : {"1": {"open": "11:00", "close": "22:00"}, ...}. Une seule plage par jour (simplification v1 — '
  'si une source (Google Places ou données structurées d''un site web) rapporte des services séparés '
  'pour un jour, on garde la première ouverture / dernière fermeture). Clé absente ou null = fermé ce jour.';

commit;
