-- Minerva Flow — Lot 4 : revue automatique par IA. Réutilise la même
-- pipeline de calcul que weekly_reports (buildReports sur une plage de
-- dates) mais dans sa propre table plutôt que d'être compressée dans
-- weekly_reports.data — chaque revue IA a besoin d'un id stable pour être
-- consultée et imprimée/partagée avec l'équipe, et une plage de dates
-- arbitraire (génération à la demande) ne respecterait pas la contrainte
-- unique(restaurant_id, week_start) de weekly_reports.
create table ai_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  source text not null default 'manuelle', -- 'auto' (cron hebdo) | 'manuelle' (à la demande)
  metrics jsonb not null, -- snapshot des ReportDef au moment de la génération
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  recommendations text[] not null default '{}',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_ai_reviews_restaurant on ai_reviews (restaurant_id, created_at desc);

alter table ai_reviews enable row level security;

create policy "ai_reviews_select" on ai_reviews for select
  using (is_restaurant_member(restaurant_id));
create policy "ai_reviews_insert" on ai_reviews for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
