-- Keep ambassador transfers behind an explicit platform-admin approval.
alter table public.flow_ambassador_commissions
  add column if not exists payout_approved_at timestamptz,
  add column if not exists payout_approved_by uuid references auth.users(id) on delete set null;

comment on column public.flow_ambassador_commissions.payout_approved_at is
  'Platform administrator approval timestamp required before a transfer can be requested.';
comment on column public.flow_ambassador_commissions.payout_approved_by is
  'Platform administrator who approved the ambassador transfer.';
