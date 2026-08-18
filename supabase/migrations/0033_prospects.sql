-- ═══════════════════════════════════════════════════════════════════════
-- Prospects — "1-Click Ingestor" (panneau opérateur)
--
-- Un prospect est une démo autonome générée par un admin Minerva à partir
-- du menu d'un restaurant (collé manuellement, pas de scraping live ni de
-- LLM dans cette version). Volontairement séparée de `restaurants` : tant
-- qu'un prospect n'est pas converti en client, aucune donnée de démo ne
-- touche les tables de production (menus, membres, etc.).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,

  source_url text not null,
  source_platform text not null default 'other'
    check (source_platform in ('uber_eats', 'doordash', 'skipthedishes', 'direct_website', 'raw_text', 'other')),

  restaurant_name text not null default '',
  currency text not null default 'CAD',
  detected_address text,

  commission_rate_pct numeric(5, 2) not null default 28,
  assumed_monthly_orders integer not null default 300,

  status text not null default 'draft'
    check (status in ('draft', 'ready', 'contacte', 'converti', 'decline')),

  demo_slug text unique,
  menu_json jsonb not null default '{"categories": []}'::jsonb,
  notes text,

  demo_view_count integer not null default 0,
  last_viewed_at timestamptz,
  contacted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prospects_status on prospects (status);
create index if not exists idx_prospects_created_at on prospects (created_at desc);

alter table prospects enable row level security;

-- Panneau opérateur : accès complet aux admins Minerva.
drop policy if exists "prospects_admin_all" on prospects;
create policy "prospects_admin_all" on prospects for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- Page de démo publique (/demo/[slug]) : lisible par quiconque connaît le
-- slug généré, comme les autres pages à jeton public (/m/[token], /p/[code]).
-- Un prospect sans slug (brouillon jamais généré) reste invisible.
drop policy if exists "prospects_public_select" on prospects;
create policy "prospects_public_select" on prospects for select
  using (demo_slug is not null);

-- Incrémente le compteur de vues de démo sans exposer d'accès en écriture
-- direct à la table depuis le client public.
create or replace function increment_prospect_demo_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update prospects
  set demo_view_count = demo_view_count + 1,
      last_viewed_at = now()
  where demo_slug = p_slug;
$$;

grant execute on function increment_prospect_demo_view(text) to anon, authenticated;
