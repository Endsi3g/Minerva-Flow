-- Migration 0117: POS customer identification, phone lookup index, and linking flags

begin;

-- Fast index on restaurant customers by phone
create index if not exists customers_restaurant_phone_idx
  on customers (restaurant_id, phone)
  where phone is not null;

-- External POS customer ID reference
alter table customers
  add column if not exists pos_customer_id text;

-- Add customer_id & via_pos_sync to orders
alter table orders
  add column if not exists customer_id uuid references customers (id) on delete set null,
  add column if not exists via_pos_sync boolean not null default false;

create index if not exists orders_restaurant_customer_idx
  on orders (restaurant_id, customer_id)
  where customer_id is not null;

-- Add flags to loyalty_transactions to distinguish origin
alter table loyalty_transactions
  add column if not exists via_pos_sync boolean not null default false,
  add column if not exists via_phone_lookup boolean not null default false;

-- Enhance increment_customer_visit RPC to support via_pos_sync and via_phone_lookup
create or replace function increment_customer_visit(
  p_customer_id uuid,
  p_restaurant_id uuid,
  p_amount_spent numeric,
  p_points_delta int,
  p_note text,
  p_via_pairing_code boolean default false,
  p_via_pos_sync boolean default false,
  p_via_phone_lookup boolean default false
)
returns setof customers
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from customers where id = p_customer_id;
  if v_restaurant_id is null or v_restaurant_id != p_restaurant_id then
    raise exception 'Restaurant invalide';
  end if;

  if auth.role() <> 'service_role' and not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  insert into loyalty_transactions (
    restaurant_id, customer_id, type, amount_spent, points_delta, note, created_by,
    via_pairing_code, via_pos_sync, via_phone_lookup
  )
  values (
    v_restaurant_id, p_customer_id, 'visite', p_amount_spent, p_points_delta, p_note, auth.uid(),
    p_via_pairing_code, p_via_pos_sync, p_via_phone_lookup
  );

  return query
    update customers
    set visit_count = visit_count + 1,
        total_spent = total_spent + coalesce(p_amount_spent, 0),
        loyalty_points = loyalty_points + p_points_delta,
        last_visit_at = now()
    where id = p_customer_id
    returning *;
end;
$$;

grant execute on function increment_customer_visit(uuid, uuid, numeric, int, text, boolean, boolean, boolean) to authenticated;

commit;
