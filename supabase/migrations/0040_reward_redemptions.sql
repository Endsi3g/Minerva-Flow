-- Reward catalog gets an optional description for richer portal cards.
alter table loyalty_rewards add column if not exists description text;

-- Redemption tracking: client redeems in the portal (self-serve) → gets a
-- short code → shows it to staff in person → staff validates it. Points are
-- deducted at request time (same guard as the existing staff-initiated
-- redeem_customer_reward), not at claim time, to avoid a double-spend
-- window across multiple pending requests.
create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  reward_id uuid not null references loyalty_rewards (id) on delete cascade,
  reward_name text not null,
  points_spent int not null,
  code text not null,
  status text not null default 'pending' check (status in ('pending', 'claimed')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid references auth.users (id)
);

create unique index if not exists idx_reward_redemptions_code on reward_redemptions (restaurant_id, code);
create index if not exists idx_reward_redemptions_customer on reward_redemptions (customer_id);

alter table reward_redemptions enable row level security;

drop policy if exists "reward_redemptions_select" on reward_redemptions;
create policy "reward_redemptions_select" on reward_redemptions for select
  using (
    is_restaurant_member(restaurant_id)
    or exists (select 1 from customers c where c.id = reward_redemptions.customer_id and c.user_id = auth.uid())
  );

-- Self-serve redemption: the customer spends their own points for a
-- reward, generating a code to show staff in person. Mirrors
-- redeem_customer_reward's balance guard exactly, just callable by the
-- customer themselves (resolved via their own customers row) instead of
-- staff acting on their behalf.
create or replace function self_redeem_reward(p_reward_id uuid)
returns reward_redemptions
language plpgsql
security definer set search_path = public
as $$
declare
  v_customer_id uuid;
  v_restaurant_id uuid;
  v_points_cost int;
  v_reward_name text;
  v_code text;
  v_row reward_redemptions%rowtype;
begin
  select c.id, c.restaurant_id into v_customer_id, v_restaurant_id
  from customers c
  where c.user_id = auth.uid()
    and c.restaurant_id = (select lr.restaurant_id from loyalty_rewards lr where lr.id = p_reward_id);

  if v_customer_id is null then
    raise exception 'Non autorisé';
  end if;

  select points_cost, name into v_points_cost, v_reward_name
  from loyalty_rewards where id = p_reward_id and restaurant_id = v_restaurant_id and active = true;

  if v_points_cost is null then
    raise exception 'Récompense introuvable';
  end if;

  update customers
  set loyalty_points = loyalty_points - v_points_cost
  where id = v_customer_id and loyalty_points >= v_points_cost;

  if not found then
    raise exception 'Solde de points insuffisant';
  end if;

  insert into loyalty_transactions (restaurant_id, customer_id, type, points_delta, note, created_by)
  values (v_restaurant_id, v_customer_id, 'echange', -v_points_cost, 'Échange : ' || v_reward_name, auth.uid());

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into reward_redemptions (restaurant_id, customer_id, reward_id, reward_name, points_spent, code, status)
  values (v_restaurant_id, v_customer_id, p_reward_id, v_reward_name, v_points_cost, v_code, 'pending')
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function self_redeem_reward(uuid) to authenticated;

-- Staff validates a code the client is showing in person, marking the
-- redemption as claimed. Fails (raises) if the code doesn't exist for this
-- restaurant or was already claimed — idempotent-safe against a double-tap.
create or replace function staff_claim_reward_redemption(p_restaurant_id uuid, p_code text)
returns table (
  id uuid,
  reward_name text,
  points_spent int,
  customer_name text,
  claimed_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not is_restaurant_member(p_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'Non autorisé';
  end if;

  update reward_redemptions rr
  set status = 'claimed', claimed_at = now(), claimed_by = auth.uid()
  where rr.restaurant_id = p_restaurant_id and upper(rr.code) = upper(p_code) and rr.status = 'pending'
  returning rr.id into v_id;

  if v_id is null then
    raise exception 'Code introuvable ou déjà utilisé';
  end if;

  return query
    select rr.id, rr.reward_name, rr.points_spent, c.name, rr.claimed_at
    from reward_redemptions rr
    join customers c on c.id = rr.customer_id
    where rr.id = v_id;
end;
$$;

grant execute on function staff_claim_reward_redemption(uuid, text) to authenticated;
