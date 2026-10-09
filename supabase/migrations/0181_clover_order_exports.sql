-- Disabled by default until a real merchant's catalogue and Orders/Register
-- reception have been verified. No payment endpoints are used by this queue.
begin;

alter table public.order_items add column if not exists price_option_id text;
alter table public.order_items add column if not exists price_option_label text;
alter table public.orders add column if not exists clover_acceptance_user_id uuid references auth.users(id);
alter table public.orders add column if not exists clover_employee_id text;
alter table public.orders add column if not exists clover_employee_name text;

create table public.clover_order_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  merchant_id text not null check (length(merchant_id) between 1 and 64),
  environment text not null check (environment in ('sandbox','production')),
  order_type_id text not null check (length(order_type_id) between 1 and 64),
  enabled boolean not null default false,
  employee_attribution boolean not null default false,
  automatic_cancellation boolean not null default false
);
create table public.clover_order_item_mappings (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  merchant_id text not null,
  environment text not null check (environment in ('sandbox','production')),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  price_option_id text not null default '',
  clover_item_id text not null,
  modifier_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(modifier_ids) = 'array'),
  verified_at timestamptz not null default now(),
  primary key (restaurant_id, merchant_id, environment, menu_item_id, price_option_id)
);
create table public.clover_order_exports (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  merchant_id text not null,
  environment text not null check (environment in ('sandbox','production')),
  order_type_id text not null,
  snapshot jsonb not null,
  status text not null default 'queued' check (status in ('queued','verify','exported','blocked','cancel_pending','cancel_verify','cancelled')),
  clover_order_id text,
  sent_payload jsonb,
  send_intent_at timestamptz,
  cancel_requested boolean not null default false,
  cancel_intent_at timestamptz,
  lease_id uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment, merchant_id, clover_order_id)
);
create index clover_exports_work on public.clover_order_exports(next_attempt_at) where status in ('queued','verify','cancel_pending','cancel_verify');

alter table public.clover_order_settings enable row level security;
alter table public.clover_order_item_mappings enable row level security;
alter table public.clover_order_exports enable row level security;
create policy clover_settings_manage on public.clover_order_settings for all to authenticated
  using (exists (select 1 from public.restaurant_members m where m.restaurant_id = clover_order_settings.restaurant_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','manager')))
  with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = clover_order_settings.restaurant_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','manager')));
create policy clover_mappings_manage on public.clover_order_item_mappings for all to authenticated
  using (exists (select 1 from public.restaurant_members m where m.restaurant_id = clover_order_item_mappings.restaurant_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','manager')))
  with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = clover_order_item_mappings.restaurant_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','manager'))
    and exists (select 1 from public.menu_items mi where mi.id = menu_item_id and mi.restaurant_id = clover_order_item_mappings.restaurant_id and ((clover_order_item_mappings.price_option_id = '' and jsonb_array_length(mi.price_options) = 0) or exists (select 1 from jsonb_array_elements(mi.price_options) o where o->>'id' = clover_order_item_mappings.price_option_id))));
create policy clover_exports_read on public.clover_order_exports for select to authenticated
  using (exists (select 1 from public.restaurant_members m where m.restaurant_id = clover_order_exports.restaurant_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','manager')));
revoke all on public.clover_order_exports from anon, authenticated;
grant select on public.clover_order_exports to authenticated;
grant all on public.clover_order_exports, public.clover_order_settings, public.clover_order_item_mappings to service_role;
grant select, insert, update, delete on public.clover_order_settings, public.clover_order_item_mappings to authenticated;

create function public.queue_clover_accepted_order() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_settings public.clover_order_settings%rowtype; v_actor uuid; v_items jsonb;
begin
  if new.status = 'annulee' then
    update public.clover_order_exports set cancel_requested = true,
      status = case when send_intent_at is null then 'cancelled' when clover_order_id is not null then 'cancel_pending' else 'verify' end,
      next_attempt_at = now(), updated_at = now() where order_id = new.id;
    return new;
  end if;
  if new.status <> 'confirmee' or coalesce(new.via_pos_sync, false) then return new; end if;
  -- Session clients cannot impersonate another approver. The native server
  -- supplies this ID only after resolving and verifying its bearer token.
  v_actor := case when auth.role() = 'service_role' then new.clover_acceptance_user_id else auth.uid() end;
  if not exists (select 1 from public.restaurant_members m where m.restaurant_id = new.restaurant_id and m.user_id = v_actor and m.status = 'active' and m.role in ('owner','manager')) then return new; end if;
  select s.* into v_settings from public.clover_order_settings s join public.pos_connections c
    on c.restaurant_id = s.restaurant_id and c.provider = 'clover' and c.status = 'connecte' and c.external_account_id = s.merchant_id
    where s.restaurant_id = new.restaurant_id and s.enabled;
  if not found then return new; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'menu_item_id',i.menu_item_id,'item_name',i.item_name,'unit_price',i.unit_price,'quantity',i.quantity,'notes',i.notes,'price_option_id',i.price_option_id,'price_option_label',i.price_option_label) order by i.id),'[]'::jsonb)
    into v_items from public.order_items i where i.order_id = new.id;
  insert into public.clover_order_exports(order_id,restaurant_id,merchant_id,environment,order_type_id,snapshot)
    values(new.id,new.restaurant_id,v_settings.merchant_id,v_settings.environment,v_settings.order_type_id,
      jsonb_build_object('id',new.id,'subtotal',new.subtotal,'tax_amount',new.tax_amount,'tip_amount',new.tip_amount,'total',new.total,'delivery_fee',new.delivery_fee,'payment_status',new.payment_status,'notes',new.notes,'created_at',new.created_at,'items',v_items))
    on conflict (order_id) do nothing;
  return new;
end $$;
create trigger orders_queue_clover after update of status on public.orders for each row execute function public.queue_clover_accepted_order();

-- A lease prevents concurrent workers, but is NOT API idempotency. Persist a
-- send intent before the POST; an expired lease must only reconcile afterwards.
create function public.claim_clover_order_export(p_environment text) returns setof public.clover_order_exports
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  select id into v_id from public.clover_order_exports
    where environment = p_environment and status in ('queued','verify','cancel_pending','cancel_verify')
      and next_attempt_at <= now() and (lease_until is null or lease_until < now())
    order by next_attempt_at for update skip locked limit 1;
  return query update public.clover_order_exports set lease_id = gen_random_uuid(), lease_until = now() + interval '3 minutes', attempts = attempts + 1, updated_at = now()
    where id = v_id returning *;
end $$;

create function public.begin_clover_order_send(p_id uuid,p_lease uuid,p_payload jsonb) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.clover_order_exports%rowtype;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  select * into v_row from public.clover_order_exports where id = p_id and lease_id = p_lease and lease_until > now() for update;
  if not found or v_row.status <> 'queued' or v_row.send_intent_at is not null or v_row.cancel_requested then return false; end if;
  if not exists (select 1 from public.orders where id = v_row.order_id and restaurant_id = v_row.restaurant_id and status in ('confirmee','en_preparation','prete','servie')) then return false; end if;
  update public.clover_order_exports set status = 'verify',send_intent_at = now(),sent_payload = p_payload,updated_at = now() where id = p_id;
  return true;
end $$;

create function public.finish_clover_order_export(p_id uuid,p_lease uuid,p_status text,p_clover_id text default null,p_error text default null) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  if p_status not in ('queued','verify','exported','blocked','cancel_pending','cancel_verify','cancelled') then raise exception 'invalid_export_status'; end if;
  update public.clover_order_exports set
    status = case when cancel_requested and send_intent_at is null then 'cancelled' when p_status = 'exported' and cancel_requested then 'cancel_pending' else p_status end,
    clover_order_id = coalesce(p_clover_id,clover_order_id),last_error_code = p_error,
    lease_id = null,lease_until = null, next_attempt_at = now() + interval '1 minute' * least(60,power(2,least(attempts,6))::integer), updated_at = now()
    where id = p_id and lease_id = p_lease and lease_until > now()
      and not (p_status = 'queued' and send_intent_at is not null);
  get diagnostics v_count = row_count;
  return v_count = 1;
end $$;
revoke all on function public.queue_clover_accepted_order() from public,anon,authenticated;
revoke all on function public.claim_clover_order_export(text), public.begin_clover_order_send(uuid,uuid,jsonb), public.finish_clover_order_export(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_clover_order_export(text), public.begin_clover_order_send(uuid,uuid,jsonb), public.finish_clover_order_export(uuid,uuid,text,text,text) to service_role;



create function public.remember_clover_order_id(p_id uuid,p_lease uuid,p_clover_id text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  if nullif(trim(p_clover_id),'') is null then raise exception 'remote_order_id_required'; end if;
  update public.clover_order_exports set clover_order_id = p_clover_id,updated_at = now()
    where id = p_id and lease_id = p_lease and lease_until > now() and send_intent_at is not null
      and (clover_order_id is null or clover_order_id = p_clover_id);
  get diagnostics v_count = row_count; return v_count = 1;
end $$;
create function public.begin_clover_order_cancel(p_id uuid,p_lease uuid) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  update public.clover_order_exports set cancel_intent_at = now(),status = 'cancel_verify',updated_at = now()
    where id = p_id and lease_id = p_lease and lease_until > now() and cancel_requested and clover_order_id is not null and cancel_intent_at is null;
  get diagnostics v_count = row_count; return v_count = 1;
end $$;
revoke all on function public.remember_clover_order_id(uuid,uuid,text), public.begin_clover_order_cancel(uuid,uuid) from public,anon,authenticated;
grant execute on function public.remember_clover_order_id(uuid,uuid,text), public.begin_clover_order_cancel(uuid,uuid) to service_role;

-- Retain the server-validated format and line notes in the checkout transaction.
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
  if auth.role() is distinct from 'service_role' then
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
    select x.menu_item_id, x.item_name, x.unit_price, x.quantity, x.price_option_id
    from jsonb_to_recordset(p_items) as x(
      menu_item_id uuid, item_name text, unit_price numeric, quantity integer, price_option_id text
    )
  loop
    v_item_count := v_item_count + 1;
    if v_item.menu_item_id is null or v_item.quantity is null or v_item.quantity not between 1 and 99
       or v_item.unit_price is null or v_item.unit_price < 0
       or v_item.item_name is null or length(v_item.item_name) > 200
       or not exists (
         select 1 from menu_items mi
         where mi.id = v_item.menu_item_id and mi.restaurant_id = p_restaurant_id
           and mi.active = true and mi.is_draft = false and (
             (v_item.price_option_id is null and jsonb_array_length(mi.price_options) = 0 and mi.price = v_item.unit_price)
             or (v_item.price_option_id is not null and exists (
               select 1 from jsonb_array_elements(mi.price_options) as option_row
               where option_row->>'id' = v_item.price_option_id
                 and (option_row->>'price')::numeric = v_item.unit_price
             ))
           )
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

  insert into order_items (order_id, menu_item_id, item_name, unit_price, quantity, price_option_id, price_option_label, notes)
  select v_order.id, x.menu_item_id, x.item_name, x.unit_price, x.quantity, x.price_option_id,
    (select option_row->>'label' from menu_items mi, lateral jsonb_array_elements(mi.price_options) option_row
      where mi.id = x.menu_item_id and mi.restaurant_id = p_restaurant_id and option_row->>'id' = x.price_option_id limit 1),
    nullif(left(trim(x.notes),500),'')
  from jsonb_to_recordset(p_items) as x(
    menu_item_id uuid, item_name text, unit_price numeric, quantity integer, price_option_id text, notes text
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
