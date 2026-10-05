-- Balance and ownership columns of a customer card are managed by the restaurant, never
-- by a direct request from the guest's own session. Staff of the restaurant, the
-- service role and security-definer functions (visits, redemptions, bonuses) are unaffected.

create or replace function public.protect_customer_balance_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon')
     and not public.is_restaurant_member(old.restaurant_id, array['owner', 'manager', 'staff']::member_role[]) then
    if new.loyalty_points is distinct from old.loyalty_points
       or new.total_spent is distinct from old.total_spent
       or new.visit_count is distinct from old.visit_count
       or new.last_visit_at is distinct from old.last_visit_at
       or new.restaurant_id is distinct from old.restaurant_id
       or new.user_id is distinct from old.user_id
       or new.welcome_bonus_awarded_at is distinct from old.welcome_bonus_awarded_at
       or new.welcome_bonus_order_id is distinct from old.welcome_bonus_order_id
       or new.app_bonus_claimed_at is distinct from old.app_bonus_claimed_at then
      raise exception 'Ces champs sont gérés par le restaurant.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists customers_protect_balance_columns on public.customers;
create trigger customers_protect_balance_columns
  before update on public.customers
  for each row execute function public.protect_customer_balance_columns();
