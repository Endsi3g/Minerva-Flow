-- Minerva Flow company ambassador program (separate from restaurant referrals).
create table if not exists public.flow_ambassadors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.flow_ambassador_referrals (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.flow_ambassadors(id) on delete restrict,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referred_workspace_id uuid unique references public.workspaces(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.flow_ambassador_commissions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null unique references public.flow_ambassador_referrals(id) on delete restrict,
  stripe_invoice_id text not null unique,
  base_amount numeric(12,2) not null check (base_amount >= 0),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  currency text not null,
  rate_percent numeric(5,2) not null default 10 check (rate_percent = 10),
  paid_at_source timestamptz not null,
  payable_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'payable', 'paid', 'void')),
  payout_reference text,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists flow_ambassador_referrals_ambassador_idx
  on public.flow_ambassador_referrals(ambassador_id, created_at desc);
create index if not exists flow_ambassador_commissions_referral_idx
  on public.flow_ambassador_commissions(referral_id, created_at desc);

alter table public.flow_ambassadors enable row level security;
alter table public.flow_ambassador_referrals enable row level security;
alter table public.flow_ambassador_commissions enable row level security;

drop policy if exists flow_ambassadors_read_own on public.flow_ambassadors;
create policy flow_ambassadors_read_own on public.flow_ambassadors
  for select to authenticated using (user_id = auth.uid());
drop policy if exists flow_ambassador_referrals_read_own on public.flow_ambassador_referrals;
create policy flow_ambassador_referrals_read_own on public.flow_ambassador_referrals
  for select to authenticated using (exists (
    select 1 from public.flow_ambassadors a where a.id = ambassador_id and a.user_id = auth.uid()
  ));
drop policy if exists flow_ambassador_commissions_read_own on public.flow_ambassador_commissions;
create policy flow_ambassador_commissions_read_own on public.flow_ambassador_commissions
  for select to authenticated using (exists (
    select 1 from public.flow_ambassador_referrals r
    join public.flow_ambassadors a on a.id = r.ambassador_id
    where r.id = referral_id and a.user_id = auth.uid()
  ));

grant all on public.flow_ambassadors, public.flow_ambassador_referrals, public.flow_ambassador_commissions to service_role;
grant select on public.flow_ambassadors, public.flow_ambassador_referrals, public.flow_ambassador_commissions to authenticated;

comment on table public.flow_ambassadors is 'Company ambassador referral identities; payouts are approved and recorded manually.';
comment on column public.flow_ambassador_commissions.payable_at is 'Thirty days after the first successfully paid subscription invoice.';
