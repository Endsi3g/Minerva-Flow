-- Durable client checkout attempts. Order + line items + referral conversion
-- are committed atomically; the unique key makes retries return that same
-- order instead of creating duplicate work or charges.

begin;

alter table orders
  add column if not exists public_checkout_key uuid,
  add column if not exists public_checkout_user_id uuid references auth.users(id) on delete set null,
  add column if not exists public_checkout_fingerprint text,
  add column if not exists checkout_stripe_account_id text;

create unique index if not exists idx_orders_public_checkout_key
  on orders (restaurant_id, public_checkout_key)
  where public_checkout_key is not null;

create or replace function create_or_get_public_order(
  p_restaurant_id uuid,
  p_checkout_key uuid,
  p_checkout_user_id uuid,
  p_request_fingerprint text,
  p_customer_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_subtotal numeric,
  p_tax_amount numeric,
  p_tip_amount numeric,
  p_total numeric,
  p_payment_method text,
  p_payment_status order_payment_status,
  p_fulfillment_mode text,
  p_delivery_address text,
  p_delivery_lat numeric,
  p_delivery_lng numeric,
  p_delivery_distance_km numeric,
  p_delivery_fee numeric,
  p_delivery_eta_minutes integer,
  p_estimated_ready_at timestamptz,
  p_requested_ready_at timestamptz,
  p_referral_link_id uuid,
  p_referral_channel text,
  p_notes text,
  p_stripe_account_id text,
  p_source text,
  p_items jsonb
)
returns table (
  order_id uuid,
  created boolean,
  order_status order_status,
  payment_status order_payment_status,
  stripe_payment_intent_id text,
  estimated_ready_at timestamptz,
  total numeric,
  stripe_account_id text,
  stripe_checkout_session_id text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order orders%rowtype;
  v_item record;
  v_items_subtotal numeric(10,2) := 0;
  v_item_count integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_checkout_key is null or p_checkout_user_id is null or p_customer_id is null
     or p_request_fingerprint is null or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_checkout_attempt' using errcode = '22023';
  end if;

  -- Serialize retries before checking the unique key. The order and its
  -- children are inserted in this same transaction below.
  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || ':' || p_checkout_key::text, 0));
  select o.* into v_order
  from orders o
  where o.restaurant_id = p_restaurant_id and o.public_checkout_key = p_checkout_key
  for update;
  if found then
    if v_order.public_checkout_user_id is distinct from p_checkout_user_id
       or v_order.public_checkout_fingerprint is distinct from p_request_fingerprint then
      raise exception 'public_checkout_key_conflict' using errcode = '23505';
    end if;
    return query select v_order.id, false, v_order.status, v_order.payment_status,
      v_order.stripe_payment_intent_id, v_order.estimated_ready_at, v_order.total,
      v_order.checkout_stripe_account_id, v_order.stripe_checkout_session_id;
    return;
  end if;

  if p_guest_name is null or length(trim(p_guest_name)) not between 1 and 160
     or p_guest_phone is not null and length(p_guest_phone) > 40
     or p_fulfillment_mode is null or p_fulfillment_mode not in ('sur_place', 'livraison')
     or p_payment_status is null or p_payment_status not in ('non_requis', 'en_attente')
     or p_subtotal is null or p_subtotal < 0
     or p_tax_amount is null or p_tax_amount < 0
     or p_tip_amount is null or p_tip_amount < 0
     or p_delivery_fee is null or p_delivery_fee < 0
     or p_total is null or p_total < 0
     or abs(p_total - (p_subtotal + p_tax_amount + p_tip_amount + p_delivery_fee)) > 0.01 then
    raise exception 'invalid_public_order' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_public_order_items' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'invalid_public_order_items' using errcode = '22023';
  end if;
  if p_payment_status = 'en_attente' and nullif(trim(p_stripe_account_id), '') is null then
    raise exception 'stripe_account_required' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('web', 'mobile') then
    raise exception 'invalid_order_source' using errcode = '22023';
  end if;
  if p_fulfillment_mode = 'livraison' and nullif(trim(p_delivery_address), '') is null then
    raise exception 'delivery_address_required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from customers c
    where c.id = p_customer_id and c.restaurant_id = p_restaurant_id and c.user_id = p_checkout_user_id
  ) then
    raise exception 'customer_restaurant_mismatch' using errcode = '42501';
  end if;

  for v_item in
    select x.menu_item_id, x.item_name, x.unit_price, x.quantity
    from jsonb_to_recordset(p_items) as x(
      menu_item_id uuid, item_name text, unit_price numeric, quantity integer
    )
  loop
    v_item_count := v_item_count + 1;
    if v_item.menu_item_id is null or v_item.quantity is null or v_item.quantity not between 1 and 99
       or v_item.unit_price is null or v_item.unit_price < 0
       or v_item.item_name is null or length(v_item.item_name) > 200
       or not exists (
         select 1 from menu_items mi
         where mi.id = v_item.menu_item_id and mi.restaurant_id = p_restaurant_id
           and mi.active = true and mi.is_draft = false and mi.price = v_item.unit_price
       ) then
      raise exception 'menu_item_changed_or_unavailable' using errcode = '22023';
    end if;
    v_items_subtotal := v_items_subtotal + (v_item.unit_price * v_item.quantity);
  end loop;
  if v_item_count = 0 or abs(v_items_subtotal - p_subtotal) > 0.01 then
    raise exception 'public_order_pricing_mismatch' using errcode = '22023';
  end if;
  if p_referral_link_id is not null and not exists (
    select 1 from customer_referral_links crl
    join referral_programs rp on rp.id = crl.referral_program_id
    where crl.id = p_referral_link_id and rp.restaurant_id = p_restaurant_id
  ) then
    raise exception 'referral_restaurant_mismatch' using errcode = '22023';
  end if;
  if p_referral_channel is null or p_referral_channel not in ('qr', 'share', 'copy', 'code', 'direct') then
    raise exception 'invalid_referral_channel' using errcode = '22023';
  end if;

  insert into orders (
    restaurant_id, status, guest_name, guest_phone, subtotal, tax_amount,
    tip_amount, total, payment_method, payment_status, fulfillment_mode,
    delivery_address, delivery_lat, delivery_lng, delivery_distance_km,
    delivery_fee, delivery_eta_minutes, estimated_ready_at, requested_ready_at,
    referral_link_id, is_public_request, customer_id, notes, source,
    public_checkout_key, public_checkout_user_id, public_checkout_fingerprint,
    checkout_stripe_account_id
  ) values (
    p_restaurant_id, 'soumise', trim(p_guest_name), nullif(trim(p_guest_phone), ''),
    p_subtotal, p_tax_amount, p_tip_amount, p_total, p_payment_method, p_payment_status,
    p_fulfillment_mode, nullif(trim(p_delivery_address), ''), p_delivery_lat, p_delivery_lng,
    p_delivery_distance_km, p_delivery_fee, p_delivery_eta_minutes, p_estimated_ready_at,
    p_requested_ready_at, p_referral_link_id, true, p_customer_id, p_notes, p_source,
    p_checkout_key, p_checkout_user_id, p_request_fingerprint, p_stripe_account_id
  ) returning * into v_order;

  insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity)
  select v_order.id, x.menu_item_id, x.item_name, x.unit_price, x.quantity
  from jsonb_to_recordset(p_items) as x(
    menu_item_id uuid, item_name text, unit_price numeric, quantity integer
  );

  if p_referral_link_id is not null then
    insert into customer_referral_conversions (
      referral_link_id, conversion_type, order_id, invited_customer_id, invitation_channel
    ) values (
      p_referral_link_id, 'achat', v_order.id, p_customer_id, p_referral_channel
    );
  end if;

  return query select v_order.id, true, v_order.status, v_order.payment_status,
    v_order.stripe_payment_intent_id, v_order.estimated_ready_at, v_order.total,
    v_order.checkout_stripe_account_id, v_order.stripe_checkout_session_id;
end;
$$;

revoke all on function create_or_get_public_order(
  uuid, uuid, uuid, text, uuid, text, text, numeric, numeric, numeric, numeric,
  text, order_payment_status, text, text, numeric, numeric, numeric, numeric,
  integer, timestamptz, timestamptz, uuid, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function create_or_get_public_order(
  uuid, uuid, uuid, text, uuid, text, text, numeric, numeric, numeric, numeric,
  text, order_payment_status, text, text, numeric, numeric, numeric, numeric,
  integer, timestamptz, timestamptz, uuid, text, text, text, text, jsonb
) to service_role;

commit;
