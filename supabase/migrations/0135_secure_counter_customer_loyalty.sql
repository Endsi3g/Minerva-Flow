-- Harden phone-based owner/staff customer identification and counter visits.
-- Keep this migration local until a database push is explicitly authorized
-- and its destination is verified as the designated staging project.

begin;

create or replace function lookup_customer_by_phone(
  p_restaurant_id uuid,
  p_phone text
)
returns table (
  customer_id uuid,
  customer_name text,
  customer_phone text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if not is_restaurant_member(p_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Accès refusé.';
  end if;

  if length(v_digits) < 7 then
    raise exception 'Entrez au moins 7 chiffres.';
  end if;

  return query
  with candidates as (
    select c.id, c.name, c.phone,
           regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') as phone_digits
    from customers c
    where c.restaurant_id = p_restaurant_id
      and c.phone is not null
  )
  select c.id, c.name, c.phone
  from candidates c
  where c.phone_digits = v_digits
     or (
       length(c.phone_digits) >= 10
       and length(v_digits) >= 10
       and right(c.phone_digits, 10) = right(v_digits, 10)
     )
  order by (c.phone_digits = v_digits) desc, c.name asc
  limit 10;
end;
$$;

revoke all on function lookup_customer_by_phone(uuid, text) from public, anon;
grant execute on function lookup_customer_by_phone(uuid, text) to authenticated;

-- Unlike resolve_pairing_code, this scoped variant checks that the code
-- belongs to the exact phone-matched customer before consuming it. The row
-- lock makes simultaneous confirmation attempts single-use and atomic.
create or replace function resolve_pairing_code_for_customer(
  p_restaurant_id uuid,
  p_customer_id uuid,
  p_code text
)
returns table (
  customer_id uuid,
  customer_name text,
  loyalty_points int,
  visit_count int,
  total_spent numeric,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pairing pairing_codes%rowtype;
  v_customer customers%rowtype;
begin
  if not is_restaurant_member(p_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Accès refusé.';
  end if;

  if p_customer_id is null or p_code is null or trim(p_code) !~ '^\d{6}$' then
    raise exception 'Code invalide.';
  end if;

  select pc.* into v_pairing
  from pairing_codes pc
  where pc.code = trim(p_code)
    and pc.used_at is null
  for update;

  if not found then
    raise exception 'Code invalide ou déjà utilisé.';
  end if;
  if v_pairing.expires_at <= now() then
    raise exception 'Ce code a expiré, demandez au client d''en générer un nouveau.';
  end if;

  select c.* into v_customer
  from customers c
  where c.user_id = v_pairing.user_id
    and c.restaurant_id = p_restaurant_id
    and c.id = p_customer_id
  limit 1;

  if not found then
    raise exception 'Le code ne correspond pas au client recherché.';
  end if;

  update pairing_codes
  set used_at = now(), used_by = auth.uid(), used_restaurant_id = p_restaurant_id
  where id = v_pairing.id;

  return query
  select v_customer.id, v_customer.name, v_customer.loyalty_points,
         v_customer.visit_count, v_customer.total_spent, v_customer.avatar_url;
end;
$$;

revoke all on function resolve_pairing_code_for_customer(uuid, uuid, text) from public, anon;
grant execute on function resolve_pairing_code_for_customer(uuid, uuid, text) to authenticated;

-- Keep the existing RPC signature for older clients, but authenticated
-- callers can no longer choose their own points_delta. The server computes
-- the configured base rate and existing $20/$50 visit bonus tiers.
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
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer customers%rowtype;
  v_restaurant_id uuid;
  v_points_delta int;
  v_rate numeric;
  v_multiplier numeric;
begin
  if p_amount_spent is null or p_amount_spent < 0 or p_amount_spent > 100000 then
    raise exception 'Montant invalide.';
  end if;

  select c.restaurant_id into v_restaurant_id
  from customers c
  where c.id = p_customer_id;

  if v_restaurant_id is null or v_restaurant_id != p_restaurant_id then
    raise exception 'Restaurant invalide.';
  end if;

  if auth.role() <> 'service_role'
    and not is_restaurant_member(v_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé.';
  end if;

  if auth.role() = 'service_role' then
    v_points_delta := greatest(coalesce(p_points_delta, 0), 0);
  else
    select coalesce(r.loyalty_points_per_dollar, 1)
    into v_rate
    from restaurants r
    where r.id = p_restaurant_id;
    v_rate := coalesce(v_rate, 1);
    v_multiplier := case
      when p_amount_spent >= 50 then 1.5
      when p_amount_spent >= 20 then 1.25
      else 1
    end;
    v_points_delta := greatest(round(p_amount_spent * v_rate * v_multiplier)::int, 0);
  end if;

  insert into loyalty_transactions (
    restaurant_id, customer_id, type, amount_spent, points_delta, note, created_by,
    via_pairing_code, via_pos_sync, via_phone_lookup
  ) values (
    p_restaurant_id, p_customer_id, 'visite', p_amount_spent, v_points_delta,
    p_note, auth.uid(), coalesce(p_via_pairing_code, false),
    coalesce(p_via_pos_sync, false), coalesce(p_via_phone_lookup, false)
  );

  return query
  update customers c
  set visit_count = c.visit_count + 1,
      total_spent = c.total_spent + p_amount_spent,
      loyalty_points = c.loyalty_points + v_points_delta,
      last_visit_at = now()
  where c.id = p_customer_id
  returning c.*;
end;
$$;

revoke all on function increment_customer_visit(uuid, uuid, numeric, int, text, boolean, boolean, boolean) from public, anon;
grant execute on function increment_customer_visit(uuid, uuid, numeric, int, text, boolean, boolean, boolean) to authenticated, service_role;

-- Remove access to the legacy overload, which accepted caller-chosen points.
revoke all on function increment_customer_visit(uuid, uuid, numeric, int, text) from public, anon, authenticated;
grant execute on function increment_customer_visit(uuid, uuid, numeric, int, text) to service_role;
revoke all on function increment_customer_visit(uuid, uuid, numeric, int, text, boolean) from public, anon, authenticated;
grant execute on function increment_customer_visit(uuid, uuid, numeric, int, text, boolean) to service_role;

commit;
