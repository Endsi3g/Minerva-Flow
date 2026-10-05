-- Staff-only guest notes (allergies, preferred table, wine, occasions).
-- Kept out of customers.notes on purpose: customers can read their own
-- customers row, so anything stored there is visible to the guest. This table
-- has no customer-facing policy at all.

create table if not exists public.customer_staff_notes (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_staff_notes_restaurant on public.customer_staff_notes (restaurant_id);

alter table public.customer_staff_notes enable row level security;

drop policy if exists "customer_staff_notes_select" on public.customer_staff_notes;
create policy "customer_staff_notes_select" on public.customer_staff_notes for select
  using (public.is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));

drop policy if exists "customer_staff_notes_insert" on public.customer_staff_notes;
create policy "customer_staff_notes_insert" on public.customer_staff_notes for insert
  with check (
    public.is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[])
    and exists (select 1 from public.customers c where c.id = customer_id and c.restaurant_id = customer_staff_notes.restaurant_id)
  );

drop policy if exists "customer_staff_notes_update" on public.customer_staff_notes;
create policy "customer_staff_notes_update" on public.customer_staff_notes for update
  using (public.is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]))
  with check (public.is_restaurant_member(restaurant_id, array['owner','manager','staff']::member_role[]));

drop policy if exists "customer_staff_notes_delete" on public.customer_staff_notes;
create policy "customer_staff_notes_delete" on public.customer_staff_notes for delete
  using (public.is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
