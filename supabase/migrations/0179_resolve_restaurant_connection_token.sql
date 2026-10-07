-- Resolve a restaurant's printed menu/loyalty QR for an authenticated
-- customer without exposing share rows or requiring the service-role key.
-- The token is the public link already printed on the restaurant's QR.

begin;

create or replace function public.resolve_restaurant_connection(p_token text)
returns table (restaurant_id uuid, restaurant_name text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_restaurant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '42501';
  end if;

  if p_token is null or length(p_token) > 256 then
    return;
  end if;

  select s.restaurant_id into v_restaurant_id
  from public.menu_shares s
  where s.token = p_token
  limit 1;

  if v_restaurant_id is null then
    select s.restaurant_id into v_restaurant_id
    from public.loyalty_shares s
    where s.token = p_token
    limit 1;
  end if;

  if v_restaurant_id is null then
    return;
  end if;

  return query
    select r.id, r.name
    from public.restaurants r
    where r.id = v_restaurant_id;
end;
$$;

revoke all on function public.resolve_restaurant_connection(text) from public, anon;
grant execute on function public.resolve_restaurant_connection(text) to authenticated;

comment on function public.resolve_restaurant_connection(text) is
  'Resolves one exact printed menu/loyalty QR token to its public restaurant identity for authenticated customer onboarding.';

commit;
