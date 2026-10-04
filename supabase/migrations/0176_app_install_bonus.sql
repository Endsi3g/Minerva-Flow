-- "Bonus d'installation de l'application": an owner-set number of loyalty points
-- a customer receives once, the first time they open the native app. Off by
-- default (0). Claimed through claim_app_install_bonus(), which only ever
-- touches the caller's own customer rows and is idempotent per row.

begin;

alter table public.restaurants
  add column if not exists app_install_bonus_points integer not null default 0;

alter table public.restaurants
  drop constraint if exists restaurants_app_install_bonus_points_check;
alter table public.restaurants
  add constraint restaurants_app_install_bonus_points_check
  check (app_install_bonus_points between 0 and 500);

alter table public.customers
  add column if not exists app_bonus_claimed_at timestamptz;

comment on column public.restaurants.app_install_bonus_points is
  'Points offerts une seule fois à l''ouverture de l''app native (0 = désactivé, max 500).';
comment on column public.customers.app_bonus_claimed_at is
  'Quand le bonus d''installation de l''app a été crédité à cette carte (une seule fois).';

create or replace function public.claim_app_install_bonus()
returns table (restaurant_id uuid, restaurant_name text, points integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentification requise.';
  end if;

  return query
  with due as (
    select c.id as customer_id, c.restaurant_id as rid, r.name as rname, r.app_install_bonus_points as bonus
    from public.customers c
    join public.restaurants r on r.id = c.restaurant_id
    where c.user_id = v_uid
      and c.app_bonus_claimed_at is null
      and r.app_install_bonus_points > 0
    for update of c
  ), upd as (
    update public.customers c
    set loyalty_points = c.loyalty_points + d.bonus,
        app_bonus_claimed_at = now()
    from due d
    where c.id = d.customer_id
    returning c.id as customer_id, d.rid, d.rname, d.bonus
  ), tx as (
    insert into public.loyalty_transactions
      (restaurant_id, customer_id, type, amount_spent, points_delta, note, created_by)
    select rid, customer_id, 'ajustement'::public.loyalty_transaction_type, 0, bonus,
           'Bonus d''installation de l''application', null
    from upd
    returning 1
  )
  select rid, rname, bonus from upd;
end;
$function$;

revoke execute on function public.claim_app_install_bonus() from public, anon;
grant execute on function public.claim_app_install_bonus() to authenticated;

commit;
