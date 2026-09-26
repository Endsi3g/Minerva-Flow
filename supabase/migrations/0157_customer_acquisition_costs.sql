begin;

create table if not exists public.customer_acquisition_costs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category text not null check (category in ('publicite', 'commissions', 'agence', 'promotions', 'equipement')),
  amount numeric(12,2) not null check (amount >= 0),
  spent_on date not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customer_acquisition_costs_restaurant_date_idx
  on public.customer_acquisition_costs(restaurant_id, spent_on desc);

alter table public.customer_acquisition_costs enable row level security;
drop policy if exists customer_acquisition_costs_member_access on public.customer_acquisition_costs;
create policy customer_acquisition_costs_member_access on public.customer_acquisition_costs
  for all using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));

commit;
