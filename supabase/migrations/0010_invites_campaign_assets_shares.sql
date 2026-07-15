-- Minerva Flow — Lot 2 : invitation par lien, pièces jointes de campagne,
-- partage public de rapport (lecture seule).
--
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
