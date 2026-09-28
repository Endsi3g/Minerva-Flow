-- Make direct 6-digit customer identification safe under concurrent staff
-- lookups, and restrict the RPC to operational restaurant roles. The code is
-- still single-use, but a parallel request can no longer resolve it twice.

begin;

create or replace function resolve_pairing_code(p_restaurant_id uuid, p_code text)
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

  if p_code is null or trim(p_code) !~ '^\d{6}$' then
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
  limit 1;

  if not found then
    raise exception 'Ce client n''est pas encore membre de cet établissement.';
  end if;

  update pairing_codes
  set used_at = now(), used_by = auth.uid(), used_restaurant_id = p_restaurant_id
  where id = v_pairing.id;

  return query
  select v_customer.id, v_customer.name, v_customer.loyalty_points,
         v_customer.visit_count, v_customer.total_spent, v_customer.avatar_url;
end;
$$;

revoke all on function resolve_pairing_code(uuid, text) from public, anon;
grant execute on function resolve_pairing_code(uuid, text) to authenticated;

commit;
