-- Owners/managers who want Minerva Flow's team to run paid advertising on
-- their behalf (the app amplifies existing word-of-mouth traffic; it does
-- not generate new traffic on its own) can leave a lightweight intake
-- request here instead of relying on email. Reviewed manually by the
-- platform team in /admin/campagnes-publicitaires; pricing is deliberately
-- not modeled here since it is quoted per restaurant, not a fixed plan.
begin;

create table if not exists public.paid_ads_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  monthly_budget_range text not null check (monthly_budget_range in ('under_500', '500_1500', '1500_5000', 'over_5000', 'not_sure')),
  goals text not null check (char_length(goals) between 1 and 2000),
  status text not null default 'nouveau' check (status in ('nouveau', 'contacte', 'ferme')),
  admin_note text,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists paid_ads_requests_restaurant_idx
  on public.paid_ads_requests(restaurant_id, created_at desc);
create index if not exists paid_ads_requests_status_idx
  on public.paid_ads_requests(status, created_at)
  where status = 'nouveau';

alter table public.paid_ads_requests enable row level security;

drop policy if exists paid_ads_requests_select on public.paid_ads_requests;
create policy paid_ads_requests_select on public.paid_ads_requests
  for select using (public.is_restaurant_member(restaurant_id));

-- Only owner/manager can actually commit the restaurant to a paid spend
-- conversation, matching the LTV & CAC page's own edit gate.
drop policy if exists paid_ads_requests_insert on public.paid_ads_requests;
create policy paid_ads_requests_insert on public.paid_ads_requests
  for insert with check (
    public.is_restaurant_member(restaurant_id, array['owner','manager']::member_role[])
    and requested_by = auth.uid()
  );

comment on table public.paid_ads_requests is
  'Owner-initiated intake for Minerva Flow-managed paid advertising. Reviewed and updated by platform staff via the service-role client in /admin/campagnes-publicitaires, not through client-side RLS writes.';

commit;
