-- Minerva Flow — Phase 1 (feuille de route) : durcissement + panneau admin.
-- Tout le schéma de cette phase regroupé dans un seul fichier, comme convenu.

begin;

-- ═══════════════════════════════════════════════════════════════════════
-- Limitation de débit (routes publiques : liens d'invitation, de partage)
-- ═══════════════════════════════════════════════════════════════════════
-- Journal glissant plutôt qu'un compteur par fenêtre fixe — simple, et ne
-- nécessite aucun service externe (Upstash/Redis). Toujours consultée via
-- le client admin depuis du code serveur (un visiteur anonyme n'a pas de
-- session RLS), donc aucune policy d'accès anon/authenticated n'est
-- nécessaire ici — RLS activé + aucune policy = accès refusé par défaut
-- pour tout le monde sauf le service role.
create table rate_limit_hits (
  id uuid primary key default gen_random_uuid(),
  rate_key text not null,
  created_at timestamptz not null default now()
);

create index idx_rate_limit_hits_key_time on rate_limit_hits (rate_key, created_at desc);

alter table rate_limit_hits enable row level security;

-- ═══════════════════════════════════════════════════════════════════════
-- Rôle opérateur Minerva (panneau admin) — distinct des rôles restaurant
-- ═══════════════════════════════════════════════════════════════════════
alter table profiles add column is_platform_admin boolean not null default false;

create function is_platform_admin()
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
create policy "restaurants_admin_select" on restaurants for select
  using (is_platform_admin());

-- Vue de tous les parrainages pour l'opérateur.
create policy "referrals_admin_select" on referrals for select
  using (is_platform_admin());

-- ── support_requests : réponse de l'opérateur visible côté restaurateur ──
alter table support_requests add column admin_reply text;
alter table support_requests add column replied_at timestamptz;
alter table support_requests add column replied_by uuid references auth.users (id);

create policy "support_requests_admin_select" on support_requests for select
  using (is_platform_admin());
create policy "support_requests_admin_update" on support_requests for update
  using (is_platform_admin());

commit;
