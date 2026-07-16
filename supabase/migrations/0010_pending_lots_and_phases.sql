-- Minerva Flow — toutes les migrations en attente (Lots 2-4 + Phases 1-6 de
-- la feuille de route + changelog), unifiées en une seule migration à
-- appliquer d'un coup (éditeur SQL Supabase ou `supabase db push`).
--
-- Idempotente de bout en bout : chaque table/policy/type/colonne est créée
-- avec une garde ("if not exists", "drop policy if exists", bloc
-- d'exception pour les types) — ce fichier peut être relancé sans risque
-- même si une exécution précédente (partielle ou complète, via cette
-- version ou une ancienne version en plusieurs fichiers) a déjà créé
-- certains objets. Une seule ligne en erreur dans une transaction annule
-- tout le reste ; l'idempotence évite ce piège.

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
create table if not exists restaurant_invites (
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

create index if not exists idx_restaurant_invites_restaurant on restaurant_invites (restaurant_id);
create index if not exists idx_restaurant_invites_token on restaurant_invites (token);

alter table restaurant_invites enable row level security;

drop policy if exists "restaurant_invites_select" on restaurant_invites;
create policy "restaurant_invites_select" on restaurant_invites for select
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ── pièces jointes de campagne ────────────────────────────────────────────
create table if not exists campaign_assets (
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

create index if not exists idx_campaign_assets_campaign on campaign_assets (campaign_id);

alter table campaign_assets enable row level security;

drop policy if exists "campaign_assets_select" on campaign_assets;
create policy "campaign_assets_select" on campaign_assets for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "campaign_assets_insert" on campaign_assets;
create policy "campaign_assets_insert" on campaign_assets for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','consultant']::member_role[]));
drop policy if exists "campaign_assets_delete" on campaign_assets;
create policy "campaign_assets_delete" on campaign_assets for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', false)
on conflict (id) do nothing;

drop policy if exists "campaign_assets_bucket_read" on storage.objects;
create policy "campaign_assets_bucket_read" on storage.objects for select
  using (bucket_id = 'campaign-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid));
drop policy if exists "campaign_assets_bucket_write" on storage.objects;
create policy "campaign_assets_bucket_write" on storage.objects for insert
  with check (bucket_id = 'campaign-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','consultant']::member_role[]));
drop policy if exists "campaign_assets_bucket_delete" on storage.objects;
create policy "campaign_assets_bucket_delete" on storage.objects for delete
  using (bucket_id = 'campaign-assets' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[]));

-- ── partage public de rapport (lecture seule) ─────────────────────────────
-- Snapshot au moment du partage plutôt qu'un recalcul live à chaque visite :
-- un visiteur anonyme n'a pas de session RLS, et figer les chiffres au
-- moment du clic "Partager" est à la fois plus simple et plus sûr (aucune
-- requête restaurant_id-scopée n'est exécutée pour un visiteur non authentifié).
create table if not exists report_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  report_slug text not null,
  token text not null unique,
  title text not null,
  data jsonb not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_report_shares_token on report_shares (token);
create index if not exists idx_report_shares_restaurant on report_shares (restaurant_id);

alter table report_shares enable row level security;

drop policy if exists "report_shares_select" on report_shares;
create policy "report_shares_select" on report_shares for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "report_shares_insert" on report_shares;
create policy "report_shares_insert" on report_shares for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','consultant']::member_role[]));
drop policy if exists "report_shares_delete" on report_shares;
create policy "report_shares_delete" on report_shares for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- LOT 3 — formulaire de support in-app
-- ═══════════════════════════════════════════════════════════════════════

-- L'envoi d'email n'étant pas fonctionnel, les demandes (bug/amélioration/
-- question) sont simplement enregistrées ici pour être consultées plus
-- tard (dashboard Supabase pour l'instant, page d'admin éventuellement).
create table if not exists support_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'bug', -- 'bug' | 'amelioration' | 'question'
  subject text not null,
  message text not null,
  status text not null default 'nouveau', -- 'nouveau' | 'en_cours' | 'resolu'
  created_at timestamptz not null default now()
);

create index if not exists idx_support_requests_user on support_requests (user_id, created_at desc);

alter table support_requests enable row level security;

drop policy if exists "support_requests_insert_own" on support_requests;
create policy "support_requests_insert_own" on support_requests for insert
  with check (user_id = auth.uid());
drop policy if exists "support_requests_select_own" on support_requests;
create policy "support_requests_select_own" on support_requests for select
  using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- LOT 4 — suivi des employés, revues de performance, revue automatique IA
-- ═══════════════════════════════════════════════════════════════════════

-- `employees` est distinct de `restaurant_members` : un employé (serveur,
-- cuisinier...) n'a pas forcément de compte dans l'application. Quand il en
-- a un, `linked_user_id` fait le lien vers son compte pour affichage
-- (avatar, etc.) — jamais requis.
create table if not exists employees (
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

create index if not exists idx_employees_restaurant on employees (restaurant_id);

alter table employees enable row level security;

drop policy if exists "employees_select" on employees;
create policy "employees_select" on employees for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "employees_manage_insert" on employees;
create policy "employees_manage_insert" on employees for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists "employees_manage_update" on employees;
create policy "employees_manage_update" on employees for update
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists "employees_manage_delete" on employees;
create policy "employees_manage_delete" on employees for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Journal de quarts léger — saisi manuellement (par l'employé ou le
-- gérant) plutôt qu'un vrai système de planification, hors scope pour
-- l'instant. Alimente les indicateurs de ponctualité/heures travaillées
-- affichés sur la revue.
create table if not exists employee_shifts (
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

create index if not exists idx_employee_shifts_employee on employee_shifts (employee_id, shift_date desc);

alter table employee_shifts enable row level security;

drop policy if exists "employee_shifts_select" on employee_shifts;
create policy "employee_shifts_select" on employee_shifts for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "employee_shifts_manage_insert" on employee_shifts;
create policy "employee_shifts_manage_insert" on employee_shifts for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists "employee_shifts_manage_delete" on employee_shifts;
create policy "employee_shifts_manage_delete" on employee_shifts for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Revue de performance — évaluation manuelle par le propriétaire/gérant.
-- attributed_revenue est saisi à la main (aucune intégration POS par
-- employé n'existe encore) plutôt que calculé automatiquement.
create table if not exists employee_reviews (
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

create index if not exists idx_employee_reviews_employee on employee_reviews (employee_id, created_at desc);

alter table employee_reviews enable row level security;

drop policy if exists "employee_reviews_select" on employee_reviews;
create policy "employee_reviews_select" on employee_reviews for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "employee_reviews_manage_insert" on employee_reviews;
create policy "employee_reviews_manage_insert" on employee_reviews for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists "employee_reviews_manage_delete" on employee_reviews;
create policy "employee_reviews_manage_delete" on employee_reviews for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- Revue automatique par IA. Réutilise la même pipeline de calcul que
-- weekly_reports (buildReports sur une plage de dates) mais dans sa propre
-- table plutôt que d'être compressée dans weekly_reports.data — chaque
-- revue IA a besoin d'un id stable pour être consultée et imprimée/
-- partagée avec l'équipe, et une plage de dates arbitraire (génération à
-- la demande) ne respecterait pas la contrainte unique(restaurant_id,
-- week_start) de weekly_reports.
create table if not exists ai_reviews (
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

create index if not exists idx_ai_reviews_restaurant on ai_reviews (restaurant_id, created_at desc);

alter table ai_reviews enable row level security;

drop policy if exists "ai_reviews_select" on ai_reviews;
create policy "ai_reviews_select" on ai_reviews for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "ai_reviews_insert" on ai_reviews;
create policy "ai_reviews_insert" on ai_reviews for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 1 (feuille de route) — durcissement + panneau admin
-- ═══════════════════════════════════════════════════════════════════════

-- Limitation de débit (routes publiques : liens d'invitation, de partage).
-- Journal glissant plutôt qu'un compteur par fenêtre fixe — simple, et ne
-- nécessite aucun service externe (Upstash/Redis). Toujours consultée via
-- le client admin depuis du code serveur (un visiteur anonyme n'a pas de
-- session RLS), donc aucune policy d'accès anon/authenticated n'est
-- nécessaire ici — RLS activé + aucune policy = accès refusé par défaut
-- pour tout le monde sauf le service role.
create table if not exists rate_limit_hits (
  id uuid primary key default gen_random_uuid(),
  rate_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_hits_key_time on rate_limit_hits (rate_key, created_at desc);

alter table rate_limit_hits enable row level security;

-- Rôle opérateur Minerva (panneau admin) — distinct des rôles restaurant.
alter table profiles add column if not exists is_platform_admin boolean not null default false;

create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_platform_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- Vue de tous les restaurants pour l'opérateur (en plus des policies
-- membres existantes — celle-ci s'ajoute, elle ne les remplace pas).
drop policy if exists "restaurants_admin_select" on restaurants;
create policy "restaurants_admin_select" on restaurants for select
  using (is_platform_admin());

-- Vue de tous les parrainages pour l'opérateur.
drop policy if exists "referrals_admin_select" on referrals;
create policy "referrals_admin_select" on referrals for select
  using (is_platform_admin());

-- ── support_requests : réponse de l'opérateur visible côté restaurateur ──
alter table support_requests add column if not exists admin_reply text;
alter table support_requests add column if not exists replied_at timestamptz;
alter table support_requests add column if not exists replied_by uuid references auth.users (id);

drop policy if exists "support_requests_admin_select" on support_requests;
create policy "support_requests_admin_select" on support_requests for select
  using (is_platform_admin());
drop policy if exists "support_requests_admin_update" on support_requests;
create policy "support_requests_admin_update" on support_requests for update
  using (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 2 (feuille de route) — conformité Loi 25
-- ═══════════════════════════════════════════════════════════════════════

-- ── registre des incidents (obligation Loi 25 en cas de fuite) ───────────
create table if not exists incident_log (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  severity text not null default 'faible', -- 'faible' | 'moyenne' | 'critique'
  occurred_at timestamptz not null default now(),
  affected_user_count integer not null default 0,
  resolution text,
  resolved_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table incident_log enable row level security;

drop policy if exists "incident_log_admin_all" on incident_log;
create policy "incident_log_admin_all" on incident_log for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- ── journal de suppression de compte (piste d'audit Loi 25) ──────────────
-- Volontairement séparé de auth.users (qui sera supprimé) : garde une
-- trace minimale — qui, quand, pourquoi — sans les données personnelles
-- elles-mêmes.
create table if not exists account_deletion_log (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  reason text,
  deleted_at timestamptz not null default now()
);

alter table account_deletion_log enable row level security;

drop policy if exists "account_deletion_log_admin_select" on account_deletion_log;
create policy "account_deletion_log_admin_select" on account_deletion_log for select
  using (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 3 (feuille de route) — programme pilote structuré
-- ═══════════════════════════════════════════════════════════════════════

-- Une demande d'accès pilote n'ouvre pas directement un compte — elle est
-- consignée pour être suivie manuellement dans le panneau admin, plutôt
-- que de laisser l'inscription ouverte à n'importe qui depuis la page
-- publique.
create table if not exists pilot_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  restaurant_name text not null,
  city text,
  phone text,
  message text,
  status text not null default 'nouveau', -- 'nouveau' | 'contacte' | 'actif' | 'decline'
  created_at timestamptz not null default now()
);

create index if not exists idx_pilot_requests_status on pilot_requests (status, created_at desc);

alter table pilot_requests enable row level security;

-- Formulaire public (visiteur anonyme) — écriture seule, jamais de lecture
-- publique. Toujours passée via le client admin côté serveur de toute
-- façon (comme les invites/report_shares), cette policy documente
-- l'intention si jamais un appel RLS-scopé venait à être ajouté plus tard.
drop policy if exists "pilot_requests_admin_all" on pilot_requests;
create policy "pilot_requests_admin_all" on pilot_requests for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 4 (feuille de route) — scaffold d'intégration POS
-- ═══════════════════════════════════════════════════════════════════════

-- Suit exactement le même schéma que ad_platform_connections
-- (0006_ad_attribution.sql) — jetons stockés dans Supabase Vault, jamais
-- en clair dans une colonne. Commence par Square (API la mieux
-- documentée) ; Lightspeed et Clover suivent le même schéma quand leurs
-- identifiants d'app seront disponibles.
do $$ begin
  create type pos_provider as enum ('square', 'lightspeed', 'clover');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type pos_connection_status as enum ('connecte', 'erreur', 'attente');
exception when duplicate_object then null;
end $$;

create table if not exists pos_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  provider pos_provider not null,
  external_account_id text,
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  status pos_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create index if not exists idx_pos_connections_restaurant on pos_connections (restaurant_id);

alter table pos_connections enable row level security;

drop policy if exists "pos_connections_select" on pos_connections;
create policy "pos_connections_select" on pos_connections for select
  using (is_restaurant_member(restaurant_id));

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 5 (feuille de route) — facturation Stripe + activation parrainage
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type subscription_status as enum (
    'incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
  );
exception when duplicate_object then null;
end $$;

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status subscription_status not null default 'incomplete',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id)
);

create index if not exists idx_subscriptions_restaurant on subscriptions (restaurant_id);
create index if not exists idx_subscriptions_stripe_customer on subscriptions (stripe_customer_id);

alter table subscriptions enable row level security;

drop policy if exists "subscriptions_select" on subscriptions;
create policy "subscriptions_select" on subscriptions for select
  using (is_restaurant_member(restaurant_id, array['owner']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Journal des mises à jour (changelog)
-- ═══════════════════════════════════════════════════════════════════════

-- Visible par tous les utilisateurs connectés (pas restreint à un
-- restaurant — c'est une information plateforme). Publier une entrée
-- déclenche une notification à tous les utilisateurs actifs, tous
-- établissements confondus (voir lib/data/notifications.ts:notifyAllUsers,
-- appelée depuis app/admin/changelog/actions.ts — pas depuis cette
-- migration, pour éviter de spammer une notification par entrée
-- historique importée ci-dessous).
do $$ begin
  create type changelog_category as enum ('fonctionnalite', 'amelioration', 'correctif');
exception when duplicate_object then null;
end $$;

create table if not exists changelog_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category changelog_category not null default 'fonctionnalite',
  published_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_changelog_entries_published on changelog_entries (published_at desc);

alter table changelog_entries enable row level security;

-- Visible par tout utilisateur connecté, peu importe son établissement —
-- c'est une info plateforme, pas une donnée de restaurant.
drop policy if exists "changelog_entries_select" on changelog_entries;
create policy "changelog_entries_select" on changelog_entries for select
  using (auth.uid() is not null);

drop policy if exists "changelog_entries_admin_insert" on changelog_entries;
create policy "changelog_entries_admin_insert" on changelog_entries for insert
  with check (is_platform_admin());
drop policy if exists "changelog_entries_admin_delete" on changelog_entries;
create policy "changelog_entries_admin_delete" on changelog_entries for delete
  using (is_platform_admin());

-- ── historique des lots/phases déjà livrés ────────────────────────────────
-- Gardé par un "where not exists" plutôt qu'une clé unique sur le titre —
-- si la table contient déjà des entrées (ce lot déjà importé, ou une
-- entrée publiée depuis l'admin), on ne réinsère rien.
insert into changelog_entries (title, description, category, published_at)
select v.title, v.description, v.category, v.published_at
from (values
  ('Gestion du workspace et navigation repensée', 'Nouvelle page pour configurer votre établissement depuis le sélecteur, sidebar réorganisée en sections repliables, correctifs d''affichage (carte centrée sur Montréal, couleurs, bannière de démarrage pour les comptes non configurés).', 'fonctionnalite'::changelog_category, now() - interval '9 days'),
  ('Invitations par lien, campagnes enrichies, rapports partageables', 'Invitez votre équipe avec un simple lien plutôt qu''un courriel. Créez des campagnes avec images et fichiers joints. Filtrez et partagez vos rapports par lien public en lecture seule.', 'fonctionnalite'::changelog_category, now() - interval '8 days'),
  ('Guide, support et pages légales', 'Nouvelle page Guide pour configurer l''application en quelques minutes, formulaire de support intégré, conditions d''utilisation et politique de confidentialité.', 'fonctionnalite'::changelog_category, now() - interval '7 days'),
  ('Suivi des employés et revues de performance', 'Nouvelle page pour suivre vos employés, leurs quarts de travail et publier des revues de performance — avec une revue automatique générée par IA sur vos données réelles.', 'fonctionnalite'::changelog_category, now() - interval '6 days'),
  ('Import de données historiques et démarrage guidé', 'Importez des mois ou années de revenus depuis un fichier Excel/CSV en un clic. Une checklist de démarrage vous guide dans les premières étapes.', 'fonctionnalite'::changelog_category, now() - interval '5 days'),
  ('Sécurité et fiabilité renforcées', 'Protection contre les abus sur les liens publics, surveillance des erreurs en production, et limitation de l''historique chargé pour garder l''application rapide même avec beaucoup de données.', 'amelioration'::changelog_category, now() - interval '5 days'),
  ('Panneau d''administration', 'Nouvel espace pour consulter tous les établissements, répondre aux demandes de support et suivre les demandes d''accès pilote.', 'fonctionnalite'::changelog_category, now() - interval '4 days'),
  ('Conformité à la Loi 25', 'Suppression de compte en libre-service, registre des incidents, responsable de la protection des renseignements personnels désigné.', 'amelioration'::changelog_category, now() - interval '3 days'),
  ('Connexion Square et export QuickBooks', 'Base technique posée pour synchroniser vos ventes Square automatiquement, et export de vos transactions au format QuickBooks dès maintenant.', 'fonctionnalite'::changelog_category, now() - interval '2 days'),
  ('Facturation et parrainage', 'Mise en place de la facturation par abonnement, et le programme de parrainage récompense maintenant automatiquement un mois gratuit par filleul actif.', 'fonctionnalite'::changelog_category, now() - interval '1 day'),
  ('Journal des mises à jour', 'Vous y êtes ! Chaque nouvelle mise à jour de Minerva Flow sera annoncée ici, avec une notification pour vous prévenir.', 'fonctionnalite'::changelog_category, now())
) as v(title, description, category, published_at)
where not exists (select 1 from changelog_entries);

-- ═══════════════════════════════════════════════════════════════════════
-- Synchronisation des ventes Square (cron quotidien + webhooks)
-- ═══════════════════════════════════════════════════════════════════════

-- Distingue une journée saisie à la main d'une journée remplie par une
-- synchronisation POS — le sync ne doit jamais écraser une saisie manuelle.
alter table service_days add column if not exists revenue_source text not null default 'manuel';

do $$ begin
  alter table service_days add constraint service_days_revenue_source_check
    check (revenue_source in ('manuel', 'square', 'lightspeed', 'clover'));
exception when duplicate_object then null;
end $$;

alter table service_days add column if not exists revenue_synced_at timestamptz;

alter table pos_connections add column if not exists last_synced_at timestamptz;

-- ═══════════════════════════════════════════════════════════════════════
-- Notifications push natives (Web Push)
-- ═══════════════════════════════════════════════════════════════════════

-- Un abonnement par appareil/navigateur — un même utilisateur peut avoir
-- plusieurs abonnements actifs (téléphone + ordinateur). L'endpoint est la
-- clé naturelle : le navigateur en génère un nouveau si l'ancien expire.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid references restaurants (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on push_subscriptions;
create policy "push_subscriptions_select_own" on push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on push_subscriptions;
create policy "push_subscriptions_insert_own" on push_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on push_subscriptions;
create policy "push_subscriptions_delete_own" on push_subscriptions for delete
  using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- Réservations et tables (module 1 de l'expansion "OS pour restaurants")
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type reservation_status as enum ('confirmee', 'annulee', 'honoree', 'no_show');
exception when duplicate_object then null;
end $$;

create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  label text not null,
  capacity int not null default 2,
  created_at timestamptz not null default now()
);

create index if not exists idx_restaurant_tables_restaurant on restaurant_tables (restaurant_id);

alter table restaurant_tables enable row level security;

drop policy if exists "restaurant_tables_select" on restaurant_tables;
create policy "restaurant_tables_select" on restaurant_tables for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "restaurant_tables_manage" on restaurant_tables;
create policy "restaurant_tables_manage" on restaurant_tables for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  table_id uuid references restaurant_tables (id) on delete set null,
  guest_name text not null,
  guest_phone text,
  party_size int not null default 2,
  reservation_time timestamptz not null,
  status reservation_status not null default 'confirmee',
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_reservations_restaurant_time on reservations (restaurant_id, reservation_time);

alter table reservations enable row level security;

drop policy if exists "reservations_select" on reservations;
create policy "reservations_select" on reservations for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "reservations_insert" on reservations;
create policy "reservations_insert" on reservations for insert
  with check (is_restaurant_member(restaurant_id));
drop policy if exists "reservations_update" on reservations;
create policy "reservations_update" on reservations for update
  using (is_restaurant_member(restaurant_id));
drop policy if exists "reservations_delete" on reservations;
create policy "reservations_delete" on reservations for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Horaire du personnel (module 2 de l'expansion "OS pour restaurants")
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type shift_schedule_status as enum ('planifie', 'confirme', 'annule');
exception when duplicate_object then null;
end $$;

create table if not exists shift_schedules (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  position_label text,
  status shift_schedule_status not null default 'planifie',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_shift_schedules_restaurant_date on shift_schedules (restaurant_id, shift_date);
create index if not exists idx_shift_schedules_employee on shift_schedules (employee_id, shift_date);

alter table shift_schedules enable row level security;

drop policy if exists "shift_schedules_select" on shift_schedules;
create policy "shift_schedules_select" on shift_schedules for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "shift_schedules_manage" on shift_schedules;
create policy "shift_schedules_manage" on shift_schedules for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Commandes fournisseurs (module 3 de l'expansion "OS pour restaurants")
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type purchase_order_status as enum ('brouillon', 'envoyee', 'recue', 'annulee');
exception when duplicate_object then null;
end $$;

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  category text,
  created_at timestamptz not null default now()
);

create index if not exists idx_suppliers_restaurant on suppliers (restaurant_id);

alter table suppliers enable row level security;

drop policy if exists "suppliers_select" on suppliers;
create policy "suppliers_select" on suppliers for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "suppliers_manage" on suppliers;
create policy "suppliers_manage" on suppliers for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  supplier_id uuid not null references suppliers (id) on delete cascade,
  status purchase_order_status not null default 'brouillon',
  order_date date not null default current_date,
  expected_date date,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_purchase_orders_restaurant on purchase_orders (restaurant_id, order_date desc);

alter table purchase_orders enable row level security;

drop policy if exists "purchase_orders_select" on purchase_orders;
create policy "purchase_orders_select" on purchase_orders for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "purchase_orders_manage" on purchase_orders;
create policy "purchase_orders_manage" on purchase_orders for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 1,
  unit text not null default 'unité',
  unit_cost numeric not null default 0
);

create index if not exists idx_purchase_order_items_order on purchase_order_items (purchase_order_id);

alter table purchase_order_items enable row level security;

drop policy if exists "purchase_order_items_select" on purchase_order_items;
create policy "purchase_order_items_select" on purchase_order_items for select
  using (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_items.purchase_order_id and is_restaurant_member(po.restaurant_id)
  ));
drop policy if exists "purchase_order_items_manage" on purchase_order_items;
create policy "purchase_order_items_manage" on purchase_order_items for all
  using (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and is_restaurant_member(po.restaurant_id, array['owner','manager']::member_role[])
  ))
  with check (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and is_restaurant_member(po.restaurant_id, array['owner','manager']::member_role[])
  ));

-- ═══════════════════════════════════════════════════════════════════════
-- Google Calendar personnel (par membre, en lecture seule — distinct de
-- google_connections qui est la connexion Workspace unique du restaurant)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists member_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  google_email text,
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table member_calendar_connections enable row level security;

drop policy if exists "member_calendar_connections_select_own" on member_calendar_connections;
create policy "member_calendar_connections_select_own" on member_calendar_connections for select
  using (user_id = auth.uid());
drop policy if exists "member_calendar_connections_delete_own" on member_calendar_connections;
create policy "member_calendar_connections_delete_own" on member_calendar_connections for delete
  using (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- Scaffold pour services de réservation tiers (OpenTable, Resy, SevenRooms)
--
-- La plupart de ces plateformes exigent un partenariat d'affaires, pas
-- juste une clé API en libre-service comme Square — ce scaffold ne peut
-- donc pas être branché sur un vrai flux OAuth tant qu'un compte
-- partenaire n'existe pas pour un fournisseur donné. Il ne fait que
-- réserver la structure de données pour brancher un provider dès que ces
-- identifiants existent, même schéma que pos_connections.
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type reservation_platform as enum ('opentable', 'resy', 'sevenrooms');
exception when duplicate_object then null;
end $$;

create table if not exists reservation_platform_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  platform reservation_platform not null,
  external_account_id text,
  access_token_id uuid references vault.secrets (id) on delete set null,
  refresh_token_id uuid references vault.secrets (id) on delete set null,
  expires_at timestamptz,
  status pos_connection_status not null default 'attente',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (restaurant_id, platform)
);

alter table reservation_platform_connections enable row level security;

drop policy if exists "reservation_platform_connections_select" on reservation_platform_connections;
create policy "reservation_platform_connections_select" on reservation_platform_connections for select
  using (is_restaurant_member(restaurant_id));

-- ═══════════════════════════════════════════════════════════════════════
-- Champs employé additionnels (description, coordonnées) + dépense
-- automatique liée aux quarts travaillés
-- ═══════════════════════════════════════════════════════════════════════

alter table employees add column if not exists description text;
alter table employees add column if not exists contact_phone text;
alter table employees add column if not exists contact_email text;

-- Un quart travaillé génère automatiquement sa dépense de main d'œuvre —
-- on garde la trace de la transaction générée pour pouvoir la mettre à
-- jour/supprimer si le quart est corrigé, sans dupliquer.
alter table employee_shifts add column if not exists financial_transaction_id uuid
  references financial_transactions (id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════════
-- Partage d'horaire par lien (même schéma que report_shares)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists schedule_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  token text not null unique,
  snapshot jsonb not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_schedule_shares_token on schedule_shares (token);
create index if not exists idx_schedule_shares_restaurant on schedule_shares (restaurant_id);

alter table schedule_shares enable row level security;

drop policy if exists "schedule_shares_select" on schedule_shares;
create policy "schedule_shares_select" on schedule_shares for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "schedule_shares_insert" on schedule_shares;
create policy "schedule_shares_insert" on schedule_shares for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Traçabilité des transactions (qui a créé/modifié) + partage de dépense
-- ═══════════════════════════════════════════════════════════════════════

alter table financial_transactions add column if not exists created_by uuid references auth.users (id);
alter table financial_transactions add column if not exists updated_by uuid references auth.users (id);
alter table financial_transactions add column if not exists updated_at timestamptz;

create table if not exists expense_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  transaction_id uuid not null references financial_transactions (id) on delete cascade,
  token text not null unique,
  snapshot jsonb not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_expense_shares_token on expense_shares (token);

alter table expense_shares enable row level security;

drop policy if exists "expense_shares_select" on expense_shares;
create policy "expense_shares_select" on expense_shares for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "expense_shares_insert" on expense_shares;
create policy "expense_shares_insert" on expense_shares for insert
  with check (is_restaurant_member(restaurant_id));

-- ═══════════════════════════════════════════════════════════════════════
-- Suivi de livraison fournisseur (adresse + coordonnées géocodées)
-- ═══════════════════════════════════════════════════════════════════════

alter table suppliers add column if not exists address text;
alter table suppliers add column if not exists lng double precision;
alter table suppliers add column if not exists lat double precision;

-- ═══════════════════════════════════════════════════════════════════════
-- Fidélisation client (fiches client + registre de points de fidélité)
-- ═══════════════════════════════════════════════════════════════════════

alter table restaurants add column if not exists loyalty_points_per_dollar numeric(6,2) not null default 1;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  visit_count int not null default 0,
  total_spent numeric(12,2) not null default 0,
  loyalty_points int not null default 0,
  last_visit_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_restaurant on customers (restaurant_id, name);

alter table customers enable row level security;

drop policy if exists "customers_select" on customers;
create policy "customers_select" on customers for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "customers_write" on customers;
create policy "customers_write" on customers for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "customers_update" on customers;
create policy "customers_update" on customers for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "customers_delete" on customers;
create policy "customers_delete" on customers for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  points_cost int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_loyalty_rewards_restaurant on loyalty_rewards (restaurant_id);

alter table loyalty_rewards enable row level security;

drop policy if exists "loyalty_rewards_select" on loyalty_rewards;
create policy "loyalty_rewards_select" on loyalty_rewards for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "loyalty_rewards_manage" on loyalty_rewards;
create policy "loyalty_rewards_manage" on loyalty_rewards for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

do $$ begin
  create type loyalty_transaction_type as enum ('visite', 'ajustement', 'echange');
exception when duplicate_object then null;
end $$;

create table if not exists loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  type loyalty_transaction_type not null,
  amount_spent numeric(12,2),
  points_delta int not null default 0,
  note text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_loyalty_transactions_customer on loyalty_transactions (customer_id, created_at desc);

alter table loyalty_transactions enable row level security;

drop policy if exists "loyalty_transactions_select" on loyalty_transactions;
create policy "loyalty_transactions_select" on loyalty_transactions for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "loyalty_transactions_insert" on loyalty_transactions;
create policy "loyalty_transactions_insert" on loyalty_transactions for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Ingénierie de menu (rentabilité par plat, classification en quadrant)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  category text,
  price numeric(10,2) not null default 0,
  food_cost numeric(10,2) not null default 0,
  units_sold numeric not null default 0,
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_items_restaurant on menu_items (restaurant_id, category);

alter table menu_items enable row level security;

drop policy if exists "menu_items_select" on menu_items;
create policy "menu_items_select" on menu_items for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "menu_items_write" on menu_items;
create policy "menu_items_write" on menu_items for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_items_update" on menu_items;
create policy "menu_items_update" on menu_items for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_items_delete" on menu_items;
create policy "menu_items_delete" on menu_items for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

-- ═══════════════════════════════════════════════════════════════════════
-- Inventaire et gaspillage (quantité en main, seuils de réapprovisionnement,
-- mouvements — le gaspillage se répercute aussi dans financial_transactions
-- via lib/data/finance.ts pour apparaître dans Dépenses/Rapports sans
-- dupliquer l'agrégation par catégorie déjà présente dans lib/reports.ts)
-- ═══════════════════════════════════════════════════════════════════════

do $$ begin
  create type inventory_movement_type as enum ('reception', 'utilisation', 'gaspillage', 'ajustement');
exception when duplicate_object then null;
end $$;

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'unité',
  quantity_on_hand numeric not null default 0,
  par_level numeric,
  unit_cost numeric(10,2) not null default 0,
  supplier_id uuid references suppliers (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_restaurant on inventory_items (restaurant_id, category);

alter table inventory_items enable row level security;

drop policy if exists "inventory_items_select" on inventory_items;
create policy "inventory_items_select" on inventory_items for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "inventory_items_write" on inventory_items;
create policy "inventory_items_write" on inventory_items for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "inventory_items_update" on inventory_items;
create policy "inventory_items_update" on inventory_items for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "inventory_items_delete" on inventory_items;
create policy "inventory_items_delete" on inventory_items for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items (id) on delete cascade,
  type inventory_movement_type not null,
  quantity numeric not null,
  reason text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_item on inventory_movements (inventory_item_id, created_at desc);

alter table inventory_movements enable row level security;

drop policy if exists "inventory_movements_select" on inventory_movements;
create policy "inventory_movements_select" on inventory_movements for select
  using (exists (
    select 1 from inventory_items ii
    where ii.id = inventory_movements.inventory_item_id and is_restaurant_member(ii.restaurant_id)
  ));
drop policy if exists "inventory_movements_insert" on inventory_movements;
create policy "inventory_movements_insert" on inventory_movements for insert
  with check (exists (
    select 1 from inventory_items ii
    where ii.id = inventory_movements.inventory_item_id
      and is_restaurant_member(ii.restaurant_id, array['owner','manager','staff']::member_role[])
  ));

-- ═══════════════════════════════════════════════════════════════════════
-- Portail client (connexion par lien magique) + programmes de parrainage
-- ═══════════════════════════════════════════════════════════════════════

-- Un client peut maintenant être un vrai utilisateur Supabase Auth (lien
-- magique, jamais un mot de passe), sans jamais devenir restaurant_members.
alter table customers add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists idx_customers_user on customers (user_id);

drop policy if exists "customers_select_own" on customers;
create policy "customers_select_own" on customers for select
  using (auth.uid() = user_id);

drop policy if exists "loyalty_transactions_select_own" on loyalty_transactions;
create policy "loyalty_transactions_select_own" on loyalty_transactions for select
  using (exists (
    select 1 from customers c where c.id = loyalty_transactions.customer_id and c.user_id = auth.uid()
  ));

-- Réservations publiques : un client soumet une "demande" via un lien de
-- parrainage, jamais auto-confirmée — le staff doit la confirmer.
alter type reservation_status add value if not exists 'demandee';

create table if not exists referral_programs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  description text,
  goal_count int not null default 1,
  reward_id uuid references loyalty_rewards (id) on delete set null,
  reward_description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_programs_restaurant on referral_programs (restaurant_id);

alter table referral_programs enable row level security;

drop policy if exists "referral_programs_select" on referral_programs;
create policy "referral_programs_select" on referral_programs for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "referral_programs_write" on referral_programs;
create policy "referral_programs_write" on referral_programs for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "referral_programs_update" on referral_programs;
create policy "referral_programs_update" on referral_programs for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "referral_programs_delete" on referral_programs;
create policy "referral_programs_delete" on referral_programs for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists customer_referral_links (
  id uuid primary key default gen_random_uuid(),
  referral_program_id uuid not null references referral_programs (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  code text not null unique,
  clicks int not null default 0,
  converted_count int not null default 0,
  reward_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referral_program_id, customer_id)
);

create index if not exists idx_customer_referral_links_code on customer_referral_links (code);

alter table customer_referral_links enable row level security;

-- Écritures uniquement via le client admin (le client n'est jamais
-- restaurant_members, donc aucune policy insert/update/delete pour lui) ;
-- lecture ouverte au staff du restaurant et au client propriétaire du lien.
drop policy if exists "customer_referral_links_select" on customer_referral_links;
create policy "customer_referral_links_select" on customer_referral_links for select
  using (
    exists (
      select 1 from referral_programs rp
      where rp.id = customer_referral_links.referral_program_id and is_restaurant_member(rp.restaurant_id)
    )
    or exists (
      select 1 from customers c
      where c.id = customer_referral_links.customer_id and c.user_id = auth.uid()
    )
  );

alter table reservations add column if not exists customer_id uuid references customers (id) on delete set null;
alter table reservations add column if not exists referral_link_id uuid references customer_referral_links (id) on delete set null;
alter table reservations add column if not exists is_public_request boolean not null default false;

do $$ begin
  create type referral_conversion_type as enum ('reservation', 'achat');
exception when duplicate_object then null;
end $$;

create table if not exists customer_referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referral_link_id uuid not null references customer_referral_links (id) on delete cascade,
  conversion_type referral_conversion_type not null,
  reservation_id uuid references reservations (id) on delete set null,
  credited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_referral_conversions_link on customer_referral_conversions (referral_link_id);

alter table customer_referral_conversions enable row level security;

drop policy if exists "customer_referral_conversions_select" on customer_referral_conversions;
create policy "customer_referral_conversions_select" on customer_referral_conversions for select
  using (
    exists (
      select 1 from customer_referral_links crl
      join referral_programs rp on rp.id = crl.referral_program_id
      where crl.id = customer_referral_conversions.referral_link_id and is_restaurant_member(rp.restaurant_id)
    )
    or exists (
      select 1 from customer_referral_links crl
      join customers c on c.id = crl.customer_id
      where crl.id = customer_referral_conversions.referral_link_id and c.user_id = auth.uid()
    )
  );

-- Un client qui se connecte par lien magique (raw_user_meta_data.is_customer)
-- ne doit jamais recevoir de faux restaurant "Mon restaurant" — seuls les
-- vrais comptes propriétaires passent par le provisionnement ci-dessous.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_restaurant_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  if (new.raw_user_meta_data ->> 'is_customer') = 'true' then
    return new;
  end if;

  insert into public.restaurants (name)
  values ('Mon restaurant')
  returning id into new_restaurant_id;

  insert into public.restaurant_members (restaurant_id, user_id, role, status)
  values (new_restaurant_id, new.id, 'owner', 'active');

  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Incréments atomiques — remplacent les patrons "lire, calculer en JS,
-- réécrire" qui existaient côté application pour ces compteurs (points de
-- fidélité, quantité en stock, ventes de menu, clics/conversions de
-- parrainage) : deux écritures concurrentes sur la même ligne pouvaient en
-- écraser une silencieusement. Chaque fonction revérifie elle-même
-- l'autorisation (security definer contourne les RLS) puisqu'un client
-- authentifié peut appeler ces fonctions RPC directement.
-- ═══════════════════════════════════════════════════════════════════════

-- Enregistre la ligne du grand livre ET met à jour le solde du client dans
-- le même aller-retour — une écriture de visite ne peut plus laisser une
-- transaction sans le solde correspondant (ou l'inverse) en cas d'échec
-- partiel entre les deux requêtes séparées que faisait l'ancien code.
create or replace function increment_customer_visit(
  p_customer_id uuid, p_restaurant_id uuid, p_amount_spent numeric, p_points_delta int, p_note text
)
returns setof customers
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from customers where id = p_customer_id;
  if v_restaurant_id is null or v_restaurant_id != p_restaurant_id
     or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  insert into loyalty_transactions (restaurant_id, customer_id, type, amount_spent, points_delta, note, created_by)
  values (v_restaurant_id, p_customer_id, 'visite', p_amount_spent, p_points_delta, p_note, auth.uid());

  return query
    update customers
    set visit_count = visit_count + 1,
        total_spent = total_spent + p_amount_spent,
        loyalty_points = loyalty_points + p_points_delta,
        last_visit_at = now()
    where id = p_customer_id
    returning *;
end;
$$;

-- Déduit le solde seulement si la clause WHERE (solde suffisant) matche —
-- retourne 0 ligne sinon, sans jamais enregistrer de transaction d'échange
-- fantôme pour un échange qui a réellement échoué.
create or replace function redeem_customer_reward(p_customer_id uuid, p_restaurant_id uuid, p_reward_id uuid)
returns setof customers
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_points_cost int;
  v_reward_name text;
  updated customers%rowtype;
begin
  select restaurant_id into v_restaurant_id from customers where id = p_customer_id;
  if v_restaurant_id is null or v_restaurant_id != p_restaurant_id
     or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  select points_cost, name into v_points_cost, v_reward_name
  from loyalty_rewards where id = p_reward_id and restaurant_id = v_restaurant_id;

  if v_points_cost is null then
    return;
  end if;

  update customers
  set loyalty_points = loyalty_points - v_points_cost
  where id = p_customer_id and loyalty_points >= v_points_cost
  returning * into updated;

  if not found then
    return;
  end if;

  insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note, created_by)
  values (v_restaurant_id, p_customer_id, 'echange', -v_points_cost, 'Échange : ' || v_reward_name, auth.uid());

  return next updated;
end;
$$;

create or replace function increment_inventory_quantity(p_item_id uuid, p_delta numeric)
returns setof inventory_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from inventory_items where id = p_item_id;
  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  return query
    update inventory_items
    set quantity_on_hand = greatest(0, quantity_on_hand + p_delta)
    where id = p_item_id
    returning *;
end;
$$;

create or replace function increment_menu_item_sales(p_item_id uuid, p_quantity numeric)
returns setof menu_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from menu_items where id = p_item_id;
  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  return query
    update menu_items
    set units_sold = units_sold + p_quantity
    where id = p_item_id
    returning *;
end;
$$;

-- Intentionnellement sans vérification d'autorisation : appelée depuis la
-- page publique /p/[code] par un visiteur anonyme qui suit un lien de
-- parrainage — c'est le même contournement RLS que le client admin déjà
-- utilisé pour cette lecture publique.
create or replace function increment_referral_link_clicks(p_code text)
returns void
language sql
security definer set search_path = public
as $$
  update customer_referral_links set clicks = clicks + 1 where code = p_code;
$$;

-- Toute la logique de crédit (marquer la conversion, incrémenter le
-- compteur, débloquer la récompense si l'objectif est atteint) tient dans
-- un seul aller-retour, verrouillé par la ligne de conversion (for update)
-- pour empêcher un double-crédit si le statut de la réservation change
-- deux fois rapidement.
create or replace function credit_referral_conversion(p_reservation_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_referral_link_id uuid;
  v_conversion_id uuid;
  v_already_credited timestamptz;
  v_new_count int;
  v_goal_count int;
  v_reward_claimed timestamptz;
begin
  select restaurant_id, referral_link_id into v_restaurant_id, v_referral_link_id
  from reservations where id = p_reservation_id;

  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id) then
    raise exception 'Non autorisé';
  end if;

  if v_referral_link_id is null then
    return;
  end if;

  select id, credited_at into v_conversion_id, v_already_credited
  from customer_referral_conversions
  where reservation_id = p_reservation_id
  for update;

  if v_conversion_id is null or v_already_credited is not null then
    return;
  end if;

  update customer_referral_conversions
  set credited_at = now()
  where id = v_conversion_id;

  update customer_referral_links
  set converted_count = converted_count + 1
  where id = v_referral_link_id
  returning converted_count, reward_claimed_at into v_new_count, v_reward_claimed;

  select goal_count into v_goal_count
  from referral_programs
  where id = (select referral_program_id from customer_referral_links where id = v_referral_link_id);

  if v_new_count >= v_goal_count and v_reward_claimed is null then
    update customer_referral_links
    set reward_claimed_at = now()
    where id = v_referral_link_id;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Lot B — menu public, commande en ligne (sans paiement réel : le client
-- compose sa commande et la voit confirmée, mais paie sur place)
-- ═══════════════════════════════════════════════════════════════════════

alter table restaurants add column if not exists tax_rate numeric(6,5) not null default 0.14975;
alter table restaurants add column if not exists accepts_tips boolean not null default true;
alter table menu_items add column if not exists image_url text;

do $$ begin
  create type order_status as enum ('soumise', 'confirmee', 'en_preparation', 'prete', 'servie', 'annulee');
exception when duplicate_object then null;
end $$;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  status order_status not null default 'soumise',
  guest_name text not null,
  guest_phone text,
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  tip_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text,
  notes text,
  customer_id uuid references customers (id) on delete set null,
  referral_link_id uuid references customer_referral_links (id) on delete set null,
  is_public_request boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_restaurant_created on orders (restaurant_id, created_at desc);

alter table orders enable row level security;

drop policy if exists "orders_select" on orders;
create policy "orders_select" on orders for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "orders_insert" on orders;
create policy "orders_insert" on orders for insert
  with check (is_restaurant_member(restaurant_id));
drop policy if exists "orders_update" on orders;
create policy "orders_update" on orders for update
  using (is_restaurant_member(restaurant_id));
drop policy if exists "orders_delete" on orders;
create policy "orders_delete" on orders for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  menu_item_id uuid references menu_items (id) on delete set null,
  item_name text not null,
  unit_price numeric(10,2) not null default 0,
  quantity int not null default 1,
  notes text
);

create index if not exists idx_order_items_order on order_items (order_id);

alter table order_items enable row level security;

drop policy if exists "order_items_select" on order_items;
create policy "order_items_select" on order_items for select
  using (exists (
    select 1 from orders o where o.id = order_items.order_id and is_restaurant_member(o.restaurant_id)
  ));
drop policy if exists "order_items_manage" on order_items;
create policy "order_items_manage" on order_items for all
  using (exists (
    select 1 from orders o where o.id = order_items.order_id and is_restaurant_member(o.restaurant_id)
  ))
  with check (exists (
    select 1 from orders o where o.id = order_items.order_id and is_restaurant_member(o.restaurant_id)
  ));

-- Lien de menu public — indépendant d'un lien de parrainage personnel
-- (customer_referral_links est scoppé à un client précis). Pas
-- d'instantané : le menu affiché reste à jour avec les prix/disponibilité
-- réels au moment de la visite, contrairement à report_shares.
create table if not exists menu_shares (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  token text not null unique,
  item_ids uuid[],
  title text not null default 'Menu',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_shares_token on menu_shares (token);

alter table menu_shares enable row level security;

drop policy if exists "menu_shares_select" on menu_shares;
create policy "menu_shares_select" on menu_shares for select
  using (is_restaurant_member(restaurant_id));
drop policy if exists "menu_shares_insert" on menu_shares;
create policy "menu_shares_insert" on menu_shares for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_shares_delete" on menu_shares;
create policy "menu_shares_delete" on menu_shares for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));

alter table customer_referral_conversions add column if not exists order_id uuid references orders (id) on delete set null;

-- Jumelle de credit_referral_conversion (réservations) mais pour une
-- commande — même verrouillage (for update) contre le double-crédit.
create or replace function credit_referral_conversion_for_order(p_order_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_referral_link_id uuid;
  v_conversion_id uuid;
  v_already_credited timestamptz;
  v_new_count int;
  v_goal_count int;
  v_reward_claimed timestamptz;
begin
  select restaurant_id, referral_link_id into v_restaurant_id, v_referral_link_id
  from orders where id = p_order_id;

  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id) then
    raise exception 'Non autorisé';
  end if;

  if v_referral_link_id is null then
    return;
  end if;

  select id, credited_at into v_conversion_id, v_already_credited
  from customer_referral_conversions
  where order_id = p_order_id
  for update;

  if v_conversion_id is null or v_already_credited is not null then
    return;
  end if;

  update customer_referral_conversions
  set credited_at = now()
  where id = v_conversion_id;

  update customer_referral_links
  set converted_count = converted_count + 1
  where id = v_referral_link_id
  returning converted_count, reward_claimed_at into v_new_count, v_reward_claimed;

  select goal_count into v_goal_count
  from referral_programs
  where id = (select referral_program_id from customer_referral_links where id = v_referral_link_id);

  if v_new_count >= v_goal_count and v_reward_claimed is null then
    update customer_referral_links
    set reward_claimed_at = now()
    where id = v_referral_link_id;
  end if;
end;
$$;

-- ── storage: images de plats (bucket public, patron "avatars") ──────────
insert into storage.buckets (id, name, public)
values ('menu-item-images', 'menu-item-images', true)
on conflict (id) do nothing;

drop policy if exists "menu_item_images_public_read" on storage.objects;
create policy "menu_item_images_public_read" on storage.objects for select
  using (bucket_id = 'menu-item-images');
drop policy if exists "menu_item_images_write" on storage.objects;
create policy "menu_item_images_write" on storage.objects for insert
  with check (bucket_id = 'menu-item-images' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_item_images_update" on storage.objects;
create policy "menu_item_images_update" on storage.objects for update
  using (bucket_id = 'menu-item-images' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','staff']::member_role[]));
drop policy if exists "menu_item_images_delete" on storage.objects;
create policy "menu_item_images_delete" on storage.objects for delete
  using (bucket_id = 'menu-item-images' and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager']::member_role[]));

commit;
