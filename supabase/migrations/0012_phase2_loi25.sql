-- Minerva Flow — Phase 2 (feuille de route) : conformité Loi 25.

begin;

-- ── registre des incidents (obligation Loi 25 en cas de fuite) ───────────
create table incident_log (
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

create policy "incident_log_admin_all" on incident_log for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- ── journal de suppression de compte (piste d'audit Loi 25) ──────────────
-- Volontairement séparé de auth.users (qui sera supprimé) : garde une
-- trace minimale — qui, quand, pourquoi — sans les données personnelles
-- elles-mêmes.
create table account_deletion_log (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  reason text,
  deleted_at timestamptz not null default now()
);

alter table account_deletion_log enable row level security;

create policy "account_deletion_log_admin_select" on account_deletion_log for select
  using (is_platform_admin());

commit;
