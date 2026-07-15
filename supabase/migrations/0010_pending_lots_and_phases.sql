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

commit;
