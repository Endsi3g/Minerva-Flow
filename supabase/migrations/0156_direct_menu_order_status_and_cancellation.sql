-- Flow Direct: branded public menu settings and traceable customer-facing
-- order/reservation status changes. No payment provider is required for the
-- on-site payment path.
begin;

alter table public.restaurants
  add column if not exists menu_presentation jsonb not null default '{}'::jsonb;

-- Presentation-only dishes stay visible on the public menu, but checkout
-- rejects them at the database boundary as well as in the client UI.
alter table public.menu_items
  add column if not exists is_orderable boolean not null default true;

do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(p.oid) into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_or_get_public_order'
  order by p.oid desc limit 1;
  if v_definition is null then
    raise exception 'create_or_get_public_order_not_found';
  end if;
  v_updated := replace(
    v_definition,
    'and mi.active = true and mi.is_draft = false and (',
    'and mi.active = true and mi.is_draft = false and mi.is_orderable = true and ('
  );
  -- Staging may not yet have the later price-options migration. Support its
  -- single-price guard too, while keeping the public checkout check aligned.
  if v_updated = v_definition then
    v_updated := replace(
      v_definition,
      'and mi.active = true and mi.is_draft = false and mi.price = v_item.unit_price',
      'and mi.active = true and mi.is_draft = false and mi.is_orderable = true and mi.price = v_item.unit_price'
    );
  end if;
  if v_updated = v_definition then
    raise exception 'public_order_orderable_guard_insertion_point_not_found';
  end if;
  execute v_updated;
end;
$$;

alter table public.orders
  add column if not exists cancellation_reason text,
  add column if not exists status_changed_at timestamptz not null default now();

alter table public.reservations
  add column if not exists cancellation_reason text;

alter table public.notifications
  add column if not exists dedupe_key text;
create unique index if not exists notifications_dedupe_key_unique
  on public.notifications(dedupe_key) where dedupe_key is not null;

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_status_events_order_created_idx
  on public.order_status_events(order_id, created_at desc);
alter table public.order_status_events enable row level security;

drop policy if exists order_status_events_select on public.order_status_events;
create policy order_status_events_select on public.order_status_events for select
  using (
    public.is_restaurant_member(restaurant_id)
    or exists (
      select 1 from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = order_status_events.order_id and c.user_id = auth.uid()
    )
  );

drop policy if exists orders_customer_select on public.orders;
create policy orders_customer_select on public.orders for select
  using (exists (
    select 1 from public.customers c
    where c.id = orders.customer_id and c.restaurant_id = orders.restaurant_id and c.user_id = auth.uid()
  ));

drop policy if exists order_items_customer_select on public.order_items;
create policy order_items_customer_select on public.order_items for select
  using (exists (
    select 1 from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = order_items.order_id and c.user_id = auth.uid()
  ));

create or replace function public.record_order_status_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'annulee' and nullif(trim(new.cancellation_reason), '') is null then
      raise exception 'order_cancellation_reason_required' using errcode = '22023';
    end if;
    new.status_changed_at := now();
    insert into public.order_status_events(restaurant_id, order_id, from_status, to_status, reason, actor_id)
    values (new.restaurant_id, new.id, old.status, new.status,
      nullif(trim(new.cancellation_reason), ''), auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists record_order_status_event on public.orders;
create trigger record_order_status_event before update of status on public.orders
for each row execute function public.record_order_status_event();

create table if not exists public.reservation_status_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  from_status public.reservation_status,
  to_status public.reservation_status not null,
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists reservation_status_events_reservation_created_idx
  on public.reservation_status_events(reservation_id, created_at desc);
alter table public.reservation_status_events enable row level security;

drop policy if exists reservation_status_events_select on public.reservation_status_events;
create policy reservation_status_events_select on public.reservation_status_events for select
  using (public.is_restaurant_member(restaurant_id));

create or replace function public.record_reservation_status_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'annulee' and nullif(trim(new.cancellation_reason), '') is null then
      raise exception 'reservation_cancellation_reason_required' using errcode = '22023';
    end if;
    insert into public.reservation_status_events(restaurant_id, reservation_id, from_status, to_status, reason, actor_id)
    values (new.restaurant_id, new.id, old.status, new.status,
      nullif(trim(new.cancellation_reason), ''), auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists record_reservation_status_event on public.reservations;
create trigger record_reservation_status_event before update of status on public.reservations
for each row execute function public.record_reservation_status_event();

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
exception when duplicate_object then null;
end $$;

commit;
