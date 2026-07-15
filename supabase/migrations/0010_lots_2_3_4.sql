-- Minerva Flow — Lots 2, 3 et 4, unifiés en une seule migration à appliquer
-- d'un coup (éditeur SQL Supabase ou `supabase db push`).
--
-- Convention à partir de maintenant : chaque lot/phase déployé regroupe
-- l'ensemble de ses changements de schéma dans UN SEUL fichier de migration
-- (numéroté séquentiellement), plutôt qu'un fichier par table — plus simple
-- à appliquer en un seul geste.

begin;

-- ═══════════════════════════════════════════════════════════════════════
-- LOT 2 — invitation par lien, pièces jointes de campagne, partage public
-- de rapport (lecture seule)
-- ═══════════════════════════════════════════════════════════════════════

-- Invitations : le flux email existant (/api/collaborateurs/invite) reste
-- en place, mais l'envoi d'email n'étant pas fonctionnel, on ajoute un
-- deuxième mode — un lien à copier/coller, avec rôle pré-assigné et
-- expiration 7 jours. Contrairement à restaurant_members (qui exige déjà
-- une adhésion pour écrire, via is_restaurant_member()), un lien peut être
-- suivi par quelqu'un qui n'a même pas encore de compte : toute la
-- génération et la consommation du lien passe donc par le client admin
-- (service role), exactement comme le flux email existant. Les policies
-- ci-dessous ne servent qu'à la lecture (lister ses propres liens actifs).
create table restaurant_invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  role member_role not null default 'staff',
  token text not null unique,
  created_by uuid not null references auth.users (id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_restaurant_invites_restaurant on restaurant_invites (restaurant_id);
create index idx_restaurant_invites_token on restaurant_invites (token);

alter table restaurant_invites enable row level security;

create policy "restaurant_invites_select" on restaurant_invites for select
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ── pièces jointes de campagne ────────────────────────────────────────────
create table campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  storage_path text not null, -- "{restaurantId}/{draftId}/{uuid}-{filename}" dans le bucket campaign-assets
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  kind text not null default 'image', -- 'image' | 'file'
  created_at timestamptz not null default now()
);

create index idx_campaign_assets_campaign on campaign_assets (campaign_id);

alter table campaign_assets enable row level security;

create policy "campaign_assets_select" on campaign_assets for select
  using (is_restaurant_member(restaurant_id));
create policy "campaign_assets_insert" on campaign_assets for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','consultant']::member_role[]));
create policy "campaign_assets_delete" on campaign_assets for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', false)
on conflict (id) do nothing;

create policy "campaign_assets_bucket_read" on storage.objects for select
  using (bucket_id = 'campaign-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid));
create policy "campaign_assets_bucket_write" on storage.objects for insert
  with check (bucket_id = 'campaign-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','consultant']::member_role[]));
create policy "campaign_assets_bucket_delete" on storage.objects for delete
  using (bucket_id = 'campaign-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[]));

-- ── partage public de rapport (lecture seule) ─────────────────────────────
-- Snapshot au moment du partage plutôt qu'un recalcul live à chaque visite :
-- un visiteur anonyme n'a pas de session RLS, et figer les chiffres au
-- moment du clic "Partager" est à la fois plus simple et plus sûr (aucune
-- requête restaurant_id-scopée n'est exécutée pour un visiteur non authentifié).
create table report_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  report_slug text not null,
  token text not null unique,
  title text not null,
  data jsonb not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_report_shares_token on report_shares (token);
create index idx_report_shares_restaurant on report_shares (restaurant_id);

alter table report_shares enable row level security;

create policy "report_shares_select" on report_shares for select
  using (is_restaurant_member(restaurant_id));
create policy "report_shares_insert" on report_shares for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','consultant']::member_role[]));
create policy "report_shares_delete" on report_shares for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- LOT 3 — formulaire de support in-app
-- ═══════════════════════════════════════════════════════════════════════

-- L'envoi d'email n'étant pas fonctionnel, les demandes (bug/amélioration/
-- question) sont simplement enregistrées ici pour être consultées plus
-- tard (dashboard Supabase pour l'instant, page d'admin éventuellement).
create table support_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'bug', -- 'bug' | 'amelioration' | 'question'
  subject text not null,
  message text not null,
  status text not null default 'nouveau', -- 'nouveau' | 'en_cours' | 'resolu'
  created_at timestamptz not null default now()
);

create index idx_support_requests_user on support_requests (user_id, created_at desc);

alter table support_requests enable row level security;

create policy "support_requests_insert_own" on support_requests for insert
  with check (user_id = auth.uid());
create policy "support_requests_select_own" on support_requests for select
  using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- LOT 4 — suivi des employés, revues de performance, revue automatique IA
-- ═══════════════════════════════════════════════════════════════════════

-- `employees` est distinct de `restaurant_members` : un employé (serveur,
-- cuisinier...) n'a pas forcément de compte dans l'application. Quand il en
-- a un, `linked_user_id` fait le lien vers son compte pour affichage
-- (avatar, etc.) — jamais requis.
create table employees (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  linked_user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  role_title text not null default 'Employé',
  hourly_wage numeric,
  active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_employees_restaurant on employees (restaurant_id);

alter table employees enable row level security;

create policy "employees_select" on employees for select
  using (is_restaurant_member(restaurant_id));
create policy "employees_manage_insert" on employees for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "employees_manage_update" on employees for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "employees_manage_delete" on employees for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Journal de quarts léger — saisi manuellement (par l'employé ou le
-- gérant) plutôt qu'un vrai système de planification, hors scope pour
-- l'instant. Alimente les indicateurs de ponctualité/heures travaillées
-- affichés sur la revue.
create table employee_shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  shift_date date not null,
  hours_worked numeric not null default 0,
  was_late boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_employee_shifts_employee on employee_shifts (employee_id, shift_date desc);

alter table employee_shifts enable row level security;

create policy "employee_shifts_select" on employee_shifts for select
  using (is_restaurant_member(restaurant_id));
create policy "employee_shifts_manage_insert" on employee_shifts for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "employee_shifts_manage_delete" on employee_shifts for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Revue de performance — évaluation manuelle par le propriétaire/gérant.
-- attributed_revenue est saisi à la main (aucune intégration POS par
-- employé n'existe encore) plutôt que calculé automatiquement.
create table employee_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  rating smallint not null check (rating between 1 and 5),
  strengths text,
  improvements text,
  attributed_revenue numeric,
  raise_recommended boolean not null default false,
  reviewer_id uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_employee_reviews_employee on employee_reviews (employee_id, created_at desc);

alter table employee_reviews enable row level security;

create policy "employee_reviews_select" on employee_reviews for select
  using (is_restaurant_member(restaurant_id));
create policy "employee_reviews_manage_insert" on employee_reviews for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
create policy "employee_reviews_manage_delete" on employee_reviews for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Revue automatique par IA. Réutilise la même pipeline de calcul que
-- weekly_reports (buildReports sur une plage de dates) mais dans sa propre
-- table plutôt que d'être compressée dans weekly_reports.data — chaque
-- revue IA a besoin d'un id stable pour être consultée et imprimée/
-- partagée avec l'équipe, et une plage de dates arbitraire (génération à
-- la demande) ne respecterait pas la contrainte unique(restaurant_id,
-- week_start) de weekly_reports.
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

commit;
