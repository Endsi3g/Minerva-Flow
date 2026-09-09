-- ERP reporting: track which visits were logged via a resolved pairing
-- code (Scanner tab / MyCardView jumelage flow) so the Fidélisation
-- dashboard can report on that path specifically, plus a money
-- distributed-vs-retained estimate built from existing loyalty_transactions
-- data (no new ledger needed).

begin;

alter table loyalty_transactions
  add column if not exists via_pairing_code boolean not null default false;

-- Same body as the 0010 original, just threading through the new flag —
-- the FidelisationView's PairingCodeCard calls logVisitAction right after
-- resolvePairingCodeAction, so it's the one call site that can truthfully
-- set this to true.
create or replace function increment_customer_visit(
  p_customer_id uuid, p_restaurant_id uuid, p_amount_spent numeric, p_points_delta int, p_note text,
  p_via_pairing_code boolean default false
)
returns setof customers
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id from customers where id = p_customer_id;
  if v_restaurant_id is null or v_restaurant_id != p_restaurant_id
     or not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  insert into loyalty_transactions (restaurant_id, customer_id, type, amount_spent, points_delta, note, created_by, via_pairing_code)
  values (v_restaurant_id, p_customer_id, 'visite', p_amount_spent, p_points_delta, p_note, auth.uid(), p_via_pairing_code);

  return query
    update customers
    set visit_count = visit_count + 1,
        total_spent = total_spent + p_amount_spent,
        loyalty_points = loyalty_points + p_points_delta,
        last_visit_at = now()
    where id = p_customer_id
    returning *;
end;
$$;

grant execute on function increment_customer_visit(uuid, uuid, numeric, int, text, boolean) to authenticated;

-- pairing_codes has no restaurant_id until resolved, and its RLS blocks all
-- direct client access (mint/resolve go through the RPCs in 0086) — a
-- restaurant-scoped read for reporting needs its own security-definer RPC
-- rather than a relaxed select policy.
create index if not exists pairing_codes_used_restaurant_idx
  on pairing_codes (used_restaurant_id, used_at)
  where used_restaurant_id is not null;

create or replace function get_pairing_code_resolved_count(p_restaurant_id uuid, p_since timestamptz)
returns bigint
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select count(*)
  from pairing_codes
  where used_restaurant_id = p_restaurant_id
    and used_at >= p_since
    and is_restaurant_member(p_restaurant_id);
$$;

grant execute on function get_pairing_code_resolved_count(uuid, timestamptz) to authenticated;

commit;
