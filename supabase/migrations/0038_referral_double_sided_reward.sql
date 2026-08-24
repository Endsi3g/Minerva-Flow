-- Double-sided referral reward: an immediate points bonus for BOTH the
-- referrer and the newly referred customer right at conversion (reservation
-- confirmed / order served), on top of the existing goal-based reward
-- (customer_referral_links.reward_claimed_at, still a flag the staff hands
-- out manually — unchanged). Previously NEITHER side got anything
-- automatic; converted_count was tracked but never translated into points.
alter table referral_programs add column if not exists new_customer_bonus_points integer not null default 0;
alter table referral_programs add column if not exists referrer_bonus_points integer not null default 0;

create or replace function credit_referral_conversion(p_reservation_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_referral_link_id uuid;
  v_new_customer_id uuid;
  v_new_count int;
  v_goal_count int;
  v_reward_claimed timestamptz;
  v_referrer_customer_id uuid;
  v_referral_program_id uuid;
  v_referrer_bonus int;
  v_new_customer_bonus int;
begin
  select restaurant_id, referral_link_id, customer_id
    into v_restaurant_id, v_referral_link_id, v_new_customer_id
  from reservations where id = p_reservation_id;

  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id) then
    raise exception 'Non autorisé';
  end if;

  if v_referral_link_id is null then
    return;
  end if;

  update customer_referral_conversions
  set credited_at = now()
  where reservation_id = p_reservation_id and credited_at is null;

  if not found then
    return;
  end if;

  update customer_referral_links
  set converted_count = converted_count + 1
  where id = v_referral_link_id
  returning converted_count, reward_claimed_at, customer_id, referral_program_id
    into v_new_count, v_reward_claimed, v_referrer_customer_id, v_referral_program_id;

  select goal_count, referrer_bonus_points, new_customer_bonus_points
    into v_goal_count, v_referrer_bonus, v_new_customer_bonus
  from referral_programs where id = v_referral_program_id;

  if v_new_count >= v_goal_count and v_reward_claimed is null then
    update customer_referral_links
    set reward_claimed_at = now()
    where id = v_referral_link_id;
  end if;

  if v_referrer_bonus > 0 and v_referrer_customer_id is not null then
    insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note)
    values (v_restaurant_id, v_referrer_customer_id, 'ajustement', v_referrer_bonus, 'Bonus de parrainage');
    update customers set loyalty_points = loyalty_points + v_referrer_bonus where id = v_referrer_customer_id;
  end if;

  if v_new_customer_bonus > 0 and v_new_customer_id is not null then
    insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note)
    values (v_restaurant_id, v_new_customer_id, 'ajustement', v_new_customer_bonus, 'Bonus de bienvenue — parrainage');
    update customers set loyalty_points = loyalty_points + v_new_customer_bonus where id = v_new_customer_id;
  end if;
end;
$$;

create or replace function credit_referral_conversion_for_order(p_order_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_referral_link_id uuid;
  v_new_customer_id uuid;
  v_new_count int;
  v_goal_count int;
  v_reward_claimed timestamptz;
  v_referrer_customer_id uuid;
  v_referral_program_id uuid;
  v_referrer_bonus int;
  v_new_customer_bonus int;
begin
  select restaurant_id, referral_link_id, customer_id
    into v_restaurant_id, v_referral_link_id, v_new_customer_id
  from orders where id = p_order_id;

  if v_restaurant_id is null or not is_restaurant_member(v_restaurant_id) then
    raise exception 'Non autorisé';
  end if;

  if v_referral_link_id is null then
    return;
  end if;

  update customer_referral_conversions
  set credited_at = now()
  where order_id = p_order_id and credited_at is null;

  if not found then
    return;
  end if;

  update customer_referral_links
  set converted_count = converted_count + 1
  where id = v_referral_link_id
  returning converted_count, reward_claimed_at, customer_id, referral_program_id
    into v_new_count, v_reward_claimed, v_referrer_customer_id, v_referral_program_id;

  select goal_count, referrer_bonus_points, new_customer_bonus_points
    into v_goal_count, v_referrer_bonus, v_new_customer_bonus
  from referral_programs where id = v_referral_program_id;

  if v_new_count >= v_goal_count and v_reward_claimed is null then
    update customer_referral_links
    set reward_claimed_at = now()
    where id = v_referral_link_id;
  end if;

  if v_referrer_bonus > 0 and v_referrer_customer_id is not null then
    insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note)
    values (v_restaurant_id, v_referrer_customer_id, 'ajustement', v_referrer_bonus, 'Bonus de parrainage');
    update customers set loyalty_points = loyalty_points + v_referrer_bonus where id = v_referrer_customer_id;
  end if;

  if v_new_customer_bonus > 0 and v_new_customer_id is not null then
    insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note)
    values (v_restaurant_id, v_new_customer_id, 'ajustement', v_new_customer_bonus, 'Bonus de bienvenue — parrainage');
    update customers set loyalty_points = loyalty_points + v_new_customer_bonus where id = v_new_customer_id;
  end if;
end;
$$;
