begin;

-- A scheduled fulfillment time is stored as an instant; clients submit an
-- ISO timestamp in the restaurant's local timezone and the API normalizes it.
alter table orders
  add column if not exists order_kind text not null default 'standard',
  add column if not exists requested_ready_at timestamptz;
alter table orders add column if not exists deposit_paid_amount numeric(10,2) not null default 0;

alter table menu_items
  add column if not exists is_draft boolean not null default false,
  add column if not exists allergens text[] not null default '{}',
  add column if not exists allergens_confirmed boolean not null default false;

-- A POS sync may see the same paid ticket via cron, webhook, and manual
-- retry. The ledger key makes point credit exactly-once across all three.
alter table loyalty_transactions
  add column if not exists pos_provider text,
  add column if not exists external_order_id text,
  add column if not exists via_pos_sync boolean not null default false,
  add column if not exists via_phone_lookup boolean not null default false;
alter table loyalty_transactions drop constraint if exists loyalty_transactions_pos_provider_check;
alter table loyalty_transactions add constraint loyalty_transactions_pos_provider_check
  check (pos_provider is null or pos_provider in ('square', 'lightspeed', 'clover', 'toast'));
create unique index if not exists idx_loyalty_transactions_pos_ticket
  on loyalty_transactions (restaurant_id, pos_provider, external_order_id)
  where pos_provider is not null and external_order_id is not null;

create or replace function increment_customer_visit_from_pos(
  p_customer_id uuid,
  p_restaurant_id uuid,
  p_amount_spent numeric,
  p_points_delta integer,
  p_note text,
  p_via_phone_lookup boolean,
  p_pos_provider text,
  p_external_order_id text
) returns table (applied boolean, customer customers)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer customers%rowtype;
  v_existing loyalty_transactions%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  if p_pos_provider not in ('square','lightspeed','clover','toast')
     or nullif(trim(p_external_order_id), '') is null
     or p_amount_spent is null or p_amount_spent < 0
     or p_points_delta is null or p_points_delta < 0 then
    raise exception 'invalid_pos_visit' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || ':' || p_pos_provider || ':' || p_external_order_id, 0));
  select * into v_existing from loyalty_transactions
    where restaurant_id = p_restaurant_id and pos_provider = p_pos_provider and external_order_id = p_external_order_id;
  if found then
    if v_existing.customer_id <> p_customer_id then raise exception 'pos_ticket_customer_conflict' using errcode = '23505'; end if;
    return query select false, c from customers c where c.id = p_customer_id and c.restaurant_id = p_restaurant_id;
    return;
  end if;

  select * into v_customer from customers where id = p_customer_id and restaurant_id = p_restaurant_id for update;
  if not found then raise exception 'customer_restaurant_mismatch' using errcode = '42501'; end if;
  insert into loyalty_transactions (
    restaurant_id, customer_id, type, amount_spent, points_delta, note,
    created_by, via_pos_sync, via_phone_lookup, pos_provider, external_order_id
  ) values (
    p_restaurant_id, p_customer_id, 'visite', p_amount_spent, p_points_delta, p_note,
    null, true, coalesce(p_via_phone_lookup, false), p_pos_provider, p_external_order_id
  );
  update customers set
    visit_count = visit_count + 1,
    total_spent = total_spent + p_amount_spent,
    loyalty_points = loyalty_points + p_points_delta,
    last_visit_at = now()
    where id = p_customer_id and restaurant_id = p_restaurant_id
    returning * into v_customer;
  return query select true, v_customer;
end;
$$;
revoke all on function increment_customer_visit_from_pos(uuid, uuid, numeric, integer, text, boolean, text, text) from public, anon, authenticated;
grant execute on function increment_customer_visit_from_pos(uuid, uuid, numeric, integer, text, boolean, text, text) to service_role;

alter table orders drop constraint if exists orders_order_kind_check;
alter table orders add constraint orders_order_kind_check
  check (order_kind in ('standard', 'custom', 'catering'));
create index if not exists idx_orders_restaurant_requested_ready
  on orders (restaurant_id, requested_ready_at) where requested_ready_at is not null;

-- Quotes cover custom meal requests and catering. They are deliberately
-- separate from orders: acceptance/deposit must happen before production.
create table if not exists service_quotes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  quote_type text not null check (quote_type in ('custom_meal', 'catering')),
  status text not null default 'requested'
    check (status in ('requested', 'quoted', 'accepted', 'declined', 'expired', 'converted', 'cancelled')),
  guest_name text not null,
  guest_phone text,
  guest_email text,
  description text not null,
  event_at timestamptz,
  guest_count integer,
  fulfillment_mode text not null default 'sur_place'
    check (fulfillment_mode in ('sur_place', 'livraison')),
  delivery_address text,
  currency text not null default 'CAD',
  subtotal numeric(10,2),
  tax_amount numeric(10,2),
  total numeric(10,2),
  deposit_percent numeric(5,2) not null default 0
    check (deposit_percent >= 0 and deposit_percent <= 100),
  deposit_amount numeric(10,2),
  expires_at timestamptz,
  client_notes text,
  owner_notes text,
  accepted_at timestamptz,
  converted_order_id uuid references orders(id) on delete set null,
  stripe_payment_intent_id text,
  checkout_session_id text unique,
  checkout_url text,
  checkout_attempt integer not null default 0 check (checkout_attempt >= 0),
  checkout_payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (guest_count is null or guest_count between 1 and 10000),
  check (subtotal is null or subtotal >= 0),
  check (tax_amount is null or tax_amount >= 0),
  check (total is null or total >= 0),
  check (deposit_amount is null or deposit_amount >= 0)
);

create index if not exists idx_service_quotes_restaurant_status_created
  on service_quotes (restaurant_id, status, created_at desc);
create index if not exists idx_service_quotes_customer_created
  on service_quotes (customer_id, created_at desc) where customer_id is not null;
create unique index if not exists idx_service_quotes_converted_order
  on service_quotes (converted_order_id) where converted_order_id is not null;

create table if not exists service_quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references service_quotes(id) on delete cascade,
  name text not null,
  description text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_service_quote_lines_quote on service_quote_lines(quote_id, sort_order);

alter table service_quotes enable row level security;
alter table service_quote_lines enable row level security;
drop policy if exists service_quotes_restaurant_select on service_quotes;
create policy service_quotes_restaurant_select on service_quotes for select
  using (is_restaurant_member(restaurant_id) or exists (
    select 1 from customers c where c.id = service_quotes.customer_id and c.user_id = auth.uid()
  ));
drop policy if exists service_quotes_restaurant_manage on service_quotes;
create policy service_quotes_restaurant_manage on service_quotes for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists service_quote_lines_select on service_quote_lines;
create policy service_quote_lines_select on service_quote_lines for select
  using (exists (select 1 from service_quotes q where q.id = service_quote_lines.quote_id
    and (is_restaurant_member(q.restaurant_id) or exists (
      select 1 from customers c where c.id = q.customer_id and c.user_id = auth.uid()
    ))));
drop policy if exists service_quote_lines_manage on service_quote_lines;
create policy service_quote_lines_manage on service_quote_lines for all
  using (exists (select 1 from service_quotes q where q.id = service_quote_lines.quote_id
    and is_restaurant_member(q.restaurant_id, array['owner','manager']::member_role[])))
  with check (exists (select 1 from service_quotes q where q.id = service_quote_lines.quote_id
    and is_restaurant_member(q.restaurant_id, array['owner','manager']::member_role[])));

-- Owner/manager quote issuance is transactional: itemization, tax, total,
-- deposit, and status can never disagree if any validation or write fails.
create or replace function issue_service_quote(
  p_quote_id uuid,
  p_lines jsonb,
  p_tax_rate numeric,
  p_deposit_percent numeric,
  p_expires_at timestamptz,
  p_checkout_payload_hash text
) returns table (subtotal numeric, tax_amount numeric, total numeric, deposit_amount numeric, checkout_attempt integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote service_quotes%rowtype;
  v_subtotal_raw numeric;
  v_subtotal numeric(10,2);
  v_tax numeric(10,2);
  v_total numeric(10,2);
  v_deposit numeric(10,2);
  v_count integer;
  v_reissue boolean;
  v_resume boolean;
begin
  select * into v_quote from service_quotes where id = p_quote_id for update;
  if not found or not is_restaurant_member(v_quote.restaurant_id, array['owner','manager']::member_role[]) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  v_reissue := v_quote.status = 'expired' or (v_quote.status = 'quoted' and v_quote.expires_at <= now());
  v_resume := v_quote.status = 'quoted' and not v_reissue and v_quote.checkout_url is null;
  if v_quote.status not in ('requested', 'quoted', 'expired')
    or (v_quote.status = 'quoted' and not v_reissue and not v_resume) then
    raise exception 'quote_not_editable' using errcode = '22023';
  end if;
  if p_checkout_payload_hash is null or length(p_checkout_payload_hash) <> 64 then
    raise exception 'invalid_checkout_payload_hash' using errcode = '22023';
  end if;
  if v_resume and v_quote.checkout_payload_hash is distinct from p_checkout_payload_hash then
    raise exception 'quote_issue_already_claimed' using errcode = '40001';
  end if;
  if jsonb_typeof(p_lines) <> 'array' then raise exception 'invalid_quote_lines' using errcode = '22023'; end if;
  select count(*) into v_count from jsonb_array_elements(p_lines);
  if v_count < 1 or v_count > 50 then raise exception 'invalid_quote_line_count' using errcode = '22023'; end if;
  if p_tax_rate is null or p_tax_rate < 0 or p_tax_rate > 0.30 then raise exception 'invalid_tax_rate' using errcode = '22023'; end if;
  if p_deposit_percent is null or p_deposit_percent <= 0 or p_deposit_percent > 100 then raise exception 'invalid_deposit_percent' using errcode = '22023'; end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '90 days' then
    raise exception 'invalid_quote_expiry' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_lines) x
    where length(trim(coalesce(x->>'name',''))) not between 1 and 120
      or coalesce((x->>'quantity')::integer, 0) not between 1 and 10000
      or coalesce((x->>'unitPrice')::numeric, -1) < 0
      or coalesce((x->>'unitPrice')::numeric, -1) > 100000
      or length(coalesce(x->>'description','')) > 500
  ) then raise exception 'invalid_quote_line' using errcode = '22023'; end if;

  select round(sum((x->>'quantity')::integer * (x->>'unitPrice')::numeric), 2)
    into v_subtotal_raw from jsonb_array_elements(p_lines) x;
  if v_subtotal_raw > 99999999.99 then raise exception 'quote_total_too_large' using errcode = '22023'; end if;
  v_subtotal := v_subtotal_raw;
  v_tax := round(v_subtotal * p_tax_rate, 2);
  v_total := v_subtotal + v_tax;
  if v_total > 99999999.99 then raise exception 'quote_total_too_large' using errcode = '22023'; end if;
  v_deposit := round(v_total * p_deposit_percent / 100, 2);
  if v_deposit < 0.50 then raise exception 'deposit_below_stripe_minimum' using errcode = '22023'; end if;

  if not v_resume then
    delete from service_quote_lines where quote_id = p_quote_id;
    insert into service_quote_lines (quote_id, name, description, quantity, unit_price, sort_order)
    select p_quote_id, trim(x->>'name'), nullif(trim(x->>'description'), ''),
      (x->>'quantity')::integer, (x->>'unitPrice')::numeric, ordinality::integer
    from jsonb_array_elements(p_lines) with ordinality as entries(x, ordinality);
  end if;

  update service_quotes set status = 'quoted', subtotal = v_subtotal, tax_amount = v_tax,
    total = v_total, deposit_percent = p_deposit_percent, deposit_amount = v_deposit,
    checkout_session_id = case when v_reissue then null else checkout_session_id end,
    checkout_url = case when v_reissue then null else checkout_url end,
    checkout_attempt = service_quotes.checkout_attempt + case when v_resume then 0 else 1 end,
    checkout_payload_hash = p_checkout_payload_hash,
    expires_at = p_expires_at, updated_at = now()
  where id = p_quote_id;
  return query select v_subtotal, v_tax, v_total, v_deposit,
    (select q.checkout_attempt from service_quotes q where q.id = p_quote_id);
end;
$$;
revoke all on function issue_service_quote(uuid, jsonb, numeric, numeric, timestamptz, text) from public, anon;
grant execute on function issue_service_quote(uuid, jsonb, numeric, numeric, timestamptz, text) to authenticated;

-- Stripe is the authority for payment completion. This single transaction
-- converts a paid quote into its production order exactly once, even when
-- Stripe retries the webhook or two workers receive it concurrently.
create or replace function complete_service_quote_payment(
  p_quote_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote service_quotes%rowtype;
  v_order_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_quote_id::text, 0));
  select * into v_quote from service_quotes where id = p_quote_id for update;
  if not found then raise exception 'service_quote_not_found' using errcode = 'P0002'; end if;
  if v_quote.converted_order_id is not null then return v_quote.converted_order_id; end if;
  if v_quote.status <> 'quoted' or v_quote.checkout_session_id is distinct from p_checkout_session_id then
    raise exception 'service_quote_payment_not_expected' using errcode = '22023';
  end if;
  if v_quote.total is null or v_quote.deposit_amount is null or v_quote.deposit_amount <= 0 then
    raise exception 'service_quote_amount_invalid' using errcode = '22023';
  end if;

  insert into orders (
    restaurant_id, status, guest_name, guest_phone, subtotal, tax_amount, total,
    payment_method, payment_status, stripe_payment_intent_id, paid_at,
    fulfillment_mode, is_public_request, customer_id, notes, requested_ready_at,
    order_kind, deposit_paid_amount
  ) values (
    v_quote.restaurant_id, 'confirmee', v_quote.guest_name, v_quote.guest_phone,
    v_quote.subtotal, v_quote.tax_amount, v_quote.total, 'Carte (Stripe)',
    case when v_quote.deposit_amount >= v_quote.total then 'paye'::order_payment_status
      else 'en_attente'::order_payment_status end,
    p_payment_intent_id, now(),
    case when v_quote.fulfillment_mode = 'livraison' then 'livraison' else 'sur_place' end,
    true, v_quote.customer_id,
    concat_ws(E'\n', nullif(v_quote.client_notes, ''), nullif(v_quote.owner_notes, ''),
      case when v_quote.deposit_amount < v_quote.total then 'Acompte encaissé : ' || v_quote.deposit_amount::text || ' ' || v_quote.currency else null end),
    v_quote.event_at,
    case when v_quote.quote_type = 'catering' then 'catering' else 'custom' end,
    v_quote.deposit_amount
  ) returning id into v_order_id;

  insert into order_items (order_id, item_name, unit_price, quantity, notes)
  select v_order_id, l.name, l.unit_price, l.quantity, l.description
  from service_quote_lines l where l.quote_id = p_quote_id order by l.sort_order, l.created_at;

  update service_quotes set
    status = 'converted',
    stripe_payment_intent_id = p_payment_intent_id,
    accepted_at = now(),
    converted_order_id = v_order_id,
    updated_at = now()
  where id = p_quote_id;
  return v_order_id;
end;
$$;

revoke all on function complete_service_quote_payment(uuid, text, text) from public, anon, authenticated;
grant execute on function complete_service_quote_payment(uuid, text, text) to service_role;

-- Suggestions/votes are customer-authenticated records, not public counters.
create table if not exists meal_suggestions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'under_review', 'draft_added', 'declined', 'archived')),
  menu_item_id uuid references menu_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(title)) between 3 and 120),
  check (description is null or char_length(description) <= 1000)
);
create index if not exists idx_meal_suggestions_restaurant_status
  on meal_suggestions (restaurant_id, status, created_at desc);

create table if not exists meal_suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references meal_suggestions(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (suggestion_id, customer_id)
);
create index if not exists idx_meal_suggestion_votes_customer on meal_suggestion_votes(customer_id);

alter table meal_suggestions enable row level security;
alter table meal_suggestion_votes enable row level security;
drop policy if exists meal_suggestions_restaurant_select on meal_suggestions;
create policy meal_suggestions_restaurant_select on meal_suggestions for select
  using (is_restaurant_member(restaurant_id) or exists (
    select 1 from customers c where c.id = meal_suggestions.customer_id and c.user_id = auth.uid()
  ));
drop policy if exists meal_suggestions_owner_manage on meal_suggestions;
create policy meal_suggestions_owner_manage on meal_suggestions for all
  using (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager']::member_role[]));
drop policy if exists meal_suggestion_votes_select on meal_suggestion_votes;
create policy meal_suggestion_votes_select on meal_suggestion_votes for select
  using (exists (select 1 from meal_suggestions s where s.id = meal_suggestion_votes.suggestion_id
    and (is_restaurant_member(s.restaurant_id) or exists (
      select 1 from customers c where c.id = meal_suggestion_votes.customer_id and c.user_id = auth.uid()
    ))));
drop policy if exists meal_suggestion_votes_customer_insert on meal_suggestion_votes;
create policy meal_suggestion_votes_customer_insert on meal_suggestion_votes for insert
  with check (exists (select 1 from customers c where c.id = meal_suggestion_votes.customer_id and c.user_id = auth.uid())
    and exists (select 1 from meal_suggestions s where s.id = meal_suggestion_votes.suggestion_id and s.status = 'open'));
drop policy if exists meal_suggestion_votes_customer_delete on meal_suggestion_votes;
create policy meal_suggestion_votes_customer_delete on meal_suggestion_votes for delete
  using (exists (select 1 from customers c where c.id = meal_suggestion_votes.customer_id and c.user_id = auth.uid()));

-- Customer RPCs resolve customer_id from auth.uid(); the mobile/web client
-- never gets to claim another customer's identity or submit raw vote counts.
create or replace function submit_meal_suggestion(
  p_restaurant_id uuid,
  p_title text,
  p_description text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_suggestion_id uuid;
begin
  select c.id into v_customer_id from customers c
  where c.user_id = auth.uid() and c.restaurant_id = p_restaurant_id
  order by c.created_at asc limit 1 for update;
  if v_customer_id is null then raise exception 'customer_not_found' using errcode = '42501'; end if;
  if length(trim(coalesce(p_title, ''))) not between 3 and 120 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if length(coalesce(p_description, '')) > 1000 then
    raise exception 'description_too_long' using errcode = '22023';
  end if;
  if (select count(*) from meal_suggestions s where s.customer_id = v_customer_id
      and s.created_at >= now() - interval '24 hours') >= 5 then
    raise exception 'daily_suggestion_limit' using errcode = '54000';
  end if;

  insert into meal_suggestions (restaurant_id, customer_id, created_by_user_id, title, description)
  values (p_restaurant_id, v_customer_id, auth.uid(), trim(p_title), nullif(trim(coalesce(p_description, '')), ''))
  returning id into v_suggestion_id;
  return v_suggestion_id;
end;
$$;

create or replace function vote_meal_suggestion(p_suggestion_id uuid)
returns table (vote_count bigint, has_voted boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_restaurant_id uuid;
begin
  select s.restaurant_id into v_restaurant_id from meal_suggestions s
  where s.id = p_suggestion_id and s.status = 'open';
  if v_restaurant_id is null then raise exception 'suggestion_not_open' using errcode = '22023'; end if;
  select c.id into v_customer_id from customers c
  where c.user_id = auth.uid() and c.restaurant_id = v_restaurant_id
  order by c.created_at asc limit 1;
  if v_customer_id is null then raise exception 'customer_not_found' using errcode = '42501'; end if;

  insert into meal_suggestion_votes (suggestion_id, customer_id)
  values (p_suggestion_id, v_customer_id)
  on conflict (suggestion_id, customer_id) do nothing;

  return query select count(*)::bigint, true from meal_suggestion_votes v
    where v.suggestion_id = p_suggestion_id;
end;
$$;

create or replace function get_meal_suggestions(p_restaurant_id uuid)
returns table (
  id uuid,
  restaurant_id uuid,
  title text,
  description text,
  status text,
  menu_item_id uuid,
  created_at timestamptz,
  vote_count bigint,
  has_voted boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_restaurant_member(p_restaurant_id) and not exists (
    select 1 from customers c where c.restaurant_id = p_restaurant_id and c.user_id = auth.uid()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  select s.id, s.restaurant_id, s.title, s.description, s.status, s.menu_item_id, s.created_at,
    (select count(*)::bigint from meal_suggestion_votes v where v.suggestion_id = s.id),
    exists (
      select 1 from meal_suggestion_votes v
      join customers c on c.id = v.customer_id
      where v.suggestion_id = s.id and c.user_id = auth.uid()
    )
  from meal_suggestions s
  where s.restaurant_id = p_restaurant_id and s.status in ('open', 'under_review', 'draft_added')
  order by (select count(*) from meal_suggestion_votes v where v.suggestion_id = s.id) desc, s.created_at desc;
end;
$$;

revoke all on function submit_meal_suggestion(uuid, text, text) from public, anon;
revoke all on function vote_meal_suggestion(uuid) from public, anon;
revoke all on function get_meal_suggestions(uuid) from public, anon;
grant execute on function submit_meal_suggestion(uuid, text, text) to authenticated;
grant execute on function vote_meal_suggestion(uuid) to authenticated;
grant execute on function get_meal_suggestions(uuid) to authenticated;

commit;
