-- Minerva Flow — Phase 3 (feuille de route) : programme pilote structuré.
-- Une demande d'accès pilote n'ouvre pas directement un compte — elle est
-- consignée pour être suivie manuellement dans le panneau admin, plutôt
-- que de laisser l'inscription ouverte à n'importe qui depuis la page
-- publique.

begin;

create table pilot_requests (
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

create index idx_pilot_requests_status on pilot_requests (status, created_at desc);

alter table pilot_requests enable row level security;

-- Formulaire public (visiteur anonyme) — écriture seule, jamais de lecture
-- publique. Toujours passée via le client admin côté serveur de toute
-- façon (comme les invites/report_shares), cette policy documente
-- l'intention si jamais un appel RLS-scopé venait à être ajouté plus tard.
create policy "pilot_requests_admin_all" on pilot_requests for all
  using (is_platform_admin())
  with check (is_platform_admin());

commit;
