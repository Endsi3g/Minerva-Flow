-- Minerva Flow — Suivi des résultats des séquences d'emails (lifecycle,
-- rétention, facturation). Reçoit les événements Resend (delivered, opened,
-- clicked, bounced, complained) via app/api/webhooks/resend/route.ts et les
-- journalise, corrélés au resend_id déjà stocké dans
-- user_lifecycle_emails.metadata.resend_id / customer_retention_sends.
-- Journal brut (pas de projection d'état) : un email ouvert 3 fois produit
-- 3 lignes "opened" — suffisant pour un taux d'ouverture/clic par étape,
-- sans avoir à gérer de mise à jour concurrente d'un compteur.

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text not null,
  event_type text not null, -- 'sent' | 'delivered' | 'delivery_delayed' | 'complained' | 'bounced' | 'opened' | 'clicked'
  recipient text,
  link_url text, -- present only for 'clicked'
  occurred_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_events_resend_email_id on public.email_events(resend_email_id);
create index if not exists idx_email_events_event_type on public.email_events(event_type);
create index if not exists idx_email_events_occurred_at on public.email_events(occurred_at);

alter table public.email_events enable row level security;

-- Écrit uniquement par le webhook (service role) ; lu par les admins Minerva
-- pour le suivi des séquences — aucun accès restaurant/membre direct.
create policy "Service role full access on email_events"
  on public.email_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
