begin;

-- Make birthday loyalty awards auditable and safe to retry. A deterministic
-- ledger key prevents duplicate bonuses if the owner double-clicks or the
-- browser retries after a network timeout.
alter table loyalty_transactions
  add column if not exists idempotency_key text;

create unique index if not exists idx_loyalty_transactions_idempotency_key
  on loyalty_transactions (restaurant_id, idempotency_key)
  where idempotency_key is not null;

create or replace function grant_customer_birthday_bonus(
  p_restaurant_id uuid,
  p_customer_id uuid
) returns table (applied boolean, customer customers)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer customers%rowtype;
  v_timezone text;
  v_today date;
  v_next_birthday date;
  v_birthday_year integer;
  v_month integer;
  v_day integer;
  v_idempotency_key text;
begin
  if auth.uid() is null
     or not is_restaurant_member(p_restaurant_id, array['owner','manager','staff']::member_role[]) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(tz.name, 'America/Toronto')
    into v_timezone
  from restaurants r
  left join pg_timezone_names tz on tz.name = r.timezone
  where r.id = p_restaurant_id;
  if not found then
    raise exception 'restaurant_not_found' using errcode = 'P0002';
  end if;
  v_today := (now() at time zone v_timezone)::date;

  select * into v_customer
  from customers c
  where c.id = p_customer_id and c.restaurant_id = p_restaurant_id
  for update;
  if not found then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;
  if v_customer.birthday is null then
    raise exception 'birthday_missing' using errcode = '22023';
  end if;

  v_month := extract(month from v_customer.birthday)::integer;
  v_day := extract(day from v_customer.birthday)::integer;
  v_birthday_year := extract(year from v_today)::integer;

  -- Celebrate Feb 29 on Feb 28 during non-leap years, matching the native app.
  if v_month = 2 and v_day = 29
     and not (v_birthday_year % 4 = 0 and (v_birthday_year % 100 <> 0 or v_birthday_year % 400 = 0)) then
    v_next_birthday := make_date(v_birthday_year, 2, 28);
  else
    v_next_birthday := make_date(v_birthday_year, v_month, v_day);
  end if;

  if v_next_birthday < v_today then
    v_birthday_year := v_birthday_year + 1;
    if v_month = 2 and v_day = 29
       and not (v_birthday_year % 4 = 0 and (v_birthday_year % 100 <> 0 or v_birthday_year % 400 = 0)) then
      v_next_birthday := make_date(v_birthday_year, 2, 28);
    else
      v_next_birthday := make_date(v_birthday_year, v_month, v_day);
    end if;
  end if;

  if v_next_birthday > v_today + 14 then
    raise exception 'birthday_bonus_not_eligible' using errcode = '22023';
  end if;

  v_idempotency_key := 'birthday:' || p_customer_id::text || ':' || v_birthday_year::text;
  if exists (
    select 1 from loyalty_transactions lt
    where lt.restaurant_id = p_restaurant_id and lt.idempotency_key = v_idempotency_key
  ) then
    return query select false, v_customer;
    return;
  end if;

  insert into loyalty_transactions (
    restaurant_id, customer_id, type, points_delta, note, created_by, idempotency_key
  ) values (
    p_restaurant_id,
    p_customer_id,
    'ajustement',
    50,
    'Bonus anniversaire ' || v_birthday_year::text,
    auth.uid(),
    v_idempotency_key
  );

  update customers c
  set loyalty_points = c.loyalty_points + 50
  where c.id = p_customer_id and c.restaurant_id = p_restaurant_id
  returning c.* into v_customer;

  return query select true, v_customer;
end;
$$;

revoke all on function grant_customer_birthday_bonus(uuid, uuid) from public, anon;
grant execute on function grant_customer_birthday_bonus(uuid, uuid) to authenticated;

commit;
