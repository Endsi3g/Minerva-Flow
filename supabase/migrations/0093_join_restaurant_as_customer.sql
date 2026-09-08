-- Browsing a restaurant you're not yet a member of was a dead end — the
-- native app could show its menu/offers (RestaurantDetailView) but had no
-- way to actually become a loyalty customer there (QRScannerView.swift's
-- own comment calls this out: "browse-only, become a customer to order").
-- Idempotent self-serve join: safe to call again for a restaurant you're
-- already a member of, returns the existing row instead of erroring.

begin;

create or replace function join_restaurant_as_customer(p_restaurant_id uuid)
returns customers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing customers%rowtype;
  v_new customers%rowtype;
  v_name text;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Authentification requise.';
  end if;

  if not exists (select 1 from restaurants where id = p_restaurant_id) then
    raise exception 'Restaurant introuvable.';
  end if;

  select * into v_existing
  from customers
  where user_id = v_user_id and restaurant_id = p_restaurant_id
  limit 1;

  if found then
    return v_existing;
  end if;

  select full_name, email into v_name, v_email
  from profiles
  where id = v_user_id;

  insert into customers (restaurant_id, user_id, name, email)
  values (p_restaurant_id, v_user_id, coalesce(v_name, v_email, 'Client'), v_email)
  returning * into v_new;

  return v_new;
end;
$$;

grant execute on function join_restaurant_as_customer(uuid) to authenticated;

commit;
