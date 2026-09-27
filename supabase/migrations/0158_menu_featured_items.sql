-- Restaurant owners can curate the public menu's featured section.
begin;

alter table public.menu_items
  add column if not exists is_featured boolean not null default false;

alter table public.restaurants
  add column if not exists welcome_bonus_points integer not null default 0
    check (welcome_bonus_points between 0 and 100000);

alter table public.customers
  add column if not exists welcome_bonus_awarded_at timestamptz,
  add column if not exists welcome_bonus_order_id uuid references public.orders(id) on delete set null;

create index if not exists idx_menu_items_public_featured
  on public.menu_items (restaurant_id, is_featured, category, name)
  where active = true and is_draft = false;

comment on column public.menu_items.is_featured is
  'Owner-curated item highlighted above the full catalog on public digital menus.';

comment on column public.restaurants.welcome_bonus_points is
  'Optional first-visit loyalty bonus. Zero disables it until the owner configures an amount.';

create or replace function public.award_first_served_order_welcome_bonus()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bonus integer;
  v_customer_id uuid;
begin
  if new.status <> 'servie' or old.status is not distinct from new.status or new.customer_id is null then
    return new;
  end if;

  select welcome_bonus_points into v_bonus
  from public.restaurants
  where id = new.restaurant_id;

  if coalesce(v_bonus, 0) <= 0 then return new; end if;

  update public.customers
  set loyalty_points = loyalty_points + v_bonus,
      welcome_bonus_awarded_at = now(),
      welcome_bonus_order_id = new.id
  where id = new.customer_id
    and restaurant_id = new.restaurant_id
    and visit_count = 0
    and welcome_bonus_awarded_at is null
  returning id into v_customer_id;

  if v_customer_id is not null then
    insert into public.loyalty_transactions
      (restaurant_id, customer_id, type, amount_spent, points_delta, note, created_by)
    values
      (new.restaurant_id, v_customer_id, 'visite', 0, v_bonus,
       'Bonus de bienvenue — première commande servie', null);
  end if;

  return new;
end;
$$;

drop trigger if exists orders_award_first_welcome_bonus on public.orders;
create trigger orders_award_first_welcome_bonus
  after update of status on public.orders
  for each row execute function public.award_first_served_order_welcome_bonus();

commit;
