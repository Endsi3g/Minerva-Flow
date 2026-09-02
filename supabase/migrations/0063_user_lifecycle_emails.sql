-- Minerva Flow — Séquences d'emails automatisés basés sur le cycle de vie & comportement utilisateur
-- Permet de suivre l'envoi des étapes (welcome, activation, feature_highlight, support_checkin, case_study, conversion, reactivation)
-- et d'éviter tout doublon.

create table if not exists public.user_lifecycle_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  step text not null,
  status text not null default 'sent', -- 'sent', 'failed', 'skipped'
  sent_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  constraint user_lifecycle_step_unique unique (user_id, step)
);

create index if not exists idx_user_lifecycle_emails_user_id on public.user_lifecycle_emails(user_id);
create index if not exists idx_user_lifecycle_emails_step on public.user_lifecycle_emails(step);
create index if not exists idx_user_lifecycle_emails_sent_at on public.user_lifecycle_emails(sent_at);

alter table public.user_lifecycle_emails enable row level security;

-- Seuls le rôle de service (cron / serveur) et les administrateurs ont accès direct
create policy "Service role full access on user_lifecycle_emails"
  on public.user_lifecycle_emails
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
