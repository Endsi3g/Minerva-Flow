-- 0065_billing_tiers_and_lifecycle.sql
-- Minerva Flow: passage du plan Stripe unique à 3 paliers (Starter/Pro/Entreprise),
-- + traçabilité des épisodes past_due/annulation pour les relances automatisées,
-- + historique des annulations (raison + offre de rétention),
-- + idempotence des emails de cycle de vie facturation (dunning, quota, win-back).

alter table subscriptions
  add column if not exists stripe_price_id text,
  add column if not exists billing_interval text check (billing_interval in ('monthly', 'yearly')),
  add column if not exists plan_tier text check (plan_tier in ('starter', 'pro', 'enterprise')),
  -- Horodatage du début de l'épisode past_due courant (null si le compte n'est pas en retard de
  -- paiement). Réinitialisé par le webhook à chaque transition d'état — sert de référence stable
  -- pour la relance J+3, indépendamment de updated_at qui bouge à chaque écriture.
  add column if not exists past_due_since timestamptz,
  -- Copie de Stripe subscription.canceled_at — référence stable pour la relance de reconquête,
  -- distincte de updated_at pour la même raison que past_due_since ci-dessus.
  add column if not exists canceled_at timestamptz;

-- Historique des annulations : raison donnée, offre de rétention présentée/acceptée.
-- Alimente le flow d'annulation (cancel-subscription-dialog) et la relance win-back.
create table if not exists public.subscription_cancellations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stripe_subscription_id text,
  reason text,
  feedback text,
  retention_offer_shown boolean not null default false,
  retention_offer_accepted boolean not null default false,
  canceled_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_subscription_cancellations_workspace
  on public.subscription_cancellations (workspace_id);

alter table public.subscription_cancellations enable row level security;

create policy "subscription_cancellations_select" on public.subscription_cancellations
  for select
  using (is_workspace_member(workspace_id));

create policy "subscription_cancellations_insert" on public.subscription_cancellations
  for insert
  with check (is_workspace_member(workspace_id));

-- Idempotence des emails de cycle de vie facturation (essai qui finit, paiement échoué,
-- relance J+3, quota atteint, reconquête post-annulation). dedupe_key distingue les épisodes
-- répétables (ex: deux périodes past_due distinctes) d'un même step — contrairement à
-- user_lifecycle_emails (0063) qui est one-shot par utilisateur, ceci est par workspace et
-- peut se redéclencher à chaque nouvel épisode.
create table if not exists public.workspace_billing_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  step text not null,
  dedupe_key text not null,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  constraint workspace_billing_email_unique unique (workspace_id, step, dedupe_key)
);

create index if not exists idx_workspace_billing_emails_workspace
  on public.workspace_billing_emails (workspace_id);

alter table public.workspace_billing_emails enable row level security;

create policy "Service role full access on workspace_billing_emails"
  on public.workspace_billing_emails
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
